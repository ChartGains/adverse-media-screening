-- Add Hierarchy and Notifications
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. ADD MANAGER_ID TO USER_PROFILES
-- ============================================
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.user_profiles(id);

-- Index for faster manager lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_manager ON public.user_profiles(manager_id);

-- ============================================
-- 2. CREATE NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('escalation', 'assignment', 'mention', 'system', 'deadline')),
    title TEXT NOT NULL,
    message TEXT,
    link TEXT,
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Allow system to insert notifications (via service role)
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;
CREATE POLICY "Service role can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

-- ============================================
-- 3. CREATE VIEW FOR TEAM HIERARCHY
-- ============================================
CREATE OR REPLACE VIEW public.team_hierarchy AS
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.department,
    u.manager_id,
    m.full_name as manager_name,
    m.email as manager_email,
    (SELECT COUNT(*) FROM public.user_profiles WHERE manager_id = u.id) as direct_reports_count
FROM public.user_profiles u
LEFT JOIN public.user_profiles m ON u.manager_id = m.id
WHERE u.is_active = true;

-- ============================================
-- 4. FUNCTION TO GET DIRECT REPORTS
-- ============================================
CREATE OR REPLACE FUNCTION public.get_direct_reports(p_manager_id UUID)
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    department TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.full_name,
        u.role,
        u.department
    FROM public.user_profiles u
    WHERE u.manager_id = p_manager_id AND u.is_active = true
    ORDER BY u.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. FUNCTION TO GET ESCALATION CHAIN
-- ============================================
CREATE OR REPLACE FUNCTION public.get_escalation_chain(p_user_id UUID)
RETURNS TABLE (
    level INT,
    user_id UUID,
    full_name TEXT,
    email TEXT,
    role TEXT
) AS $$
WITH RECURSIVE chain AS (
    -- Start with the user's manager
    SELECT 
        1 as level,
        m.id as user_id,
        m.full_name,
        m.email,
        m.role
    FROM public.user_profiles u
    JOIN public.user_profiles m ON u.manager_id = m.id
    WHERE u.id = p_user_id
    
    UNION ALL
    
    -- Recursively get each manager's manager
    SELECT 
        c.level + 1,
        m.id,
        m.full_name,
        m.email,
        m.role
    FROM chain c
    JOIN public.user_profiles m ON (
        SELECT manager_id FROM public.user_profiles WHERE id = c.user_id
    ) = m.id
    WHERE c.level < 10 -- Prevent infinite loops
)
SELECT * FROM chain ORDER BY level;
$$ LANGUAGE sql SECURITY DEFINER;

SELECT 'Hierarchy and notifications setup complete!' as status;
