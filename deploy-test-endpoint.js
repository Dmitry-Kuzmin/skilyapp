// Deploy entire test to Supabase (batch UPSERT)
app.post('/api/db/deploy-test', async (req, res) => {
    try {
        const { testId } = req.body;

        console.log(`[Deploy Test] Starting deployment for: ${testId}`);

        // Parse test ID to get file path
        const parts = testId.split('_');
        const topic = parts[0];
        const test = parts.slice(1).join('_');

        const enrichedPath = path.join(process.cwd(), 'data/parsed', topic, `${topic}_${test}-enriched.json`);

        // Read enriched JSON
        const content = await fs.readFile(enrichedPath, 'utf-8');
        const questions = JSON.parse(content);

        let deployed = 0;
        let errors = [];

        for (const q of questions) {
            try {
                // Check if question already exists
                const { data: existing } = await supabase
                    .from('questions_new')
                    .select('id')
                    .eq('id', q.external_id || q.id)
                    .maybeSingle();

                if (existing) {
                    console.log(`[Deploy Test] Skipping ${q.external_id} - already exists`);
                    continue;
                }

                // Format answer options
                const answerOptions = [
                    {
                        question_id: q.external_id || q.id,
                        position: 0,
                        text_ru: q.answer_correct_ru || q.answers?.find(a => a.is_correct)?.text?.ru || '',
                        text_es: q.answer_correct_es || q.answers?.find(a => a.is_correct)?.text?.es || '',
                        text_en: q.answer_correct_en || q.answers?.find(a => a.is_correct)?.text?.en || '',
                        is_correct: true
                    },
                    ...Object.entries(q)
                        .filter(([key]) => key.startsWith('answer_wrong_'))
                        .map(([key, value], idx) => ({
                            question_id: q.external_id || q.id,
                            position: idx + 1,
                            text_ru: q[`answer_wrong_${idx + 1}_ru`] || '',
                            text_es: q[`answer_wrong_${idx + 1}_es`] || '',
                            text_en: q[`answer_wrong_${idx + 1}_en`] || '',
                            is_correct: false
                        }))
                ];

                // Insert question
                const { error: qError } = await supabase
                    .from('questions_new')
                    .insert({
                        id: q.external_id || q.id,
                        topic_id: q.topic_id || null,
                        difficulty: 'easy',
                        type: 'single',
                        question_ru: q.question?.ru || q.question_ru || '',
                        question_es: q.question?.es || q.question_es || '',
                        question_en: q.question?.en || q.question_en || '',
                        explanation_ru: q.explanation?.ru || q.explanation_ru || '',
                        explanation_es: q.explanation?.es || q.explanation_es || '',
                        explanation_en: q.explanation?.en || q.explanation_en || '',
                        source: 'practicavial',
                        metadata: {
                            test_id: testId,
                            original_image: q.image_url || q.schema_url || '',
                            question_number: q.question_number || 0
                        }
                    });

                if (qError) throw qError;

                // Insert answer options
                const { error: aError } = await supabase
                    .from('answer_options')
                    .insert(answerOptions.filter(a => a.text_ru || a.text_es));

                if (aError) console.warn(`[Deploy Test] Answer options warning for ${q.external_id}:`, aError);

                deployed++;
                console.log(`[Deploy Test] ✅ Deployed question ${q.external_id}`);

            } catch (e) {
                console.error(`[Deploy Test] Error deploying ${q.external_id}:`, e);
                errors.push({ id: q.external_id, error: e.message });
            }
        }

        console.log(`[Deploy Test] Deployment complete: ${deployed}/${questions.length}`);

        res.json({
            success: true,
            deployed,
            total: questions.length,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('[Deploy Test] Error:', error);
        res.status(500).json({ error: error.message });
    }
});
