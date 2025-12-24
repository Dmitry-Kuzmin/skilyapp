import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const FALLBACK_PLAYLIST = [
    'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3',
    'https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3',
];

const MAX_RETRIES = 3;
const MAX_TRACK_DURATION = 5 * 60 * 1000; // 5 minutes

export const useTestAmbientMusic = (enabled: boolean) => {
    useEffect(() => {
        if (!enabled) return;

        let audioElement: HTMLAudioElement | null = null;
        let unlockAttempted = false;
        let currentTrackIndex = 0;
        let retryCount = 0;
        let failedTracks = new Set<number>();
        let trackTimeout: NodeJS.Timeout | null = null;
        let handleEndedRef: (() => void) | null = null;
        let handleErrorRef: (() => void) | null = null;
        let handleTimeUpdateRef: (() => void) | null = null;
        let playlist: string[] = [];

        const loadPlaylist = async (): Promise<string[]> => {
            try {
                console.log('[Ambient Music] Загрузка плейлиста из Supabase Storage...');

                const { data, error } = await supabase.storage
                    .from('ambient-music')
                    .list('', {
                        limit: 100,
                        sortBy: { column: 'name', order: 'asc' }
                    });

                if (error || !data || data.length === 0) {
                    console.warn('[Ambient Music] ⚠️ Ошибка или пустой bucket, используем fallback');
                    return FALLBACK_PLAYLIST;
                }

                const audioFiles = data.filter(file =>
                    file.name.endsWith('.mp3') ||
                    file.name.endsWith('.wav') ||
                    file.name.endsWith('.ogg')
                );

                if (audioFiles.length === 0) {
                    console.warn('[Ambient Music] ⚠️ Нет аудио файлов, используем fallback');
                    return FALLBACK_PLAYLIST;
                }

                const urls = audioFiles.map(file => {
                    const { data: { publicUrl } } = supabase.storage
                        .from('ambient-music')
                        .getPublicUrl(file.name);
                    return publicUrl;
                });

                console.log(`[Ambient Music] ✅ Плейлист загружен: ${urls.length} треков`);
                return urls;
            } catch (error) {
                console.error('[Ambient Music] ❌ Критическая ошибка:', error);
                return FALLBACK_PLAYLIST;
            }
        };

        const initPlayer = async () => {
            playlist = await loadPlaylist();
            if (playlist.length === 0) return;

            audioElement = new Audio();
            audioElement.volume = 0.10;
            audioElement.preload = "auto";
            audioElement.loop = false;

            const playTrack = async (index: number, retry: number = 0) => {
                if (!audioElement) return;

                if (failedTracks.has(index) && failedTracks.size < playlist.length) {
                    nextTrack();
                    return;
                }

                try {
                    audioElement.src = playlist[index];

                    await new Promise<void>((resolve, reject) => {
                        const onLoadedMetadata = () => {
                            audioElement?.removeEventListener('loadedmetadata', onLoadedMetadata);
                            audioElement?.removeEventListener('error', onError);
                            resolve();
                        };
                        const onError = (e: Event) => {
                            audioElement?.removeEventListener('loadedmetadata', onLoadedMetadata);
                            audioElement?.removeEventListener('error', onError);
                            reject(e);
                        };

                        audioElement!.addEventListener('loadedmetadata', onLoadedMetadata);
                        audioElement!.addEventListener('error', onError);

                        setTimeout(() => {
                            audioElement?.removeEventListener('loadedmetadata', onLoadedMetadata);
                            audioElement?.removeEventListener('error', onError);
                            reject(new Error('Timeout loading track'));
                        }, 5000);
                    });

                    const playPromise = audioElement.play();
                    if (playPromise !== undefined) {
                        await playPromise;
                        unlockAttempted = true;
                        retryCount = 0;

                        if (trackTimeout) {
                            clearTimeout(trackTimeout);
                            trackTimeout = null;
                        }

                        const duration = audioElement.duration * 1000 || MAX_TRACK_DURATION;
                        const switchTime = Math.min(duration, MAX_TRACK_DURATION);

                        trackTimeout = setTimeout(() => {
                            console.log(`[Ambient Music] ⏰ Принудительное переключение трека ${index}`);
                            if (audioElement && !audioElement.ended) {
                                nextTrack();
                            }
                        }, switchTime);

                        console.log(`[Ambient Music] ✅ Трек ${index} воспроизводится`);
                    }
                } catch (error: any) {
                    console.warn(`[Ambient Music] ⚠️ Ошибка трека ${index}:`, error);
                    failedTracks.add(index);

                    if (failedTracks.size >= playlist.length) {
                        failedTracks.clear();
                        retryCount++;
                        if (retryCount < MAX_RETRIES) {
                            setTimeout(() => {
                                currentTrackIndex = Math.floor(Math.random() * playlist.length);
                                playTrack(currentTrackIndex, retryCount);
                            }, 2000);
                        }
                        return;
                    }

                    if (retry < MAX_RETRIES) {
                        setTimeout(() => nextTrack(), 500);
                    }
                }
            };

            const nextTrack = () => {
                if (!audioElement) return;

                const workingTracks = playlist
                    .map((_, index) => index)
                    .filter(index => !failedTracks.has(index));

                if (workingTracks.length === 0) {
                    failedTracks.clear();
                    currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
                    playTrack(currentTrackIndex);
                    return;
                }

                if (workingTracks.length === 1) {
                    currentTrackIndex = workingTracks[0];
                    playTrack(currentTrackIndex);
                    return;
                }

                const currentIndexInWorking = workingTracks.indexOf(currentTrackIndex);
                let nextIndexInWorking = currentIndexInWorking + 1;

                if (currentIndexInWorking === -1 || nextIndexInWorking >= workingTracks.length) {
                    nextIndexInWorking = 0;
                }

                currentTrackIndex = workingTracks[nextIndexInWorking];
                playTrack(currentTrackIndex);
            };

            handleEndedRef = () => {
                if (!audioElement) return;
                if (trackTimeout) {
                    clearTimeout(trackTimeout);
                    trackTimeout = null;
                }
                console.log('[Ambient Music] 🎵 Трек закончился, следующий...');
                nextTrack();
            };

            handleTimeUpdateRef = () => {
                if (!audioElement) return;
                if (audioElement.duration && audioElement.currentTime >= audioElement.duration - 1) {
                    console.log('[Ambient Music] ⏱️ Трек почти закончился');
                }
            };

            handleErrorRef = () => {
                if (!audioElement) return;
                console.warn('[Ambient Music] Ошибка воспроизведения');
                failedTracks.add(currentTrackIndex);
                nextTrack();
            };

            audioElement.addEventListener('ended', handleEndedRef);
            audioElement.addEventListener('error', handleErrorRef);
            audioElement.addEventListener('timeupdate', handleTimeUpdateRef);

            playTrack(currentTrackIndex);

            if (typeof document === 'undefined') return;

            const unlockAudio = () => {
                if (audioElement && !unlockAttempted) {
                    playTrack(currentTrackIndex);
                    document.removeEventListener('click', unlockAudio);
                    document.removeEventListener('keydown', unlockAudio);
                    document.removeEventListener('touchstart', unlockAudio);
                }
            };

            document.addEventListener('click', unlockAudio, { once: true });
            document.addEventListener('keydown', unlockAudio, { once: true });
            document.addEventListener('touchstart', unlockAudio, { once: true });
        };

        initPlayer();

        return () => {
            if (trackTimeout) {
                clearTimeout(trackTimeout);
                trackTimeout = null;
            }

            if (audioElement) {
                if (handleEndedRef) audioElement.removeEventListener('ended', handleEndedRef);
                if (handleErrorRef) audioElement.removeEventListener('error', handleErrorRef);
                if (handleTimeUpdateRef) audioElement.removeEventListener('timeupdate', handleTimeUpdateRef);
                audioElement.pause();
                audioElement.src = '';
                audioElement = null;
            }
        };
    }, [enabled]);
};
