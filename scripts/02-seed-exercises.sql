-- Insert sample exercises
INSERT INTO public.exercises (name, description, muscle_groups, equipment, instructions, tips) VALUES
('Push-ups', 'Classic bodyweight chest exercise', ARRAY['chest', 'shoulders', 'triceps'], 'None', 'Start in plank position, lower body until chest nearly touches ground, push back up', 'Keep core tight and maintain straight line from head to heels'),
('Squats', 'Fundamental lower body exercise', ARRAY['quadriceps', 'glutes', 'hamstrings'], 'None', 'Stand with feet shoulder-width apart, lower hips back and down, return to standing', 'Keep knees aligned with toes and chest up'),
('Plank', 'Core strengthening exercise', ARRAY['core', 'shoulders'], 'None', 'Hold push-up position with forearms on ground', 'Keep body in straight line, breathe normally'),
('Lunges', 'Single-leg strength exercise', ARRAY['quadriceps', 'glutes', 'hamstrings'], 'None', 'Step forward, lower back knee toward ground, return to start', 'Keep front knee over ankle, not past toes'),
('Burpees', 'Full-body cardio exercise', ARRAY['full body'], 'None', 'Squat down, jump back to plank, do push-up, jump feet to hands, jump up', 'Move quickly but maintain good form'),
('Mountain Climbers', 'Cardio and core exercise', ARRAY['core', 'shoulders', 'legs'], 'None', 'Start in plank, alternate bringing knees to chest rapidly', 'Keep hips level and core engaged'),
('Jumping Jacks', 'Cardio warm-up exercise', ARRAY['full body'], 'None', 'Jump feet apart while raising arms overhead, return to start', 'Land softly and maintain rhythm'),
('Dumbbell Bench Press', 'Chest strengthening exercise', ARRAY['chest', 'shoulders', 'triceps'], 'Dumbbells, Bench', 'Lie on bench, press dumbbells up from chest level', 'Control the weight on both up and down phases'),
('Deadlifts', 'Posterior chain exercise', ARRAY['hamstrings', 'glutes', 'back'], 'Barbell or Dumbbells', 'Hinge at hips, lower weight while keeping back straight, return to standing', 'Keep bar close to body and engage core'),
('Pull-ups', 'Upper body pulling exercise', ARRAY['back', 'biceps'], 'Pull-up bar', 'Hang from bar, pull body up until chin clears bar, lower with control', 'Use full range of motion and avoid swinging');

-- Insert sample workout plans
INSERT INTO public.workout_plans (name, description, difficulty_level, duration_weeks, is_public) VALUES
('Beginner Bodyweight', 'Perfect for starting your fitness journey with no equipment needed', 'beginner', 4, true),
('Intermediate Strength', 'Build strength with basic equipment', 'intermediate', 6, true),
('Advanced HIIT', 'High-intensity interval training for experienced athletes', 'advanced', 8, true);

-- Get the workout plan IDs for linking exercises
DO $$
DECLARE
    beginner_plan_id UUID;
    intermediate_plan_id UUID;
    advanced_plan_id UUID;
    pushup_id UUID;
    squat_id UUID;
    plank_id UUID;
    lunge_id UUID;
    burpee_id UUID;
    mountain_climber_id UUID;
    jumping_jack_id UUID;
    bench_press_id UUID;
    deadlift_id UUID;
    pullup_id UUID;
BEGIN
    -- Get plan IDs
    SELECT id INTO beginner_plan_id FROM public.workout_plans WHERE name = 'Beginner Bodyweight';
    SELECT id INTO intermediate_plan_id FROM public.workout_plans WHERE name = 'Intermediate Strength';
    SELECT id INTO advanced_plan_id FROM public.workout_plans WHERE name = 'Advanced HIIT';
    
    -- Get exercise IDs
    SELECT id INTO pushup_id FROM public.exercises WHERE name = 'Push-ups';
    SELECT id INTO squat_id FROM public.exercises WHERE name = 'Squats';
    SELECT id INTO plank_id FROM public.exercises WHERE name = 'Plank';
    SELECT id INTO lunge_id FROM public.exercises WHERE name = 'Lunges';
    SELECT id INTO burpee_id FROM public.exercises WHERE name = 'Burpees';
    SELECT id INTO mountain_climber_id FROM public.exercises WHERE name = 'Mountain Climbers';
    SELECT id INTO jumping_jack_id FROM public.exercises WHERE name = 'Jumping Jacks';
    SELECT id INTO bench_press_id FROM public.exercises WHERE name = 'Dumbbell Bench Press';
    SELECT id INTO deadlift_id FROM public.exercises WHERE name = 'Deadlifts';
    SELECT id INTO pullup_id FROM public.exercises WHERE name = 'Pull-ups';
    
    -- Beginner plan exercises (3 days)
    INSERT INTO public.workout_plan_exercises (workout_plan_id, exercise_id, day_number, sets, reps, rest_seconds, order_in_day) VALUES
    (beginner_plan_id, jumping_jack_id, 1, 2, '30 seconds', 30, 1),
    (beginner_plan_id, pushup_id, 1, 3, '5-8', 60, 2),
    (beginner_plan_id, squat_id, 1, 3, '8-12', 60, 3),
    (beginner_plan_id, plank_id, 1, 3, '20-30 seconds', 60, 4),
    
    (beginner_plan_id, jumping_jack_id, 2, 2, '30 seconds', 30, 1),
    (beginner_plan_id, lunge_id, 2, 3, '6-8 each leg', 60, 2),
    (beginner_plan_id, pushup_id, 2, 3, '5-8', 60, 3),
    (beginner_plan_id, plank_id, 2, 3, '20-30 seconds', 60, 4),
    
    (beginner_plan_id, jumping_jack_id, 3, 2, '30 seconds', 30, 1),
    (beginner_plan_id, squat_id, 3, 3, '10-15', 60, 2),
    (beginner_plan_id, pushup_id, 3, 3, '6-10', 60, 3),
    (beginner_plan_id, mountain_climber_id, 3, 3, '20 seconds', 60, 4);
    
    -- Intermediate plan exercises
    INSERT INTO public.workout_plan_exercises (workout_plan_id, exercise_id, day_number, sets, reps, rest_seconds, order_in_day) VALUES
    (intermediate_plan_id, bench_press_id, 1, 4, '8-10', 90, 1),
    (intermediate_plan_id, squat_id, 1, 4, '10-12', 90, 2),
    (intermediate_plan_id, pullup_id, 1, 3, '5-8', 90, 3),
    
    (intermediate_plan_id, deadlift_id, 2, 4, '6-8', 120, 1),
    (intermediate_plan_id, pushup_id, 2, 4, '12-15', 60, 2),
    (intermediate_plan_id, lunge_id, 2, 3, '10-12 each leg', 60, 3);
    
    -- Advanced plan exercises
    INSERT INTO public.workout_plan_exercises (workout_plan_id, exercise_id, day_number, sets, reps, rest_seconds, order_in_day) VALUES
    (advanced_plan_id, burpee_id, 1, 5, '45 seconds', 15, 1),
    (advanced_plan_id, mountain_climber_id, 1, 5, '45 seconds', 15, 2),
    (advanced_plan_id, jumping_jack_id, 1, 5, '45 seconds', 15, 3),
    
    (advanced_plan_id, squat_id, 2, 6, '20', 30, 1),
    (advanced_plan_id, pushup_id, 2, 6, '15', 30, 2),
    (advanced_plan_id, plank_id, 2, 4, '60 seconds', 30, 3);
END $$;
