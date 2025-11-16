import { supabase } from "@/integrations/supabase/client";
import { loadXLSX } from "@/utils/xlsxLoader";

// Helper function to clean text fields
const cleanText = (text: string | undefined | null): string => {
  if (!text) return '';
  return text.toString().trim().replace(/\s+/g, ' ');
};

interface QuestionRow {
  topic_number?: number;
  difficulty?: string;
  is_premium?: boolean | string;
  type?: string;
  image_url?: string;
  sign_code?: string;
  tags?: string;
  percent_correct?: number;
  question_ru?: string;
  question_es?: string;
  question_en?: string;
  answer_1_ru?: string;
  answer_1_es?: string;
  answer_1_en?: string;
  is_correct_1?: boolean | string | number;
  answer_2_ru?: string;
  answer_2_es?: string;
  answer_2_en?: string;
  is_correct_2?: boolean | string | number;
  answer_3_ru?: string;
  answer_3_es?: string;
  answer_3_en?: string;
  is_correct_3?: boolean | string | number;
  answer_4_ru?: string;
  answer_4_es?: string;
  answer_4_en?: string;
  is_correct_4?: boolean | string | number;
  explanation_ru?: string;
  explanation_es?: string;
  explanation_en?: string;
  notes?: string;
  source?: string;
}

export const importQuestions = async (file: File) => {
  try {
    // Lazy load XLSX только когда нужен
    const XLSX = await loadXLSX();
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData: QuestionRow[] = XLSX.utils.sheet_to_json(sheet);

    console.log(`Processing ${jsonData.length} questions...`);

    // Get existing topics map
    const { data: topics, error: topicsError } = await supabase
      .from('topics')
      .select('id, number');
    
    if (topicsError) throw topicsError;
    
    const topicMap = new Map(topics?.map(t => [t.number, t.id]) || []);

    // Get existing tags map
    const { data: tags, error: tagsError } = await supabase
      .from('tags')
      .select('id, name_en');
    
    if (tagsError) throw tagsError;
    
    const tagMap = new Map(tags?.map(t => [t.name_en.toLowerCase(), t.id]) || []);

    let successCount = 0;
    let errorCount = 0;

    for (const row of jsonData) {
      try {
        // Find topic_id by topic_number
        const topicId = row.topic_number ? topicMap.get(row.topic_number) : null;
        
        if (!topicId && row.topic_number) {
          console.warn(`Topic ${row.topic_number} not found, skipping question`);
          errorCount++;
          continue;
        }

        // Parse boolean values
        const parseBool = (val: any): boolean => {
          if (typeof val === 'boolean') return val;
          if (typeof val === 'string') return val.toLowerCase() === 'true' || val === '1' || val.toLowerCase() === 'yes';
          if (typeof val === 'number') return val === 1;
          return false;
        };

        // Insert question
        const questionData: any = {
          difficulty: row.difficulty?.toLowerCase() || 'medium',
          is_premium: parseBool(row.is_premium),
          type: row.type || 'single',
          image_url: cleanText(row.image_url) || null,
          sign_code: cleanText(row.sign_code) || null,
          source: cleanText(row.source) || null,
          percent_correct: row.percent_correct || 0,
          question_ru: cleanText(row.question_ru),
          question_es: cleanText(row.question_es),
          question_en: cleanText(row.question_en),
          explanation_ru: cleanText(row.explanation_ru) || null,
          explanation_es: cleanText(row.explanation_es) || null,
          explanation_en: cleanText(row.explanation_en) || null,
          notes: cleanText(row.notes) || null,
        };

        if (topicId) {
          questionData.topic_id = topicId;
        }

        const { data: question, error: questionError } = await supabase
          .from('questions_new')
          .insert(questionData)
          .select()
          .single();

        if (questionError) {
          console.error('Error inserting question:', questionError);
          errorCount++;
          continue;
        }

        // Insert answer options
        const answers = [];
        
        for (let i = 1; i <= 4; i++) {
          const answerRu = row[`answer_${i}_ru` as keyof QuestionRow];
          const answerEs = row[`answer_${i}_es` as keyof QuestionRow];
          const answerEn = row[`answer_${i}_en` as keyof QuestionRow];
          const isCorrect = row[`is_correct_${i}` as keyof QuestionRow];

          if (answerRu || answerEs || answerEn) {
            answers.push({
              question_id: question.id,
              text_ru: cleanText(answerRu as string),
              text_es: cleanText(answerEs as string),
              text_en: cleanText(answerEn as string),
              is_correct: parseBool(isCorrect),
              position: i,
            });
          }
        }

        // answer_options table was removed - questions now store options differently
        /* DISABLED - answer_options table removed for security
        if (answers.length > 0) {
          const { error: answersError } = await supabase
            .from('answer_options')
            .insert(answers);

          if (answersError) {
            console.error('Error inserting answers:', answersError);
            // Don't skip, question is already inserted
          }
        }
        */

        // Process tags
        if (row.tags) {
          const tagNames = row.tags.split(',').map(t => t.trim().toLowerCase());
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
            const { error: tagsError } = await supabase
              .from('question_tags')
              .insert(questionTags);

            if (tagsError) {
              console.error('Error inserting question tags:', tagsError);
            }
          }
        }

        successCount++;
      } catch (err) {
        console.error('Error processing row:', err);
        errorCount++;
      }
    }

    console.log(`Import completed: ${successCount} success, ${errorCount} errors`);
    return { successCount, errorCount, total: jsonData.length };
  } catch (error) {
    console.error('Error importing questions:', error);
    throw error;
  }
};
