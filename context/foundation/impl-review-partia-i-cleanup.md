# Impl review — Partia I cleanup (2026-06-14)

Scope: privacy follow-up (PR #17), S-07 mobile subgenre, S-08 structured price.

## Verdicts

| Area | Verdict | Notes |
|------|---------|-------|
| Privacy (checkbox, cookies, RLS) | **APPROVED WITH NOTES** | Shipped PR #17; deploy OK. Optional: test POST signup without consent; timestamp akceptacji regulaminu na przyszłość. |
| S-07 SubgenreFilter | **APPROVED WITH NOTES** | UI-only; brak testów E2E mobile — akceptowalne. |
| S-08 Structured price | **APPROVED** (after fix) | Bug: domyślne `PLN` blokowało „Cena do ustalenia” — naprawione w cleanup commit. |

## Housekeeping done

- [x] Archive `structured-price-currency` → `context/archive/2026-06-14-structured-price-currency/`
- [x] Roadmap S-08 → `done`; Partia I marked complete
- [x] `public-roadmap.ts` — usunięto `structured-price-currency`
- [x] Legal-pages archive — notatka o follow-up privacy (PR #17)
- [ ] GitHub issue #15 — close + board Done (manual/gh)

## Optional follow-ups (non-blocking)

1. Spójny język błędów w `SignUpForm` (PL vs EN).
2. Test integracyjny POST `/api/auth/signup` bez `acceptTerms`.
3. `npm update wrangler` — moderate advisory w dev tooling.
4. `.editorconfig` — redukcja szumu CRLF w working tree.
5. `BassMap_PL_dokumenty_prawne.docx` — trzymać poza repo (gitignore?) lub w osobnym storage.
