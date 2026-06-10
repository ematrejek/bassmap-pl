-- F-02: Fix dev admin allowlist email (matejek → matrejek typo)

INSERT INTO public.admin_allowlist (email)
VALUES ('matrejekemilia@gmail.com')
ON CONFLICT (email) DO NOTHING;

DELETE FROM public.admin_allowlist
WHERE email = 'matejekemilia@gmail.com';
