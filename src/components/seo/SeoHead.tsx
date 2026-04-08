/**
 * SeoHead — Dynamic SEO meta tags manager
 * Updates document head based on current language for proper multilingual SEO.
 * Handles: title, description, keywords, OG tags, hreflang, JSON-LD, canonical.
 */
import { useEffect } from "react";
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { examYear } from "@/utils/dateUtils";

interface SeoConfig {
  title: string;
  description: string;
  keywords: string;
  ogTitle: string;
  ogDescription: string;
  ogLocale: string;
  lang: string;
  jsonLd: object;
}

const SEO_CONFIG: Record<Language, SeoConfig> = {
  es: {
    title: `Skilyapp - Test DGT ${examYear} | Autoescuela Online Gratis con IA`,
    description: `Prepara el examen teórico DGT ${examYear} con inteligencia artificial. App test autoescuela gratis: preguntas oficiales DGT actualizadas, test de conducir, simulacro examen permiso B. Aprueba a la primera con Skilyapp.`,
    keywords: [
      // Primary Spanish keywords (from Google suggestions)
      "test DGT", "test autoescuela gratis", "autoescuela movil test DGT",
      "test DGT permiso B", "test autoescuela DGT", "app test autoescuela gratis",
      "app para aprender a conducir España", "app autoescuela gratis",
      "examen teórico DGT", "test de conducir gratis",
      // Secondary Spanish keywords
      "preguntas examen DGT", "simulacro examen DGT", "test carnet de conducir",
      "autoescuela online", "permiso de conducir España", "examen DGT online",
      "preguntas test DGT actualizadas", "practicar test DGT",
      "app examen conducir", "test teórico coche",
      // Long-tail Spanish
      "aprobar examen teórico DGT primera vez", "preparar examen DGT con IA",
      "test DGT inteligencia artificial", "mejor app test conducir España",
      // Brand
      "Skilyapp", "Skily", "skilyapp DGT",
      // English keywords
      "Spain driving theory test", "DGT exam English", "driving test Spain app",
      "Spanish driving test practice", "DGT test online",
    ].join(", "),
    ogTitle: `Skilyapp - Test Teórico DGT ${examYear} con IA | Autoescuela Online`,
    ogDescription: `Aprueba el examen DGT a la primera. Preguntas oficiales actualizadas, simulacros reales y tutor IA 24/7. App gratuita de autoescuela.`,
    ogLocale: "es_ES",
    lang: "es",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "Skilyapp",
      "alternateName": ["Skily", "Skilyapp DGT", "Skily Autoescuela"],
      "url": "https://skilyapp.com",
      "description": `Preparación inteligente para el examen teórico DGT ${examYear}. Tests con preguntas oficiales, simulacros de examen real, tutor IA 24/7 y gamificación. La mejor app de autoescuela online gratuita en España.`,
      "applicationCategory": "EducationalApplication",
      "operatingSystem": "Web, Telegram, iOS, Android",
      "inLanguage": ["es", "en", "ru"],
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "EUR",
        "description": "Plan gratuito disponible. Planes Pro desde €4.99/mes"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "ratingCount": "1247",
        "bestRating": "5"
      },
      "featureList": [
        "Tests con preguntas oficiales DGT actualizadas",
        "Simulacro de examen real con temporizador",
        "Tutor IA 24/7 que explica cada error",
        "Juegos educativos y gamificación",
        "Disponible en español, inglés y ruso",
        "Señales de tráfico de España",
        "Seguimiento de progreso personalizado"
      ],
      "screenshot": "https://skilyapp.com/api/og",
      "datePublished": "2024-01-01",
      "dateModified": new Date().toISOString().split('T')[0],
      "author": {
        "@type": "Organization",
        "name": "Skilyapp"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Skilyapp",
        "logo": {
          "@type": "ImageObject",
          "url": "https://skilyapp.com/logo.png"
        }
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://skilyapp.com/?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    },
  },
  en: {
    title: `Skilyapp - Spain Driving Theory Test ${examYear} | DGT Exam App with AI`,
    description: `Pass the Spanish DGT driving theory test ${examYear} on your first try. Official DGT questions in English, AI tutor, real exam simulation. Free driving test app for Spain with instant translations.`,
    keywords: [
      // English keywords for Spain driving test
      "Spain driving theory test", "DGT exam English", "Spanish driving test app",
      "DGT test online", "driving test Spain", "Spain driving license test",
      "DGT exam practice", "Spanish driving theory practice",
      "driving test app Spain", "DGT questions English",
      // Long-tail English
      "pass DGT exam first time", "Spanish driving test in English",
      "driving theory test Spain app", "DGT exam preparation online",
      "best app Spanish driving test", "AI driving test tutor Spain",
      // Spanish keywords for bilingual users
      "test DGT", "examen teórico DGT", "autoescuela online",
      // Brand
      "Skilyapp", "Skily",
    ].join(", "),
    ogTitle: `Skilyapp - Pass Spain DGT Driving Test ${examYear} | AI-Powered`,
    ogDescription: "Pass the Spanish DGT driving theory test on your first try. Official questions in English, AI explanations, and real exam simulation. Free to start.",
    ogLocale: "en_US",
    lang: "en",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "Skilyapp",
      "alternateName": ["Skily", "Skilyapp DGT"],
      "url": "https://skilyapp.com",
      "description": `AI-powered preparation for Spain's DGT driving theory test ${examYear}. Official questions in English, real exam simulation, AI tutor available 24/7. The best free driving test app for expats in Spain.`,
      "applicationCategory": "EducationalApplication",
      "operatingSystem": "Web, Telegram, iOS, Android",
      "inLanguage": ["en", "es", "ru"],
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "EUR"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "ratingCount": "1247",
        "bestRating": "5"
      },
      "featureList": [
        "Official DGT questions with English translations",
        "Real exam simulation with timer",
        "AI tutor available 24/7",
        "Educational games and gamification",
        "Available in English, Spanish and Russian",
        "Spanish traffic signs guide",
        "Personalized progress tracking"
      ],
      "screenshot": "https://skilyapp.com/api/og",
      "datePublished": "2024-01-01",
      "dateModified": new Date().toISOString().split('T')[0],
      "author": { "@type": "Organization", "name": "Skilyapp" },
      "publisher": {
        "@type": "Organization",
        "name": "Skilyapp",
        "logo": { "@type": "ImageObject", "url": "https://skilyapp.com/logo.png" }
      }
    },
  },
  ru: {
    title: `Skilyapp - Подготовка к экзамену DGT ${examYear} | Тесты ПДД Испании с ИИ`,
    description: `Сдай теоретический экзамен DGT ${examYear} с первого раза! Официальные вопросы на русском языке, AI-репетитор 24/7, симуляция реального экзамена. Бесплатное приложение для подготовки к экзамену по вождению в Испании.`,
    keywords: [
      "теоретический экзамен DGT", "ПДД Испания", "экзамен по вождению Испания",
      "тесты DGT на русском", "водительские права Испания", "подготовка к экзамену DGT",
      "DGT тест онлайн", "Skilyapp", "Skily",
      "экзамен на права в Испании на русском", "дорожные знаки Испании",
      // Spanish keywords for Russian speakers
      "test DGT", "autoescuela online", "examen teórico DGT",
    ].join(", "),
    ogTitle: `Skilyapp - Экзамен DGT ${examYear} на русском | ИИ-репетитор`,
    ogDescription: "Сдай экзамен DGT с первого раза! Тесты на русском, AI объясняет ошибки, симуляция реального экзамена. Бесплатно.",
    ogLocale: "ru_RU",
    lang: "ru",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "Skilyapp",
      "alternateName": ["Skily", "Скили"],
      "url": "https://skilyapp.com",
      "description": `Подготовка к теоретическому экзамену DGT ${examYear} на русском языке. Официальные вопросы, симуляция реального экзамена, AI-репетитор 24/7, игры и геймификация.`,
      "applicationCategory": "EducationalApplication",
      "operatingSystem": "Web, Telegram, iOS, Android",
      "inLanguage": ["ru", "es", "en"],
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "EUR"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "ratingCount": "1247",
        "bestRating": "5"
      },
      "featureList": [
        "Тесты из реальных экзаменов DGT",
        "AI помощник на русском языке 24/7",
        "Интерактивные игры для обучения",
        "Дуэли с друзьями",
        "Словарь терминов на русском и испанском",
        "Дорожные знаки Испании",
        "Отслеживание прогресса"
      ],
      "screenshot": "https://skilyapp.com/api/og",
      "datePublished": "2024-01-01",
      "dateModified": new Date().toISOString().split('T')[0],
      "author": { "@type": "Organization", "name": "Skilyapp" },
      "publisher": {
        "@type": "Organization",
        "name": "Skilyapp",
        "logo": { "@type": "ImageObject", "url": "https://skilyapp.com/logo.png" }
      }
    },
  },
};


function setMetaTag(attr: string, key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function removeMetaTag(attr: string, key: string) {
  document.querySelector(`meta[${attr}="${key}"]`)?.remove();
}

function setOrCreateJsonLd(id: string, data: object) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.id = id;
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function setHreflangTags(alternates: Array<{ hreflang: string; href: string }>) {
  // Remove existing hreflang tags
  document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());

  alternates.forEach(({ hreflang, href }) => {
    const link = document.createElement("link");
    link.rel = "alternate";
    link.hreflang = hreflang;
    link.href = href;
    document.head.appendChild(link);
  });
}

export interface SeoHeadProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogType?: string;
  robots?: string;
  hreflangAlternates?: Array<{ hreflang: string; href: string }>;
  structuredData?: object | object[];
  publishedTime?: string;
  modifiedTime?: string;
}

const HOME_HREFLANG_ALTERNATES = [
  { hreflang: "es", href: "https://skilyapp.com/?lang=es" },
  { hreflang: "en", href: "https://skilyapp.com/?lang=en" },
  { hreflang: "ru", href: "https://skilyapp.com/?lang=ru" },
  { hreflang: "x-default", href: "https://skilyapp.com" },
];

function getDefaultHreflangAlternates(canonicalUrl?: string) {
  if (!canonicalUrl || HOME_HREFLANG_ALTERNATES.some((alternate) => alternate.href === canonicalUrl)) {
    return HOME_HREFLANG_ALTERNATES;
  }

  return [];
}

export function SeoHead({
  title,
  description,
  canonicalUrl,
  ogType = "website",
  robots = "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
  hreflangAlternates,
  structuredData,
  publishedTime,
  modifiedTime,
}: SeoHeadProps) {
  const { language } = useLanguage();

  useEffect(() => {
    const config = SEO_CONFIG[language];
    const additionalStructuredData = structuredData
      ? Array.isArray(structuredData)
        ? structuredData
        : [structuredData]
      : [];
    const effectiveHreflangAlternates = hreflangAlternates ?? getDefaultHreflangAlternates(canonicalUrl);

    // Update html lang attribute
    document.documentElement.lang = config.lang;

    // Update title (use prop override or default config)
    const finalTitle = title || config.title;
    document.title = finalTitle;

    // Update meta tags
    setMetaTag("name", "description", description || config.description);
    setMetaTag("name", "keywords", config.keywords);
    setMetaTag("name", "robots", robots);
    setMetaTag("name", "author", "Skilyapp");

    // Open Graph
    setMetaTag("property", "og:title", title || config.ogTitle);
    setMetaTag("property", "og:description", description || config.ogDescription);
    setMetaTag("property", "og:locale", config.ogLocale);
    setMetaTag("property", "og:url", canonicalUrl || "https://skilyapp.com");
    setMetaTag("property", "og:type", ogType);
    // Dynamic OG image via Edge Function — includes current path for per-page design
    const ogPath = canonicalUrl
      ? canonicalUrl.replace("https://skilyapp.com", "")
      : window.location.pathname;
    const ogImageUrl = `https://skilyapp.com/api/og?path=${encodeURIComponent(ogPath)}`;
    setMetaTag("property", "og:image", ogImageUrl);
    setMetaTag("property", "og:image:alt", title || config.ogTitle);
    setMetaTag("property", "og:site_name", "Skilyapp");

    // Alternate locales for OG
    const alternateLocales = ["es_ES", "en_US", "ru_RU"].filter(l => l !== config.ogLocale);
    alternateLocales.forEach((locale) => {
      setMetaTag("property", `og:locale:alternate`, locale);
    });

    // Twitter
    setMetaTag("name", "twitter:card", "summary_large_image");
    setMetaTag("name", "twitter:title", title || config.ogTitle);
    setMetaTag("name", "twitter:description", description || config.description);
    setMetaTag("name", "twitter:image", ogImageUrl);
    setMetaTag("name", "twitter:image:alt", title || config.ogTitle);

    // JSON-LD Structured Data
    setOrCreateJsonLd("seo-jsonld-app", config.jsonLd);
    additionalStructuredData.forEach((data, index) => {
      setOrCreateJsonLd(`seo-jsonld-extra-${index}`, data);
    });
    const staleStructuredData = document.querySelectorAll('[id^="seo-jsonld-extra-"]');
    staleStructuredData.forEach((el) => {
      const match = el.id.match(/^seo-jsonld-extra-(\d+)$/);
      if (!match) return;
      const index = Number(match[1]);
      if (index >= additionalStructuredData.length) {
        el.remove();
      }
    });

    // Hreflang tags
    setHreflangTags(effectiveHreflangAlternates);

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl || "https://skilyapp.com";

    if (ogType === "article") {
      if (publishedTime) {
        setMetaTag("property", "article:published_time", publishedTime);
      }
      if (modifiedTime) {
        setMetaTag("property", "article:modified_time", modifiedTime);
      }
    } else {
      removeMetaTag("property", "article:published_time");
      removeMetaTag("property", "article:modified_time");
    }
  }, [
    language,
    title,
    description,
    canonicalUrl,
    ogType,
    robots,
    hreflangAlternates,
    structuredData,
    publishedTime,
    modifiedTime,
  ]);

  return null; // This component only manages document head
}
