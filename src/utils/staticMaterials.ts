/**
 * Утилита для загрузки статических материалов из JSON файлов
 */

export interface StaticMaterial {
  id: string;
  code: string;
  topic_id: string;
  title_ru: string;
  title_es: string;
  title_en: string;
  content_ru: string;
  content_es: string;
  content_en: string;
  images: Array<{
    url: string;
    alt?: string;
    caption?: string;
  }>;
  order: number;
  source_pdf?: string;
}

/**
 * Загружает статический материал по коду подтемы
 */
export async function loadStaticMaterial(
  topicNumber: number,
  subtopicCode: string
): Promise<StaticMaterial | null> {
  try {
    // Формируем путь к JSON файлу
    const codeNormalized = subtopicCode.replace('.', '-');
    const materialPath = `/data/materials/topic-${topicNumber}/subtopic-${codeNormalized}.json`;
    
    // Загружаем JSON файл
    const response = await fetch(materialPath);
    
    // Проверяем статус ответа
    if (!response.ok) {
      // Файл не найден - это нормально, не логируем как ошибку
      return null;
    }
    
    // Проверяем Content-Type перед парсингом
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // Ответ не является JSON - возможно HTML страница 404
      return null;
    }
    
    // Парсим JSON с проверкой на пустой ответ
    const text = await response.text();
    if (!text || text.trim().length === 0) {
      return null;
    }
    
    try {
      const material: StaticMaterial = JSON.parse(text);
      
      // Валидация базовой структуры
      if (!material || typeof material !== 'object' || !material.id) {
        console.warn(`[StaticMaterials] Invalid material structure: ${materialPath}`);
        return null;
      }
      
      console.log(`[StaticMaterials] Loaded material: ${materialPath}`);
      return material;
    } catch (parseError) {
      // Ошибка парсинга JSON - файл поврежден или не является JSON
      console.warn(`[StaticMaterials] Invalid JSON in ${materialPath}:`, parseError);
      return null;
    }
  } catch (error) {
    // Сетевые ошибки или другие проблемы
    // Не логируем как ошибку, если это просто отсутствующий файл
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      // Сетевая ошибка - файл не найден
      return null;
    }
    // Другие ошибки логируем только в dev режиме
    if (import.meta.env.DEV) {
      console.warn(`[StaticMaterials] Error loading material for topic ${topicNumber}, subtopic ${subtopicCode}:`, error);
    }
    return null;
  }
}

/**
 * Загружает статический материал по ID подтемы из Supabase
 * Сначала пытается найти код подтемы, затем загружает статический материал
 */
export async function loadStaticMaterialBySubtopicId(
  subtopicId: string,
  topicNumber?: number
): Promise<StaticMaterial | null> {
  try {
    // Если номер темы не передан, пытаемся загрузить из Supabase
    if (!topicNumber) {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: subtopic } = await supabase
        .from('subtopics')
        .select('code, topics(number)')
        .eq('id', subtopicId)
        .single();
      
      if (!subtopic || !subtopic.topics) {
        return null;
      }
      
      topicNumber = (subtopic.topics as any).number;
    }
    
    // Получаем код подтемы
    const { supabase } = await import('@/integrations/supabase/client');
    const { data: subtopic } = await supabase
      .from('subtopics')
      .select('code')
      .eq('id', subtopicId)
      .single();
    
    if (!subtopic?.code) {
      return null;
    }
    
    return loadStaticMaterial(topicNumber, subtopic.code);
  } catch (error) {
    console.error(`[StaticMaterials] Error loading material by subtopic ID ${subtopicId}:`, error);
    return null;
  }
}

/**
 * Загружает статический материал по статическому ID
 * Формат ID: static-topic-{number}-subtopic-{code}
 */
export async function loadStaticMaterialByStaticId(
  staticId: string
): Promise<StaticMaterial | null> {
  const match = staticId.match(/^static-topic-(\d+)-subtopic-([\d-]+)$/);
  if (!match) {
    console.log(`[StaticMaterials] Invalid static ID format: ${staticId}`);
    return null;
  }
  
  const topicNumber = parseInt(match[1]);
  const subtopicCode = match[2].replace('-', '.');
  
  console.log(`[StaticMaterials] Loading by static ID: ${staticId} -> topic ${topicNumber}, code ${subtopicCode}`);
  return loadStaticMaterial(topicNumber, subtopicCode);
}

/**
 * Проверяет наличие статического материала (легкая проверка без загрузки)
 */
export async function hasStaticMaterial(
  topicNumber: number,
  subtopicCode: string
): Promise<boolean> {
  try {
    // Формируем путь к JSON файлу
    const codeNormalized = subtopicCode.replace('.', '-');
    const materialPath = `/data/materials/topic-${topicNumber}/subtopic-${codeNormalized}.json`;
    
    // Используем HEAD запрос для проверки наличия файла без загрузки содержимого
    const response = await fetch(materialPath, { method: 'HEAD' });
    
    // Проверяем статус и Content-Type
    if (!response.ok) {
      return false;
    }
    
    const contentType = response.headers.get('content-type');
    return contentType !== null && contentType.includes('application/json');
  } catch (error) {
    // При любой ошибке считаем, что файла нет
    return false;
  }
}

