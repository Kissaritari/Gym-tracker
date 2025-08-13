-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workout plans table
CREATE TABLE IF NOT EXISTS public.workout_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  duration_weeks INTEGER DEFAULT 4,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create exercises table
CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  muscle_groups TEXT[], -- Array of muscle groups
  equipment TEXT,
  instructions TEXT,
  tips TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workout plan exercises (junction table)
CREATE TABLE IF NOT EXISTS public.workout_plan_exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_plan_id UUID REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  sets INTEGER DEFAULT 3,
  reps TEXT, -- Can be "8-12" or "30 seconds" etc
  rest_seconds INTEGER DEFAULT 60,
  order_in_day INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user workout sessions
CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  workout_plan_id UUID REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Create exercise logs for tracking individual exercise performance
CREATE TABLE IF NOT EXISTS public.exercise_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE,
  sets_completed INTEGER,
  reps_completed INTEGER[],
  weight_used DECIMAL[],
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view public workout plans" ON public.workout_plans
  FOR SELECT USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create workout plans" ON public.workout_plans
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own workout plans" ON public.workout_plans
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Anyone can view exercises" ON public.exercises
  FOR SELECT TO authenticated;

CREATE POLICY "Users can view own workout sessions" ON public.workout_sessions
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view own exercise logs" ON public.exercise_logs
  FOR ALL USING (
    session_id IN (
      SELECT id FROM public.workout_sessions WHERE user_id = auth.uid()
    )
  );

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
