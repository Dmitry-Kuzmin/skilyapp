// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  Target,
  Calendar,
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
  const [filterStatus, setFilterStatus] = useState<'all' | 'ready' | 'active'>('all');
  const [showAddStudentDialog, setShowAddStudentDialog] = useState(false);

  useEffect(() => {
    loadStudentsData();
  }, [partnerId]);

  const loadStudentsData = async () => {
    try {
      setLoading(true);

      const { data: studentsData, error: studentsError } = await supabase
        .rpc('get_autoschool_students_progress', {
          p_partner_id: partnerId
        });

      if (studentsError) throw studentsError;

      if (studentsData) {
        setStudents(studentsData);
      }

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
      toast.error("Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  };

  const getReadinessConfig = (status: string, isReady: boolean) => {
    if (isReady || status === 'ready') {
      return { label: "Готов", icon: CheckCircle2, color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
    }
    if (status === 'almost_ready') {
      return { label: "Почти", icon: AlertCircle, color: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
    }
    if (status === 'in_progress') {
      return { label: "Учится", icon: TrendingUp, color: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
    }
    return { label: "Начал", icon: XCircle, color: "bg-zinc-800 text-zinc-400 border-zinc-700" };
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         student.student_group?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' ||
                         (filterStatus === 'ready' && student.exam_ready) ||
                         (filterStatus === 'active' && student.is_active);
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin h-6 w-6 border-3 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Студенты</span>
                <GraduationCap className="h-4 w-4 text-zinc-400" />
              </div>
              <p className="text-2xl font-bold text-white">{summary.total_students}</p>
              <p className="text-xs text-zinc-500 mt-1">
                Активных: {summary.active_students}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Готовы</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-emerald-400">{summary.ready_for_exam}</p>
              <p className="text-xs text-zinc-500 mt-1">
                Почти: {summary.almost_ready}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Точность</span>
                <Target className="h-4 w-4 text-indigo-400" />
              </div>
              <p className="text-2xl font-bold text-white">
                {summary.avg_accuracy.toFixed(1)}%
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Тестов: {summary.avg_tests_per_student.toFixed(1)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Сегодня</span>
                <Calendar className="h-4 w-4 text-zinc-400" />
              </div>
              <p className="text-2xl font-bold text-white">{summary.students_tested_today}</p>
              <p className="text-xs text-zinc-500 mt-1">
                Неделя: {summary.students_tested_this_week}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Поиск студента..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            <button 
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filterStatus === 'all' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Все
            </button>
            <button 
              onClick={() => setFilterStatus('ready')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filterStatus === 'ready' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Готовы
            </button>
            <button 
              onClick={() => setFilterStatus('active')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filterStatus === 'active' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Активные
            </button>
          </div>
          <button
            onClick={() => setShowAddStudentDialog(true)}
            className="bg-white text-black hover:bg-zinc-200 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <UserPlus size={14} />
            Добавить
          </button>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-zinc-800 border border-zinc-700 mb-4">
              <GraduationCap className="w-8 h-8 text-zinc-500" />
            </div>
            <h3 className="text-zinc-200 font-medium mb-1">Студенты не найдены</h3>
            <p className="text-zinc-500 text-sm">
              {searchQuery ? "Измените запрос" : "Добавьте первого студента"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  <th className="px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Студент</th>
                  <th className="px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Тесты</th>
                  <th className="px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Точность</th>
                  <th className="px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Готовность</th>
                  <th className="px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Последний тест</th>
                  <th className="px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredStudents.map((student, index) => {
                  const readinessConfig = getReadinessConfig(student.readiness_status, student.exam_ready);
                  const ReadinessIcon = readinessConfig.icon;
                  
                  return (
                    <motion.tr
                      key={student.student_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="group hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-zinc-700">
                            <AvatarImage src={student.avatar_url || undefined} />
                            <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs">
                              {student.full_name?.substring(0, 2).toUpperCase() || "??"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-white">
                              {student.full_name || "Без имени"}
                            </p>
                            {student.student_group && (
                              <p className="text-xs text-zinc-500">{student.student_group}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-medium text-zinc-300">
                          {student.total_tests_taken}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-sm font-semibold ${
                          student.accuracy_rate >= 90 ? 'text-emerald-400' :
                          student.accuracy_rate >= 80 ? 'text-amber-400' :
                          'text-red-400'
                        }`}>
                          {student.accuracy_rate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 bg-zinc-800 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                student.exam_readiness_score >= 80 ? 'bg-emerald-500' :
                                student.exam_readiness_score >= 60 ? 'bg-amber-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${student.exam_readiness_score}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-zinc-400 w-8">
                            {student.exam_readiness_score}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-zinc-500">
                          {student.last_test_at ? (
                            student.days_since_last_test !== null ? (
                              student.days_since_last_test === 0 ? 'Сегодня' :
                              student.days_since_last_test === 1 ? 'Вчера' :
                              `${student.days_since_last_test}д`
                            ) : 'Давно'
                          ) : 'Никогда'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${readinessConfig.color}`}>
                          <ReadinessIcon className="w-3 h-3" />
                          {readinessConfig.label}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
        <p className="text-xs text-indigo-400 mb-2 font-semibold uppercase tracking-wider">
          Критерии готовности
        </p>
        <div className="space-y-1 text-xs text-zinc-400">
          <p>• <strong>Готов:</strong> ≥15 тестов, ≥90% точность</p>
          <p>• <strong>Почти:</strong> ≥10 тестов, ≥85% точность</p>
          <p>• <strong>Учится:</strong> ≥5 тестов или ≥70% точность</p>
        </div>
      </div>

      <AddStudentDialog
        open={showAddStudentDialog}
        onOpenChange={setShowAddStudentDialog}
        partnerId={partnerId}
        onStudentAdded={loadStudentsData}
      />
    </div>
  );
}
