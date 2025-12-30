import { supabase } from "@/integrations/supabase/client";
import { generateHTMLPreview } from "./editor";
import { saveMaterialVersion, cleanupOldVersions } from "./materialVersioning";

/**
 * CRUD операции для тем
 */
export const topicApi = {
  async create(data: {
    number: number;
    title_ru: string;
    title_es: string;
    title_en: string;
    description_ru?: string;
    description_es?: string;
    description_en?: string;
    order_index?: number;
    gradient_from?: string;
    gradient_to?: string;
    is_premium?: boolean;
  }) {
    // Build insert data, only include description fields if they exist and are not empty
    const insertData: Record<string, unknown> = {
      number: data.number,
      title_ru: data.title_ru,
      title_es: data.title_es,
      title_en: data.title_en,
      order_index: data.order_index || data.number,
    };

    // Only add description fields if they are provided and not empty
    if (data.description_ru) {
      insertData.description_ru = data.description_ru;
    }
    if (data.description_es) {
      insertData.description_es = data.description_es;
    }
    if (data.description_en) {
      insertData.description_en = data.description_en;
    }

    // Add optional fields
    if (data.gradient_from) {
      insertData.gradient_from = data.gradient_from;
    }
    if (data.gradient_to) {
      insertData.gradient_to = data.gradient_to;
    }
    if (data.is_premium !== undefined) {
      insertData.is_premium = data.is_premium;
    }

    const { data: result, error } = await supabase
      .from("topics")
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return result;
  },

  async update(id: string, data: Partial<Parameters<typeof topicApi.create>[0]>) {
    const { data: result, error } = await supabase
      .from("topics")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return result;
  },

  async delete(id: string) {
    const { error } = await supabase.from("topics").delete().eq("id", id);
    if (error) throw error;
  },

  async getAll() {
    const { data, error } = await supabase
      .from("topics")
      .select("*")
      .order("order_index", { ascending: true });

    if (error) throw error;
    return data || [];
  },
};

/**
 * Тип подтемы
 */
export interface Subtopic {
  id: string;
  topic_id: string;
  title_ru: string;
  title_es: string;
  title_en: string;
  order_index: number;
  type: "material" | "test" | "terms";
  content_id?: string;
  is_required?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * CRUD операции для подтем
 */
export const subtopicApi = {
  async create(data: {
    topic_id: string;
    title_ru: string;
    title_es: string;
    title_en: string;
    order_index: number;
    type: "material" | "test" | "terms";
    content_id?: string;
    is_required?: boolean;
  }) {
    const { data: result, error } = await supabase
      .from("subtopics")
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return result;
  },

  async update(id: string, data: Partial<Parameters<typeof subtopicApi.create>[0]>) {
    const { data: result, error } = await supabase
      .from("subtopics")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return result;
  },

  async delete(id: string) {
    const { error } = await supabase.from("subtopics").delete().eq("id", id);
    if (error) throw error;
  },

  async getByTopic(topicId: string) {
    const { data, error } = await supabase
      .from("subtopics")
      .select("*")
      .eq("topic_id", topicId)
      .order("order_index", { ascending: true });

    if (error) throw error;
    return data || [];
  },
};

/**
 * CRUD операции для материалов
 */
export const materialApi = {
  async create(data: {
    subtopic_id: string;
    title_ru: string;
    title_es: string;
    title_en: string;
    content?: Record<string, unknown> | null;
    type?: "theory" | "test" | "terms";
    is_published?: boolean;
    updated_by?: string | null;
  }) {
    const htmlPreview = data.content ? generateHTMLPreview(data.content) : "";

    // Initialize default TipTap content if not provided
    const defaultContent = data.content || {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: []
        }
      ]
    };

    const { data: result, error } = await supabase
      .from("materials")
      .insert({
        subtopic_id: data.subtopic_id,
        title_ru: data.title_ru,
        title_es: data.title_es,
        title_en: data.title_en,
        content: defaultContent,
        html_preview: htmlPreview,
        type: data.type || "theory",
        is_published: data.is_published || false,
        version: 1,
        updated_by: data.updated_by || null,
        // Legacy fields - set to empty strings for backward compatibility
        content_ru: "",
        content_es: "",
        content_en: "",
      })
      .select()
      .single();

    if (error) throw error;

    // Сохраняем первую версию (даже если контент пустой)
    if (data.updated_by) {
      try {
        await saveMaterialVersion(result.id, defaultContent, data.updated_by);
      } catch (versionError) {
        console.warn("Failed to save initial version:", versionError);
        // Не прерываем создание материала, если не удалось сохранить версию
      }
    }

    return result;
  },

  async update(
    id: string,
    data: {
      title_ru?: string;
      title_es?: string;
      title_en?: string;
      content?: string; // HTML content from TinyMCE
      html_preview?: string;
      type?: "theory" | "test" | "terms";
      is_published?: boolean;
      updated_by?: string | null;
    }
  ) {
    // Если content это HTML строка, используем его напрямую
    // Если это объект (старый формат TipTap JSON), конвертируем в HTML
    let htmlContent = data.content;
    let htmlPreview = data.html_preview;

    if (data.content) {
      // Если content это строка (HTML), используем напрямую
      if (typeof data.content === 'string') {
        htmlContent = data.content;
        htmlPreview = data.content; // Для TinyMCE HTML и preview одинаковые
      } else {
        // Если это объект (старый формат TipTap), конвертируем в HTML
        htmlPreview = generateHTMLPreview(data.content);
        // Сохраняем JSON в content для обратной совместимости
        htmlContent = data.content;
      }
    }

    // Получаем текущую версию
    const { data: current } = await supabase
      .from("materials")
      .select("version")
      .eq("id", id)
      .single();

    const newVersion = (current?.version || 0) + 1;

    // Обновляем материал
    // content может быть строкой (HTML) или объектом (JSON для обратной совместимости)
    const updateData: Record<string, unknown> = {
      ...data,
      html_preview: htmlPreview,
      version: newVersion,
      updated_at: new Date().toISOString(),
    };

    // Если content это HTML строка, сохраняем её в content как JSON с полем html
    if (typeof data.content === 'string') {
      updateData.content = { html: data.content };
    } else if (data.content) {
      updateData.content = data.content;
    }

    const { data: result, error } = await supabase
      .from("materials")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Сохраняем версию если контент изменился
    if (data.content && data.updated_by) {
      await saveMaterialVersion(id, updateData.content, data.updated_by);
    }

    return result;
  },

  async delete(id: string) {
    const { error } = await supabase.from("materials").delete().eq("id", id);
    if (error) throw error;
  },

  async publish(id: string) {
    const { data, error } = await supabase
      .from("materials")
      .update({ is_published: true })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async unpublish(id: string) {
    const { data, error } = await supabase
      .from("materials")
      .update({ is_published: false })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from("materials")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  async getBySubtopic(subtopicId: string) {
    const { data, error } = await supabase
      .from("materials")
      .select("*")
      .eq("subtopic_id", subtopicId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },
};

/**
 * Поиск терминов для автодополнения
 */
export async function searchTerms(query: string): Promise<Array<Record<string, unknown>>> {
  try {
    const { data, error } = await supabase
      .from("language_terms")
      .select("*")
      .or(
        `term_es.ilike.%${query}%,term_ru.ilike.%${query}%,description_es.ilike.%${query}%,description_ru.ilike.%${query}%`
      )
      .limit(20);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error searching terms:", error);
    return [];
  }
}

/**
 * Загрузка изображения в Supabase Storage
 */
export async function uploadImage(
  materialId: string,
  file: File
): Promise<string> {
  try {
    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `materials/images/${materialId}/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("materials")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("materials").getPublicUrl(filePath);

    return publicUrl;
  } catch (error: unknown) {
    console.error("Error uploading image:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Ошибка загрузки изображения: ${msg}`);
  }
}

/**
 * Удаление изображения из Supabase Storage
 */
export async function deleteImage(imageUrl: string): Promise<void> {
  try {
    // Extract path from URL
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split("/");
    const pathIndex = pathParts.findIndex((part) => part === "materials");
    if (pathIndex === -1) throw new Error("Invalid image URL");

    const filePath = pathParts.slice(pathIndex + 1).join("/");

    const { error } = await supabase.storage
      .from("materials")
      .remove([filePath]);

    if (error) throw error;
  } catch (error: unknown) {
    console.error("Error deleting image:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Ошибка удаления изображения: ${msg}`);
  }
}

