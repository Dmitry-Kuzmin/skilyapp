/**
 * ========================================
 * БИБЛИОТЕКА ИСПАНСКИХ ДОРОЖНЫХ ЗНАКОВ DGT
 * ========================================
 * Официальные коды и описания для корректной генерации
 */

export const DGT_SIGNS = {
    // SEÑALES DE PELIGRO (Предупреждающие - треугольник красный)
    P1: { code: 'P-1', name: 'Intersección con prioridad', emoji: '⚠️', shape: 'triangle_red' },
    P2: { code: 'P-2', name: 'Intersección con prioridad sobre vía a la derecha', emoji: '⚠️', shape: 'triangle_red' },
    P3: { code: 'P-3', name: 'Intersección con prioridad sobre vía a la izquierda', emoji: '⚠️', shape: 'triangle_red' },
    P4: { code: 'P-4', name: 'Intersección con circulación giratoria', emoji: '⚠️', shape: 'triangle_red' },
    P5: { code: 'P-5', name: 'Semáforos', emoji: '🚦', shape: 'triangle_red' },
    P6: { code: 'P-6', name: 'Paso de tranvía', emoji: '🚋', shape: 'triangle_red' },
    P7: { code: 'P-7', name: 'Paso a nivel con barreras', emoji: '🚧', shape: 'triangle_red' },
    P8: { code: 'P-8', name: 'Paso a nivel sin barreras', emoji: '🚂', shape: 'triangle_red' },
    P9: { code: 'P-9', name: 'Proximidad de paso a nivel', emoji: '⚠️', shape: 'triangle_red' },
    P10: { code: 'P-10', name: 'Curva peligrosa a la derecha', emoji: '↪️', shape: 'triangle_red' },
    P11: { code: 'P-11', name: 'Curva peligrosa a la izquierda', emoji: '↩️', shape: 'triangle_red' },
    P12: { code: 'P-12', name: 'Curvas peligrosas hacia la derecha', emoji: '〰️', shape: 'triangle_red' },
    P13: { code: 'P-13', name: 'Resalto o badén', emoji: '⛰️', shape: 'triangle_red' },
    P14: { code: 'P-14', name: 'Calzada deteriorada', emoji: '🕳️', shape: 'triangle_red' },
    P15: { code: 'P-15', name: 'Estrechamiento de calzada', emoji: '⬅️➡️', shape: 'triangle_red' },
    P16: { code: 'P-16', name: 'Obras', emoji: '🚧', shape: 'triangle_red' },
    P17: { code: 'P-17', name: 'Peligro no especificado', emoji: '❗', shape: 'triangle_red' },
    P18: { code: 'P-18', name: 'Ciclistas', emoji: '🚴', shape: 'triangle_red' },
    P19: { code: 'P-19', name: 'Paso de peatones', emoji: '🚶', shape: 'triangle_red' },
    P20: { code: 'P-20', name: 'Niños', emoji: '👦', shape: 'triangle_red' },
    P21: { code: 'P-21', name: 'Animales domésticos', emoji: '🐄', shape: 'triangle_red' },
    P22: { code: 'P-22', name: 'Animales en libertad', emoji: '🦌', shape: 'triangle_red' },
    P23: { code: 'P-23', name: 'Bajada con fuerte pendiente', emoji: '⬇️', shape: 'triangle_red' },
    P24: { code: 'P-24', name: 'Subida con fuerte pendiente', emoji: '⬆️', shape: 'triangle_red' },

    // SEÑALES DE PROHIBICIÓN (Запрещающие - круг красный)
    R1: { code: 'R-1', name: 'STOP', emoji: '🛑', shape: 'octagon_red' },
    R2: { code: 'R-2', name: 'Ceda el paso', emoji: '▼', shape: 'inverted_triangle' },
    R100: { code: 'R-100', name: 'Prohibido el paso', emoji: '⛔', shape: 'circle_red' },
    R101: { code: 'R-101', name: 'Entrada prohibida', emoji: '🚫', shape: 'circle_red' },
    R102: { code: 'R-102', name: 'Circulación prohibida', emoji: '⛔', shape: 'circle_red' },
    R103: { code: 'R-103', name: 'Prohibido a los vehículos de motor', emoji: '🚗', shape: 'circle_red' },
    R104: { code: 'R-104', name: 'Prohibido motocicletas', emoji: '🏍️', shape: 'circle_red' },
    R105: { code: 'R-105', name: 'Prohibido ciclomotores', emoji: '🛵', shape: 'circle_red' },
    R106: { code: 'R-106', name: 'Prohibido ciclos', emoji: '🚲', shape: 'circle_red' },
    R107: { code: 'R-107', name: 'Prohibido vehículos de tracción animal', emoji: '🐴', shape: 'circle_red' },
    R108: { code: 'R-108', name: 'Prohibido vehículos con remolque', emoji: '🚛', shape: 'circle_red' },
    R109: { code: 'R-109', name: 'Prohibido peatones', emoji: '🚷', shape: 'circle_red' },

    // SEÑALES DE OBLIGACIÓN (Обязательные - круг синий)
    R400: { code: 'R-400', name: 'Sentido obligatorio', emoji: '➡️', shape: 'circle_blue' },
    R401: { code: 'R-401', name: 'Dirección obligatoria a la derecha', emoji: '↗️', shape: 'circle_blue' },
    R402: { code: 'R-402', name: 'Dirección obligatoria a la izquierda', emoji: '↖️', shape: 'circle_blue' },
    R403: { code: 'R-403', name: 'Glorieta obligatoria', emoji: '🔄', shape: 'circle_blue' },
    R404: { code: 'R-404', name: 'Paso obligatorio (derecha)', emoji: '➡️', shape: 'circle_blue' },
    R405: { code: 'R-405', name: 'Paso obligatorio (izquierda)', emoji: '⬅️', shape: 'circle_blue' },

    // SEÑALES DE INDICACIÓN (Информационные - прямоугольник синий)
    S1: { code: 'S-1', name: 'Autopista', emoji: '🛣️', shape: 'square_blue' },
    S2: { code: 'S-2', name: 'Autovía', emoji: '🛣️', shape: 'square_blue' },
    S13: { code: 'S-13', name: 'Vía para automóviles', emoji: '🚗', shape: 'square_blue' },
    S14: { code: 'S-14', name: 'Túnel', emoji: '🚇', shape: 'square_blue' },
    S17: { code: 'S-17', name: 'Estacionamiento', emoji: '🅿️', shape: 'square_blue' },
    S18: { code: 'S-18', name: 'Hospital', emoji: '🏥', shape: 'square_blue' },
};

/**
 * Определяет тип знака по коду и возвращает детальное описание для AI
 */
export function getSignDescription(signCode) {
    const sign = Object.values(DGT_SIGNS).find(s => s.code === signCode);

    if (!sign) return null;

    const descriptions = {
        triangle_red: 'Red border equilateral triangle (pointing up) with white background',
        octagon_red: 'Red octagon with white letters STOP',
        inverted_triangle: 'Red border inverted (pointing down) triangle with white background',
        circle_red: 'Red circle with white background',
        circle_blue: 'Blue circle with white symbol',
        square_blue: 'Blue rectangular sign with white symbols/text'
    };

    return {
        code: sign.code,
        name: sign.name,
        emoji: sign.emoji,
        shapeDescription: descriptions[sign.shape],
        officialShape: sign.shape
    };
}

/**
 * Генерирует промпт для знака с учётом официального дизайна DGT
 */
export function generateSignPrompt(signCode) {
    const sign = getSignDescription(signCode);
    if (!sign) return '';

    return `Spanish DGT road sign ${sign.code} "${sign.name}": ${sign.shapeDescription}. Must be pixel-perfect according to Spanish traffic regulations.`;
}
