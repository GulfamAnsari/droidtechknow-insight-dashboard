-- Lock down music_cast_* tables: no direct client access.
-- All access is routed through the music-cast edge function which
-- validates the user's session and uses the service role.

DROP POLICY IF EXISTS "cast devices open" ON public.music_cast_devices;
DROP POLICY IF EXISTS "cast state open" ON public.music_cast_state;

-- Revoke direct Data API privileges from anon/authenticated.
REVOKE ALL ON public.music_cast_devices FROM anon, authenticated;
REVOKE ALL ON public.music_cast_state FROM anon, authenticated;

-- Ensure service role (used by the edge function) retains full access.
GRANT ALL ON public.music_cast_devices TO service_role;
GRANT ALL ON public.music_cast_state TO service_role;

-- RLS stays enabled with no policies => deny-by-default for anon/authenticated.
ALTER TABLE public.music_cast_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_cast_state ENABLE ROW LEVEL SECURITY;
