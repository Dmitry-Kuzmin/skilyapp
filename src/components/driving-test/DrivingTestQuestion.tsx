import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DrivingTestQuestion as DrivingTestQuestionType } from '@/types/driving-test';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface DrivingTestQuestionProps {
  question: DrivingTestQuestionType;
  questionIndex: number;
  totalQuestions: number;
  userAnswer: 'a' | 'b' | 'c' | null;
  showResult: boolean;
  onAnswerSelect: (answer: 'a' | 'b' | 'c') => void;
  onNext: () => void;
  onPrevious: () => void;
  onShowExplanation: () => void;
}

export const DrivingTestQuestionComponent = ({
  question,
  questionIndex,
  totalQuestions,
  userAnswer,
  showResult,
  onAnswerSelect,
  onNext,
  onPrevious,
  onShowExplanation,
}: DrivingTestQuestionProps) => {
  const [showExplanation, setShowExplanation] = useState(false);

  const isCorrect = userAnswer === question.correct_answer;
  const options = [
    { key: 'a' as const, text: question.option_a },
    { key: 'b' as const, text: question.option_b },
    { key: 'c' as const, text: question.option_c },
  ];

  const handleShowExplanation = () => {
    setShowExplanation(!showExplanation);
    if (!showExplanation) {
      onShowExplanation();
    }
  };

  const getOptionStyles = (optionKey: 'a' | 'b' | 'c') => {
    if (!showResult) {
      return cn(
        'w-full text-left p-4 rounded-lg border-2 transition-all',
        userAnswer === optionKey
          ? 'border-primary bg-primary/10'
          : 'border-gray-200 hover:border-primary/50'
      );
    }

    const isCorrectAnswer = optionKey === question.correct_answer;
    const isUserAnswer = optionKey === userAnswer;

    if (isCorrectAnswer) {
      return 'w-full text-left p-4 rounded-lg border-2 border-green-500 bg-green-50';
    }

    if (isUserAnswer && !isCorrectAnswer) {
      return 'w-full text-left p-4 rounded-lg border-2 border-red-500 bg-red-50';
    }

    return 'w-full text-left p-4 rounded-lg border-2 border-gray-200 opacity-50';
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="text-sm">
            {question.license_type} - Вопрос {questionIndex + 1} из {totalQuestions}
          </Badge>
          {showResult && (
            <Badge variant={isCorrect ? 'default' : 'destructive'} className="text-sm">
              {isCorrect ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Правильно
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-1" />
                  Неправильно
                </>
              )}
            </Badge>
          )}
        </div>
        <CardTitle className="text-xl">{question.question_text}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Изображение вопроса */}
        {question.image_filename && (
          <div className="flex justify-center">
            <img
              src={`/images/dgt/${question.license_type}/${question.image_filename}`}
              alt="Иллюстрация к вопросу"
              className="max-w-full h-auto rounded-lg shadow-md"
              onError={(e) => {
                // Скрываем изображение, если оно не загрузилось
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Варианты ответов */}
        <div className="space-y-3">
          {options.map((option) => (
            <button
              key={option.key}
              onClick={() => !showResult && onAnswerSelect(option.key)}
              disabled={showResult}
              className={getOptionStyles(option.key)}
            >
              <div className="flex items-start gap-3">
                <span className="font-semibold text-lg min-w-[24px]">
                  {option.key.toUpperCase()}.
                </span>
                <span className="flex-1">{option.text}</span>
                {showResult && option.key === question.correct_answer && (
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                )}
                {showResult && option.key === userAnswer && option.key !== question.correct_answer && (
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Объяснение */}
        {showResult && question.explanation && (
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={handleShowExplanation}
              className="w-full mb-3"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              {showExplanation ? 'Скрыть объяснение' : 'Показать объяснение'}
            </Button>

            {showExplanation && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-gray-700 whitespace-pre-line">
                  {question.explanation}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Навигация */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={onPrevious}
            disabled={questionIndex === 0}
          >
            ← Назад
          </Button>
          
          {!showResult ? (
            <Button
              onClick={onNext}
              disabled={!userAnswer}
            >
              {questionIndex === totalQuestions - 1 ? 'Завершить' : 'Далее →'}
            </Button>
          ) : (
            <Button onClick={onNext}>
              {questionIndex === totalQuestions - 1 ? 'Результаты' : 'Далее →'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

