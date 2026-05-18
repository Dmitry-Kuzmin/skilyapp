/**
 * question-image-store.js
 *
 * Single source of truth for image lifecycle in `dgt-images` bucket + `questions_new` DB.
 *
 * Lifecycle:
 *   generated → uploaded by sync from local data/generated-images, stored at `generated/{testId}/{uuid}.webp`
 *   approved  → manually approved via Mission Control, stored at `approved/{testId}/{uuid}_{timestamp}.webp`
 *
 * Approved images are PROTECTED: deployTestToDb / Sync All never overwrites them.
 *
 * All paths are computed here. Do not duplicate path logic elsewhere.
 */

import { processImageForUpload } from './image-processor.js';

const BUCKET = 'dgt-images';

// ---------------------------------------------------------------------------
// Path helpers (pure)
// ---------------------------------------------------------------------------

export function generatedStoragePath(testId, questionId, ext = 'webp') {
    return `generated/${testId}/${questionId}.${ext}`;
}

export function approvedStoragePath(testId, questionId) {
    return `approved/${testId}/${questionId}_${Date.now()}.webp`;
}

/**
 * Extract the storage object key from a Supabase public URL.
 * Returns null if URL doesn't belong to our bucket.
 *
 * Input:  https://xxx.supabase.co/storage/v1/object/public/dgt-images/approved/topic-01_test-001/UUID_123.webp
 * Output: approved/topic-01_test-001/UUID_123.webp
 */
export function extractStorageKey(publicUrl) {
    if (!publicUrl || typeof publicUrl !== 'string') return null;
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return null;
    const key = publicUrl.slice(idx + marker.length).split('?')[0];
    return key || null;
}

// ---------------------------------------------------------------------------
// Storage operations
// ---------------------------------------------------------------------------

/**
 * Upload a processed image buffer to Storage and return the public URL.
 */
async function uploadBuffer(supabase, storagePath, buffer, { upsert = false } = {}) {
    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, buffer, {
            contentType: 'image/webp',
            upsert
        });
    if (error) throw error;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    return data.publicUrl;
}

/**
 * Delete an old image from Storage given its public URL.
 * Logs a warning on failure; never throws (cleanup is best-effort).
 */
export async function deleteByPublicUrl(supabase, publicUrl) {
    const key = extractStorageKey(publicUrl);
    if (!key) return false;
    try {
        const { error } = await supabase.storage.from(BUCKET).remove([key]);
        if (error) {
            console.warn(`[image-store] Failed to remove ${key}: ${error.message}`);
            return false;
        }
        return true;
    } catch (e) {
        console.warn(`[image-store] Exception removing ${key}: ${e.message}`);
        return false;
    }
}

// ---------------------------------------------------------------------------
// High-level operations
// ---------------------------------------------------------------------------

/**
 * Upload a generated image (auto-pipeline, no watermark/processing changes).
 * Overwrites previous generated image at the same path (upsert: true).
 */
export async function uploadGeneratedImage(supabase, { buffer, questionId, testId, question }) {
    const processed = await processImageForUpload(buffer, question, testId);
    const storagePath = generatedStoragePath(testId, questionId);
    return uploadBuffer(supabase, storagePath, processed, { upsert: true });
}

/**
 * Upload a manually-approved image. Each approval gets a unique timestamped path,
 * so CDN never serves a stale version.
 */
export async function uploadApprovedImage(supabase, { buffer, questionId, testId, question }) {
    const processed = await processImageForUpload(buffer, question, testId);
    const storagePath = approvedStoragePath(testId, questionId);
    return uploadBuffer(supabase, storagePath, processed, { upsert: false });
}

// ---------------------------------------------------------------------------
// DB operations
// ---------------------------------------------------------------------------

/**
 * Read current image state for a question.
 * Returns { exists, image_url, image_status } — or { exists: false } if not in DB.
 */
export async function getImageState(supabase, questionId, table = 'questions_new') {
    const { data, error } = await supabase
        .from(table)
        .select('id, image_url, image_status')
        .eq('id', questionId)
        .maybeSingle();
    if (error) throw error;
    if (!data) return { exists: false };
    return {
        exists: true,
        image_url: data.image_url,
        image_status: data.image_status
    };
}

/**
 * Should a sync overwrite this question's image?
 * Approved images are protected.
 */
export function shouldOverwriteImage(currentState) {
    if (!currentState.exists) return true;
    if (currentState.image_status === 'approved') return false;
    return true;
}
