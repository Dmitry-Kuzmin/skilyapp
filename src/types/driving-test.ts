// Типы для экзамена на водительские права DGT

export type LicenseType = 'A1' | 'B' | 'D';

export interface DrivingTestQuestion {
  id: string;
  license_type: LicenseType;
  question_number: number;
  image_filename?: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  correct_answer: 'a' | 'b' | 'c';
  explanation?: string;
  created_at: string;
  updated_at: string;
}

export interface UserAnswer {
  question_id: string;
  question_number: number;
  user_answer: 'a' | 'b' | 'c' | null;
  correct_answer: 'a' | 'b' | 'c';
  is_correct: boolean;
  time_spent_seconds: number;
}

export interface UserDrivingTestProgress {
  id: string;
  user_id: string;
  license_type: LicenseType;
  session_started_at: string;
  session_completed_at?: string;
  total_questions: number;
  current_question_index: number;
  correct_answers: number;
  incorrect_answers: number;
  skipped_questions: number;
  score_percent: number;
  time_spent_seconds: number;
  is_completed: boolean;
  answers_data: UserAnswer[];
  created_at: string;
  updated_at: string;
}

// Формат данных из JSON файла Anki
export interface AnkiQuestionData {
  img?: string;
  question: string;
  'a.': string;
  'b.': string;
  'c.': string;
  explanation: string;
  correct: string; // Формат: "1 0 0" для вариантов a, b, c
}

