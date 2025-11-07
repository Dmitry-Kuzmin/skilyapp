import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Proper CSV parser that handles quoted fields with commas
function parseCSVRow(row: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    const nextChar = row[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  result.push(current.trim());
  
  return result;
}

// Check if text contains Cyrillic characters
function hasCyrillic(text: string): boolean {
  return /[а-яА-ЯЁё]/.test(text);
}

interface QuestionRow {
  source_id?: string;
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
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's JWT to verify authentication
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Verify user authentication
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check admin role using the has_role function
    const { data: isAdmin, error: roleError } = await supabaseAuth.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      console.error('Role check error:', roleError);
      return new Response(
        JSON.stringify({ error: 'Forbidden - admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Admin user verified:', user.email);

    // Create service role client for actual operations
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
      const columns = parseCSVRow(row);
      
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
    let questionsUpdated = 0;
    let questionsInserted = 0;
    const skipReasons: string[] = [];
    const warnings: string[] = [];

    for (const row of questionsRows) {
      const columns = parseCSVRow(row);
      
      // Log parsed columns for debugging
      console.log(`Parsed ${columns.length} columns for row ${questionsProcessed + questionsSkipped + 1}`);
      
      // source_id is now in column 0 (first column)
      // topic_number is now in column 1 (second column)
      const questionData: QuestionRow = {
        source_id: columns[0]?.trim() || null,
        topic_number: parseInt(columns[1]),
        difficulty: columns[2],
        is_premium: columns[3],
        type: columns[4],
        image_url: columns[5],
        sign_code: columns[6],
        source: columns[7],
        question_ru: columns[8],
        question_es: columns[9],
        question_en: columns[10],
        explanation_ru: columns[11],
        explanation_es: columns[12],
        explanation_en: columns[13],
        tags: columns[14],
        answer_1_ru: columns[15],
        answer_1_es: columns[16],
        answer_1_en: columns[17],
        is_correct_1: columns[18],
        answer_2_ru: columns[19],
        answer_2_es: columns[20],
        answer_2_en: columns[21],
        is_correct_2: columns[22],
        answer_3_ru: columns[23],
        answer_3_es: columns[24],
        answer_3_en: columns[25],
        is_correct_3: columns[26],
        answer_4_ru: columns[27],
        answer_4_es: columns[28],
        answer_4_en: columns[29],
        is_correct_4: columns[30],
        notes: columns[31],
      };
      
      // Validate source_id
      if (!questionData.source_id || !questionData.source_id.trim()) {
        skipReasons.push(`Вопрос пропущен: отсутствует source_id (строка ${questionsSkipped + questionsProcessed + 2})`);
        questionsSkipped++;
        continue;
      }
      
      // Validate data
      if (questionData.question_es && hasCyrillic(questionData.question_es)) {
        warnings.push(`⚠️ Русские буквы в question_es (строка ${questionsProcessed + questionsSkipped + 2}): "${questionData.question_es.substring(0, 50)}..."`);
      }
      
      // Validate answer lengths
      for (let i = 1; i <= 4; i++) {
        const answerEs = questionData[`answer_${i}_es` as keyof QuestionRow] as string;
        const answerRu = questionData[`answer_${i}_ru` as keyof QuestionRow] as string;
        
        if (answerEs && answerEs.length > 200) {
          warnings.push(`⚠️ Ответ ${i} (ES) слишком длинный: ${answerEs.length} символов (строка ${questionsProcessed + questionsSkipped + 2})`);
        }
        if (answerRu && answerRu.length > 200) {
          warnings.push(`⚠️ Ответ ${i} (RU) слишком длинный: ${answerRu.length} символов (строка ${questionsProcessed + questionsSkipped + 2})`);
        }
        if (answerEs && hasCyrillic(answerEs)) {
          warnings.push(`⚠️ Русские буквы в answer_${i}_es (строка ${questionsProcessed + questionsSkipped + 2}): "${answerEs.substring(0, 50)}..."`);
        }
      }

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

      // Upsert question (insert or update if source_id exists)
      // Check if question exists by comparing created_at and updated_at after upsert
      const { data: question, error: questionError } = await supabase
        .from('questions_new')
        .upsert({
          source_id: questionData.source_id.trim(),
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
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'source_id',
          ignoreDuplicates: false
        })
        .select('id, created_at, updated_at')
        .single();

      if (questionError) {
        const reason = `Ошибка upsert вопроса: ${questionError.message} (source_id: ${questionData.source_id}, тема: ${questionData.topic_number})`;
        console.error(reason);
        skipReasons.push(reason);
        questionsSkipped++;
        continue;
      }
      
      // Determine if question was new or updated by comparing timestamps
      // If created_at and updated_at are very close (within 1 second), it's likely a new question
      const createdAt = new Date(question.created_at).getTime();
      const updatedAt = new Date(question.updated_at).getTime();
      const timeDiff = Math.abs(updatedAt - createdAt);
      const isNewQuestion = timeDiff < 2000; // Less than 2 seconds difference
      
      // Update statistics
      if (isNewQuestion) {
        questionsInserted++;
      } else {
        questionsUpdated++;
        // Delete old answer_options for this question (if updating)
        await supabase
          .from('answer_options')
          .delete()
          .eq('question_id', question.id);
        
        // Delete old question_tags for this question (if updating)
        await supabase
          .from('question_tags')
          .delete()
          .eq('question_id', question.id);
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

      // Process tags (insert new tags)
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
          // Use upsert to avoid duplicates
          await supabase
            .from('question_tags')
            .upsert(questionTags, {
              onConflict: 'question_id,tag_id',
              ignoreDuplicates: false
            });
        }
      }

      questionsProcessed++;
    }

    const result = {
      success: true,
      topicsProcessed: topicsProcessed,
      questionsProcessed: questionsProcessed,
      questionsInserted: questionsInserted,
      questionsUpdated: questionsUpdated,
      questionsSkipped: questionsSkipped,
      skipReasons: skipReasons.slice(0, 10), // First 10 reasons
      warnings: warnings.slice(0, 20), // First 20 warnings
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
