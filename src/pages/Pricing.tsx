import Layout from "@/components/Layout";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Pricing() {
  const { language } = useLanguage();

  const content = {
    ru: {
      title: "Тарифные планы",
      subtitle: "Выберите план, который подходит вам",
      plans: [
        {
          name: "Premium на месяц",
          price: "€9.99",
          period: "в месяц",
          description: "Полный доступ ко всем функциям Premium",
          features: [
            "Безлимитный доступ ко всем тестам и играм",
            "+50% монет за все действия",
            "Duel Pass Premium",
            "+20% Season Points",
            "Без рекламы",
            "Мгновенные подсказки",
            "Приоритетная поддержка"
          ]
        },
        {
          name: "Premium на год",
          price: "€59.99",
          period: "в год",
          description: "Максимальная экономия для активных пользователей",
          features: [
            "Все функции Premium",
            "Экономия 50% по сравнению с месячной подпиской",
            "Автоматическое продление",
            "Все преимущества месячной подписки"
          ],
          popular: true
        },
        {
          name: "Premium Forever",
          price: "€59.99",
          period: "единоразово",
          description: "Пожизненный доступ ко всем функциям",
          features: [
            "Пожизненный доступ",
            "Автоматический Duel Pass Premium каждый сезон",
            "+500 монет при покупке",
            "Эксклюзивный бейдж",
            "Приоритетная поддержка",
            "Ранний доступ к новым функциям"
          ],
          highlight: true
        }
      ],
      coins: {
        title: "Пакеты монет",
        description: "Пополните баланс монет для покупки бустов и улучшений",
        packs: [
          { name: "100 монет", price: "€2.99", coins: 100 },
          { name: "500 монет + 50 бонус", price: "€9.99", coins: 550 },
          { name: "1200 монет + 200 бонус", price: "€19.99", coins: 1400 },
          { name: "3000 монет + 500 бонус", price: "€39.99", coins: 3500 }
        ]
      },
      duelPass: {
        title: "Duel Pass",
        price: "€4.99",
        description: "Разблокируйте премиум награды для текущего сезона"
      }
    },
    es: {
      title: "Planes de precios",
      subtitle: "Elige el plan que mejor se adapte a ti",
      plans: [
        {
          name: "Premium mensual",
          price: "€9.99",
          period: "por mes",
          description: "Acceso completo a todas las funciones Premium",
          features: [
            "Acceso ilimitado a todos los tests y juegos",
            "+50% de monedas por todas las acciones",
            "Duel Pass Premium",
            "+20% de Season Points",
            "Sin anuncios",
            "Pistas instantáneas",
            "Soporte prioritario"
          ]
        },
        {
          name: "Premium anual",
          price: "€59.99",
          period: "por año",
          description: "Máximo ahorro para usuarios activos",
          features: [
            "Todas las funciones Premium",
            "Ahorro del 50% comparado con suscripción mensual",
            "Renovación automática",
            "Todos los beneficios de suscripción mensual"
          ],
          popular: true
        },
        {
          name: "Premium Forever",
          price: "€59.99",
          period: "pago único",
          description: "Acceso de por vida a todas las funciones",
          features: [
            "Acceso de por vida",
            "Duel Pass Premium automático cada temporada",
            "+500 monedas al comprar",
            "Insignia exclusiva",
            "Soporte prioritario",
            "Acceso anticipado a nuevas funciones"
          ],
          highlight: true
        }
      ],
      coins: {
        title: "Paquetes de monedas",
        description: "Recarga tu balance de monedas para comprar mejoras",
        packs: [
          { name: "100 monedas", price: "€2.99", coins: 100 },
          { name: "500 monedas + 50 bonus", price: "€9.99", coins: 550 },
          { name: "1200 monedas + 200 bonus", price: "€19.99", coins: 1400 },
          { name: "3000 monedas + 500 bonus", price: "€39.99", coins: 3500 }
        ]
      },
      duelPass: {
        title: "Duel Pass",
        price: "€4.99",
        description: "Desbloquea recompensas premium para la temporada actual"
      }
    },
    en: {
      title: "Pricing Plans",
      subtitle: "Choose the plan that works best for you",
      plans: [
        {
          name: "Premium Monthly",
          price: "€9.99",
          period: "per month",
          description: "Full access to all Premium features",
          features: [
            "Unlimited access to all tests and games",
            "+50% coins for all actions",
            "Duel Pass Premium",
            "+20% Season Points",
            "No ads",
            "Instant hints",
            "Priority support"
          ]
        },
        {
          name: "Premium Yearly",
          price: "€59.99",
          period: "per year",
          description: "Maximum savings for active users",
          features: [
            "All Premium features",
            "50% savings compared to monthly subscription",
            "Auto-renewal",
            "All benefits of monthly subscription"
          ],
          popular: true
        },
        {
          name: "Premium Forever",
          price: "€59.99",
          period: "one-time",
          description: "Lifetime access to all features",
          features: [
            "Lifetime access",
            "Automatic Duel Pass Premium every season",
            "+500 coins on purchase",
            "Exclusive badge",
            "Priority support",
            "Early access to new features"
          ],
          highlight: true
        }
      ],
      coins: {
        title: "Coin Packs",
        description: "Top up your coin balance to purchase boosts and upgrades",
        packs: [
          { name: "100 coins", price: "€2.99", coins: 100 },
          { name: "500 coins + 50 bonus", price: "€9.99", coins: 550 },
          { name: "1200 coins + 200 bonus", price: "€19.99", coins: 1400 },
          { name: "3000 coins + 500 bonus", price: "€39.99", coins: 3500 }
        ]
      },
      duelPass: {
        title: "Duel Pass",
        price: "€4.99",
        description: "Unlock premium rewards for the current season"
      }
    }
  };

  const currentContent = content[language] || content.en;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {currentContent.title}
          </h1>
          <p className="text-lg text-muted-foreground">
            {currentContent.subtitle}
          </p>
        </div>

        {/* Premium Plans */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {currentContent.plans.map((plan, index) => (
            <div
              key={index}
              className={`rounded-xl border p-6 ${
                plan.highlight
                  ? "border-primary bg-primary/5 scale-105"
                  : plan.popular
                  ? "border-blue-500"
                  : ""
              }`}
            >
              {plan.popular && (
                <div className="text-center mb-4">
                  <span className="inline-block px-3 py-1 text-xs font-semibold bg-blue-500 text-white rounded-full">
                    POPULAR
                  </span>
                </div>
              )}
              {plan.highlight && (
                <div className="text-center mb-4">
                  <span className="inline-block px-3 py-1 text-xs font-semibold bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-full">
                    BEST VALUE
                  </span>
                </div>
              )}
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground ml-2">
                  {plan.period}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                {plan.description}
              </p>
              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Coin Packs */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-center">
            {currentContent.coins.title}
          </h2>
          <p className="text-center text-muted-foreground mb-6">
            {currentContent.coins.description}
          </p>
          <div className="grid md:grid-cols-4 gap-4">
            {currentContent.coins.packs.map((pack, index) => (
              <div
                key={index}
                className="rounded-lg border p-4 text-center"
              >
                <h3 className="font-semibold mb-2">{pack.name}</h3>
                <div className="text-2xl font-bold mb-2">{pack.price}</div>
                <div className="text-sm text-muted-foreground">
                  {pack.coins} {language === 'ru' ? 'монет' : language === 'es' ? 'monedas' : 'coins'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Duel Pass */}
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">
            {currentContent.duelPass.title}
          </h2>
          <div className="inline-block rounded-lg border p-6">
            <div className="text-3xl font-bold mb-2">
              {currentContent.duelPass.price}
            </div>
            <p className="text-muted-foreground">
              {currentContent.duelPass.description}
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

