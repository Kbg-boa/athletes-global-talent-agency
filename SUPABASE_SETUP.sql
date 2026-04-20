-- ============================================
-- AGTA Management Portal - Complete Setup
-- ============================================

-- 1. Créer la table agta_activity (pour le tracking)
CREATE TABLE public.agta_activity (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email text NOT NULL,
  activity_type text NOT NULL,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. Créer la table athletes (pour les profils validés)
CREATE TABLE public.athletes (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  sport text NOT NULL,
  position text NOT NULL,
  club text,
  value text,
  registration_type text CHECK (registration_type IN ('bureau', 'online')),
  location text,
  status text DEFAULT 'Actif',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. Créer la table recruitment (pour les candidatures)
CREATE TABLE public.recruitment (
  id bigserial PRIMARY KEY,
  full_name text NOT NULL,
  age text,
  sport text NOT NULL,
  position text NOT NULL,
  nationality text,
  email text NOT NULL,
  phone text,
  height text,
  weight text,
  experience text,
  video_url text,
  cv_url text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 4. Créer la table payments (pour les revenus)
CREATE TABLE public.payments (
  id bigserial PRIMARY KEY,
  user_email text,
  amount decimal(10,2),
  currency text DEFAULT 'USD',
  type text CHECK (type IN ('subscription', 'service', 'commission')),
  status text DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  description text,
  created_at timestamp with time zone DEFAULT now()
);

-- 5. Créer la table recruiters (pour les utilisateurs payants)
CREATE TABLE public.recruiters (
  id bigserial PRIMARY KEY,
  email text UNIQUE NOT NULL,
  name text,
  company text,
  subscription_status text DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'suspended')),
  subscription_type text,
  access_level text DEFAULT 'basic' CHECK (access_level IN ('basic', 'premium', 'enterprise')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 6. Créer la table opportunities (pour les offres d'emploi)
CREATE TABLE public.opportunities (
  id bigserial PRIMARY KEY,
  title text NOT NULL,
  sport text NOT NULL,
  position text NOT NULL,
  club text,
  location text,
  salary_range text,
  description text,
  requirements text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'filled', 'expired')),
  created_by text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 7. Créer la table documents (pour les fichiers)
CREATE TABLE public.documents (
  id bigserial PRIMARY KEY,
  athlete_id bigint REFERENCES athletes(id),
  document_type text CHECK (document_type IN ('contract', 'cv', 'passport', 'photo', 'video', 'other')),
  file_name text NOT NULL,
  file_url text NOT NULL,
  uploaded_by text,
  created_at timestamp with time zone DEFAULT now()
);

-- 8. Activer RLS sur toutes les tables
ALTER TABLE public.agta_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruiters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 9. Politiques RLS pour agta_activity
CREATE POLICY "Users can read all activities"
  ON public.agta_activity
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own activities"
  ON public.agta_activity
  FOR INSERT
  TO authenticated
  WITH CHECK (user_email = auth.jwt() ->> 'email');

-- 10. Politiques RLS pour athletes
CREATE POLICY "Staff can manage athletes"
  ON public.athletes
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'email' IN ('kbgmathieu@gmail.com', 'staff@agta.com'));

-- 11. Politiques RLS pour recruitment
CREATE POLICY "Public can insert applications"
  ON public.recruitment
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Staff can read applications"
  ON public.recruitment
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'email' IN ('kbgmathieu@gmail.com', 'staff@agta.com'));

CREATE POLICY "Staff can update applications"
  ON public.recruitment
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'email' IN ('kbgmathieu@gmail.com', 'staff@agta.com'));

-- 12. Politiques RLS pour payments
CREATE POLICY "DG can manage payments"
  ON public.payments
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'kbgmathieu@gmail.com');

-- 13. Politiques RLS pour recruiters
CREATE POLICY "DG can manage recruiters"
  ON public.recruiters
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'kbgmathieu@gmail.com');

-- 14. Politiques RLS pour opportunities
CREATE POLICY "DG can manage opportunities"
  ON public.opportunities
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'kbgmathieu@gmail.com');

-- 15. Politiques RLS pour documents
CREATE POLICY "Staff can manage documents"
  ON public.documents
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'email' IN ('kbgmathieu@gmail.com', 'staff@agta.com'));

-- 16. Créer les buckets de stockage
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('athlete-files', 'athlete-files', false),
  ('documents', 'documents', false),
  ('opportunities', 'opportunities', false);

-- 17. Politiques de stockage
CREATE POLICY "Users can upload athlete files"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'athlete-files');

CREATE POLICY "Users can view athlete files"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'athlete-files');

-- 18. Indexes pour les performances
CREATE INDEX idx_agta_activity_created_at ON public.agta_activity(created_at DESC);
CREATE INDEX idx_agta_activity_user_email ON public.agta_activity(user_email);
CREATE INDEX idx_agta_activity_type ON public.agta_activity(activity_type);

CREATE INDEX idx_athletes_created_at ON public.athletes(created_at DESC);
CREATE INDEX idx_athletes_sport ON public.athletes(sport);
CREATE INDEX idx_athletes_registration_type ON public.athletes(registration_type);

CREATE INDEX idx_recruitment_created_at ON public.recruitment(created_at DESC);
CREATE INDEX idx_recruitment_status ON public.recruitment(status);
CREATE INDEX idx_recruitment_sport ON public.recruitment(sport);

CREATE INDEX idx_payments_created_at ON public.payments(created_at DESC);
CREATE INDEX idx_payments_type ON public.payments(type);

CREATE INDEX idx_recruiters_email ON public.recruiters(email);
CREATE INDEX idx_recruiters_status ON public.recruiters(subscription_status);

CREATE INDEX idx_opportunities_created_at ON public.opportunities(created_at DESC);
CREATE INDEX idx_opportunities_status ON public.opportunities(status);

-- 19. Triggers pour updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agta_activity_updated_at
BEFORE UPDATE ON public.agta_activity
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_athletes_updated_at
BEFORE UPDATE ON public.athletes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recruitment_updated_at
BEFORE UPDATE ON public.recruitment
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recruiters_updated_at
BEFORE UPDATE ON public.recruiters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at
BEFORE UPDATE ON public.opportunities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- INSTRUCTIONS DE CONFIGURATION
-- ============================================
-- 1. Aller sur https://app.supabase.com
-- 2. Ouvrir votre projet AGTA
-- 3. Aller dans l'onglet "SQL Editor"
-- 4. Copier-coller TOUT le SQL ci-dessus
-- 5. Cliquer sur "Run"
-- 6. Vérifier que toutes les tables sont créées
-- 7. Les buckets de stockage sont configurés
-- 8. RLS est activé sur toutes les tables
--
-- 🎉 Base de données AGTA complète et prête ! !
