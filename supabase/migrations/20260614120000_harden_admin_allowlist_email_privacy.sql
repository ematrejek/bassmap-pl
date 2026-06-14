-- Privacy: prevent authenticated users from reading other users' emails via admin_allowlist API.
-- is_admin() remains SECURITY DEFINER and can still match allowlist internally.

DROP POLICY IF EXISTS admin_allowlist_select_admin ON public.admin_allowlist;

REVOKE ALL ON TABLE public.admin_allowlist FROM anon, authenticated;
GRANT ALL ON TABLE public.admin_allowlist TO service_role;
