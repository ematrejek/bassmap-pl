-- Fix is_admin(): match allowlist via auth.uid() instead of JWT email claim.
-- Dashboard-created users may not expose email in auth.jwt() during RPC calls.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_allowlist a
    INNER JOIN auth.users u ON lower(a.email) = lower(u.email)
    WHERE u.id = auth.uid()
      AND u.deleted_at IS NULL
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
