export interface Testimonial {
  name: string;
  location: string;
  text: string;
  rating: number;
  highlight: string;
  avatar: string;
}

export const testimonials: Testimonial[] = [
  {
    name: "Мария Г.",
    location: "Мадрид",
    text: "Сдала экзамен DGT с первого раза! Практика на реальных вопросах помогла мне чувствовать себя уверенно.",
    rating: 5,
    highlight: "Сдала с первого раза",
    avatar: "👩‍🦰"
  },
  {
    name: "Алексей К.",
    location: "Барселона",
    text: "AI помощник объяснил все сложные моменты на русском языке. Очень удобно для тех, кто только начинает изучать испанский.",
    rating: 5,
    highlight: "AI помощник",
    avatar: "👨‍💼"
  },
  {
    name: "Елена С.",
    location: "Валенсия",
    text: "Игры делают обучение интересным. Особенно понравились дуэли с друзьями - отличная мотивация!",
    rating: 5,
    highlight: "Интересные игры",
    avatar: "👩‍🎓"
  },
  {
    name: "Дмитрий Р.",
    location: "Севилья",
    text: "Premium окупился за неделю - удвоенные монеты и безлимитный доступ к тестам. Рекомендую!",
    rating: 5,
    highlight: "Premium окупился",
    avatar: "👨‍💻"
  },
  {
    name: "Анна В.",
    location: "Малага",
    text: "Duel Pass - это просто находка! Получаю награды за то, что и так делаю каждый день.",
    rating: 5,
    highlight: "Duel Pass находка",
    avatar: "👩‍🏫"
  }
];

