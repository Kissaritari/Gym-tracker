-- Add more diverse training programs
INSERT INTO public.workout_plans (name, description, difficulty_level, duration_weeks, is_public) VALUES
('Upper Body Strength', 'Focus on building upper body muscle and strength', 'intermediate', 6, true),
('Lower Body Power', 'Explosive lower body training for power and strength', 'advanced', 8, true),
('Full Body Beginner', 'Complete beginner program targeting all muscle groups', 'beginner', 4, true),
('Cardio HIIT Blast', 'High-intensity cardio for fat burning and endurance', 'intermediate', 4, true),
('Powerlifting Basics', 'Introduction to powerlifting movements', 'intermediate', 8, true),
('Bodyweight Mastery', 'Advanced bodyweight movements and progressions', 'advanced', 12, true),
('Quick Morning Routine', 'Short 15-minute morning workouts', 'beginner', 2, true),
('Athletic Performance', 'Sport-specific training for athletes', 'advanced', 10, true);

-- Add more exercises for variety
INSERT INTO public.exercises (name, description, muscle_groups, equipment, instructions, tips) VALUES
('Dumbbell Rows', 'Back strengthening exercise', ARRAY['back', 'biceps'], 'Dumbbells', 'Bend over, pull dumbbell to hip, squeeze shoulder blade', 'Keep core tight and avoid using momentum'),
('Overhead Press', 'Shoulder and tricep exercise', ARRAY['shoulders', 'triceps'], 'Dumbbells or Barbell', 'Press weight overhead from shoulder level', 'Keep core engaged and avoid arching back'),
('Romanian Deadlifts', 'Hamstring and glute focused deadlift', ARRAY['hamstrings', 'glutes'], 'Dumbbells or Barbell', 'Hinge at hips, lower weight while keeping legs straight', 'Feel stretch in hamstrings, keep weight close to body'),
('Goblet Squats', 'Squat variation with weight held at chest', ARRAY['quadriceps', 'glutes'], 'Dumbbell or Kettlebell', 'Hold weight at chest, squat down keeping chest up', 'Great for learning proper squat form'),
('Tricep Dips', 'Bodyweight tricep exercise', ARRAY['triceps', 'shoulders'], 'Chair or Bench', 'Lower body by bending arms, push back up', 'Keep body close to chair, control the movement'),
('Russian Twists', 'Core rotational exercise', ARRAY['core'], 'None or Weight', 'Sit with knees bent, rotate torso side to side', 'Keep feet off ground for added difficulty'),
('Wall Sits', 'Isometric leg exercise', ARRAY['quadriceps', 'glutes'], 'Wall', 'Slide down wall until thighs parallel, hold position', 'Keep back flat against wall, breathe normally'),
('Pike Push-ups', 'Shoulder-focused push-up variation', ARRAY['shoulders', 'triceps'], 'None', 'Start in downward dog, lower head toward ground', 'Great progression toward handstand push-ups'),
('Single Leg Glute Bridges', 'Unilateral glute exercise', ARRAY['glutes', 'hamstrings'], 'None', 'Bridge up on one leg, squeeze glute at top', 'Keep hips level, focus on working glute'),
('Bear Crawls', 'Full body crawling exercise', ARRAY['full body'], 'None', 'Crawl forward on hands and feet, knees off ground', 'Keep core tight, move opposite hand and foot together'),
('Box Jumps', 'Explosive leg exercise', ARRAY['quadriceps', 'glutes', 'calves'], 'Box or Platform', 'Jump onto box, land softly, step down', 'Start with lower box, focus on soft landing'),
('Farmer Walks', 'Grip and core strengthening', ARRAY['core', 'forearms', 'traps'], 'Heavy Weights', 'Hold heavy weights, walk with good posture', 'Keep shoulders back, take controlled steps'),
('High Knees', 'Cardio warm-up exercise', ARRAY['legs', 'core'], 'None', 'Run in place bringing knees to chest level', 'Pump arms, stay on balls of feet'),
('Bicycle Crunches', 'Core exercise with rotation', ARRAY['core'], 'None', 'Alternate bringing elbow to opposite knee', 'Control the movement, don\'t pull on neck'),
('Superman', 'Lower back strengthening', ARRAY['lower back', 'glutes'], 'None', 'Lie face down, lift chest and legs off ground', 'Hold briefly at top, lower with control');

-- Link exercises to new workout plans
DO $$
DECLARE
    upper_body_id UUID;
    lower_body_id UUID;
    full_body_id UUID;
    cardio_hiit_id UUID;
    powerlifting_id UUID;
    bodyweight_id UUID;
    morning_id UUID;
    athletic_id UUID;
    
    -- Exercise IDs
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
    dumbbell_row_id UUID;
    overhead_press_id UUID;
    romanian_dl_id UUID;
    goblet_squat_id UUID;
    tricep_dip_id UUID;
    russian_twist_id UUID;
    wall_sit_id UUID;
    pike_pushup_id UUID;
    glute_bridge_id UUID;
    bear_crawl_id UUID;
    box_jump_id UUID;
    farmer_walk_id UUID;
    high_knees_id UUID;
    bicycle_crunch_id UUID;
    superman_id UUID;
BEGIN
    -- Get new plan IDs
    SELECT id INTO upper_body_id FROM public.workout_plans WHERE name = 'Upper Body Strength';
    SELECT id INTO lower_body_id FROM public.workout_plans WHERE name = 'Lower Body Power';
    SELECT id INTO full_body_id FROM public.workout_plans WHERE name = 'Full Body Beginner';
    SELECT id INTO cardio_hiit_id FROM public.workout_plans WHERE name = 'Cardio HIIT Blast';
    SELECT id INTO powerlifting_id FROM public.workout_plans WHERE name = 'Powerlifting Basics';
    SELECT id INTO bodyweight_id FROM public.workout_plans WHERE name = 'Bodyweight Mastery';
    SELECT id INTO morning_id FROM public.workout_plans WHERE name = 'Quick Morning Routine';
    SELECT id INTO athletic_id FROM public.workout_plans WHERE name = 'Athletic Performance';
    
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
    SELECT id INTO dumbbell_row_id FROM public.exercises WHERE name = 'Dumbbell Rows';
    SELECT id INTO overhead_press_id FROM public.exercises WHERE name = 'Overhead Press';
    SELECT id INTO romanian_dl_id FROM public.exercises WHERE name = 'Romanian Deadlifts';
    SELECT id INTO goblet_squat_id FROM public.exercises WHERE name = 'Goblet Squats';
    SELECT id INTO tricep_dip_id FROM public.exercises WHERE name = 'Tricep Dips';
    SELECT id INTO russian_twist_id FROM public.exercises WHERE name = 'Russian Twists';
    SELECT id INTO wall_sit_id FROM public.exercises WHERE name = 'Wall Sits';
    SELECT id INTO pike_pushup_id FROM public.exercises WHERE name = 'Pike Push-ups';
    SELECT id INTO glute_bridge_id FROM public.exercises WHERE name = 'Single Leg Glute Bridges';
    SELECT id INTO bear_crawl_id FROM public.exercises WHERE name = 'Bear Crawls';
    SELECT id INTO box_jump_id FROM public.exercises WHERE name = 'Box Jumps';
    SELECT id INTO farmer_walk_id FROM public.exercises WHERE name = 'Farmer Walks';
    SELECT id INTO high_knees_id FROM public.exercises WHERE name = 'High Knees';
    SELECT id INTO bicycle_crunch_id FROM public.exercises WHERE name = 'Bicycle Crunches';
    SELECT id INTO superman_id FROM public.exercises WHERE name = 'Superman';
    
    -- Upper Body Strength Program (3 days)
    INSERT INTO public.workout_plan_exercises (workout_plan_id, exercise_id, day_number, sets, reps, rest_seconds, order_in_day) VALUES
    (upper_body_id, bench_press_id, 1, 4, '8-10', 90, 1),
    (upper_body_id, dumbbell_row_id, 1, 4, '8-10', 90, 2),
    (upper_body_id, overhead_press_id, 1, 3, '10-12', 75, 3),
    (upper_body_id, tricep_dip_id, 1, 3, '8-12', 60, 4),
    
    (upper_body_id, pullup_id, 2, 4, '5-8', 90, 1),
    (upper_body_id, pushup_id, 2, 4, '12-15', 60, 2),
    (upper_body_id, pike_pushup_id, 2, 3, '6-10', 75, 3),
    (upper_body_id, plank_id, 2, 3, '45-60 seconds', 60, 4),
    
    (upper_body_id, bench_press_id, 3, 3, '12-15', 60, 1),
    (upper_body_id, dumbbell_row_id, 3, 3, '12-15', 60, 2),
    (upper_body_id, overhead_press_id, 3, 3, '12-15', 60, 3),
    (upper_body_id, russian_twist_id, 3, 3, '20 each side', 45, 4);
    
    -- Lower Body Power Program (3 days)
    INSERT INTO public.workout_plan_exercises (workout_plan_id, exercise_id, day_number, sets, reps, rest_seconds, order_in_day) VALUES
    (lower_body_id, box_jump_id, 1, 5, '5', 120, 1),
    (lower_body_id, squat_id, 1, 4, '6-8', 120, 2),
    (lower_body_id, romanian_dl_id, 1, 4, '8-10', 90, 3),
    (lower_body_id, lunge_id, 1, 3, '10 each leg', 75, 4),
    
    (lower_body_id, deadlift_id, 2, 5, '5', 150, 1),
    (lower_body_id, goblet_squat_id, 2, 4, '12-15', 75, 2),
    (lower_body_id, glute_bridge_id, 2, 3, '12 each leg', 60, 3),
    (lower_body_id, wall_sit_id, 2, 3, '45-60 seconds', 60, 4),
    
    (lower_body_id, box_jump_id, 3, 4, '8', 90, 1),
    (lower_body_id, squat_id, 3, 4, '15-20', 75, 2),
    (lower_body_id, lunge_id, 3, 4, '12 each leg', 60, 3),
    (lower_body_id, farmer_walk_id, 3, 3, '30 seconds', 90, 4);
    
    -- Full Body Beginner Program (3 days)
    INSERT INTO public.workout_plan_exercises (workout_plan_id, exercise_id, day_number, sets, reps, rest_seconds, order_in_day) VALUES
    (full_body_id, jumping_jack_id, 1, 2, '30 seconds', 30, 1),
    (full_body_id, goblet_squat_id, 1, 3, '8-10', 60, 2),
    (full_body_id, pushup_id, 1, 3, '5-8', 60, 3),
    (full_body_id, plank_id, 1, 3, '20-30 seconds', 60, 4),
    (full_body_id, superman_id, 1, 3, '10-12', 45, 5),
    
    (full_body_id, high_knees_id, 2, 2, '30 seconds', 30, 1),
    (full_body_id, lunge_id, 2, 3, '6 each leg', 60, 2),
    (full_body_id, tricep_dip_id, 2, 3, '5-8', 60, 3),
    (full_body_id, bicycle_crunch_id, 2, 3, '10 each side', 45, 4),
    (full_body_id, wall_sit_id, 2, 3, '20-30 seconds', 60, 5),
    
    (full_body_id, bear_crawl_id, 3, 2, '20 seconds', 45, 1),
    (full_body_id, squat_id, 3, 3, '10-12', 60, 2),
    (full_body_id, pushup_id, 3, 3, '6-10', 60, 3),
    (full_body_id, russian_twist_id, 3, 3, '15 each side', 45, 4),
    (full_body_id, glute_bridge_id, 3, 3, '10 each leg', 60, 5);
    
    -- Cardio HIIT Blast Program (4 days)
    INSERT INTO public.workout_plan_exercises (workout_plan_id, exercise_id, day_number, sets, reps, rest_seconds, order_in_day) VALUES
    (cardio_hiit_id, burpee_id, 1, 6, '30 seconds', 30, 1),
    (cardio_hiit_id, mountain_climber_id, 1, 6, '30 seconds', 30, 2),
    (cardio_hiit_id, jumping_jack_id, 1, 6, '30 seconds', 30, 3),
    (cardio_hiit_id, high_knees_id, 1, 6, '30 seconds', 30, 4),
    
    (cardio_hiit_id, squat_id, 2, 8, '45 seconds', 15, 1),
    (cardio_hiit_id, pushup_id, 2, 8, '45 seconds', 15, 2),
    (cardio_hiit_id, lunge_id, 2, 8, '45 seconds', 15, 3),
    (cardio_hiit_id, plank_id, 2, 8, '45 seconds', 15, 4),
    
    (cardio_hiit_id, bear_crawl_id, 3, 5, '40 seconds', 20, 1),
    (cardio_hiit_id, burpee_id, 3, 5, '40 seconds', 20, 2),
    (cardio_hiit_id, mountain_climber_id, 3, 5, '40 seconds', 20, 3),
    (cardio_hiit_id, box_jump_id, 3, 5, '40 seconds', 20, 4),
    
    (cardio_hiit_id, jumping_jack_id, 4, 10, '20 seconds', 10, 1),
    (cardio_hiit_id, high_knees_id, 4, 10, '20 seconds', 10, 2),
    (cardio_hiit_id, burpee_id, 4, 10, '20 seconds', 10, 3),
    (cardio_hiit_id, squat_id, 4, 10, '20 seconds', 10, 4);
    
    -- Quick Morning Routine (2 days)
    INSERT INTO public.workout_plan_exercises (workout_plan_id, exercise_id, day_number, sets, reps, rest_seconds, order_in_day) VALUES
    (morning_id, jumping_jack_id, 1, 2, '30 seconds', 15, 1),
    (morning_id, squat_id, 1, 2, '10', 30, 2),
    (morning_id, pushup_id, 1, 2, '8', 30, 3),
    (morning_id, plank_id, 1, 2, '30 seconds', 30, 4),
    (morning_id, lunge_id, 1, 2, '8 each leg', 30, 5),
    
    (morning_id, high_knees_id, 2, 2, '30 seconds', 15, 1),
    (morning_id, goblet_squat_id, 2, 2, '10', 30, 2),
    (morning_id, tricep_dip_id, 2, 2, '8', 30, 3),
    (morning_id, bicycle_crunch_id, 2, 2, '10 each side', 30, 4),
    (morning_id, superman_id, 2, 2, '10', 30, 5);
    
END $$;
