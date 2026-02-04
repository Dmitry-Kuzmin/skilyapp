import React from 'react';
import { motion } from 'framer-motion';
import { DuelQuestionCard } from '../../DuelQuestionCard';
import { useDuelStore } from '@/store/duelStore';

interface ArenaPlaygroundProps {
    currentIndex: number;
    screenShake: boolean;
    currentQuestion: any;
    selectedAnswer: string | null;
    isAnswered: boolean;
    eliminatedOptions: string[];
    translationLanguage: any;
    onAnswer: (optionId: string) => void;
    activeExploits: Map<string, any>;
    cryptolockerActive: boolean;
}

export const ArenaPlayground: React.FC<ArenaPlaygroundProps> = ({
    currentIndex,
    screenShake,
    currentQuestion,
    selectedAnswer,
    isAnswered,
    eliminatedOptions,
    translationLanguage,
    onAnswer,
    activeExploits,
    cryptolockerActive
}) => {
    return (
        <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{
                opacity: 1,
                x: screenShake ? [0, -10, 10, -10, 10, 0] : 0,
                y: screenShake ? [0, -5, 5, -5, 5, 0] : 0,
            }}
            exit={{ opacity: 0, x: -50 }}
            transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
                ...(screenShake ? { duration: 0.5, ease: "easeOut" } : {})
            }}
            className="flex flex-col relative mt-2"
        >
            <DuelQuestionCard
                question={currentQuestion}
                selectedAnswer={selectedAnswer}
                isAnswered={isAnswered}
                eliminatedOptions={eliminatedOptions}
                translationLanguage={translationLanguage}
                onAnswer={onAnswer}
                inputLagActive={!!activeExploits.get('input_lag') && !activeExploits.get('input_lag')?.passed}
                inputLagDelay={1500}
                cryptolockerActive={cryptolockerActive}
            />
        </motion.div>
    );
};
