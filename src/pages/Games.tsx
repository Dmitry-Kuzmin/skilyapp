import { Swords, Zap, CreditCard, Puzzle, FileText, Languages, Layers } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";

const Games = () => {
  const navigate = useNavigate();
  
  const games = [
    {
      id: 1,
      title: "Дуэль с другом",
      description: "Соревнуйся с другом или ботом на знание ПДД",
      icon: Swords,
      color: "primary",
      premium: false,
      difficulty: "Средняя",
      route: "/games/duel",
    },
    {
      id: 2,
      title: "Гонка",
      description: "Переведи максимум слов за ограниченное время",
      icon: Zap,
      color: "secondary",
      premium: false,
      difficulty: "Лёгкая",
      route: "/games/race",
    },
    {
      id: 3,
      title: "Флэш-карточки",
      description: "Классический метод изучения с карточками",
      icon: CreditCard,
      color: "success",
      premium: false,
      difficulty: "Лёгкая",
    },
    {
      id: 4,
      title: "Сопоставление",
      description: "Соедини испанские термины с русскими переводами",
      icon: Puzzle,
      color: "primary",
      premium: false,
      difficulty: "Средняя",
      route: "/games/matching",
    },
    {
      id: 5,
      title: "Заполни пробел",
      description: "Вставь правильный термин в определение",
      icon: FileText,
      color: "secondary",
      premium: false,
      difficulty: "Сложная",
    },
    {
      id: 6,
      title: "Переведи правильно",
      description: "Выбери правильный перевод термина из вариантов",
      icon: Languages,
      color: "success",
      premium: false,
      difficulty: "Средняя",
    },
    {
      id: 7,
      title: "Разбей слово по слогам",
      description: "Собери слово из перемешанных слогов",
      icon: Layers,
      color: "primary",
      premium: false,
      difficulty: "Сложная",
    },
  ];

  const difficultyColors = {
    "Лёгкая": "success",
    "Средняя": "warning",
    "Сложная": "destructive",
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-4 md:py-8 space-y-6 md:space-y-8 pb-20 md:pb-4">
        {/* Header */}
        <div className="text-center space-y-2 relative">
          <h1 className="text-4xl font-bold">Игры</h1>
          <p className="text-muted-foreground text-lg">
            Учись играя! Закрепляй термины в увлекательном формате
          </p>
        </div>

        {/* Premium Notice */}
        <Card className="p-4 md:p-6 gradient-card border-gold/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gold/10 rounded-full blur-3xl" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
            <div className="flex items-center gap-3 md:gap-4 flex-1">
              <div className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-xl gradient-gold shrink-0">
                <Swords className="w-6 h-6 md:w-7 md:h-7 text-gold-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg md:text-xl font-bold">Безлимитный доступ к играм</h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  В бесплатном режиме доступно 3 игры в день
                </p>
              </div>
            </div>
            <Button variant="gold" size="lg" className="shadow-glow w-full sm:w-auto shrink-0">
              Премиум за €9.99/мес
            </Button>
          </div>
        </Card>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => (
            <Card
              key={game.id}
              className="p-6 gradient-card border-border/50 hover:border-primary/30 transition-all duration-300 hover:scale-105 cursor-pointer group relative overflow-hidden"
            >
              {game.premium && (
                <Badge className="absolute top-4 right-4 gradient-gold border-none">
                  Premium
                </Badge>
              )}

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className={`flex items-center justify-center w-14 h-14 rounded-xl bg-${game.color}/20 group-hover:bg-${game.color}/30 transition-colors`}>
                    <game.icon className={`w-7 h-7 text-${game.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                      {game.title}
                    </h3>
                    <Badge 
                      variant="outline" 
                      className={`text-xs mt-1 border-${difficultyColors[game.difficulty as keyof typeof difficultyColors]}/50`}
                    >
                      {game.difficulty}
                    </Badge>
                  </div>
                </div>

                <p className="text-muted-foreground text-sm min-h-[40px]">
                  {game.description}
                </p>

                <Button
                  className="w-full group-hover:shadow-primary"
                  variant={game.premium ? "outline" : "default"}
                  onClick={() => game.route ? navigate(game.route) : null}
                  disabled={!game.route}
                >
                  {game.premium ? "Разблокировать" : game.route ? "Играть" : "Скоро"}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Stats */}
        <Card className="p-6 gradient-card border-border/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-3xl font-bold text-primary">24</p>
              <p className="text-sm text-muted-foreground mt-1">Игр сыграно</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gold">156</p>
              <p className="text-sm text-muted-foreground mt-1">Терминов изучено</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-success">89%</p>
              <p className="text-sm text-muted-foreground mt-1">Средний результат</p>
            </div>
          </div>
        </Card>

        {/* Daily Limit Info for Free Users */}
        <Card className="p-4 gradient-card border-primary/30">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/20">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Сегодня доступно: 2 / 3 игры</p>
              <p className="text-xs text-muted-foreground">
                Лимит обновится через 18 часов
              </p>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default Games;
