import { useEffect } from 'react';

interface TestUIEffectsParams {
    showQuestionMap: boolean;
    setShowQuestionMap: (show: boolean) => void;
    currentIndex: number;
    questionsCount: number;
    handleCloseModal: () => void;
    isClosing: boolean;
    isClosingRef: React.MutableRefObject<boolean>;
}

export const useTestUIEffects = ({
    showQuestionMap,
    setShowQuestionMap,
    currentIndex,
    questionsCount,
    handleCloseModal,
    isClosing,
    isClosingRef
}: TestUIEffectsParams) => {
    // 1. Body Scroll Lock when Modal is open
    useEffect(() => {
        if (showQuestionMap) {
            const scrollY = window.scrollY;
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
            document.body.style.left = '0';
            document.body.style.right = '0';
            document.body.setAttribute('data-scroll-y', scrollY.toString());
        } else {
            const scrollY = document.body.getAttribute('data-scroll-y');
            document.body.removeAttribute('data-scroll-y');
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.left = '';
            document.body.style.right = '';

            if (scrollY) {
                window.scrollTo(0, parseInt(scrollY, 10));
            }
        }

        return () => {
            const scrollY = document.body.getAttribute('data-scroll-y');
            document.body.removeAttribute('data-scroll-y');
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.left = '';
            document.body.style.right = '';
            if (scrollY) {
                window.scrollTo(0, parseInt(scrollY, 10));
            }
        };
    }, [showQuestionMap]);

    // 2. Scroll to Top on question change
    useEffect(() => {
        if (questionsCount > 0 && currentIndex >= 0) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [currentIndex, questionsCount]);

    // 3. Escape key to close modal
    useEffect(() => {
        if (!showQuestionMap) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isClosingRef.current && !isClosing) {
                handleCloseModal();
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [showQuestionMap, isClosing, handleCloseModal, isClosingRef]);
};
