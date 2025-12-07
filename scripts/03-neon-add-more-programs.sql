-- Additional workout programs for Neon
-- Run after seeding exercises

-- Get exercise IDs for linking (run these separately if needed)
-- This script assumes exercises already exist

-- Beginner Bodyweight Program
INSERT INTO workout_plans (name, description, difficulty_level, duration_weeks, is_public) VALUES
('Beginner Bodyweight', 'No equipment needed - perfect for home workouts', 'beginner', 4, true),
('HIIT Cardio Blast', 'High intensity interval training for fat loss', 'intermediate', 6, true),
('Powerlifting Basics', 'Focus on the big three: squat, bench, deadlift', 'intermediate', 8, true),
('Hypertrophy Focus', 'High volume training for muscle growth', 'advanced', 12, true),
('Core Strength', 'Build a rock solid core foundation', 'beginner', 4, true),
('Upper Body Focus', 'Dedicated upper body development program', 'intermediate', 6, true),
('Lower Body Power', 'Build strong and powerful legs', 'intermediate', 6, true)
ON CONFLICT DO NOTHING;
