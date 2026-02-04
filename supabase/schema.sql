-- Adverse Media Screening Tool - Database Schema
-- Run this in Supabase SQL Editor to set up the database

-- ============================================
-- 1. USER PROFILES TABLE
-- ============================================
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('analyst', 'senior_analyst', 'admin', 'api_user', 'auditor')),
    department TEXT,
    is_active BOOLEAN DEFAULT true,
    last_active_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);

-- ============================================
-- 2. SCREENING SUBJECTS TABLE
-- ============================================
CREATE TABLE public.screening_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    address TEXT NOT NULL,
    country TEXT NOT NULL,
    aliases TEXT[],
    company_affiliation TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'searching', 'analyzing', 'review', 'completed', 'escalated')),
    risk_level TEXT CHECK (risk_level IN ('none', 'low', 'medium', 'high', 'critical')),
    submitted_by UUID REFERENCES public.user_profiles(id),
    assigned_to UUID REFERENCES public.user_profiles(id),
    batch_id UUID,
    search_queries_count INTEGER DEFAULT 0,
    articles_found_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes for common queries
CREATE INDEX idx_screening_subjects_status ON public.screening_subjects(status);
CREATE INDEX idx_screening_subjects_submitted_by ON public.screening_subjects(submitted_by);
CREATE INDEX idx_screening_subjects_assigned_to ON public.screening_subjects(assigned_to);
CREATE INDEX idx_screening_subjects_created_at ON public.screening_subjects(created_at DESC);
CREATE INDEX idx_screening_subjects_risk_level ON public.screening_subjects(risk_level);

-- ============================================
-- 3. SEARCH TERM CATEGORIES TABLE
-- ============================================
CREATE TABLE public.search_term_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name TEXT NOT NULL UNIQUE,
    description TEXT,
    risk_weight INTEGER DEFAULT 1 CHECK (risk_weight BETWEEN 1 AND 5),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. SEARCH TERMS TABLE
-- ============================================
CREATE TABLE public.search_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.search_term_categories(id) ON DELETE CASCADE,
    term TEXT NOT NULL,
    variations TEXT[],
    is_active BOOLEAN DEFAULT true,
    hit_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(category_id, term)
);

CREATE INDEX idx_search_terms_category ON public.search_terms(category_id);

-- ============================================
-- 5. SEARCH RESULTS TABLE
-- ============================================
CREATE TABLE public.search_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES public.screening_subjects(id) ON DELETE CASCADE,
    query_used TEXT NOT NULL,
    query_category TEXT,
    source TEXT NOT NULL CHECK (source IN ('serpapi', 'google_cse')),
    result_url TEXT NOT NULL,
    result_title TEXT,
    result_snippet TEXT,
    result_position INTEGER,
    domain TEXT,
    is_duplicate BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_search_results_subject ON public.search_results(subject_id);
CREATE INDEX idx_search_results_url ON public.search_results(result_url);

-- ============================================
-- 6. ARTICLE ANALYSES TABLE
-- ============================================
CREATE TABLE public.article_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    search_result_id UUID REFERENCES public.search_results(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.screening_subjects(id) ON DELETE CASCADE,
    article_content TEXT,
    article_headline TEXT,
    publication_date DATE,
    publisher TEXT,
    article_url TEXT,
    ai_provider TEXT NOT NULL CHECK (ai_provider IN ('claude', 'openai')),
    risk_category TEXT,
    risk_level TEXT CHECK (risk_level IN ('none', 'low', 'medium', 'high', 'critical')),
    subject_match_confidence DECIMAL(5,2) CHECK (subject_match_confidence BETWEEN 0 AND 100),
    match_status TEXT DEFAULT 'pending' CHECK (match_status IN ('pending', 'matched', 'excluded', 'uncertain')),
    match_reasoning TEXT,
    entities_extracted JSONB DEFAULT '{}',
    ai_summary TEXT,
    key_findings TEXT[],
    raw_ai_response JSONB,
    processing_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_article_analyses_subject ON public.article_analyses(subject_id);
CREATE INDEX idx_article_analyses_risk_level ON public.article_analyses(risk_level);
CREATE INDEX idx_article_analyses_match_status ON public.article_analyses(match_status);

-- ============================================
-- 7. HUMAN REVIEWS TABLE
-- ============================================
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES public.screening_subjects(id) ON DELETE CASCADE,
    article_analysis_id UUID REFERENCES public.article_analyses(id),
    reviewer_id UUID REFERENCES public.user_profiles(id),
    action TEXT NOT NULL CHECK (action IN ('confirm_match', 'exclude', 'escalate', 'clear', 'flag')),
    reason_code TEXT,
    notes TEXT,
    time_spent_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_subject ON public.reviews(subject_id);
CREATE INDEX idx_reviews_reviewer ON public.reviews(reviewer_id);
CREATE INDEX idx_reviews_action ON public.reviews(action);
CREATE INDEX idx_reviews_created_at ON public.reviews(created_at DESC);

-- ============================================
-- 8. SCREENING DECISIONS TABLE
-- ============================================
CREATE TABLE public.screening_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES public.screening_subjects(id) ON DELETE CASCADE UNIQUE,
    decision TEXT NOT NULL CHECK (decision IN ('cleared', 'flagged', 'escalated')),
    final_risk_level TEXT CHECK (final_risk_level IN ('none', 'low', 'medium', 'high', 'critical')),
    decided_by UUID REFERENCES public.user_profiles(id),
    reviewed_by UUID REFERENCES public.user_profiles(id),
    decision_summary TEXT,
    flagged_articles_count INTEGER DEFAULT 0,
    total_articles_reviewed INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_screening_decisions_decision ON public.screening_decisions(decision);
CREATE INDEX idx_screening_decisions_decided_by ON public.screening_decisions(decided_by);

-- ============================================
-- 9. AUDIT LOGS TABLE
-- ============================================
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id),
    user_email TEXT,
    user_role TEXT,
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action_type);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ============================================
-- 10. BATCH UPLOADS TABLE
-- ============================================
CREATE TABLE public.batch_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploaded_by UUID REFERENCES public.user_profiles(id),
    filename TEXT NOT NULL,
    file_size_bytes INTEGER,
    total_records INTEGER,
    processed_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'cancelled')),
    error_log JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_batch_uploads_status ON public.batch_uploads(status);
CREATE INDEX idx_batch_uploads_uploaded_by ON public.batch_uploads(uploaded_by);

-- ============================================
-- 11. ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screening_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_term_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screening_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_uploads ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.user_profiles
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'auditor'))
    );

CREATE POLICY "Admins can update profiles" ON public.user_profiles
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.user_profiles WHERE id = auth.uid()));

-- Screening Subjects Policies
CREATE POLICY "Analysts see own and unassigned subjects" ON public.screening_subjects
    FOR SELECT USING (
        auth.uid() = submitted_by 
        OR auth.uid() = assigned_to 
        OR assigned_to IS NULL
        OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'senior_analyst', 'auditor'))
    );

CREATE POLICY "Users can insert subjects" ON public.screening_subjects
    FOR INSERT WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Users can update assigned subjects" ON public.screening_subjects
    FOR UPDATE USING (
        auth.uid() = assigned_to 
        OR auth.uid() = submitted_by
        OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'senior_analyst'))
    );

-- Search Terms Policies (Read for all, Write for admins)
CREATE POLICY "All users can view search terms" ON public.search_term_categories
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage search term categories" ON public.search_term_categories
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "All users can view search terms" ON public.search_terms
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage search terms" ON public.search_terms
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Search Results Policies
CREATE POLICY "Users can view related search results" ON public.search_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.screening_subjects ss 
            WHERE ss.id = subject_id 
            AND (ss.submitted_by = auth.uid() OR ss.assigned_to = auth.uid() OR ss.assigned_to IS NULL)
        )
        OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'senior_analyst', 'auditor'))
    );

CREATE POLICY "System can insert search results" ON public.search_results
    FOR INSERT WITH CHECK (true);

-- Article Analyses Policies
CREATE POLICY "Users can view related analyses" ON public.article_analyses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.screening_subjects ss 
            WHERE ss.id = subject_id 
            AND (ss.submitted_by = auth.uid() OR ss.assigned_to = auth.uid() OR ss.assigned_to IS NULL)
        )
        OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'senior_analyst', 'auditor'))
    );

CREATE POLICY "System can insert analyses" ON public.article_analyses
    FOR INSERT WITH CHECK (true);

-- Reviews Policies
CREATE POLICY "Users can view own reviews" ON public.reviews
    FOR SELECT USING (
        reviewer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'senior_analyst', 'auditor'))
    );

CREATE POLICY "Users can insert reviews" ON public.reviews
    FOR INSERT WITH CHECK (reviewer_id = auth.uid());

-- Screening Decisions Policies
CREATE POLICY "Users can view related decisions" ON public.screening_decisions
    FOR SELECT USING (
        decided_by = auth.uid()
        OR reviewed_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.screening_subjects ss 
            WHERE ss.id = subject_id 
            AND (ss.submitted_by = auth.uid() OR ss.assigned_to = auth.uid())
        )
        OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'senior_analyst', 'auditor'))
    );

CREATE POLICY "Users can insert decisions" ON public.screening_decisions
    FOR INSERT WITH CHECK (decided_by = auth.uid());

-- Audit Logs Policies (Admins and Auditors only)
CREATE POLICY "Admins and auditors can view audit logs" ON public.audit_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'auditor'))
    );

CREATE POLICY "System can insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (true);

-- Batch Uploads Policies
CREATE POLICY "Users can view own batches" ON public.batch_uploads
    FOR SELECT USING (
        uploaded_by = auth.uid()
        OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'auditor'))
    );

CREATE POLICY "Users can insert batches" ON public.batch_uploads
    FOR INSERT WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Users can update own batches" ON public.batch_uploads
    FOR UPDATE USING (uploaded_by = auth.uid());

-- ============================================
-- 12. FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to relevant tables
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_search_term_categories_updated_at
    BEFORE UPDATE ON public.search_term_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_search_terms_updated_at
    BEFORE UPDATE ON public.search_terms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'analyst')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
    p_user_id UUID,
    p_action_type TEXT,
    p_entity_type TEXT,
    p_entity_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_user_email TEXT;
    v_user_role TEXT;
    v_audit_id UUID;
BEGIN
    -- Get user details
    SELECT email, role INTO v_user_email, v_user_role
    FROM public.user_profiles
    WHERE id = p_user_id;
    
    -- Insert audit log
    INSERT INTO public.audit_logs (user_id, user_email, user_role, action_type, entity_type, entity_id, details)
    VALUES (p_user_id, v_user_email, v_user_role, p_action_type, p_entity_type, p_entity_id, p_details)
    RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user's last active timestamp
CREATE OR REPLACE FUNCTION update_user_last_active()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.user_profiles
    SET last_active_at = NOW()
    WHERE id = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 13. VIEWS FOR ANALYTICS
-- ============================================

-- View for admin dashboard statistics
CREATE OR REPLACE VIEW public.dashboard_stats AS
SELECT
    (SELECT COUNT(*) FROM public.screening_subjects WHERE status = 'pending') as pending_screenings,
    (SELECT COUNT(*) FROM public.screening_subjects WHERE status = 'review') as in_review,
    (SELECT COUNT(*) FROM public.screening_subjects WHERE status = 'completed') as completed,
    (SELECT COUNT(*) FROM public.screening_subjects WHERE status = 'escalated') as escalated,
    (SELECT COUNT(*) FROM public.screening_subjects WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h,
    (SELECT COUNT(*) FROM public.screening_subjects WHERE created_at > NOW() - INTERVAL '7 days') as last_7_days,
    (SELECT COUNT(*) FROM public.user_profiles WHERE is_active = true) as active_users,
    (SELECT COUNT(*) FROM public.reviews WHERE created_at > NOW() - INTERVAL '24 hours') as reviews_last_24h;

-- View for user activity summary
CREATE OR REPLACE VIEW public.user_activity_summary AS
SELECT 
    up.id,
    up.email,
    up.full_name,
    up.role,
    up.last_active_at,
    COUNT(DISTINCT ss.id) as total_screenings_submitted,
    COUNT(DISTINCT r.id) as total_reviews_completed,
    COUNT(DISTINCT sd.id) as total_decisions_made
FROM public.user_profiles up
LEFT JOIN public.screening_subjects ss ON ss.submitted_by = up.id
LEFT JOIN public.reviews r ON r.reviewer_id = up.id
LEFT JOIN public.screening_decisions sd ON sd.decided_by = up.id
GROUP BY up.id, up.email, up.full_name, up.role, up.last_active_at;
