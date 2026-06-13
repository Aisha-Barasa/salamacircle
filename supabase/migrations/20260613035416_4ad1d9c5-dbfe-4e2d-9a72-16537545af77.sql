CREATE OR REPLACE FUNCTION public.submit_anonymous_case(
  p_category public.case_category,
  p_constituency text,
  p_ward text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_urgency public.case_urgency DEFAULT 'moderate',
  p_contact_method text DEFAULT NULL,
  p_contact_value text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case_code text;
BEGIN
  IF p_category IS NULL THEN
    RAISE EXCEPTION 'category_required';
  END IF;

  IF length(trim(coalesce(p_constituency, ''))) = 0 THEN
    RAISE EXCEPTION 'constituency_required';
  END IF;

  IF length(trim(coalesce(p_description, ''))) < 10 OR length(trim(coalesce(p_description, ''))) > 2000 THEN
    RAISE EXCEPTION 'invalid_description';
  END IF;

  INSERT INTO public.cases (
    category,
    constituency,
    ward,
    description,
    urgency,
    contact_method,
    contact_value
  )
  VALUES (
    p_category,
    trim(p_constituency),
    nullif(trim(coalesce(p_ward, '')), ''),
    trim(p_description),
    coalesce(p_urgency, 'moderate'),
    nullif(trim(coalesce(p_contact_method, '')), ''),
    nullif(trim(coalesce(p_contact_value, '')), '')
  )
  RETURNING case_code INTO v_case_code;

  RETURN v_case_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_anonymous_case(public.case_category, text, text, text, public.case_urgency, text, text) TO anon, authenticated;