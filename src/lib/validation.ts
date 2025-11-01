import { z } from 'zod';

// User progress validation
export const userProgressSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  question_id: z.string().uuid('Invalid question ID'),
  is_answered: z.boolean(),
  is_correct: z.boolean(),
  attempts: z.number().int().min(1).max(10, 'Too many attempts'),
  time_spent_seconds: z.number().int().min(0).max(7200, 'Invalid time'),
  last_attempt_at: z.string().datetime().optional(),
  answer_history: z.array(z.any()).optional()
});

// Game session validation
export const gameSessionSchema = z.object({
  user_id: z.string().uuid(),
  game_type: z.enum(['test_exam', 'test_practice', 'matching', 'race']),
  score: z.number().int().min(0).max(100),
  total_questions: z.number().int().min(1).max(100),
  duration_seconds: z.number().int().min(0).max(7200),
  mode: z.string().optional(),
  topic: z.string().optional(),
  questions_data: z.any().optional()
});

// Profile settings validation
export const settingsSchema = z.object({
  theme: z.enum(['light', 'dark']),
  language: z.enum(['ru', 'en', 'es']),
  notifications: z.boolean()
});

// Profile update validation
export const profileUpdateSchema = z.object({
  boosts: z.number().int().min(0).max(100, 'Maximum boosts exceeded').optional(),
  xp: z.number().int().min(0).max(1000000).optional(),
  coins: z.number().int().min(0).max(1000000).optional(),
  streak_days: z.number().int().min(0).max(365).optional(),
  settings: settingsSchema.optional()
});
