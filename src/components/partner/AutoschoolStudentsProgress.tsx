// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  GraduationCap, 
  CheckCircle2, 
  AlertCircle, 
  XCircle,
  TrendingUp,
  Search,
  Filter,
  Calendar,
  Target,
  Award,
  UserPlus
} from "lucide-react";
import { motion } from "framer-motion";
import { AddStudentDialog } from "./AddStudentDialog";

interface StudentProgress {
  student_id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  student_group: string | null;
  enrollment_date: string | null;
  expected_exam_date: string | null;
  total_tests_taken: number;
  total_questions_answered: number;
  correct_answers: number;
  accuracy_rate: number;
  last_test_at: string | null;
  esencial_tests_taken: number;
  priority_tests_taken: number;
  general_tests_taken: number;
  exam_ready: boolean;
  exam_readiness_score: number;
  readiness_status: 'not_ready' | 'in_progress' | 'almost_ready' | 'ready';
  days_since_last_test: number | null;
  is_active: boolean;
}

interface AutoschoolSummary {
  total_students: number;
  active_students: number;
  ready_for_exam: number;
  almost_ready: number;
  avg_accuracy: number;
  avg_tests_per_student: number;
  students_tested_today: number;
  students_tested_this_week: number;
}

interface Props {
  partnerId: string;
}

export function AutoschoolStudentsProgress({ partnerId }: Props) {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [summary, setSummary] = useState<AutoschoolSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showAddStudentDialog, setShowAddStudentDialog] = useState(false);

  useEffect(() => {
    loadStudentsData();
  }, [partnerId]);

  const loadStudentsData = async () => {
    try {
      setLoading(true);

      // Загрузить прогресс студентов
      // @ts-ignore
      const { data: studentsData, error: studentsError } = await supabase
        .rpc('get_autoschool_students_progress', {
          p_partner_id: partnerId
        });

      if (studentsError) throw studentsError;

      if (studentsData) {
        setStudents(studentsData);
      }

      // Загрузить сводную статистику
      // @ts-ignore
      const { data: summaryData, error: summaryError } = await supabase
        .rpc('get_autoschool_summary', {
          p_partner_id: partnerId
        });

      if (summaryError) throw summaryError;

      if (summaryData && summaryData.length > 0) {
        setSummary(summaryData[0]);
      }
    } catch (error: any) {
      console.error('[AutoschoolStudentsProgress] Error:', error);
      toast.error("Ошибка загрузки данных студентов");
    } finally {
      setLoading(false);
    }
  };

  const getReadinessBadge = (status: string, isReady: boolean) => {
    if (isReady || status === 'ready') {
      return (
        <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Готов к экзамену
        </Badge>
      );
    }
    if (status === 'almost_ready') {
      return (
        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
          <AlertCircle className="h-3 w-3 mr-1" />
          Почти готов
        </Badge>
      );
    }
    if (status === 'in_progress') {
      return (
        <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
          <TrendingUp className="h-3 w-3 mr-1" />
          В процессе
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-slate-800/50 text-slate-400">
        <XCircle className="h-3 w-3 mr-1" />
        Только начал
      </Badge>
    );
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         student.student_group?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' ||
                         (filterStatus === 'ready' && student.exam_ready) ||
                         (filterStatus === 'not_ready' && !student.exam_ready) ||
                         (filterStatus === 'active' && student.is_active);
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <Card className="bg-slate-900/80 border-slate-800">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Сводная статистика */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900/80 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-400">Всего студентов</p>
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <p className="text-3xl font-black">{summary.total_students}</p>
              <p className="text-xs text-slate-500 mt-1">
                Активных: {summary.active_students}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-blue-500/10 border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-400">Готовы к экзамену</p>
                <CheckCircle2 className="h-5 w-5 text-green-400" />
              </div>
              <p className="text-3xl font-black text-green-400">{summary.ready_for_exam}</p>
              <p className="text-xs text-slate-500 mt-1">
                Почти готовы: {summary.almost_ready}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-400">Средняя точность</p>
                <Target className="h-5 w-5 text-primary" />
              </div>
              <p className="text-3xl font-black text-primary">
                {summary.avg_accuracy.toFixed(1)}%
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Тестов: {summary.avg_tests_per_student.toFixed(1)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-400">Тестировались</p>
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <p className="text-3xl font-black">{summary.students_tested_today}</p>
              <p className="text-xs text-slate-500 mt-1">
                За неделю: {summary.students_tested_this_week}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Фильтры */}
      <Card className="bg-slate-900/80 border-slate-800">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Поиск по имени или группе..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-800/50 border-slate-700"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('all')}
                className="border-slate-700"
              >
                Все
              </Button>
              <Button
                variant={filterStatus === 'ready' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('ready')}
                className="border-green-500/30"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Готовы
              </Button>
              <Button
                variant={filterStatus === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('active')}
                className="border-slate-700"
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                Активные
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Список студентов */}
      <Card className="bg-slate-900/80 border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                Мои Студенты ({filteredStudents.length})
              </CardTitle>
              <CardDescription>
                Детальный прогресс и готовность к экзамену DGT
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowAddStudentDialog(true)}
              size="sm"
              className="bg-primary hover:bg-primary/90"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Добавить студента
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <GraduationCap className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Студентов не найдено</p>
              <p className="text-sm">
                {searchQuery ? "Попробуйте изменить поисковый запрос" : "Добавьте студентов в систему"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredStudents.map((student, index) => (
                <motion.div
                  key={student.student_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 rounded-lg border border-slate-800 bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Аватар и имя */}
                    <Avatar className="h-12 w-12 border-2 border-slate-700">
                      <AvatarImage src={student.avatar_url || undefined} />
                      <AvatarFallback className="bg-slate-800 text-slate-400">
                        {student.full_name?.substring(0, 2).toUpperCase() || "??"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <h3 className="font-bold text-slate-200">
                            {student.full_name || "Имя не указано"}
                          </h3>
                          {student.student_group && (
                            <p className="text-sm text-slate-500">{student.student_group}</p>
                          )}
                        </div>
                        {getReadinessBadge(student.readiness_status, student.exam_ready)}
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        <div>
                          <p className="text-xs text-slate-500">Тестов</p>
                          <p className="text-lg font-bold">{student.total_tests_taken}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Точность</p>
                          <p className={`text-lg font-bold ${
                            student.accuracy_rate >= 90 ? 'text-green-400' :
                            student.accuracy_rate >= 80 ? 'text-amber-400' :
                            'text-red-400'
                          }`}>
                            {student.accuracy_rate.toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Готовность</p>
                          <div className="flex items-center gap-1">
                            <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  student.exam_readiness_score >= 80 ? 'bg-green-500' :
                                  student.exam_readiness_score >= 60 ? 'bg-amber-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${student.exam_readiness_score}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-slate-400">
                              {student.exam_readiness_score}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Последний тест</p>
                          <p className="text-sm font-medium text-slate-400">
                            {student.last_test_at ? (
                              student.days_since_last_test !== null ? (
                                student.days_since_last_test === 0 ? 'Сегодня' :
                                student.days_since_last_test === 1 ? 'Вчера' :
                                `${student.days_since_last_test}д назад`
                              ) : 'Давно'
                            ) : 'Никогда'}
                          </p>
                        </div>
                      </div>

                      {/* Детали по типам тестов */}
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>
                          Esencial: <span className="text-slate-400 font-medium">{student.esencial_tests_taken}</span>
                        </span>
                        <span>
                          Priority: <span className="text-slate-400 font-medium">{student.priority_tests_taken}</span>
                        </span>
                        <span>
                          General: <span className="text-slate-400 font-medium">{student.general_tests_taken}</span>
                        </span>
                      </div>

                      {/* Warnings */}
                      {!student.is_active && student.days_since_last_test && student.days_since_last_test > 7 && (
                        <div className="mt-2 p-2 rounded bg-amber-500/10 border border-amber-500/30">
                          <p className="text-xs text-amber-300">
                            ⚠️ Неактивен {student.days_since_last_test} дней
                          </p>
                        </div>
                      )}

                      {student.exam_ready && student.expected_exam_date && (
                        <div className="mt-2 p-2 rounded bg-green-500/10 border border-green-500/30">
                          <p className="text-xs text-green-300 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Планируемый экзамен: {new Date(student.expected_exam_date).toLocaleDateString('ru-RU')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Инструкции */}
      <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            Критерии готовности к экзамену DGT
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-300">
          <p><strong>✅ Готов:</strong> ≥15 тестов, ≥90% точность, все типы тестов пройдены</p>
          <p><strong>⚠️ Почти готов:</strong> ≥10 тестов, ≥85% точность</p>
          <p><strong>📚 В процессе:</strong> ≥5 тестов или ≥70% точность</p>
          <p><strong>❌ Не готов:</strong> {'<'}5 тестов или {'<'}70% точность</p>
          <div className="mt-3 pt-3 border-t border-slate-700">
            <p className="text-xs text-slate-400">
              💡 <strong>Совет:</strong> Рекомендуем отправлять на экзамен только студентов с индикатором "Готов к экзамену"
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Диалог добавления студента */}
      <AddStudentDialog
        open={showAddStudentDialog}
        onOpenChange={setShowAddStudentDialog}
        partnerId={partnerId}
        onStudentAdded={loadStudentsData}
      />
    </div>
  );
}

