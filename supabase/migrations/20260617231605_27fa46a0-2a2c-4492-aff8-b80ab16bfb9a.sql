
-- Add critical urgency level and escalation fields
ALTER TYPE public.case_urgency ADD VALUE IF NOT EXISTS 'critical';

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS escalation_target text,
  ADD COLUMN IF NOT EXISTS escalation_authority text,
  ADD COLUMN IF NOT EXISTS escalation_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz,
  ADD COLUMN IF NOT EXISTS forwarded_at timestamptz,
  ADD COLUMN IF NOT EXISTS forwarded_by uuid,
  ADD COLUMN IF NOT EXISTS forwarded_reference text;

-- Validation trigger for escalation_target values
CREATE OR REPLACE FUNCTION public.validate_case_escalation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.escalation_target IS NOT NULL AND NEW.escalation_target NOT IN ('chief','police') THEN
    RAISE EXCEPTION 'invalid_escalation_target';
  END IF;
  IF NEW.escalation_status NOT IN ('none','pending','forwarded','acknowledged','closed') THEN
    RAISE EXCEPTION 'invalid_escalation_status';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_case_escalation ON public.cases;
CREATE TRIGGER trg_validate_case_escalation BEFORE INSERT OR UPDATE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.validate_case_escalation();

-- Replace submit RPC to accept escalation routing for critical cases
CREATE OR REPLACE FUNCTION public.submit_anonymous_case(
  p_category case_category,
  p_constituency text,
  p_ward text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_urgency case_urgency DEFAULT 'moderate',
  p_contact_method text DEFAULT NULL,
  p_contact_value text DEFAULT NULL,
  p_escalation_target text DEFAULT NULL,
  p_escalation_authority text DEFAULT NULL
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_case_code text; v_esc_status text := 'none'; v_esc_at timestamptz := NULL;
BEGIN
  IF p_category IS NULL THEN RAISE EXCEPTION 'category_required'; END IF;
  IF length(trim(coalesce(p_constituency,''))) = 0 THEN RAISE EXCEPTION 'constituency_required'; END IF;
  IF length(trim(coalesce(p_description,''))) < 10 OR length(trim(coalesce(p_description,''))) > 2000 THEN
    RAISE EXCEPTION 'invalid_description';
  END IF;

  IF p_urgency = 'critical' THEN
    IF p_escalation_target NOT IN ('chief','police') THEN
      RAISE EXCEPTION 'escalation_target_required';
    END IF;
    IF length(trim(coalesce(p_escalation_authority,''))) = 0 THEN
      RAISE EXCEPTION 'escalation_authority_required';
    END IF;
    v_esc_status := 'pending';
    v_esc_at := now();
  END IF;

  INSERT INTO public.cases (
    category, constituency, ward, description, urgency,
    contact_method, contact_value,
    escalation_target, escalation_authority, escalation_status, escalated_at
  ) VALUES (
    p_category, trim(p_constituency),
    nullif(trim(coalesce(p_ward,'')),''),
    trim(p_description),
    coalesce(p_urgency,'moderate'),
    nullif(trim(coalesce(p_contact_method,'')),''),
    nullif(trim(coalesce(p_contact_value,'')),''),
    CASE WHEN p_urgency = 'critical' THEN p_escalation_target ELSE NULL END,
    CASE WHEN p_urgency = 'critical' THEN trim(p_escalation_authority) ELSE NULL END,
    v_esc_status,
    v_esc_at
  ) RETURNING case_code INTO v_case_code;

  RETURN v_case_code;
END $$;

-- Function for admins to mark an escalation as forwarded
CREATE OR REPLACE FUNCTION public.mark_escalation_forwarded(p_case_id uuid, p_reference text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'coordinator')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.cases
    SET escalation_status = 'forwarded',
        forwarded_at = now(),
        forwarded_by = auth.uid(),
        forwarded_reference = nullif(trim(coalesce(p_reference,'')),'')
    WHERE id = p_case_id AND urgency = 'critical';
END $$;
