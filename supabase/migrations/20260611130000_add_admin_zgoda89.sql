-- Add co-admin for event management

INSERT INTO public.admin_allowlist (email)
VALUES ('zgoda89@gmail.com')
ON CONFLICT (email) DO NOTHING;
