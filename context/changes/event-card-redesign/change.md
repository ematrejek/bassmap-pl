---
change_id: event-card-redesign
title: Kafelki wydarzeń (bassmap-pl-ui)
roadmap_ref: S-18
status: impl_reviewed
created: 2026-06-22
updated: 2026-06-22
archived_at: null
github-issue: 38
---

# Change: event-card-redesign

Roadmap **S-18** – kwadratowe kafelki wydarzeń na `/events` zgodne z mockupem `bassmap-pl-ui`, układ mapa nad siatką, link do strony szczegółów zamiast podglądu.

## Outcome

Fan na liście `/events` widzi siatkę kafelków (nazwa, podgatunki, miejsce, czas, cena, placeholder „0 Idzie”, przycisk biletu gdy jest URL). Mapa nad siatką; hover na kafelku podświetla pin. Klik kafelka lub pina prowadzi do `/events/[id]`.

## Notes

Design reference: `bassmap-pl-ui/components/event-card.tsx` + `event-explorer.tsx` (folder gitignored, lokalny mockup Next.js).
