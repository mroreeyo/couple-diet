-- Meals table schema for couple diet app
-- This table stores meal information including photos and calorie data

-- Create meal_type enum for better data consistency
CREATE TYPE meal_type AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');

-- Create meals table
CREATE TABLE IF NOT EXISTS public.meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    meal_name TEXT NOT NULL,
    calories INTEGER,
    meal_type meal_type NOT NULL DEFAULT 'lunch',
    photo_url TEXT,
    description TEXT,
    meal_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_meals_user_id ON public.meals(user_id);
CREATE INDEX IF NOT EXISTS idx_meals_meal_date ON public.meals(meal_date);
CREATE INDEX IF NOT EXISTS idx_meals_meal_type ON public.meals(meal_type);
CREATE INDEX IF NOT EXISTS idx_meals_user_date ON public.meals(user_id, meal_date);

-- Enable Row Level Security (RLS)
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own meals and their partner's meals
CREATE POLICY "Users can view own meals and partner's meals" 
    ON public.meals 
    FOR SELECT 
    USING (
        user_id = auth.uid() OR 
        user_id = (SELECT partner_id FROM public.users WHERE id = auth.uid())
    );

-- Users can only insert their own meals
CREATE POLICY "Users can insert own meals" 
    ON public.meals 
    FOR INSERT 
    WITH CHECK (user_id = auth.uid());

-- Users can only update their own meals
CREATE POLICY "Users can update own meals" 
    ON public.meals 
    FOR UPDATE 
    USING (user_id = auth.uid());

-- Users can only delete their own meals
CREATE POLICY "Users can delete own meals" 
    ON public.meals 
    FOR DELETE 
    USING (user_id = auth.uid());

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_meals_updated_at
    BEFORE UPDATE ON public.meals
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meals TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create view for daily meal summary
CREATE OR REPLACE VIEW public.daily_meal_summary AS
SELECT 
    user_id,
    meal_date,
    COUNT(*) as total_meals,
    SUM(calories) as total_calories,
    COUNT(CASE WHEN meal_type = 'breakfast' THEN 1 END) as breakfast_count,
    COUNT(CASE WHEN meal_type = 'lunch' THEN 1 END) as lunch_count,
    COUNT(CASE WHEN meal_type = 'dinner' THEN 1 END) as dinner_count,
    COUNT(CASE WHEN meal_type = 'snack' THEN 1 END) as snack_count
FROM public.meals
GROUP BY user_id, meal_date
ORDER BY meal_date DESC;

-- Enable RLS on the view
ALTER VIEW public.daily_meal_summary SET (security_invoker = true);

-- Grant access to the view
GRANT SELECT ON public.daily_meal_summary TO authenticated; 