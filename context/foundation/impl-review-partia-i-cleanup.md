# Impl review \u2013 Partia I cleanup (2026-06-14)

Scope: privacy follow-up (PR #17), S-07 mobile subgenre, S-08 structured price.

## Verdicts

| Area                             | Verdict                  | Notes                                                                                                                 |
| -------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Privacy (checkbox, cookies, RLS) | **APPROVED WITH NOTES**  | Shipped PR #17; deploy OK. Optional: test POST signup without consent; timestamp akceptacji regulaminu na przyszłość. |
| S-07 SubgenreFilter              | **APPROVED WITH NOTES**  | UI-only; brak testów E2E mobile \u2013 akceptowalne.                                                                       |
| S-08 Structured price            | **APPROVED** (after fix) | Bug: domyślne `PLN` blokowało „Cena do ustalenia” \u2013 naprawione w cleanup commit.                                      |

## Housekeeping done

- [x] Archive `structured-price-currency` → `context/archive/2026-06-14-structured-price-currency/`
- [x] Roadmap S-08 → `done`; Partia I marked complete
- [x] `public-roadmap.ts` \u2013 usunięto `structured-price-currency`
- [x] Legal-pages archive \u2013 notatka o follow-up privacy (PR #17)
- [ ] GitHub issue #15 \u2013 close + board Done (manual/gh)

## Optional follow-ups (non-blocking)

1. Spójny język błędów w `SignUpForm` (PL vs EN).
2. Test integracyjny POST `/api/auth/signup` bez `acceptTerms`.
3. `npm update wrangler` \u2013 moderate advisory w dev tooling.
4. `.editorconfig` \u2013 redukcja szumu CRLF w working tree.
5. `BassMap_PL_dokumenty_prawne.docx` \u2013 trzymać poza repo (gitignore?) lub w osobnym storage.
