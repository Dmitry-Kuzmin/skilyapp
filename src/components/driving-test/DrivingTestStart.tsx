import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LicenseType } from '@/types/driving-test';
import { Bike, Car, Bus, Play } from 'lucide-react';

interface DrivingTestStartProps {
  onStart: (licenseType: LicenseType, questionCount: number) => void;
}

export const DrivingTestStart = ({ onStart }: DrivingTestStartProps) => {
  const [selectedLicense, setSelectedLicense] = useState<LicenseType>('B');
  const [questionCount, setQuestionCount] = useState<number>(30);

  const licenseTypes = [
    {
      type: 'A1' as LicenseType,
      name: 'Категория A1',
      description: 'Мотоциклы (легкие)',
      icon: Bike,
      totalQuestions: 899,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 hover:bg-orange-100',
      borderColor: 'border-orange-200',
    },
    {
      type: 'B' as LicenseType,
      name: 'Категория B',
      description: 'Легковые автомобили',
      icon: Car,
      totalQuestions: 2890,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 hover:bg-blue-100',
      borderColor: 'border-blue-200',
    },
    {
      type: 'D' as LicenseType,
      name: 'Категория D',
      description: 'Автобусы',
      icon: Bus,
      totalQuestions: 166,
      color: 'text-green-600',
      bgColor: 'bg-green-50 hover:bg-green-100',
      borderColor: 'border-green-200',
    },
  ];

  const questionCountOptions = [10, 20, 30, 40, 50];

  const handleStart = () => {
    onStart(selectedLicense, questionCount);
  };

  const selectedLicenseData = licenseTypes.find(l => l.type === selectedLicense);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      <div className="max-w-4xl mx-auto pt-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Экзамен DGT (Испания)
          </h1>
          <p className="text-gray-600">
            Практические тесты для получения водительских прав
          </p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Выберите категорию</CardTitle>
            <CardDescription>
              Выберите категорию водительских прав и количество вопросов для теста
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Выбор категории */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Категория прав</Label>
              <RadioGroup
                value={selectedLicense}
                onValueChange={(value) => setSelectedLicense(value as LicenseType)}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                {licenseTypes.map((license) => {
                  const Icon = license.icon;
                  const isSelected = selectedLicense === license.type;
                  
                  return (
                    <label
                      key={license.type}
                      className={`cursor-pointer transition-all ${
                        isSelected
                          ? `${license.bgColor} ${license.borderColor} border-2`
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-gray-200'
                      } rounded-lg p-4`}
                    >
                      <div className="flex items-start gap-3">
                        <RadioGroupItem value={license.type} className="mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className={`w-5 h-5 ${license.color}`} />
                            <span className="font-semibold">{license.name}</span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {license.description}
                          </p>
                          <Badge variant="secondary" className="text-xs">
                            {license.totalQuestions} вопросов
                          </Badge>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </RadioGroup>
            </div>

            {/* Выбор количества вопросов */}
            <div className="space-y-3">
              <Label htmlFor="question-count" className="text-lg font-semibold">
                Количество вопросов
              </Label>
              <Select
                value={questionCount.toString()}
                onValueChange={(value) => setQuestionCount(parseInt(value))}
              >
                <SelectTrigger id="question-count" className="w-full">
                  <SelectValue placeholder="Выберите количество вопросов" />
                </SelectTrigger>
                <SelectContent>
                  {questionCountOptions.map((count) => (
                    <SelectItem key={count} value={count.toString()}>
                      {count} вопросов
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Информация о выбранном тесте */}
            {selectedLicenseData && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold mb-2">Параметры теста:</h3>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>• Категория: {selectedLicenseData.name}</li>
                  <li>• Количество вопросов: {questionCount}</li>
                  <li>• Доступно в базе: {selectedLicenseData.totalQuestions} вопросов</li>
                  <li>• Минимум для сдачи: {Math.ceil(questionCount * 0.9)} правильных ответов (90%)</li>
                </ul>
              </div>
            )}

            {/* Кнопка запуска */}
            <Button
              onClick={handleStart}
              size="lg"
              className="w-full text-lg"
            >
              <Play className="w-5 h-5 mr-2" />
              Начать тест
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

