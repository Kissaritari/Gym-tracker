-- Upgrade existing Supabase installations before deploying this version. Safe to rerun.
BEGIN;
ALTER TABLE public.workout_plan_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_logs ADD COLUMN IF NOT EXISTS workout_plan_exercise_id UUID
  REFERENCES public.workout_plan_exercises(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_exercise_logs_session_plan_exercise
  ON public.exercise_logs(session_id, workout_plan_exercise_id) WHERE workout_plan_exercise_id IS NOT NULL;

DROP POLICY IF EXISTS "Users can delete own workout plans" ON public.workout_plans;
CREATE POLICY "Users can delete own workout plans" ON public.workout_plans
  FOR DELETE TO authenticated USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can view accessible planned exercises" ON public.workout_plan_exercises;
CREATE POLICY "Users can view accessible planned exercises" ON public.workout_plan_exercises
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.workout_plans wp WHERE wp.id = workout_plan_id AND (wp.is_public OR wp.created_by = auth.uid())
  ));
DROP POLICY IF EXISTS "Users can manage own planned exercises" ON public.workout_plan_exercises;
CREATE POLICY "Users can manage own planned exercises" ON public.workout_plan_exercises
  FOR ALL TO authenticated USING (EXISTS (
    SELECT 1 FROM public.workout_plans wp WHERE wp.id = workout_plan_id AND wp.created_by = auth.uid()
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.workout_plans wp WHERE wp.id = workout_plan_id AND wp.created_by = auth.uid()
  ));

-- Restrict new logs to the user's active session and the exact planned exercise.
DROP POLICY IF EXISTS "Users can view own exercise logs" ON public.exercise_logs;
DROP POLICY IF EXISTS "Users can read own exercise logs" ON public.exercise_logs;
CREATE POLICY "Users can read own exercise logs" ON public.exercise_logs
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.workout_sessions ws WHERE ws.id = session_id AND ws.user_id = auth.uid()
  ));
DROP POLICY IF EXISTS "Users can log active planned exercises" ON public.exercise_logs;
CREATE POLICY "Users can log active planned exercises" ON public.exercise_logs
  FOR INSERT TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM public.workout_sessions ws
    JOIN public.workout_plan_exercises wpe ON wpe.workout_plan_id = ws.workout_plan_id
    WHERE ws.id = session_id AND ws.user_id = auth.uid() AND ws.completed_at IS NULL
      AND wpe.id = workout_plan_exercise_id AND wpe.exercise_id = exercise_logs.exercise_id
  ));

-- PostgREST executes this function in a single transaction; an exercise insert
-- failure rolls back the plan, so no client-side cleanup permission is needed.
CREATE OR REPLACE FUNCTION public.create_training_program(p_name text, p_description text, p_exercise_ids uuid[])
RETURNS SETOF public.workout_plans
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
DECLARE
  plan public.workout_plans;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_name IS NULL OR btrim(p_name) = '' THEN RAISE EXCEPTION 'Program name is required'; END IF;
  IF COALESCE(cardinality(p_exercise_ids), 0) = 0 THEN RAISE EXCEPTION 'Choose at least one exercise'; END IF;
  IF (SELECT count(*) FROM public.exercises WHERE id = ANY(p_exercise_ids)) <> cardinality(p_exercise_ids) THEN
    RAISE EXCEPTION 'Select valid, distinct exercises';
  END IF;
  INSERT INTO public.workout_plans (name, description, difficulty_level, duration_weeks, created_by, is_public)
  VALUES (btrim(p_name), p_description, 'beginner', 4, auth.uid(), false) RETURNING * INTO plan;
  INSERT INTO public.workout_plan_exercises (workout_plan_id, exercise_id, day_number, sets, reps, rest_seconds, order_in_day)
  SELECT plan.id, exercise_id, 1, 3, '8-12', 60, position::integer
  FROM unnest(p_exercise_ids) WITH ORDINALITY AS selected(exercise_id, position);
  RETURN NEXT plan;
END;
$$;
REVOKE ALL ON FUNCTION public.create_training_program(text, text, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_training_program(text, text, uuid[]) TO authenticated;
COMMIT;
