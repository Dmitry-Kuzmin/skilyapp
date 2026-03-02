/**
 * Главная страница ПДД для страны
 * Показывает статистику, быстрые действия и последние билеты
 */

import { useParams, useNavigate } from 'react-router-dom';
import { COUNTRIES_CONFIG, CountryCode } from '@/types/pdd';
import { usePDDTickets } from '@/hooks/usePDDTickets';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  Shuffle,
  TrendingUp,
  Trophy,
  ArrowRight,
  Loader2,
  Play,
  FileText,
  Target,
  Sparkles
} from 'lucide-react';
import { motion } from '@/components/optimized/Motion';
import { cn } from '@/lib/utils';
import { useUserContext } from '@/contexts/UserContext';
import { usePDDContext } from '@/contexts/PDDContext';

export function LearnCountryHome() {
  const { country } = useParams<{ country: CountryCode }>();
  const navigate = useNavigate();
  const { profileId } = useUserContext();
  const { selectedCategory } = usePDDContext();

  // Хук должен вызываться до return — правила React Hooks
  // Если страна невалидна — передаём undefined, хук обрабатывает это корректно
  const validCountry = country && COUNTRIES_CONFIG[country]?.available ? country : undefined;
  const { data: tickets, isLoading: ticketsLoading } = usePDDTickets(validCountry as CountryCode, selectedCategory);

  if (!validCountry) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Страна не найдена</h1>
          <Button onClick={() => navigate('/learn')}>
            Выбрать страну
          </Button>
        </div>
      </Layout>
    );
  }

  const countryData = COUNTRIES_CONFIG[validCountry];

  // Вычисляем статистику (пока мок, потом из БД)
  const stats = {
    totalTickets: tickets?.length || 0,
    completedTickets: 0,
    totalQuestions: tickets?.reduce((sum, t) => sum + t.questions_count, 0) || 0,
    answeredQuestions: 0,
    correctAnswers: 0,
    accuracy: 0,
    averageScore: 0,
  };

  const lastTickets = tickets?.slice(0, 4) || [];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Заголовок */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">{countryData.flag}</span>
            <div>
              <h1 className="text-3xl font-bold">{countryData.name}</h1>
              <p className="text-muted-foreground">
                Правила дорожного движения
              </p>
            </div>
          </div>
        </motion.div>

        {/* Статистика */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        >
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Билеты</p>
                  <p className="text-2xl font-bold">
                    {stats.completedTickets}/{stats.totalTickets}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-blue-500/10">
                  <FileText className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Вопросы</p>
                  <p className="text-2xl font-bold">
                    {stats.answeredQuestions}/{stats.totalQuestions}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-green-500/10">
                  <Target className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Точность</p>
                  <p className="text-2xl font-bold">
                    {stats.accuracy > 0 ? `${stats.accuracy}%` : '—'}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-purple-500/10">
                  <Trophy className="w-6 h-6 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Быстрые действия */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Быстрые действия
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Экзамен - только для России */}
            {country === 'russia' && (
              <Card
                className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 border-primary/50 hover:border-primary bg-gradient-to-br from-primary/10 to-primary/5"
                onClick={() => navigate(`/test/exam-russia?category=${selectedCategory}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-gradient-to-br from-red-500 to-orange-600">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">Экзамен ПДД</h3>
                      <p className="text-sm text-muted-foreground">
                        20 вопросов, 2 ошибки, режим экзамена
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </CardContent>
              </Card>
            )}

            <Card
              className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/50"
              onClick={() => navigate(`/learn/${country}/test/random?count=20&category=${selectedCategory}`)}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600">
                    <Shuffle className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">Случайный тест</h3>
                    <p className="text-sm text-muted-foreground">
                      20 случайных вопросов для практики
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </CardContent>
            </Card>

            <Card
              className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/50"
              onClick={() => navigate(`/learn/${country}/tickets`)}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">Выбрать билет</h3>
                    <p className="text-sm text-muted-foreground">
                      Все {stats.totalTickets} билетов для изучения
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Последние билеты */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Начните с этих билетов
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/learn/${country}/tickets`)}
            >
              Все билеты
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {ticketsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {lastTickets.map((ticket, index) => {
                // Поддержка обратной совместимости
                const ticketId = typeof ticket.id === 'number' ? ticket.id : ticket.number;
                const ticketNumber = ticket.metadata?.ticket_number || ticket.number;

                return (
                  <motion.div
                    key={ticket.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <Card
                      className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                      onClick={() => navigate(`/learn/${country}/ticket/${ticketId}`)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <FileText className="w-4 h-4 text-primary" />
                            </div>
                            <span className="font-semibold">
                              {ticket.title || `Билет ${ticketNumber}`}
                            </span>
                          </div>
                          {ticket.completed && (
                            <div className="p-1 rounded-full bg-green-500/10">
                              <Trophy className="w-3 h-3 text-green-500" />
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {ticket.questions_count} вопросов
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full group-hover:border-primary group-hover:text-primary"
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Начать
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </Layout>
  );
}

