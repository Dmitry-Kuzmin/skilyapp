import Layout from "@/components/Layout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Gamepad2, Sparkles, Trophy, Coins, Shield, Book } from "lucide-react";

export default function About() {
  const { language } = useLanguage();

  const content = {
    ru: {
      title: "О SkilyApp",
      subtitle: "Gamified SaaS платформа для изучения безопасности дорожного движения",
      sections: [
        {
          icon: Gamepad2,
          title: "Что мы делаем",
          content: `SkilyApp — это Software-as-a-Service (SaaS) платформа и мобильное приложение, которое помогает изучать правила дорожного движения через интерактивную геймификацию.

Мы не продаем доступ к экзаменам или сертификаты. Мы создаем программный продукт с собственными технологиями: интерактивными модулями, AI-помощником и системой геймификации.`
        },
        {
          icon: Sparkles,
          title: "Наши технологии",
          content: `Все технологии разработаны нашей командой:

• RaceGame — тренировка восприятия дорожных ситуаций
• GuessTheSign — мгновенное распознавание дорожных знаков
• Match & Learn — изучение терминологии
• Skily AI — AI-помощник на базе собственных алгоритмов
• Система дуэлей — соревновательный режим с виртуальной экономикой
• Аналитика прогресса — персональные рекомендации`
        },
        {
          icon: Trophy,
          title: "Бизнес-модель",
          content: `Мы зарабатываем на программном обеспечении, а не на образовании:

1. Premium подписка - доступ ко всем функциям приложения
2. Виртуальная валюта (монеты) - для косметических предметов и бустов
3. Duel Pass - сезонный боевой пас с эксклюзивными наградами

Все покупки дают доступ к программным функциям, а не к экзаменам или сертификатам.`
        },
        {
          icon: Book,
          title: "Образовательный контент",
          content: `Мы используем публично доступную базу вопросов DGT (Dirección General de Tráfico) в качестве исходного материала - точно так же, как Duolingo использует общедоступные тексты для изучения языков.

Однако наша ценность - не в самих вопросах, а в том, КАК мы их подаем:
• Интерактивные игры вместо скучных списков
• AI-объяснения на русском языке
• Адаптивная система повторения
• Геймификация и соревновательные режимы

Все программное обеспечение, дизайн, игры и AI-алгоритмы - наша собственная интеллектуальная собственность.`
        },
        {
          icon: Shield,
          title: "Чем мы НЕ являемся",
          content: `SkilyApp НЕ является:

❌ Сервисом подготовки к экзаменам (exam preparation service)
❌ Провайдером сертификатов или учетных данных
❌ Перепродавцом курсов третьих лиц
❌ Сервисом бронирования экзаменов

Мы - разработчики программного обеспечения и игр с образовательным уклоном.`
        },
        {
          icon: Coins,
          title: "Аналоги на рынке",
          content: `Мы работаем по модели, похожей на успешные EdTech платформы:

• Duolingo - gamified language learning
• Mimo - coding education через игры
• Peak - brain training приложение
• Kahoot - игровое обучение

Все эти компании используют общедоступный образовательный контент, но монетизируют свое уникальное программное обеспечение и геймификацию - точно как мы.`
        }
      ],
      footer: "SkilyApp является программным продуктом категории SaaS / Mobile Gaming / EdTech."
    },
    es: {
      title: "Acerca de SkilyApp",
      subtitle: "Plataforma SaaS gamificada para aprender seguridad vial",
      sections: [
        {
          icon: Gamepad2,
          title: "Lo que hacemos",
          content: `SkilyApp es una plataforma Software-as-a-Service (SaaS) y una aplicación móvil que ayuda a aprender las reglas de tráfico a través de experiencias interactivas.

No vendemos acceso a exámenes ni certificados. Creamos un producto de software con tecnologías propias: módulos interactivos, asistente de IA y sistema de gamificación.`
        },
        {
          icon: Sparkles,
          title: "Nuestras tecnologías",
          content: `Todas nuestras tecnologías están desarrolladas internamente:

• RaceGame - juego para entrenar la percepción de riesgo
• GuessTheSign - reconocimiento instantáneo de señales de tráfico
• Match & Learn - aprendizaje de terminología
• Skily AI - compañero de inteligencia artificial con algoritmos propios
• Sistema de duelos - modo competitivo con economía
• Análisis de progreso - recomendaciones adaptativas`
        },
        {
          icon: Trophy,
          title: "Modelo de negocio",
          content: `Ganamos dinero con software, no con educación:

1. Suscripción Premium - acceso a todas las funciones de la aplicación
2. Moneda virtual (monedas) - para artículos cosméticos y potenciadores
3. Duel Pass - pase de batalla de temporada con recompensas exclusivas

Todas las compras dan acceso a funciones de software, no a exámenes o certificados.`
        },
        {
          icon: Book,
          title: "Contenido educativo",
          content: `Utilizamos la base de preguntas DGT (Dirección General de Tráfico) de acceso público como material de origen, igual que Duolingo usa textos de dominio público para aprender idiomas.

Sin embargo, nuestro valor no está en las preguntas mismas, sino en CÓMO las presentamos:
• Juegos interactivos en lugar de listas aburridas
• Explicaciones de IA en ruso
• Sistema de repetición adaptativo
• Gamificación y modos competitivos

Todo el software, diseño, juegos y algoritmos de IA son propiedad intelectual nuestra.`
        },
        {
          icon: Shield,
          title: "Lo que NO somos",
          content: `SkilyApp NO es:

❌ Un servicio de preparación de exámenes (exam preparation service)
❌ Un proveedor de certificados o credenciales
❌ Un revendedor de cursos de terceros
❌ Un servicio de reserva de exámenes

Somos desarrolladores de software y juegos con enfoque educativo.`
        },
        {
          icon: Coins,
          title: "Análogos en el mercado",
          content: `Trabajamos según un modelo similar a las plataformas EdTech exitosas:

• Duolingo - aprendizaje de idiomas gamificado
• Mimo - educación de codificación a través de juegos
• Peak - aplicación de entrenamiento cerebral
• Kahoot - aprendizaje de juegos

Todas estas empresas utilizan contenido educativo de acceso público, pero monetizan su software único y gamificación, exactamente como nosotros.`
        }
      ],
      footer: "SkilyApp es un producto de software de categoría SaaS / Mobile Gaming / EdTech."
    },
    en: {
      title: "About SkilyApp",
      subtitle: "Gamified SaaS platform for learning road safety",
      sections: [
        {
          icon: Gamepad2,
          title: "What we do",
          content: `SkilyApp is a Software-as-a-Service (SaaS) platform and mobile application that helps people learn traffic rules through interactive experiences.

We don't sell exam access or certificates. We create a software product with proprietary technology: interactive modules, AI assistant, and gamification system.`
        },
        {
          icon: Sparkles,
          title: "Our technologies",
          content: `All our technologies are developed in-house:

• RaceGame - game for training risk perception
• GuessTheSign - instant traffic sign recognition
• Match & Learn - terminology learning
• Skily AI - artificial intelligence companion with proprietary algorithms
• Duel system - competitive mode with economy
• Progress analytics - adaptive recommendations`
        },
        {
          icon: Trophy,
          title: "Business model",
          content: `We make money from software, not education:

1. Premium subscription - access to all app features
2. Virtual currency (coins) - for cosmetic items and boosts
3. Duel Pass - seasonal battle pass with exclusive rewards

All purchases provide access to software features, not exams or certificates.`
        },
        {
          icon: Book,
          title: "Educational content",
          content: `We use the publicly available DGT (Dirección General de Tráfico) question bank as source material - just like Duolingo uses public domain texts for language learning.

However, our value is not in the questions themselves, but in HOW we present them:
• Interactive games instead of boring lists
• AI explanations in Russian
• Adaptive repetition system
• Gamification and competitive modes

All software, design, games, and AI algorithms are our own intellectual property.`
        },
        {
          icon: Shield,
          title: "What we are NOT",
          content: `SkilyApp is NOT:

❌ An exam preparation service
❌ A certificate or credential provider
❌ A reseller of third-party courses
❌ An exam booking service

We are software and game developers with an educational focus.`
        },
        {
          icon: Coins,
          title: "Market analogues",
          content: `We work according to a model similar to successful EdTech platforms:

• Duolingo - gamified language learning
• Mimo - coding education through games
• Peak - brain training app
• Kahoot - game-based learning

All these companies use publicly available educational content but monetize their unique software and gamification - exactly like us.`
        }
      ],
      footer: "SkilyApp is a software product in the SaaS / Mobile Gaming / EdTech category."
    }
  };

  const currentContent = content[language] || content.en;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 bg-clip-text text-transparent">
            {currentContent.title}
          </h1>
          <p className="text-xl text-zinc-400 max-w-3xl mx-auto">
            {currentContent.subtitle}
          </p>
        </div>

        <div className="space-y-8">
          {currentContent.sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <div
                key={index}
                className="bg-zinc-900/50 border border-white/10 rounded-2xl p-8 backdrop-blur-sm hover:border-white/20 transition-all"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-semibold text-white">
                    {section.title}
                  </h2>
                </div>
                <p className="text-zinc-300 leading-relaxed whitespace-pre-line text-base">
                  {section.content}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-12 p-8 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-violet-500/10 border border-white/10 rounded-2xl text-center">
          <p className="text-lg font-medium text-white">
            {currentContent.footer}
          </p>
          <p className="text-sm text-zinc-400 mt-4">
            <strong>{language === 'ru' ? 'Контакты:' : language === 'es' ? 'Contacto:' : 'Contact:'}</strong> support@skilyapp.com
          </p>
          <p className="text-sm text-zinc-400 mt-2">
            <strong>{language === 'ru' ? 'Адрес:' : language === 'es' ? 'Dirección:' : 'Address:'}</strong> {language === 'ru' ? 'Испания, Таррагона' : 'Spain, Tarragona'}
          </p>
        </div>
      </div>
    </Layout>
  );
}

