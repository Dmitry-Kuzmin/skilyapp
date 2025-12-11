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

type MaterialModule = StaticMaterial | { default: StaticMaterial };

import { getSupabaseClient } from "@/integrations/supabase/lazyClient";

const localMaterials = new Map<string, StaticMaterial>();
const localMaterialsByStaticId = new Map<string, StaticMaterial>();

const materialModules = import.meta.glob<MaterialModule>("../data/materials/**/*.json", {
  eager: true,
});

const cloneMaterial = (material: StaticMaterial): StaticMaterial =>
  typeof structuredClone === "function"
    ? structuredClone(material)
    : JSON.parse(JSON.stringify(material));

const normalizeImagePath = (image: string, topicNumber: number) => {
  if (!image) return image;
  if (image.startsWith("http") || image.startsWith("/") || image.startsWith("data:")) {
    return image;
  }
  const sanitized = image.replace(/^\.?\//, "");
  return `/data/materials/topic-${topicNumber}/images/${sanitized}`;
};

Object.entries(materialModules).forEach(([path, module]) => {
  const material = (module as any).default ?? module;
  if (!material || !material.code) return;

  const topicNumberMatchFromId = material.topic_id?.match(/(\d+)/);
  const topicNumberMatchFromPath = path.match(/topic-(\d+)/);
  const topicNumberRaw = topicNumberMatchFromId?.[1] ?? topicNumberMatchFromPath?.[1];
  if (!topicNumberRaw) return;

  const topicNumber = Number(topicNumberRaw);
  if (Number.isNaN(topicNumber)) return;

  const normalizedCode = material.code.replace(/\./g, "-");
  const key = `${topicNumber}:${normalizedCode}`;
  const staticId = `static-topic-${topicNumber}-subtopic-${normalizedCode}`;

  localMaterials.set(key, {
    ...material,
    id: material.id ?? staticId,
    images: (material.images ?? []).map((image) => normalizeImagePath(image, topicNumber)),
  });
  localMaterialsByStaticId.set(staticId, localMaterials.get(key)!);
});

const getCachedMaterial = (topicNumber: number, subtopicCode: string) => {
  const normalizedCode = subtopicCode.replace(/\./g, "-");
  const key = `${topicNumber}:${normalizedCode}`;
  const cached = localMaterials.get(key);
  return cached ? cloneMaterial(cached) : null;
};

const getCachedMaterialByStaticId = (staticId: string) => {
  const cached = localMaterialsByStaticId.get(staticId);
  return cached ? cloneMaterial(cached) : null;
};

/**
 * Загружает статический материал по коду подтемы
 */
export async function loadStaticMaterial(
  topicNumber: number,
  subtopicCode: string
): Promise<StaticMaterial | null> {
  const cachedMaterial = getCachedMaterial(topicNumber, subtopicCode);
  if (cachedMaterial) {
    return cachedMaterial;
  }

  try {
    // Формируем путь к JSON файлу
    const codeNormalized = subtopicCode.replace(/\./g, "-");
    const materialPath = `/data/materials/topic-${topicNumber}/subtopic-${codeNormalized}.json`;

    // Загружаем JSON файл
    const response = await fetch(materialPath);

    if (!response.ok) {
      console.debug(`[StaticMaterials] Material not found: ${materialPath}`);
      return null;
    }

    const material: StaticMaterial = await response.json();
    console.log(`[StaticMaterials] Loaded material: ${materialPath}`, material);

    return {
      ...material,
      images: (material.images ?? []).map((image) =>
        normalizeImagePath(
          image,
          Number(material.topic_id?.replace("topic-", "") ?? topicNumber) || topicNumber
        )
      ),
    };
  } catch (error) {
    console.debug(
      `[StaticMaterials] Fallback fetch failed for topic ${topicNumber}, subtopic ${subtopicCode}`,
      error
    );
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
      const supabase = await getSupabaseClient();
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
    const supabase = await getSupabaseClient();
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
  const cachedMaterial = getCachedMaterialByStaticId(staticId);
  if (cachedMaterial) {
    return cachedMaterial;
  }

  const match = staticId.match(/^static-topic-(\d+)-subtopic-([\d-]+)$/);
  if (!match) {
    console.log(`[StaticMaterials] Invalid static ID format: ${staticId}`);
    return null;
  }

  const topicNumber = parseInt(match[1]);
  const subtopicCode = match[2].replace(/-/g, ".");

  console.log(
    `[StaticMaterials] Loading by static ID: ${staticId} -> topic ${topicNumber}, code ${subtopicCode}`
  );
  return loadStaticMaterial(topicNumber, subtopicCode);
}

/**
 * Проверяет наличие статического материала
 */
export async function hasStaticMaterial(
  topicNumber: number,
  subtopicCode: string
): Promise<boolean> {
  const cachedMaterial = getCachedMaterial(topicNumber, subtopicCode);
  if (cachedMaterial) {
    return true;
  }
  const material = await loadStaticMaterial(topicNumber, subtopicCode);
  return material !== null;
}

