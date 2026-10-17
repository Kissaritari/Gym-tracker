-- Upgrade existing Neon installations before deploying this version. Safe to rerun.
BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'name') THEN
    EXECUTE 'UPDATE public.users SET full_name = COALESCE(full_name, name)';
  END IF;
END;
$$;
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS workout_plan_exercise_id UUID
  REFERENCES workout_plan_exercises(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_exercise_logs_session_plan_exercise
  ON exercise_logs(session_id, workout_plan_exercise_id) WHERE workout_plan_exercise_id IS NOT NULL;
COMMIT;
