-- ============================================
-- ADVERSE MEDIA SCREENING TOOL - COMPLETE DATABASE SETUP
-- Run this SINGLE file in Supabase SQL Editor
-- ============================================

-- ============================================
-- PART 1: DATABASE SCHEMA
-- ============================================

-- 1. USER PROFILES TABLE
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

CREATE INDEX idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);

-- 2. SCREENING SUBJECTS TABLE
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

CREATE INDEX idx_screening_subjects_status ON public.screening_subjects(status);
CREATE INDEX idx_screening_subjects_submitted_by ON public.screening_subjects(submitted_by);
CREATE INDEX idx_screening_subjects_assigned_to ON public.screening_subjects(assigned_to);
CREATE INDEX idx_screening_subjects_created_at ON public.screening_subjects(created_at DESC);
CREATE INDEX idx_screening_subjects_risk_level ON public.screening_subjects(risk_level);

-- 3. SEARCH TERM CATEGORIES TABLE
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

-- 4. SEARCH TERMS TABLE
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

-- 5. SEARCH RESULTS TABLE
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

-- 6. ARTICLE ANALYSES TABLE
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

-- 7. HUMAN REVIEWS TABLE
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

-- 8. SCREENING DECISIONS TABLE
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

-- 9. AUDIT LOGS TABLE
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

-- 10. BATCH UPLOADS TABLE
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
-- PART 2: ROW LEVEL SECURITY POLICIES
-- ============================================

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

-- Search Terms Policies
CREATE POLICY "All users can view search term categories" ON public.search_term_categories
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

-- Audit Logs Policies
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
-- PART 3: FUNCTIONS & TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_search_term_categories_updated_at
    BEFORE UPDATE ON public.search_term_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_search_terms_updated_at
    BEFORE UPDATE ON public.search_terms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Handle new user signup - auto create profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, role, is_active)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'analyst'),
        true
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Audit logging function
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
    SELECT email, role INTO v_user_email, v_user_role
    FROM public.user_profiles
    WHERE id = p_user_id;
    
    INSERT INTO public.audit_logs (user_id, user_email, user_role, action_type, entity_type, entity_id, details)
    VALUES (p_user_id, v_user_email, v_user_role, p_action_type, p_entity_type, p_entity_id, p_details)
    RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 4: ANALYTICS VIEWS
-- ============================================

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

-- ============================================
-- PART 5: SEED SEARCH TERM CATEGORIES
-- ============================================

INSERT INTO public.search_term_categories (category_name, description, risk_weight, display_order, is_active) VALUES
('Financial Crimes', 'Fraud, embezzlement, money laundering, bribery, and related financial offenses', 5, 1, true),
('Violent Crimes', 'Murder, assault, kidnapping, and other violent offenses', 5, 2, true),
('Organized Crime', 'Mafia, trafficking, cartels, and criminal organizations', 5, 3, true),
('Terrorism & Security', 'Terrorism, sanctions, extremism, and national security threats', 5, 4, true),
('Sexual Offenses', 'Sexual assault, harassment, and related offenses', 5, 5, true),
('Legal/Criminal Proceedings', 'Arrests, convictions, prosecutions, and court cases', 4, 6, true),
('Regulatory Actions', 'Fines, bans, license revocations, and compliance failures', 3, 7, true),
('Civil/Business Issues', 'Lawsuits, bankruptcy, and business disputes', 2, 8, true),
('Reputational/Ethical', 'Scandals, controversies, and ethical concerns', 2, 9, true),
('Environmental Crimes', 'Pollution, illegal dumping, and environmental violations', 3, 10, true),
('Cyber Crimes', 'Hacking, data breaches, and digital fraud', 4, 11, true);

-- ============================================
-- PART 6: SEED SEARCH TERMS
-- ============================================

-- Financial Crimes
INSERT INTO public.search_terms (category_id, term, variations, is_active)
SELECT id, term, variations, true
FROM public.search_term_categories, 
(VALUES
    ('launder', ARRAY['laundering', 'laundered', 'money laundering', 'AML violation']),
    ('fraud', ARRAY['fraudulent', 'defraud', 'defrauded', 'fraudster', 'wire fraud', 'bank fraud']),
    ('embezzle', ARRAY['embezzlement', 'embezzled', 'embezzling', 'misappropriation']),
    ('bribe', ARRAY['bribery', 'bribed', 'bribing', 'kickback', 'kickbacks', 'payoff']),
    ('corrupt', ARRAY['corruption', 'corrupted', 'corrupt official', 'corrupt practices']),
    ('tax evasion', ARRAY['tax fraud', 'tax cheat', 'tax crime', 'tax avoidance scheme']),
    ('insider trading', ARRAY['securities fraud', 'market manipulation', 'stock manipulation']),
    ('Ponzi', ARRAY['Ponzi scheme', 'pyramid scheme', 'investment fraud', 'investment scam']),
    ('forgery', ARRAY['forged', 'forger', 'counterfeiting', 'counterfeit', 'falsified documents']),
    ('misappropriation', ARRAY['misappropriated', 'theft of funds', 'diversion of funds'])
) AS t(term, variations)
WHERE category_name = 'Financial Crimes';

-- Violent Crimes
INSERT INTO public.search_terms (category_id, term, variations, is_active)
SELECT id, term, variations, true
FROM public.search_term_categories, 
(VALUES
    ('murder', ARRAY['murdered', 'murderer', 'homicide', 'manslaughter', 'killing', 'slaying']),
    ('assault', ARRAY['assaulted', 'battery', 'violent attack', 'aggravated assault', 'attacked']),
    ('kidnap', ARRAY['kidnapping', 'kidnapped', 'abduction', 'abducted', 'hostage']),
    ('armed robbery', ARRAY['robbery', 'robber', 'robbed', 'heist', 'hold-up']),
    ('domestic violence', ARRAY['domestic abuse', 'spousal abuse', 'family violence']),
    ('threatening', ARRAY['death threats', 'threats', 'intimidation', 'menacing'])
) AS t(term, variations)
WHERE category_name = 'Violent Crimes';

-- Organized Crime
INSERT INTO public.search_terms (category_id, term, variations, is_active)
SELECT id, term, variations, true
FROM public.search_term_categories, 
(VALUES
    ('mafia', ARRAY['mob', 'organized crime', 'crime syndicate', 'crime family', 'crime boss']),
    ('trafficking', ARRAY['trafficked', 'trafficker', 'human trafficking', 'drug trafficking', 'sex trafficking']),
    ('cartel', ARRAY['drug cartel', 'gang', 'criminal organization', 'crime ring']),
    ('racketeering', ARRAY['RICO', 'racket', 'extortion ring', 'protection racket']),
    ('smuggling', ARRAY['smuggled', 'smuggler', 'contraband', 'illegal import'])
) AS t(term, variations)
WHERE category_name = 'Organized Crime';

-- Terrorism & Security
INSERT INTO public.search_terms (category_id, term, variations, is_active)
SELECT id, term, variations, true
FROM public.search_term_categories, 
(VALUES
    ('terrorism', ARRAY['terrorist', 'terror attack', 'terror financing', 'terrorist organization']),
    ('extremist', ARRAY['extremism', 'radicalized', 'radical', 'militant']),
    ('sanctions', ARRAY['sanctioned', 'OFAC', 'SDN list', 'sanctions violation', 'sanctions evasion']),
    ('weapons', ARRAY['arms dealing', 'illegal arms', 'weapons trafficking', 'arms smuggling'])
) AS t(term, variations)
WHERE category_name = 'Terrorism & Security';

-- Sexual Offenses
INSERT INTO public.search_terms (category_id, term, variations, is_active)
SELECT id, term, variations, true
FROM public.search_term_categories, 
(VALUES
    ('sexual assault', ARRAY['sexual harassment', 'sexual misconduct', 'sexual abuse', 'groping']),
    ('rape', ARRAY['rapist', 'sexual violence']),
    ('child abuse', ARRAY['child exploitation', 'pedophile', 'child pornography', 'minor abuse']),
    ('indecent', ARRAY['indecency', 'indecent exposure', 'lewd conduct'])
) AS t(term, variations)
WHERE category_name = 'Sexual Offenses';

-- Legal/Criminal Proceedings
INSERT INTO public.search_terms (category_id, term, variations, is_active)
SELECT id, term, variations, true
FROM public.search_term_categories, 
(VALUES
    ('arrest', ARRAY['arrested', 'detention', 'detained', 'taken into custody', 'apprehended']),
    ('convict', ARRAY['convicted', 'conviction', 'convictions', 'found guilty']),
    ('prosecute', ARRAY['prosecuted', 'prosecution', 'prosecutor', 'criminal prosecution']),
    ('indict', ARRAY['indicted', 'indictment', 'grand jury indictment']),
    ('guilty', ARRAY['guilt', 'guilty verdict', 'guilty plea', 'pleaded guilty']),
    ('sentence', ARRAY['sentenced', 'sentencing', 'prison sentence', 'jail sentence']),
    ('prison', ARRAY['imprisoned', 'imprisonment', 'jail', 'jailed', 'incarcerated', 'incarceration']),
    ('felon', ARRAY['felony', 'felonies', 'felony conviction', 'convicted felon']),
    ('verdict', ARRAY['court ruling', 'court verdict', 'jury verdict']),
    ('plea', ARRAY['plea deal', 'plea bargain', 'plea agreement', 'nolo contendere']),
    ('trial', ARRAY['criminal trial', 'on trial', 'court trial', 'jury trial']),
    ('charges', ARRAY['charged', 'criminal charges', 'facing charges', 'charge filed'])
) AS t(term, variations)
WHERE category_name = 'Legal/Criminal Proceedings';

-- Regulatory Actions
INSERT INTO public.search_terms (category_id, term, variations, is_active)
SELECT id, term, variations, true
FROM public.search_term_categories, 
(VALUES
    ('fine', ARRAY['fined', 'penalty', 'penalized', 'monetary penalty', 'civil penalty']),
    ('ban', ARRAY['banned', 'barred', 'disbarred', 'prohibited', 'exclusion']),
    ('license revoked', ARRAY['license suspended', 'deregistered', 'license cancelled']),
    ('violation', ARRAY['violated', 'breach', 'breached', 'infringement', 'non-compliance']),
    ('regulatory action', ARRAY['enforcement action', 'regulatory enforcement', 'SEC action', 'FCA action']),
    ('cease and desist', ARRAY['injunction', 'restraining order', 'court order']),
    ('compliance failure', ARRAY['non-compliance', 'compliance breach', 'regulatory breach'])
) AS t(term, variations)
WHERE category_name = 'Regulatory Actions';

-- Civil/Business Issues
INSERT INTO public.search_terms (category_id, term, variations, is_active)
SELECT id, term, variations, true
FROM public.search_term_categories, 
(VALUES
    ('lawsuit', ARRAY['sued', 'suing', 'litigation', 'litigated', 'legal action', 'civil suit']),
    ('bankruptcy', ARRAY['bankrupt', 'insolvent', 'insolvency', 'Chapter 11', 'Chapter 7', 'liquidation']),
    ('default', ARRAY['defaulted', 'loan default', 'debt default', 'payment default']),
    ('settlement', ARRAY['settled', 'legal settlement', 'out of court settlement']),
    ('dispute', ARRAY['disputed', 'legal dispute', 'contract dispute', 'business dispute']),
    ('malpractice', ARRAY['negligence', 'negligent', 'professional misconduct', 'gross negligence'])
) AS t(term, variations)
WHERE category_name = 'Civil/Business Issues';

-- Reputational/Ethical
INSERT INTO public.search_terms (category_id, term, variations, is_active)
SELECT id, term, variations, true
FROM public.search_term_categories, 
(VALUES
    ('scandal', ARRAY['scandalous', 'embroiled in scandal', 'scandal-hit']),
    ('controversy', ARRAY['controversial', 'controversies', 'public outcry']),
    ('allegation', ARRAY['alleged', 'accused', 'accusations', 'claims against']),
    ('unethical', ARRAY['misconduct', 'ethical violation', 'ethics breach']),
    ('whistleblower', ARRAY['exposed', 'leak', 'leaked', 'revealed wrongdoing']),
    ('cover-up', ARRAY['concealed', 'concealment', 'hidden', 'suppressed'])
) AS t(term, variations)
WHERE category_name = 'Reputational/Ethical';

-- Environmental Crimes
INSERT INTO public.search_terms (category_id, term, variations, is_active)
SELECT id, term, variations, true
FROM public.search_term_categories, 
(VALUES
    ('environmental crime', ARRAY['eco crime', 'environmental offense', 'green crime']),
    ('pollution', ARRAY['polluter', 'polluted', 'polluting', 'contamination', 'toxic release']),
    ('illegal dumping', ARRAY['toxic waste', 'hazardous waste', 'waste dumping', 'fly-tipping']),
    ('environmental violation', ARRAY['EPA violation', 'environmental breach', 'emissions violation'])
) AS t(term, variations)
WHERE category_name = 'Environmental Crimes';

-- Cyber Crimes
INSERT INTO public.search_terms (category_id, term, variations, is_active)
SELECT id, term, variations, true
FROM public.search_term_categories, 
(VALUES
    ('hacking', ARRAY['hacker', 'hacked', 'cyber attack', 'cyberattack', 'computer intrusion']),
    ('data breach', ARRAY['data theft', 'data leak', 'information breach', 'privacy breach']),
    ('identity theft', ARRAY['identity fraud', 'stolen identity', 'impersonation fraud']),
    ('ransomware', ARRAY['malware', 'computer virus', 'cyber extortion', 'cryptolocker'])
) AS t(term, variations)
WHERE category_name = 'Cyber Crimes';

-- ============================================
-- SETUP COMPLETE!
-- ============================================
