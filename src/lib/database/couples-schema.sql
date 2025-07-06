-- Couples table schema for couple diet app
-- This table manages relationships between users

-- Create relationship_status enum for better data consistency
CREATE TYPE relationship_status AS ENUM ('pending', 'active', 'inactive', 'blocked');

-- Create couples table
CREATE TABLE IF NOT EXISTS public.couples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    relationship_status relationship_status NOT NULL DEFAULT 'pending',
    requested_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure user1_id and user2_id are different
    CONSTRAINT different_users CHECK (user1_id != user2_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_couples_user1_id ON public.couples(user1_id);
CREATE INDEX IF NOT EXISTS idx_couples_user2_id ON public.couples(user2_id);
CREATE INDEX IF NOT EXISTS idx_couples_status ON public.couples(relationship_status);
CREATE INDEX IF NOT EXISTS idx_couples_requested_by ON public.couples(requested_by);

-- Create unique index to prevent duplicate couple relationships
-- This ensures that user A + user B can only have one relationship regardless of order
CREATE UNIQUE INDEX IF NOT EXISTS idx_couples_unique_pair 
ON public.couples(LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id));

-- Enable Row Level Security (RLS)
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see couples records they are part of
CREATE POLICY "Users can view own couples records" 
    ON public.couples 
    FOR SELECT 
    USING (user1_id = auth.uid() OR user2_id = auth.uid());

-- Users can only insert couples records if they are one of the users
CREATE POLICY "Users can insert own couples records" 
    ON public.couples 
    FOR INSERT 
    WITH CHECK (
        (user1_id = auth.uid() OR user2_id = auth.uid()) AND
        requested_by = auth.uid()
    );

-- Users can only update couples records they are part of
CREATE POLICY "Users can update own couples records" 
    ON public.couples 
    FOR UPDATE 
    USING (user1_id = auth.uid() OR user2_id = auth.uid());

-- Users can only delete couples records they are part of
CREATE POLICY "Users can delete own couples records" 
    ON public.couples 
    FOR DELETE 
    USING (user1_id = auth.uid() OR user2_id = auth.uid());

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_couples_updated_at
    BEFORE UPDATE ON public.couples
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Create function to automatically update user partner_id when couple is accepted
CREATE OR REPLACE FUNCTION public.handle_couple_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- If relationship becomes active, update both users' partner_id
    IF NEW.relationship_status = 'active' AND OLD.relationship_status != 'active' THEN
        -- Set accepted_at timestamp
        NEW.accepted_at = NOW();
        
        -- Update both users' partner_id
        UPDATE public.users SET partner_id = NEW.user2_id WHERE id = NEW.user1_id;
        UPDATE public.users SET partner_id = NEW.user1_id WHERE id = NEW.user2_id;
    END IF;
    
    -- If relationship becomes inactive or blocked, clear partner_id
    IF NEW.relationship_status IN ('inactive', 'blocked') AND OLD.relationship_status = 'active' THEN
        UPDATE public.users SET partner_id = NULL WHERE id = NEW.user1_id;
        UPDATE public.users SET partner_id = NULL WHERE id = NEW.user2_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for couple status changes
CREATE TRIGGER on_couple_status_change
    BEFORE UPDATE ON public.couples
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_couple_status_change();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.couples TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create view for active couples with user details
CREATE OR REPLACE VIEW public.active_couples AS
SELECT 
    c.id,
    c.user1_id,
    c.user2_id,
    c.relationship_status,
    c.requested_at,
    c.accepted_at,
    u1.email as user1_email,
    u1.display_name as user1_display_name,
    u1.avatar_url as user1_avatar_url,
    u2.email as user2_email,
    u2.display_name as user2_display_name,
    u2.avatar_url as user2_avatar_url
FROM public.couples c
JOIN public.users u1 ON c.user1_id = u1.id
JOIN public.users u2 ON c.user2_id = u2.id
WHERE c.relationship_status = 'active';

-- Enable RLS on the view
ALTER VIEW public.active_couples SET (security_invoker = true);

-- Grant access to the view
GRANT SELECT ON public.active_couples TO authenticated;

-- Create function to send couple request
CREATE OR REPLACE FUNCTION public.send_couple_request(target_user_email TEXT)
RETURNS JSON AS $$
DECLARE
    target_user_id UUID;
    existing_couple_id UUID;
    new_couple_id UUID;
BEGIN
    -- Find target user by email
    SELECT id INTO target_user_id 
    FROM public.users 
    WHERE email = target_user_email;
    
    IF target_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'User not found');
    END IF;
    
    -- Check if couple relationship already exists (using LEAST/GREATEST to handle order)
    SELECT id INTO existing_couple_id
    FROM public.couples
    WHERE (LEAST(user1_id, user2_id) = LEAST(auth.uid(), target_user_id)
       AND GREATEST(user1_id, user2_id) = GREATEST(auth.uid(), target_user_id));
    
    IF existing_couple_id IS NOT NULL THEN
        RETURN json_build_object('success', false, 'message', 'Couple relationship already exists');
    END IF;
    
    -- Create new couple request
    INSERT INTO public.couples (user1_id, user2_id, requested_by, relationship_status)
    VALUES (auth.uid(), target_user_id, auth.uid(), 'pending')
    RETURNING id INTO new_couple_id;
    
    RETURN json_build_object('success', true, 'couple_id', new_couple_id, 'message', 'Couple request sent successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to accept couple request
CREATE OR REPLACE FUNCTION public.accept_couple_request(couple_id UUID)
RETURNS JSON AS $$
DECLARE
    couple_record RECORD;
BEGIN
    -- Get couple record and verify user is part of it
    SELECT * INTO couple_record
    FROM public.couples
    WHERE id = couple_id
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
      AND relationship_status = 'pending';
    
    IF couple_record IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Couple request not found or already processed');
    END IF;
    
    -- Make sure the user accepting is not the one who requested
    IF couple_record.requested_by = auth.uid() THEN
        RETURN json_build_object('success', false, 'message', 'Cannot accept your own request');
    END IF;
    
    -- Update couple status to active
    UPDATE public.couples
    SET relationship_status = 'active'
    WHERE id = couple_id;
    
    RETURN json_build_object('success', true, 'message', 'Couple request accepted successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 