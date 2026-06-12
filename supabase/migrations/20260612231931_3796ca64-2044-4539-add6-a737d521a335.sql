
-- Enums
CREATE TYPE public.case_category AS ENUM (
  'sudden_isolation','harmful_online_influence','school_dropout_risk',
  'emotional_distress','violent_rhetoric','recruitment_concerns',
  'substance_abuse','family_community_conflict'
);
CREATE TYPE public.case_urgency AS ENUM ('low','moderate','urgent');
CREATE TYPE public.case_status AS ENUM (
  'submitted','under_review','verified','intervention_assigned',
  'active_support','monitoring','resolved'
);
CREATE TYPE public.support_type AS ENUM (
  'mentorship','counseling','jobs','education','mental_health'
);
CREATE TYPE public.author_type AS ENUM ('reporter','admin','system');

-- Sequence for nice case codes
CREATE SEQUENCE public.case_code_seq START 129;

CREATE OR REPLACE FUNCTION public.generate_case_code()
RETURNS text LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT 'SC-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.case_code_seq')::text, 5, '0');
$$;

-- cases
CREATE TABLE public.cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_code text NOT NULL UNIQUE DEFAULT public.generate_case_code(),
  category public.case_category NOT NULL,
  constituency text NOT NULL,
  ward text,
  description text NOT NULL,
  urgency public.case_urgency NOT NULL DEFAULT 'moderate',
  status public.case_status NOT NULL DEFAULT 'submitted',
  contact_method text,
  contact_value text,
  intervention_notes text,
  assigned_to text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.cases TO anon, authenticated;
GRANT ALL ON public.cases TO service_role;
GRANT USAGE ON SEQUENCE public.case_code_seq TO anon, authenticated, service_role;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

-- Anyone may submit a concern
CREATE POLICY "anyone can submit a case" ON public.cases
  FOR INSERT TO anon, authenticated WITH CHECK (true);
-- No public SELECT — reads go through security-definer function

-- case_messages
CREATE TABLE public.case_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  author public.author_type NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.case_messages TO service_role;
GRANT INSERT ON public.case_messages TO anon, authenticated;
ALTER TABLE public.case_messages ENABLE ROW LEVEL SECURITY;
-- reporters post via security-definer fn; admin via service role

-- support_requests
CREATE TABLE public.support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.support_type NOT NULL,
  display_name text,
  contact text,
  constituency text,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.support_requests TO anon, authenticated;
GRANT ALL ON public.support_requests TO service_role;
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can submit support request" ON public.support_requests
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- resources
CREATE TABLE public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  url text,
  location text,
  contact text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.resources TO anon, authenticated;
GRANT ALL ON public.resources TO service_role;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "resources are public" ON public.resources
  FOR SELECT TO anon, authenticated USING (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER cases_touch BEFORE UPDATE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Security-definer: fetch a case + messages by case_code (reporter lookup)
CREATE OR REPLACE FUNCTION public.get_case_by_code(p_code text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'case', to_jsonb(c.*) - 'contact_value' - 'contact_method',
    'messages', COALESCE((
      SELECT jsonb_agg(to_jsonb(m.*) ORDER BY m.created_at)
      FROM public.case_messages m WHERE m.case_id = c.id
    ), '[]'::jsonb)
  ) INTO result
  FROM public.cases c WHERE c.case_code = p_code;
  RETURN result;
END $$;
GRANT EXECUTE ON FUNCTION public.get_case_by_code(text) TO anon, authenticated;

-- Security-definer: reporter posts a message using case_code
CREATE OR REPLACE FUNCTION public.post_reporter_message(p_code text, p_body text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_case_id uuid; v_msg_id uuid;
BEGIN
  IF length(trim(p_body)) = 0 OR length(p_body) > 2000 THEN
    RAISE EXCEPTION 'invalid_message';
  END IF;
  SELECT id INTO v_case_id FROM public.cases WHERE case_code = p_code;
  IF v_case_id IS NULL THEN RAISE EXCEPTION 'case_not_found'; END IF;
  INSERT INTO public.case_messages(case_id, author, body)
  VALUES (v_case_id, 'reporter', p_body) RETURNING id INTO v_msg_id;
  RETURN v_msg_id;
END $$;
GRANT EXECUTE ON FUNCTION public.post_reporter_message(text, text) TO anon, authenticated;
