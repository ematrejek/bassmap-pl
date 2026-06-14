-- S-08 structured-price-currency: replace free-text price with structured amount + currency.

CREATE TYPE public.price_mode AS ENUM ('exact', 'from', 'range');
CREATE TYPE public.event_currency AS ENUM ('PLN', 'EUR', 'CZK');

ALTER TABLE public.events
  ADD COLUMN price_mode public.price_mode,
  ADD COLUMN price_min numeric(10, 2),
  ADD COLUMN price_max numeric(10, 2),
  ADD COLUMN currency public.event_currency;

-- Heuristic migration from legacy text price (common admin/seed patterns).
-- Unmatched rows keep NULL price fields (fan sees "Cena do ustalenia") — not data loss on is_free/name/etc.

UPDATE public.events
SET
  price_mode = 'from',
  price_min = replace((regexp_match(price, '^od\s+(\d+(?:[.,]\d+)?)\s*(zł|pln)', 'i'))[1], ',', '.')::numeric,
  currency = 'PLN'
WHERE price ~* '^od\s+\d+(?:[.,]\d+)?\s*(zł|pln)';

UPDATE public.events
SET
  price_mode = 'from',
  price_min = replace((regexp_match(price, '^od\s+(\d+(?:[.,]\d+)?)\s*(€|eur)', 'i'))[1], ',', '.')::numeric,
  currency = 'EUR'
WHERE price_mode IS NULL
  AND price ~* '^od\s+\d+(?:[.,]\d+)?\s*(€|eur)';

UPDATE public.events
SET
  price_mode = 'from',
  price_min = replace((regexp_match(price, '^od\s+(\d+(?:[.,]\d+)?)\s*(kč|czk)', 'i'))[1], ',', '.')::numeric,
  currency = 'CZK'
WHERE price_mode IS NULL
  AND price ~* '^od\s+\d+(?:[.,]\d+)?\s*(kč|czk)';

-- "od 50" without currency suffix → assume PLN (legacy Polish entries).
UPDATE public.events
SET
  price_mode = 'from',
  price_min = replace((regexp_match(price, '^od\s+(\d+(?:[.,]\d+)?)\b', 'i'))[1], ',', '.')::numeric,
  currency = 'PLN'
WHERE price_mode IS NULL
  AND price ~* '^od\s+\d+(?:[.,]\d+)?';

UPDATE public.events
SET
  price_mode = 'range',
  price_min = replace((regexp_match(price, '(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)\s*(zł|pln)', 'i'))[1], ',', '.')::numeric,
  price_max = replace((regexp_match(price, '(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)\s*(zł|pln)', 'i'))[2], ',', '.')::numeric,
  currency = 'PLN'
WHERE price_mode IS NULL
  AND price ~* '\d+\s*[-–]\s*\d+\s*(zł|pln)';

UPDATE public.events
SET
  price_mode = 'exact',
  price_min = replace((regexp_match(price, '^(\d+(?:[.,]\d+)?)\s*(zł|pln)', 'i'))[1], ',', '.')::numeric,
  currency = 'PLN'
WHERE price_mode IS NULL
  AND price ~* '^\d+(?:[.,]\d+)?\s*(zł|pln)';

ALTER TABLE public.events DROP COLUMN price;

ALTER TABLE public.events
  ADD CONSTRAINT events_price_free_clear CHECK (
    is_free = false
    OR (
      price_mode IS NULL
      AND price_min IS NULL
      AND price_max IS NULL
      AND currency IS NULL
    )
  ),
  ADD CONSTRAINT events_price_shape CHECK (
    price_mode IS NULL
    OR (
      price_min IS NOT NULL
      AND currency IS NOT NULL
      AND (
        (price_mode IN ('exact', 'from') AND price_max IS NULL)
        OR (price_mode = 'range' AND price_max IS NOT NULL AND price_max > price_min)
      )
    )
  );
