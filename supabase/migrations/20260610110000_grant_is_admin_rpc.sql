-- F-02: Allow authenticated clients to call is_admin() via RPC (app-layer guard)

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
