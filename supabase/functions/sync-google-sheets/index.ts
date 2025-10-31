import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuestionRow {
  topic_number?: number;
  difficulty?: string;
  is_premium?: string;
  type?: string;
  image_url?: string;
  sign_code?: string;
  source?: string;
  question_ru?: string;
  question_es?: string;
  question_en?: string;
  explanation_ru?: string;
  explanation_es?: string;
  explanation_en?: string;
  tags?: string;
  answer_1_ru?: string;
  answer_1_es?: string;
  answer_1_en?: string;
  is_correct_1?: string;
  answer_2_ru?: string;
  answer_2_es?: string;
  answer_2_en?: string;
  is_correct_2?: string;
  answer_3_ru?: string;
  answer_3_es?: string;
  answer_3_en?: string;
  is_correct_3?: string;
  answer_4_ru?: string;
  answer_4_es?: string;
  answer_4_en?: string;
  is_correct_4?: string;
  notes?: string;
}

interface TopicRow {
  number?: number;
  title_ru?: string;
  title_es?: string;
  title_en?: string;
  cover_image?: string;
  is_premium?: string;
  gradient_from?: string;
  gradient_to?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const sheetsId = Deno.env.get('GOOGLE_SHEETS_ID');
    if (!sheetsId) {
      throw new Error('GOOGLE_SHEETS_ID not configured');
    }

    console.log('Starting Google Sheets sync...');

    // Fetch Topics sheet
    const topicsUrl = `https://docs.google.com/spreadsheets/d/${sheetsId}/gviz/tq?tqx=out:csv&sheet=Topics`;
    const topicsResponse = await fetch(topicsUrl);
    const topicsCsv = await topicsResponse.text();
    const topicsRows = topicsCsv.split('\n').slice(1).filter(row => row.trim());

    console.log(`Found ${topicsRows.length} topics`);

    // Parse and upsert topics
    let topicsProcessed = 0;
    for (const row of topicsRows) {
      const columns = row.split(',').map(col => col.replace(/^"|"$/g, '').trim());
      
      if (!columns[0] || !columns[1]) continue; // Skip empty rows

      const topicData: TopicRow = {
        number: parseInt(columns[0]),
        title_ru: columns[1],
        title_es: columns[2],
        title_en: columns[3],
        cover_image: columns[4],
        is_premium: columns[5],
        gradient_from: columns[6] || '#00BFFF',
        gradient_to: columns[7] || '#39FF14',
      };

      const parseBool = (val?: string): boolean => {
        if (!val) return false;
        return val.toLowerCase() === 'true' || val === '✔' || val === '1' || val.toLowerCase() === 'yes';
      };

      const { error } = await supabase
        .from('topics')
        .upsert({
          number: topicData.number,
          title_ru: topicData.title_ru,
          title_es: topicData.title_es,
          title_en: topicData.title_en,
          cover_image: topicData.cover_image || null,
          is_premium: parseBool(topicData.is_premium),
          gradient_from: topicData.gradient_from,
          gradient_to: topicData.gradient_to,
        }, { onConflict: 'number' });

      if (error) {
        console.error('Error upserting topic:', error);
      } else {
        topicsProcessed++;
      }
    }

    // Fetch Questions sheet
    const questionsUrl = `https://docs.google.com/spreadsheets/d/${sheetsId}/gviz/tq?tqx=out:csv&sheet=Questions`;
    const questionsResponse = await fetch(questionsUrl);
    const questionsCsv = await questionsResponse.text();
    const questionsRows = questionsCsv.split('\n').slice(1).filter(row => row.trim());

    console.log(`Found ${questionsRows.length} questions`);

    // Get topics map
    const { data: topics } = await supabase
      .from('topics')
      .select('id, number');
    
    const topicMap = new Map(topics?.map(t => [t.number, t.id]) || []);

    // Get tags map
    const { data: tags } = await supabase
      .from('tags')
      .select('id, name_en');
    
    const tagMap = new Map(tags?.map(t => [t.name_en.toLowerCase(), t.id]) || []);

    let questionsProcessed = 0;
    let questionsSkipped = 0;
    const skipReasons: string[] = [];

    for (const row of questionsRows) {
      const columns = row.split(',').map(col => col.replace(/^"|"$/g, '').trim());
      
      const questionData: QuestionRow = {
        topic_number: parseInt(columns[0]),
        difficulty: columns[1],
        is_premium: columns[2],
        type: columns[3],
        image_url: columns[4],
        sign_code: columns[5],
        source: columns[6],
        question_ru: columns[7],
        question_es: columns[8],
        question_en: columns[9],
        explanation_ru: columns[10] || columns[30],
        explanation_es: columns[11] || columns[31],
        explanation_en: columns[12] || columns[32],
        tags: columns[13],
        answer_1_ru: columns[14],
        answer_1_es: columns[15],
        answer_1_en: columns[16],
        is_correct_1: columns[17],
        answer_2_ru: columns[18],
        answer_2_es: columns[19],
        answer_2_en: columns[20],
        is_correct_2: columns[21],
        answer_3_ru: columns[22],
        answer_3_es: columns[23],
        answer_3_en: columns[24],
        is_correct_3: columns[25],
        answer_4_ru: columns[26],
        answer_4_es: columns[27],
        answer_4_en: columns[28],
        is_correct_4: columns[29],
        notes: columns[33],
      };

      if (!questionData.question_ru || !questionData.question_es || !questionData.question_en) {
        skipReasons.push(`Вопрос пропущен: отсутствуют тексты вопроса (строка ${questionsSkipped + questionsProcessed + 2})`);
        questionsSkipped++;
        continue;
      }

      const topicId = questionData.topic_number ? topicMap.get(questionData.topic_number) : null;
      
      if (!topicId && questionData.topic_number) {
        const reason = `Тема ${questionData.topic_number} не найдена в базе (вопрос: "${questionData.question_ru?.substring(0, 50)}...")`;
        console.warn(reason);
        skipReasons.push(reason);
        questionsSkipped++;
        continue;
      }

      const parseBool = (val?: string): boolean => {
        if (!val) return false;
        return val.toLowerCase() === 'true' || val === '✔' || val === '1' || val.toLowerCase() === 'yes';
      };

      // Map difficulty number to enum value
      const difficultyMap: Record<string, 'easy' | 'medium' | 'hard'> = {
        '1': 'easy',
        '2': 'medium',
        '3': 'hard',
        'easy': 'easy',
        'medium': 'medium',
        'hard': 'hard',
      };
      const difficulty = questionData.difficulty 
        ? (difficultyMap[questionData.difficulty.toLowerCase()] || 'medium')
        : 'medium';

      // Insert question
      const { data: question, error: questionError } = await supabase
        .from('questions_new')
        .insert({
          topic_id: topicId,
          difficulty: difficulty,
          is_premium: parseBool(questionData.is_premium),
          type: questionData.type || 'single',
          image_url: questionData.image_url || null,
          sign_code: questionData.sign_code || null,
          source: questionData.source || null,
          question_ru: questionData.question_ru,
          question_es: questionData.question_es,
          question_en: questionData.question_en,
          explanation_ru: questionData.explanation_ru || null,
          explanation_es: questionData.explanation_es || null,
          explanation_en: questionData.explanation_en || null,
          notes: questionData.notes || null,
        })
        .select()
        .single();

      if (questionError) {
        const reason = `Ошибка вставки вопроса: ${questionError.message} (тема: ${questionData.topic_number}, difficulty: ${questionData.difficulty})`;
        console.error(reason);
        skipReasons.push(reason);
        questionsSkipped++;
        continue;
      }

      // Insert answer options
      const answers = [];
      
      for (let i = 1; i <= 4; i++) {
        const answerRu = questionData[`answer_${i}_ru` as keyof QuestionRow];
        const answerEs = questionData[`answer_${i}_es` as keyof QuestionRow];
        const answerEn = questionData[`answer_${i}_en` as keyof QuestionRow];
        const isCorrect = questionData[`is_correct_${i}` as keyof QuestionRow];

        if (answerRu || answerEs || answerEn) {
          answers.push({
            question_id: question.id,
            text_ru: answerRu || '',
            text_es: answerEs || '',
            text_en: answerEn || '',
            is_correct: parseBool(isCorrect as string),
            position: i,
          });
        }
      }

      if (answers.length > 0) {
        const { error: answersError } = await supabase
          .from('answer_options')
          .insert(answers);

        if (answersError) {
          console.error('Error inserting answers:', answersError);
        }
      }

      // Process tags
      if (questionData.tags) {
        const tagNames = questionData.tags.split(',').map(t => t.trim().toLowerCase());
        const questionTags = [];

        for (const tagName of tagNames) {
          const tagId = tagMap.get(tagName);
          if (tagId) {
            questionTags.push({
              question_id: question.id,
              tag_id: tagId,
            });
          }
        }

        if (questionTags.length > 0) {
          await supabase
            .from('question_tags')
            .insert(questionTags);
        }
      }

      questionsProcessed++;
    }

    const result = {
      success: true,
      topicsProcessed: topicsProcessed,
      questionsProcessed: questionsProcessed,
      questionsSkipped: questionsSkipped,
      skipReasons: skipReasons.slice(0, 10), // First 10 reasons
      timestamp: new Date().toISOString(),
      availableTopics: Array.from(topicMap.keys()).sort((a, b) => a - b),
    };

    console.log('Sync completed:', result);
    console.log('Available topics in DB:', Array.from(topicMap.keys()).sort((a, b) => a - b));

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in sync-google-sheets:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
