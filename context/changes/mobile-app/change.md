---
change_id: mobile-app
title: PWA instalowalna (S-27)
status: implemented
created: 2026-06-30
updated: 2026-06-30
archived_at: null
---

## Notes

Roadmap **S-27** – BassMap jako PWA: użytkownik instaluje stronę na ekran głównym telefonu (ikona, tryb standalone, ekran offline), bez publikacji w App Store / Google Play w v1.

Research i decyzje: `context/foundation/pwa-research.md`.

Technologia: `@vite-pwa/astro` + manifest + service worker (auto-update) + ikony 192/512/maskable + strona `/offline`. SSR pozostaje – cache tylko statyków; strony prywatne i API bez agresywnego cache.

Prerequisites: S-26 (GA4) zalecane, nie blokuje planu.
