-- Local dev seed for F-01 event data foundation.
-- Dev admin allowlist — matejekemilia@gmail.com

INSERT INTO public.admin_allowlist (email)
VALUES ('matejekemilia@gmail.com')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.events (
  name,
  starts_at,
  city,
  venue_name,
  address_street,
  address_number,
  latitude,
  longitude,
  subgenres,
  lineup,
  ticket_url,
  is_free,
  price,
  status
)
VALUES
  (
    'Neuro Night: Warsaw',
    '2026-09-12 22:00:00+02',
    'Warszawa',
    'Proxima',
    'Złota',
    '9',
    52.2297,
    21.0122,
    ARRAY['neurofunk', 'techstep']::public.subgenre[],
    ARRAY['Noisia', 'Phace', 'Mefjus'],
    'https://example.com/tickets/neuro-night-warsaw',
    false,
    'od 89 zł',
    'published'
  ),
  (
    'Liquid Sundays',
    '2026-10-04 18:00:00+02',
    'Kraków',
    'Hype Park',
    'Kamienna',
    '15',
    50.0647,
    19.9450,
    ARRAY['liquid_dnb', 'soul_dnb']::public.subgenre[],
    ARRAY['Calibre', 'Lenzman'],
    NULL,
    true,
    NULL,
    'published'
  ),
  (
    'Jump-Up Massive',
    '2026-11-21 23:00:00+01',
    'Wrocław',
    'Akademia',
    'Piotra Skargi',
    '5-9',
    NULL,
    NULL,
    ARRAY['jump_up', 'anthem_dnb']::public.subgenre[],
    NULL,
    'https://example.com/tickets/jump-up-wroclaw',
    false,
    'od 45 zł',
    'published'
  ),
  (
    'Halftime & Autonomic Session',
    '2026-12-06 20:00:00+01',
    'Gdańsk',
    'B90',
    'Elektryków',
    '4',
    NULL,
    NULL,
    ARRAY['halftime', 'autonomic']::public.subgenre[],
    ARRAY['Om Unit', 'Machinedrum'],
    NULL,
    false,
    'wstęp wolny, rezerwacja miejsc',
    'published'
  ),
  (
    'Jungle Roots Outdoor',
    '2026-09-27 16:00:00+02',
    'Poznań',
    'Strefa Kultury',
    'Niepodległości',
    '34',
    52.4064,
    16.9252,
    ARRAY['jungle', 'ragga_dnb']::public.subgenre[],
    ARRAY['Aphrodite', 'Shy FX'],
    'https://example.com/tickets/jungle-poznan',
    false,
    'od 60 zł',
    'published'
  );
