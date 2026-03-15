-- Enum Types for structured data fields
CREATE TYPE user_role AS ENUM ('caretaker', 'admin', 'officer');
CREATE TYPE alert_type AS ENUM ('emergency', 'missing_report', 'inspection');

--
-- 1. vrudhashrams Table
--
CREATE TABLE public.vrudhashrams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location TEXT,
    district TEXT,
    total_residents INT DEFAULT 0,
    registered_date TIMESTAMP WITH TIME ZONE DEFAULT now()
);

--
-- 2. users Table
--
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role user_role NOT NULL,
    vrudhashram_id UUID REFERENCES public.vrudhashrams(id) ON DELETE SET NULL,
    push_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

--
-- 3. residents Table
--
CREATE TABLE public.residents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    age INT,
    gender TEXT,
    room_number TEXT,
    medical_conditions TEXT,
    emergency_contact TEXT,
    admission_date DATE DEFAULT CURRENT_DATE,
    vrudhashram_id UUID NOT NULL REFERENCES public.vrudhashrams(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

--
-- 4. daily_reports Table
--
CREATE TABLE public.daily_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    caretaker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
    date DATE DEFAULT CURRENT_DATE,
    breakfast BOOLEAN DEFAULT FALSE,
    lunch BOOLEAN DEFAULT FALSE,
    dinner BOOLEAN DEFAULT FALSE,
    medicine_given BOOLEAN DEFAULT FALSE,
    medicine_time TEXT,
    activity TEXT,
    hygiene_bath BOOLEAN DEFAULT FALSE,
    hygiene_clothes BOOLEAN DEFAULT FALSE,
    mood TEXT,
    issues TEXT,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

--
-- 5. alerts Table
--
CREATE TABLE public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type alert_type NOT NULL,
    resident_id UUID REFERENCES public.residents(id) ON DELETE CASCADE,
    vrudhashram_id UUID NOT NULL REFERENCES public.vrudhashrams(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'Open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==========================================
-- INDEXES FOR OPTIMIZED QUERIES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_users_vrudhashram_id ON public.users(vrudhashram_id);
CREATE INDEX IF NOT EXISTS idx_residents_vrudhashram_id ON public.residents(vrudhashram_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_resident_id ON public.daily_reports(resident_id);
CREATE INDEX IF NOT EXISTS idx_alerts_vrudhashram_id_status ON public.alerts(vrudhashram_id, status);
CREATE INDEX IF NOT EXISTS idx_residents_name_search ON public.residents USING GIN (to_tsvector('simple', name));

-- -----------------------------------------------------
-- HELPER FUNCTIONS FOR RLS
-- -----------------------------------------------------
-- These functions fetch the current user's role and 
-- vrudhashram_id to avoid infinite recursion in policies.
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS text
LANGUAGE sql SECURITY DEFINER SET search_path = public
STABLE AS $$
    SELECT role::text FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_auth_user_vrudhashram_id()
RETURNS uuid
LANGUAGE sql SECURITY DEFINER SET search_path = public
STABLE AS $$
    SELECT vrudhashram_id FROM public.users WHERE id = auth.uid();
$$;

-- -----------------------------------------------------
-- ENABLE ROW LEVEL SECURITY
-- -----------------------------------------------------
ALTER TABLE public.vrudhashrams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------
-- RLS POLICIES
-- -----------------------------------------------------

-- Vrudhashrams Policies
CREATE POLICY "Admins/Caretakers can read their own vrudhashram, Officers can read all"
ON public.vrudhashrams FOR SELECT TO authenticated
USING (
    public.get_auth_user_role() = 'officer' OR id = public.get_auth_user_vrudhashram_id()
);

CREATE POLICY "Officers can insert/update/delete vrudhashrams"
ON public.vrudhashrams FOR ALL TO authenticated
USING (public.get_auth_user_role() = 'officer');

CREATE POLICY "Admins can update their own vrudhashram"
ON public.vrudhashrams FOR UPDATE TO authenticated
USING (public.get_auth_user_role() = 'admin' AND id = public.get_auth_user_vrudhashram_id());


-- Users Policies
CREATE POLICY "Users can read their own profile, Admins read their vrudhashram, Officers read all"
ON public.users FOR SELECT TO authenticated
USING (
    id = auth.uid() OR
    public.get_auth_user_role() = 'officer' OR
    (public.get_auth_user_role() IN ('admin', 'caretaker') AND vrudhashram_id = public.get_auth_user_vrudhashram_id())
);

CREATE POLICY "Users can update their own profile"
ON public.users FOR UPDATE TO authenticated
USING (id = auth.uid());

CREATE POLICY "Admins can manage users in their vrudhashram, Officers manage all"
ON public.users FOR ALL TO authenticated
USING (
    public.get_auth_user_role() = 'officer' OR
    (public.get_auth_user_role() = 'admin' AND vrudhashram_id = public.get_auth_user_vrudhashram_id())
);


-- Residents Policies
CREATE POLICY "Read residents of own vrudhashram, Officers read all"
ON public.residents FOR SELECT TO authenticated
USING (
    public.get_auth_user_role() = 'officer' OR
    vrudhashram_id = public.get_auth_user_vrudhashram_id()
);

CREATE POLICY "Admins manage their residents, Officers manage all"
ON public.residents FOR ALL TO authenticated
USING (
    public.get_auth_user_role() = 'officer' OR
    (public.get_auth_user_role() = 'admin' AND vrudhashram_id = public.get_auth_user_vrudhashram_id())
);


-- Daily Reports Policies
CREATE POLICY "Read reports of own vrudhashram, Officers read all"
ON public.daily_reports FOR SELECT TO authenticated
USING (
    public.get_auth_user_role() = 'officer' OR
    EXISTS (
        SELECT 1 FROM public.residents 
        WHERE id = daily_reports.resident_id AND vrudhashram_id = public.get_auth_user_vrudhashram_id()
    )
);

CREATE POLICY "Caretakers and Admins can insert/update reports for their residents"
ON public.daily_reports FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.residents 
        WHERE id = daily_reports.resident_id AND vrudhashram_id = public.get_auth_user_vrudhashram_id()
    )
);


-- Alerts Policies
CREATE POLICY "Read alerts of own vrudhashram, Officers read all"
ON public.alerts FOR SELECT TO authenticated
USING (
    public.get_auth_user_role() = 'officer' OR
    vrudhashram_id = public.get_auth_user_vrudhashram_id()
);

CREATE POLICY "Caretakers/Admins can manage alerts for their vrudhashram, Officers all"
ON public.alerts FOR ALL TO authenticated
USING (
    public.get_auth_user_role() = 'officer' OR
    vrudhashram_id = public.get_auth_user_vrudhashram_id()
);
