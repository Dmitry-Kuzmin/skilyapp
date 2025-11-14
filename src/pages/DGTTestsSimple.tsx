/**
 * Простая страница выбора DGT тестов
 * Использует существующий TestSession интерфейс
 */

import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Car, Bike, Bus, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

const DGTTestsSimple = () => {
  const navigate = useNavigate();

  const categories = [
    {
      id: 'A1',
      title: 'Категория A1',
      description: 'Легкие мотоциклы до 125 см³',
      icon: Bike,
      color: '#FF6B35',
      questions: 899,
    },
    {
      id: 'B',
      title: 'Категория B',
      description: 'Легковые автомобили',
      icon: Car,
      color: '#00A8E8',
      questions: 2947,
    },
    {
      id: 'D',
      title: 'Категория D',
      description: 'Автобусы',
      icon: Bus,
      color: '#7B2CBF',
      questions: 166,
    },
  ];

  const startTest = (category: string) => {
    // Используем существующий TestSession с параметром dgt_category
    navigate(`/test/dgt/${category}`);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 md:mb-16"
        >
          {/* 2025 Trend Header - Neo-brutalism + Typography */}
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-[-0.02em] leading-[0.9] mb-4 text-foreground">
            Экзамены DGT
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground font-normal max-w-xl leading-relaxed mb-2">
            Практикуйтесь для получения водительских прав в Испании
          </p>
          <p className="text-base text-muted-foreground/70 font-normal">
            4012 реальных вопросов с официальных экзаменов
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories.map((cat, index) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-all">
                <CardHeader>
                  <div
                    className="flex items-center justify-center mb-4 p-4 rounded-lg"
                    style={{ backgroundColor: `${cat.color}20` }}
                  >
                    <cat.icon className="h-12 w-12" style={{ color: cat.color }} />
                  </div>
                  <CardTitle className="text-center text-xl">
                    {cat.title}
                  </CardTitle>
                  <p className="text-center text-sm text-muted-foreground">
                    {cat.description}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="text-center mb-4">
                    <p className="text-2xl font-bold">{cat.questions}</p>
                    <p className="text-sm text-muted-foreground">вопросов</p>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => startTest(cat.id)}
                    style={{ backgroundColor: cat.color }}
                  >
                    Начать тест
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default DGTTestsSimple;

