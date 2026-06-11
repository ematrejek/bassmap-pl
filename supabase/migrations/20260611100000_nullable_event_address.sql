-- S-01: Allow secret-location events without street address (manual coordinates only)

ALTER TABLE public.events ALTER COLUMN address_street DROP NOT NULL;
ALTER TABLE public.events ALTER COLUMN address_number DROP NOT NULL;
