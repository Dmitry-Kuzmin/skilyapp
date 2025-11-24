import { useState, useEffect } from 'react';

export function useDuelSettings() {
  const [voiceOver, setVoiceOver] = useState(() => {
    const saved = localStorage.getItem('duel-voice-over');
    return saved === 'true';
  });

  const [ambientMusic, setAmbientMusic] = useState(() => {
    const saved = localStorage.getItem('duel-ambient-music');
    return saved === 'true';
  });

  const [fontSize, setFontSize] = useState<number>(() => {
    const saved = localStorage.getItem('duel-font-size');
    return saved ? parseInt(saved) : 1; // 0 = small, 1 = default, 2 = large
  });

  // ОПТИМИЗАЦИЯ: Объединяем сохранение настроек в один useEffect
  useEffect(() => {
    localStorage.setItem('duel-voice-over', String(voiceOver));
    localStorage.setItem('duel-ambient-music', String(ambientMusic));
    localStorage.setItem('duel-font-size', String(fontSize));
  }, [voiceOver, ambientMusic, fontSize]);

  return {
    voiceOver,
    setVoiceOver,
    ambientMusic,
    setAmbientMusic,
    fontSize,
    setFontSize,
  };
}

