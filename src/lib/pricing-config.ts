import { Trophy, Clock, Calendar, Crown, Infinity } from "lucide-react";

export interface PricingPlan {
    id: 'monthly' | 'quarterly' | 'biannual' | 'yearly' | 'lifetime';
    title: string;
    subtitle: string;
    price: string;
    priceValue: number; // Цена в евро (число)
    period: string;
    pricePerMonth?: string; // Для отображения "€X.XX/мес"
    description: string;
    features: string[];
    highlight?: boolean;
    popular?: boolean;
    savings?: string; // "Экономия 33%"
    icon?: any;
    gradient?: string; // CSS классы для градиента
}

export interface CoinPack {
    id: string;
    name: string;
    price: string;
    priceValue: number;
    coins: number;
    bonus: number;
    totalCoins: number;
    descriptionKey?: string;
    helperKey?: string;
    highlight?: boolean;
    bestValue?: boolean;
}

export const DUEL_PASS_PRICE = {
    price: "€4.99",
    priceValue: 4.99,
    title: "Duel Pass"
};

export const PRICING_PLANS: PricingPlan[] = [
    {
        id: 'monthly',
        title: '1 Месяц',
        subtitle: 'Базовый старт',
        price: "€9.99",
        priceValue: 9.99,
        period: "мес",
        pricePerMonth: "€9.99",
        description: "Полный доступ на 30 дней",
        features: [
            "Все функции Premium",
            "Без рекламы",
            "AI-помощник",
            "+50% монет"
        ],
        highlight: false,
        icon: Clock,
        gradient: "from-blue-500 to-cyan-500"
    },
    {
        id: 'quarterly',
        title: '3 Месяца',
        subtitle: 'Для уверенных',
        price: "€24.99",
        priceValue: 24.99,
        period: "3 мес",
        pricePerMonth: "€8.33",
        description: "Оптимально для подготовки",
        savings: "17%",
        features: [
            "Всё из тарифа 1 Месяц",
            "Экономия 17%",
            "Хватит на всю теорию"
        ],
        highlight: false,
        icon: Calendar,
        gradient: "from-indigo-500 to-purple-500"
    },
    {
        id: 'biannual',
        title: '6 Месяцев',
        subtitle: 'Максимум спокойствия',
        price: "€39.99",
        priceValue: 39.99,
        period: "6 мес",
        pricePerMonth: "€6.66",
        description: "Самый популярный выбор",
        savings: "33%",
        popular: true, // Звезда продаж
        features: [
            "Всё из тарифа 3 Месяца",
            "Экономия 33%",
            "Страховка от пересдачи"
        ],
        highlight: true,
        icon: Trophy,
        gradient: "from-pink-500 to-rose-500"
    },
    {
        id: 'yearly',
        title: '1 Год',
        subtitle: 'Полный безлимит',
        price: "€59.99",
        priceValue: 59.99,
        period: "год",
        pricePerMonth: "€4.99",
        description: "Выбор перфекционистов",
        savings: "50%",
        features: [
            "Всё включено на год",
            "Максимальная выгода 50%",
            "Пожизненное обновление" // Маркетинговый ход (в рамках года)
        ],
        highlight: false,
        icon: Crown,
        gradient: "from-amber-400 to-orange-500"
    }
];

export const COIN_PACKS: CoinPack[] = [
    {
        id: 'coins_pack_100',
        name: 'Starter',
        price: "€2.99",
        priceValue: 2.99,
        coins: 100,
        bonus: 0,
        totalCoins: 100,
        descriptionKey: 'boostShop.coins.descriptions.starter',
        helperKey: 'boostShop.coins.helpers.starter'
    },
    {
        id: 'coins_pack_500',
        name: 'Grinder',
        price: "€9.99",
        priceValue: 9.99,
        coins: 500,
        bonus: 50,
        totalCoins: 550,
        highlight: true,
        bestValue: true, // "ХИТ"
        descriptionKey: 'boostShop.coins.descriptions.grinder',
        helperKey: 'boostShop.coins.helpers.grinder'
    },
    {
        id: 'coins_pack_1200',
        name: 'Pro',
        price: "€19.99",
        priceValue: 19.99,
        coins: 1200,
        bonus: 200,
        totalCoins: 1400,
        descriptionKey: 'boostShop.coins.descriptions.pro',
        helperKey: 'boostShop.coins.helpers.pro'
    },
    {
        id: 'coins_pack_3000',
        name: 'Elite',
        price: "€39.99",
        priceValue: 39.99,
        coins: 3000,
        bonus: 500,
        totalCoins: 3500,
        descriptionKey: 'boostShop.coins.descriptions.elite',
        helperKey: 'boostShop.coins.helpers.elite'
    }
];
