import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSettingsStore } from '@/stores/useSettingsStore';

const FALLBACK_PLAYLIST = [
    'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3',
    'https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3',
];

const MAX_RETRIES = 3;
const MAX_TRACK_DURATION = 15 * 60 * 1000; // Increased to 15 minutes for long ambient tracks

export const useTestAmbientMusic = (enabled: boolean) => {
    const selectedTrackName = useSettingsStore(state => state.selectedMusicTrack);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const playlistRef = useRef<string[]>([]);
    const trackNamesRef = useRef<string[]>([]);
    const currentTrackIndexRef = useRef(0);
    const unlockAttemptedRef = useRef(false);

    useEffect(() => {
        if (!enabled) {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
                audioRef.current = null;
            }
            return;
        }

        const failedTracks = new Set<number>();
        let trackTimeout: NodeJS.Timeout | null = null;
        let handleEndedRef: (() => void) | null = null;
        let handleErrorRef: (() => void) | null = null;

        const loadPlaylist = async (): Promise<{ urls: string[], names: string[] }> => {
            try {
                console.log('[Ambient Music] Загрузка плейлиста из Supabase Storage...');

                const { data, error } = await supabase.storage
                    .from('ambient-music')
                    .list('', {
                        limit: 100,
                        sortBy: { column: 'name', order: 'asc' }
                    });

                if (error || !data || data.length === 0) {
                    return { urls: FALLBACK_PLAYLIST, names: FALLBACK_PLAYLIST.map((_, i) => `Fallback ${i + 1}`) };
                }

                const audioFiles = data.filter(file =>
                    file.name.endsWith('.mp3') ||
                    file.name.endsWith('.wav') ||
                    file.name.endsWith('.ogg')
                );

                if (audioFiles.length === 0) {
                    return { urls: FALLBACK_PLAYLIST, names: FALLBACK_PLAYLIST.map((_, i) => `Fallback ${i + 1}`) };
                }

                const names: string[] = [];
                const urls = audioFiles.map(file => {
                    names.push(file.name);
                    const { data: { publicUrl } } = supabase.storage
                        .from('ambient-music')
                        .getPublicUrl(file.name);
                    return publicUrl;
                });

                return { urls, names };
            } catch (error) {
                return { urls: FALLBACK_PLAYLIST, names: FALLBACK_PLAYLIST.map((_, i) => `Fallback ${i + 1}`) };
            }
        };

        const playTrack = async (index: number) => {
            if (!audioRef.current || playlistRef.current.length === 0) return;

            // Если выбран конкретный трек, ищем его
            let targetIndex = index;
            if (selectedTrackName) {
                const foundIndex = trackNamesRef.current.indexOf(selectedTrackName);
                if (foundIndex !== -1) {
                    targetIndex = foundIndex;
                } else {
                    // Трек не найден, используем первый трек
                    console.warn(`[Ambient Music] ⚠️ Selected track "${selectedTrackName}" not found, using first track`);
                    targetIndex = 0;
                }
            }

            // Проверка на неудачные треки только если НЕ выбран конкретный трек
            if (!selectedTrackName && failedTracks.has(targetIndex) && failedTracks.size < playlistRef.current.length) {
                nextTrack();
                return;
            }

            try {
                audioRef.current.src = playlistRef.current[targetIndex];
                currentTrackIndexRef.current = targetIndex;

                const playPromise = audioRef.current.play();
                if (playPromise !== undefined) {
                    await playPromise;
                    unlockAttemptedRef.current = true;

                    if (trackTimeout) clearTimeout(trackTimeout);

                    const duration = Math.max(audioRef.current.duration * 1000 || 0, MAX_TRACK_DURATION);
                    trackTimeout = setTimeout(() => {
                        if (audioRef.current && !audioRef.current.ended) {
                            nextTrack();
                        }
                    }, duration);

                    console.log(`[Ambient Music] ✅ Playing: ${trackNamesRef.current[targetIndex]}`);
                }
            } catch (error) {
                failedTracks.add(targetIndex);
                setTimeout(nextTrack, 1000);
            }
        };

        const nextTrack = () => {
            if (selectedTrackName) {
                // Если выбран конкретный трек, просто играем его по кругу
                playTrack(currentTrackIndexRef.current);
                return;
            }
            currentTrackIndexRef.current = (currentTrackIndexRef.current + 1) % playlistRef.current.length;
            playTrack(currentTrackIndexRef.current);
        };

        const initPlayer = async () => {
            const { urls, names } = await loadPlaylist();
            playlistRef.current = urls;
            trackNamesRef.current = names;

            if (!audioRef.current) {
                audioRef.current = new Audio();
                audioRef.current.volume = 0.15;
            }

            handleEndedRef = nextTrack;
            handleErrorRef = () => setTimeout(nextTrack, 1000);

            audioRef.current.addEventListener('ended', handleEndedRef);
            audioRef.current.addEventListener('error', handleErrorRef);

            playTrack(0);

            const unlockAudio = () => {
                if (audioRef.current && !unlockAttemptedRef.current) {
                    audioRef.current.play().catch(() => { });
                    unlockAttemptedRef.current = true;
                }
            };

            document.addEventListener('click', unlockAudio, { once: true });
        };

        initPlayer();

        return () => {
            if (trackTimeout) clearTimeout(trackTimeout);
            if (audioRef.current) {
                if (handleEndedRef) audioRef.current.removeEventListener('ended', handleEndedRef);
                if (handleErrorRef) audioRef.current.removeEventListener('error', handleErrorRef);
                audioRef.current.pause();
                audioRef.current.src = '';
                audioRef.current = null;
            }
        };
    }, [enabled, selectedTrackName]);
};
