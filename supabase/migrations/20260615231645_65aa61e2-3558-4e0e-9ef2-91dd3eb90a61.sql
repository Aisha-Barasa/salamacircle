
-- App role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'coordinator', 'mentor');

-- user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
$$;

CREATE POLICY "Users view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- First admin claim: only allowed when no admin exists yet
CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (v_uid, 'admin');
  INSERT INTO public.user_roles(user_id, role) VALUES (v_uid, 'coordinator')
    ON CONFLICT DO NOTHING;
  RETURN true;
END $$;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;

-- Admin: grant or revoke roles
CREATE OR REPLACE FUNCTION public.grant_role(_target_user uuid, _role public.app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (_target_user, _role)
    ON CONFLICT DO NOTHING;
END $$;
GRANT EXECUTE ON FUNCTION public.grant_role(uuid, public.app_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.revoke_role(_target_user uuid, _role public.app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.user_roles WHERE user_id = _target_user AND role = _role;
END $$;
GRANT EXECUTE ON FUNCTION public.revoke_role(uuid, public.app_role) TO authenticated;

-- Audit log
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_label text,
  action text NOT NULL,
  case_id uuid,
  target text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit log" ON public.audit_log
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE INDEX audit_log_case_id_idx ON public.audit_log(case_id);
CREATE INDEX audit_log_created_at_idx ON public.audit_log(created_at DESC);

-- Mentor pool
CREATE TABLE public.mentor_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  constituency text NOT NULL,
  skills text[] NOT NULL DEFAULT '{}'::text[],
  languages text[] NOT NULL DEFAULT '{}'::text[],
  contact text,
  active_caseload int NOT NULL DEFAULT 0,
  capacity int NOT NULL DEFAULT 5,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_pool TO authenticated;
GRANT ALL ON public.mentor_pool TO service_role;
ALTER TABLE public.mentor_pool ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coordinators view mentors" ON public.mentor_pool
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'coordinator') OR public.is_admin(auth.uid())
  );
CREATE POLICY "Admins manage mentors" ON public.mentor_pool
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER mentor_pool_updated BEFORE UPDATE ON public.mentor_pool
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Cases: allow coordinators to view & update (still no public SELECT)
CREATE POLICY "Coordinators view cases" ON public.cases
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'coordinator') OR public.is_admin(auth.uid())
  );
CREATE POLICY "Coordinators update cases" ON public.cases
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'coordinator') OR public.is_admin(auth.uid())
  ) WITH CHECK (
    public.has_role(auth.uid(), 'coordinator') OR public.is_admin(auth.uid())
  );

CREATE POLICY "Coordinators view case messages" ON public.case_messages
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'coordinator') OR public.is_admin(auth.uid())
  );
CREATE POLICY "Coordinators add admin messages" ON public.case_messages
  FOR INSERT TO authenticated WITH CHECK (
    (public.has_role(auth.uid(), 'coordinator') OR public.is_admin(auth.uid()))
    AND author = 'admin'
  );

-- Audit trigger for case updates
CREATE OR REPLACE FUNCTION public.log_case_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_changes jsonb := '{}'::jsonb;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    v_changes := v_changes || jsonb_build_object('status', jsonb_build_array(OLD.status, NEW.status));
  END IF;
  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    v_changes := v_changes || jsonb_build_object('assigned_to', jsonb_build_array(OLD.assigned_to, NEW.assigned_to));
  END IF;
  IF NEW.intervention_notes IS DISTINCT FROM OLD.intervention_notes THEN
    v_changes := v_changes || jsonb_build_object('intervention_notes', 'changed');
  END IF;
  IF v_changes <> '{}'::jsonb THEN
    INSERT INTO public.audit_log(actor_id, action, case_id, target, details)
    VALUES (auth.uid(), 'case_update', NEW.id, NEW.case_code, v_changes);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER cases_audit_update AFTER UPDATE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.log_case_update();

CREATE OR REPLACE FUNCTION public.log_case_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.author = 'admin' THEN
    INSERT INTO public.audit_log(actor_id, action, case_id, details)
    VALUES (auth.uid(), 'admin_message', NEW.case_id, jsonb_build_object('message_id', NEW.id));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER case_messages_audit_insert AFTER INSERT ON public.case_messages
  FOR EACH ROW EXECUTE FUNCTION public.log_case_message();

-- Touch updated_at on cases too (used by triggers above; ensure trigger exists)
DROP TRIGGER IF EXISTS cases_touch_updated_at ON public.cases;
CREATE TRIGGER cases_touch_updated_at BEFORE UPDATE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed sample mentor pool
INSERT INTO public.mentor_pool (display_name, constituency, skills, languages, contact, capacity, notes) VALUES
  ('Amina Hassan', 'Kilifi North', ARRAY['counseling','youth coaching'], ARRAY['Swahili','English'], 'amina@example.org', 6, 'Trauma-informed; available evenings.'),
  ('Joseph Mwangi', 'Kilifi South', ARRAY['vocational training','carpentry'], ARRAY['Swahili'], 'joseph@example.org', 4, 'Runs Saturday workshop in Mtwapa.'),
  ('Fatuma Ali', 'Malindi', ARRAY['peer support','religious dialogue'], ARRAY['Swahili','Arabic','English'], 'fatuma@example.org', 5, 'Coordinates with local madrasas.'),
  ('Daniel Karisa', 'Magarini', ARRAY['sports mentorship','football'], ARRAY['Swahili','Giriama'], 'daniel@example.org', 8, 'Youth football league lead.'),
  ('Esther Charo', 'Ganze', ARRAY['mental health','case management'], ARRAY['Swahili','English','Giriama'], 'esther@example.org', 5, 'Licensed counselor.'),
  ('Salim Bakari', 'Kaloleni', ARRAY['religious dialogue','community elders'], ARRAY['Swahili','Arabic'], 'salim@example.org', 4, 'Imam and community elder.'),
  ('Grace Mwende', 'Rabai', ARRAY['career coaching','employment'], ARRAY['Swahili','English'], 'grace@example.org', 6, 'Links youth to jobs.');
