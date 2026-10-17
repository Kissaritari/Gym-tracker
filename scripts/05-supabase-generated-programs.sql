-- Apply after 04-supabase-workout-integrity.sql. Safe to rerun.
BEGIN;
CREATE OR REPLACE FUNCTION public.create_training_program_details(p_program jsonb)
RETURNS SETOF public.workout_plans
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
DECLARE
  plan public.workout_plans;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_program IS NULL OR jsonb_typeof(p_program) <> 'object'
    OR COALESCE(length(btrim(p_program->>'name')), 0) NOT BETWEEN 1 AND 120
    OR COALESCE(length(p_program->>'description'), 0) > 2000
    OR COALESCE(p_program->>'difficulty_level', '') NOT IN ('beginner','intermediate','advanced')
    OR COALESCE((p_program->>'duration_weeks')::integer, 0) NOT BETWEEN 1 AND 52
    OR jsonb_typeof(p_program->'exercises') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Invalid program';
  END IF;
  IF jsonb_array_length(p_program->'exercises') NOT BETWEEN 1 AND 84 THEN
    RAISE EXCEPTION 'Choose 1 to 84 planned exercises';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset(p_program->'exercises') AS ex(
      exercise_id uuid, day_number integer, sets integer, reps text, rest_seconds integer
    ) LEFT JOIN public.exercises e ON e.id = ex.exercise_id
    WHERE e.id IS NULL OR COALESCE(ex.day_number,0) NOT BETWEEN 1 AND 7
      OR COALESCE(ex.sets,0) NOT BETWEEN 1 AND 20
      OR COALESCE(length(btrim(ex.reps)),0) NOT BETWEEN 1 AND 80
      OR COALESCE(ex.rest_seconds,-1) NOT BETWEEN 0 AND 600
  ) THEN RAISE EXCEPTION 'Invalid exercise prescription'; END IF;
  INSERT INTO public.workout_plans(name, description, difficulty_level, duration_weeks, created_by, is_public)
  VALUES (btrim(p_program->>'name'), p_program->>'description', p_program->>'difficulty_level',
    (p_program->>'duration_weeks')::integer, auth.uid(), false) RETURNING * INTO plan;
  INSERT INTO public.workout_plan_exercises(workout_plan_id, exercise_id, day_number, sets, reps, rest_seconds, order_in_day)
  SELECT plan.id, (entry->>'exercise_id')::uuid, (entry->>'day_number')::integer,
    (entry->>'sets')::integer, entry->>'reps', (entry->>'rest_seconds')::integer,
    (row_number() OVER (PARTITION BY entry->>'day_number' ORDER BY position))::integer
  FROM jsonb_array_elements(p_program->'exercises') WITH ORDINALITY AS items(entry, position);
  RETURN NEXT plan;
END;
$$;
REVOKE ALL ON FUNCTION public.create_training_program_details(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_training_program_details(jsonb) TO authenticated;
COMMIT;
