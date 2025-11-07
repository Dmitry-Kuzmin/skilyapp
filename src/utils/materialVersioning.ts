import { supabase } from "@/integrations/supabase/client";
import { generateHTMLPreview } from "./editor";

export interface MaterialVersion {
  id: string;
  material_id: string;
  content: any;
  html_preview: string;
  version: number;
  updated_by: string | null;
  created_at: string;
}

/**
 * Сохраняет версию материала
 */
export async function saveMaterialVersion(
  materialId: string,
  content: any,
  userId: string | null
): Promise<MaterialVersion | null> {
  try {
    // Генерируем HTML preview
    const htmlPreview = generateHTMLPreview(content);

    // Получаем текущую версию материала
    const { data: material } = await supabase
      .from("materials")
      .select("version")
      .eq("id", materialId)
      .single();

    const newVersion = (material?.version || 0) + 1;

    // Сохраняем версию
    const { data, error } = await supabase
      .from("material_versions")
      .insert({
        material_id: materialId,
        content,
        html_preview: htmlPreview,
        version: newVersion,
        updated_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    // Очищаем старые версии (оставляем только 3 последние)
    await cleanupOldVersions(materialId);

    return data;
  } catch (error) {
    console.error("Error saving material version:", error);
    return null;
  }
}

/**
 * Получает версии материала (последние 3)
 */
export async function getMaterialVersions(
  materialId: string
): Promise<MaterialVersion[]> {
  try {
    const { data, error } = await supabase
      .from("material_versions")
      .select("*")
      .eq("material_id", materialId)
      .order("version", { ascending: false })
      .limit(3);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error getting material versions:", error);
    return [];
  }
}

/**
 * Откатывает материал на указанную версию
 */
export async function revertToVersion(
  materialId: string,
  versionId: string,
  userId: string | null
): Promise<boolean> {
  try {
    // Получаем версию
    const { data: version, error: versionError } = await supabase
      .from("material_versions")
      .select("*")
      .eq("id", versionId)
      .single();

    if (versionError || !version) throw versionError;

    // Обновляем материал
    const { error: updateError } = await supabase
      .from("materials")
      .update({
        content: version.content,
        html_preview: version.html_preview,
        version: version.version,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", materialId);

    if (updateError) throw updateError;

    // Создаем новую версию с откатом
    await saveMaterialVersion(materialId, version.content, userId);

    return true;
  } catch (error) {
    console.error("Error reverting to version:", error);
    return false;
  }
}

/**
 * Удаляет старые версии, оставляя только 3 последние
 */
export async function cleanupOldVersions(materialId: string): Promise<void> {
  try {
    // Получаем все версии
    const { data: versions } = await supabase
      .from("material_versions")
      .select("id, version")
      .eq("material_id", materialId)
      .order("version", { ascending: false });

    if (!versions || versions.length <= 3) return;

    // Удаляем версии старше 3 последних
    const versionsToDelete = versions.slice(3);
    const idsToDelete = versionsToDelete.map((v) => v.id);

    if (idsToDelete.length > 0) {
      await supabase
        .from("material_versions")
        .delete()
        .in("id", idsToDelete);
    }
  } catch (error) {
    console.error("Error cleaning up old versions:", error);
  }
}

