type PremiumContext = {
    isPremium: boolean;
    hasUsedTrial: boolean;
};

type LanguageCode = 'ru' | 'es' | 'en';

export function buildWidgetRules(language: LanguageCode): string {
    if (language === 'ru') {
        return `
- **ИНТЕРАКТИВНЫЕ ВИДЖЕТЫ (ОБЯЗАТЕЛЬНО):**
  - Если нужен trial-CTA, используй точно так: [WIDGET:CTA:TRIAL:3 дня Premium бесплатно]
  - Если нужен CTA для тарифа, используй точно так: [WIDGET:CTA:PREMIUM:Открыть тарифы]
  (Не пиши "Тэг:" или "Tag:", пиши именно сам код в квадратных скобках на новой строке)
`;
    }

    if (language === 'es') {
        return `
- **WIDGETS INTERACTIVOS (OBLIGATORIO):**
  - Si hace falta un trial CTA, usa exactamente: [WIDGET:CTA:TRIAL:3 días Premium gratis]
  - Si hace falta un CTA de planes, usa exactamente: [WIDGET:CTA:PREMIUM:Abrir planes]
  (No escribas "Tag:" ni "Etiqueta:", usa exactamente el código entre corchetes en una nueva línea)
`;
    }

    return `
- **INTERACTIVE WIDGETS (REQUIRED):**
  - If you need a trial CTA, use exactly: [WIDGET:CTA:TRIAL:3-day Premium trial]
  - If you need a plan CTA, use exactly: [WIDGET:CTA:PREMIUM:Open plans]
  (Do not write "Tag:" or "Label:", write the exact bracket code on its own line)
`;
}

export function buildPremiumRules(language: LanguageCode, premiumContext?: PremiumContext): string {
    const premiumStatusLine = premiumContext?.isPremium
        ? (language === 'ru'
            ? '- У пользователя уже активен Premium. Не предлагай покупку.'
            : language === 'es'
                ? '- El usuario ya tiene Premium. No ofrezcas compra.'
                : '- The user already has Premium. Do not offer a purchase.')
        : premiumContext?.hasUsedTrial
            ? (language === 'ru'
                ? '- Trial уже использован. Если речь о Premium, предлагай оплату картой или криптой и показывай тарифы.'
                : language === 'es'
                    ? '- El trial ya se usó. Si se habla de Premium, ofrece pago con tarjeta o cripto y muestra los planes.'
                    : '- The trial has already been used. If the user asks about Premium, offer card or crypto payment and show the plan widget.')
            : (language === 'ru'
                ? '- Trial доступен только один раз. Если речь о Premium, сначала предложи 3-дневный trial и покажи виджет trial.'
                : language === 'es'
                    ? '- El trial solo está disponible una vez. Si se habla de Premium, ofrece primero el trial de 3 días y muestra el widget del trial.'
                    : '- The trial is available only once. If the user asks about Premium, offer the 3-day trial first and show the trial widget.');

    if (language === 'ru') {
        return `
- **PREMIUM / TRIAL:** ${premiumStatusLine}
  - При ответе о покупке упоминай только карту и крипту. Не упоминай внутренние кошельки или провайдеров.
`;
    }

    if (language === 'es') {
        return `
- **PREMIUM / TRIAL:** ${premiumStatusLine}
  - When talking about payment, mention only card or crypto. Do not mention internal wallets or providers.
`;
    }

    return `
- **PREMIUM / TRIAL:** ${premiumStatusLine}
  - When talking about payment, mention only card or crypto. Do not mention internal wallets or providers.
`;
}
