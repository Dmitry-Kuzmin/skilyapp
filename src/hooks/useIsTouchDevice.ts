
import { useEffect, useState } from 'react';

export function useIsTouchDevice() {
    const [isTouch, setIsTouch] = useState(false);

    useEffect(() => {
        // Media Query Level 4: (pointer: coarse) - основной признак сенсорного экрана
        // Также проверяем max-width, чтобы не задеть ноутбуки с тачскринами, но с мышкой
        const checkTouch = () => {
            const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
            const isMobileWidth = window.innerWidth < 1024; // iPad Pro и меньше

            // Считаем устройство "сенсорным" (нуждающимся в отдельной странице),
            // если у него грубый указатель (палец) ИЛИ это явно мобильная ширина
            setIsTouch(isCoarsePointer || isMobileWidth);
        };

        checkTouch();
        window.addEventListener('resize', checkTouch);
        return () => window.removeEventListener('resize', checkTouch);
    }, []);

    return isTouch;
}
