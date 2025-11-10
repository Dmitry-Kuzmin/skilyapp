import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { UserAnswer, LicenseType } from '@/types/driving-test';
import { CheckCircle2, XCircle, Trophy, AlertCircle, RotateCcw, Home } from 'lucide-react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';

interface DrivingTestResultsProps {
  licenseType: LicenseType;
  answers: UserAnswer[];
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  skippedQuestions: number;
  scorePercent: number;
  timeSpentSeconds: number;
  onRestart: () => void;
  onReviewAnswers: () => void;
  onGoHome: () => void;
}

export const DrivingTestResults = ({
  licenseType,
  answers,
  totalQuestions,
  correctAnswers,
  incorrectAnswers,
  skippedQuestions,
  scorePercent,
  timeSpentSeconds,
  onRestart,
  onReviewAnswers,
  onGoHome,
}: DrivingTestResultsProps) => {
  const { width, height } = useWindowSize();
  const isPassed = scorePercent >= 90;
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      {isPassed && <Confetti width={width} height={height} recycle={false} numberOfPieces={500} />}
      
      <div className="max-w-4xl mx-auto pt-8">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {isPassed ? (
                <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
                  <Trophy className="w-12 h-12 text-green-600" />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-12 h-12 text-red-600" />
                </div>
              )}
            </div>
            <CardTitle className="text-3xl mb-2">
              {isPassed ? '¡Enhorabuena! 🎉' : 'Попробуйте еще раз'}
            </CardTitle>
            <Badge variant={isPassed ? 'default' : 'destructive'} className="text-lg px-4 py-1">
              {isPassed ? 'Экзамен сдан!' : 'Экзамен не сдан'}
            </Badge>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Основная статистика */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-3xl font-bold text-blue-600">
                  {scorePercent.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 mt-1">Результат</div>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-3xl font-bold text-green-600 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-6 h-6" />
                  {correctAnswers}
                </div>
                <div className="text-sm text-gray-600 mt-1">Правильно</div>
              </div>

              <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="text-3xl font-bold text-red-600 flex items-center justify-center gap-1">
                  <XCircle className="w-6 h-6" />
                  {incorrectAnswers}
                </div>
                <div className="text-sm text-gray-600 mt-1">Неправильно</div>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-3xl font-bold text-gray-600">
                  {formatTime(timeSpentSeconds)}
                </div>
                <div className="text-sm text-gray-600 mt-1">Время</div>
              </div>
            </div>

            {/* Прогресс бар */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Прогресс</span>
                <span>{correctAnswers} из {totalQuestions}</span>
              </div>
              <Progress value={(correctAnswers / totalQuestions) * 100} className="h-3" />
            </div>

            {/* Информация о категории */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">Категория:</span>
                <Badge variant="outline" className="text-base">
                  {licenseType}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold">Минимум для сдачи:</span>
                <span className="text-gray-700">90% ({Math.ceil(totalQuestions * 0.9)} правильных)</span>
              </div>
            </div>

            {/* Сообщение */}
            <div className={`p-4 rounded-lg ${isPassed ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
              <p className="text-sm text-gray-700">
                {isPassed ? (
                  <>
                    <strong>Отличный результат!</strong> Вы успешно сдали тест. 
                    Продолжайте в том же духе для подготовки к настоящему экзамену DGT.
                  </>
                ) : (
                  <>
                    <strong>Не расстраивайтесь!</strong> Для сдачи нужно набрать минимум 90% правильных ответов. 
                    Просмотрите свои ответы и попробуйте снова.
                  </>
                )}
              </p>
            </div>

            {/* Кнопки действий */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <Button
                variant="outline"
                onClick={onGoHome}
                className="w-full"
              >
                <Home className="w-4 h-4 mr-2" />
                На главную
              </Button>

              <Button
                variant="outline"
                onClick={onReviewAnswers}
                className="w-full"
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Просмотреть ответы
              </Button>

              <Button
                onClick={onRestart}
                className="w-full"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Пройти заново
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

