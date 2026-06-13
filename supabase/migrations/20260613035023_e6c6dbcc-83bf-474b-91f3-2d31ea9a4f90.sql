
GRANT INSERT ON public.cases TO anon, authenticated;
GRANT ALL ON public.cases TO service_role;

GRANT INSERT ON public.case_messages TO anon, authenticated;
GRANT ALL ON public.case_messages TO service_role;

GRANT SELECT ON public.resources TO anon, authenticated;
GRANT ALL ON public.resources TO service_role;

GRANT INSERT ON public.support_requests TO anon, authenticated;
GRANT ALL ON public.support_requests TO service_role;

GRANT USAGE ON SEQUENCE public.case_code_seq TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_case_by_code(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.post_reporter_message(text, text) TO anon, authenticated;
