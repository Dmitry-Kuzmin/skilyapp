import { useState, useEffect } from 'react';

export interface TestSettings {
    voiceOver: boolean;
    setVoiceOver: (value: boolean) => void;
    answerPopularity: boolean;
    setAnswerPopularity: (value: boolean) => void;
    ambientMusic: boolean;
    setAmbientMusic: (value: boolean) => void;
    fontSize: number;
    setFontSize: (value: number) => void;
}

export const useTestSettings = (): TestSettings => {
    const [voiceOver, setVoiceOver] = useState(() => {
        if (typeof window === 'undefined') return false;
        const saved = localStorage.getItem('test-voice-over');
        return saved ? saved === 'true' : false; // По умолчанию ВЫКЛЮЧЕНА
    });

    const [answerPopularity, setAnswerPopularity] = useState(() => {
        if (typeof window === 'undefined') return true;
        const saved = localStorage.getItem('test-answer-popularity');
        return saved ? saved === 'true' : true;
    });

    const [ambientMusic, setAmbientMusic] = useState(() => {
        if (typeof window === 'undefined') return false;
        const saved = localStorage.getItem('test-ambient-music');
        return saved ? saved === 'true' : false; // По умолчанию выключено
    });

    const [fontSize, setFontSize] = useState(() => {
        if (typeof window === 'undefined') return 1;
        const saved = localStorage.getItem('test-font-size');
        return saved ? parseInt(saved) : 1; // 0=small, 1=medium, 2=large
    });

    useEffect(() => {
        localStorage.setItem('test-voice-over', String(voiceOver));
    }, [voiceOver]);

    useEffect(() => {
        localStorage.setItem('test-answer-popularity', String(answerPopularity));
    }, [answerPopularity]);

    useEffect(() => {
        localStorage.setItem('test-ambient-music', String(ambientMusic));
    }, [ambientMusic]);

    useEffect(() => {
        localStorage.setItem('test-font-size', String(fontSize));
    }, [fontSize]);

    return {
        voiceOver, setVoiceOver,
        answerPopularity, setAnswerPopularity,
        ambientMusic, setAmbientMusic,
        fontSize, setFontSize,
    };
};
