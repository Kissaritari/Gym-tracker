-- Seed exercises for Neon Database
-- Run this after creating tables

INSERT INTO exercises (name, description, muscle_groups, equipment, instructions, tips) VALUES
-- Chest Exercises
('Bench Press', 'Classic chest exercise using a barbell', ARRAY['Chest', 'Triceps', 'Shoulders'], 'Barbell, Bench', 'Lie on bench, grip bar slightly wider than shoulder width, lower to chest, press up', 'Keep feet flat, maintain arch in lower back, control the descent'),
('Push-ups', 'Bodyweight chest exercise', ARRAY['Chest', 'Triceps', 'Core'], 'Bodyweight', 'Start in plank position, lower chest to ground, push back up', 'Keep body straight, engage core throughout'),
('Dumbbell Flyes', 'Isolation exercise for chest', ARRAY['Chest'], 'Dumbbells, Bench', 'Lie on bench with dumbbells, arms extended, lower in arc motion', 'Slight bend in elbows, squeeze chest at top'),
('Incline Press', 'Upper chest focused press', ARRAY['Upper Chest', 'Shoulders', 'Triceps'], 'Barbell or Dumbbells, Incline Bench', 'Set bench to 30-45 degrees, press weight up from upper chest', 'Control the weight, focus on upper chest contraction'),

-- Back Exercises
('Pull-ups', 'Compound back exercise', ARRAY['Lats', 'Biceps', 'Upper Back'], 'Pull-up Bar', 'Hang from bar, pull body up until chin over bar', 'Full range of motion, avoid swinging'),
('Barbell Rows', 'Horizontal pulling movement', ARRAY['Back', 'Biceps', 'Rear Delts'], 'Barbell', 'Bend at hips, pull bar to lower chest', 'Keep back flat, squeeze shoulder blades'),
('Lat Pulldown', 'Machine-based lat exercise', ARRAY['Lats', 'Biceps'], 'Cable Machine', 'Pull bar down to upper chest, control return', 'Lean back slightly, focus on lat engagement'),
('Deadlift', 'Full body pulling exercise', ARRAY['Back', 'Hamstrings', 'Glutes', 'Core'], 'Barbell', 'Stand with bar over mid-foot, hinge and grip, drive through floor', 'Keep back neutral, push hips back'),

-- Leg Exercises
('Squats', 'King of leg exercises', ARRAY['Quadriceps', 'Glutes', 'Hamstrings'], 'Barbell, Squat Rack', 'Bar on upper back, squat down until thighs parallel, drive up', 'Keep chest up, knees track over toes'),
('Leg Press', 'Machine-based leg exercise', ARRAY['Quadriceps', 'Glutes'], 'Leg Press Machine', 'Place feet shoulder width on platform, lower and press', 'Do not lock knees at top, control the negative'),
('Romanian Deadlift', 'Hamstring focused hinge', ARRAY['Hamstrings', 'Glutes', 'Lower Back'], 'Barbell or Dumbbells', 'Hinge at hips with slight knee bend, lower weight along legs', 'Feel stretch in hamstrings, keep back flat'),
('Lunges', 'Unilateral leg exercise', ARRAY['Quadriceps', 'Glutes', 'Hamstrings'], 'Bodyweight or Dumbbells', 'Step forward, lower back knee toward ground, push back up', 'Keep torso upright, front knee over ankle'),
('Leg Curls', 'Hamstring isolation', ARRAY['Hamstrings'], 'Leg Curl Machine', 'Curl weight toward glutes, control return', 'Full range of motion, squeeze at top'),
('Calf Raises', 'Calf isolation exercise', ARRAY['Calves'], 'Machine or Bodyweight', 'Rise up on toes, lower with control', 'Full stretch at bottom, squeeze at top'),

-- Shoulder Exercises
('Overhead Press', 'Compound shoulder press', ARRAY['Shoulders', 'Triceps'], 'Barbell or Dumbbells', 'Press weight from shoulders overhead', 'Keep core tight, avoid excessive arch'),
('Lateral Raises', 'Side delt isolation', ARRAY['Side Delts'], 'Dumbbells', 'Raise arms out to sides until parallel', 'Slight bend in elbows, control the weight'),
('Face Pulls', 'Rear delt and upper back', ARRAY['Rear Delts', 'Upper Back'], 'Cable Machine', 'Pull rope to face, separate at end', 'External rotate at the end, squeeze shoulder blades'),
('Front Raises', 'Front delt isolation', ARRAY['Front Delts'], 'Dumbbells', 'Raise arms in front to shoulder height', 'Control the movement, avoid momentum'),

-- Arm Exercises
('Bicep Curls', 'Classic bicep exercise', ARRAY['Biceps'], 'Dumbbells or Barbell', 'Curl weight up, squeeze bicep, lower with control', 'Keep elbows stationary, full range of motion'),
('Tricep Dips', 'Bodyweight tricep exercise', ARRAY['Triceps', 'Chest'], 'Parallel Bars or Bench', 'Lower body by bending arms, push back up', 'Keep elbows close, lean forward slightly for chest'),
('Hammer Curls', 'Bicep and forearm exercise', ARRAY['Biceps', 'Forearms'], 'Dumbbells', 'Curl with neutral grip', 'Keep wrists straight, control the movement'),
('Tricep Pushdowns', 'Tricep isolation', ARRAY['Triceps'], 'Cable Machine', 'Push bar down until arms straight', 'Keep elbows at sides, squeeze triceps'),
('Skull Crushers', 'Lying tricep extension', ARRAY['Triceps'], 'EZ Bar or Dumbbells', 'Lower weight to forehead, extend arms', 'Keep upper arms vertical, control the weight'),

-- Core Exercises
('Plank', 'Core stability exercise', ARRAY['Core', 'Shoulders'], 'Bodyweight', 'Hold body straight in push-up position on forearms', 'Keep hips level, engage entire core'),
('Crunches', 'Basic ab exercise', ARRAY['Abs'], 'Bodyweight', 'Curl shoulders toward hips, lower with control', 'Focus on contraction, avoid pulling neck'),
('Russian Twists', 'Oblique exercise', ARRAY['Obliques', 'Core'], 'Bodyweight or Medicine Ball', 'Rotate torso side to side while seated', 'Keep feet elevated for more challenge'),
('Leg Raises', 'Lower ab exercise', ARRAY['Lower Abs', 'Hip Flexors'], 'Bodyweight', 'Raise legs while lying down, lower with control', 'Keep lower back pressed to floor'),
('Mountain Climbers', 'Dynamic core exercise', ARRAY['Core', 'Cardio'], 'Bodyweight', 'Alternate driving knees to chest in plank position', 'Keep hips low, maintain quick pace')

ON CONFLICT DO NOTHING;

-- Create some default public workout plans
INSERT INTO workout_plans (name, description, difficulty_level, duration_weeks, is_public) VALUES
('Beginner Full Body', 'Perfect starting program for newcomers to fitness', 'beginner', 4, true),
('Push Pull Legs', 'Classic 6-day split for intermediate lifters', 'intermediate', 8, true),
('Advanced Strength', 'High intensity program for experienced lifters', 'advanced', 6, true)
ON CONFLICT DO NOTHING;
