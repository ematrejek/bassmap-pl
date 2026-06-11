---
change-id: admin-event-management
title: Panel admina — CRUD wydarzeń DnB (S-01)
status: impl_reviewed
roadmap-id: S-01
github-issue: 3
created: 2026-06-10
updated: 2026-06-11
impl-review: context/changes/admin-event-management/reviews/impl-review.md
---

Warstwa aplikacyjna zarządzania wydarzeniami — lista admina, formularze create/edit, API mutacji z `requireAdmin()` + zod, mapper DB↔TS, geokodowanie adresu (Nominatim) z trybem „lokalizacja tajna” (ręczne współrzędne). Odblokowuje S-02 (odkrywanie przez fana).
