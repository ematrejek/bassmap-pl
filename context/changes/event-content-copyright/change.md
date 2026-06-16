---
change_id: event-content-copyright
title: Prawa autorskie treści zgłoszenia (okładka + opis)
roadmap_ref: S-17
status: impl_reviewed
created: 2026-06-15
updated: 2026-06-16
legal_copy_approved: 2026-06-15
legal_copy_note: Właściciel zaakceptował projekt §5.6–5.9 i dopisków polityki w planie; zalecany przegląd prawnika przed produkcją.
github-issue: "#30"
plan: context/changes/event-content-copyright/plan.md
plan-brief: context/changes/event-content-copyright/plan-brief.md
---

# Change: event-content-copyright

Roadmap **S-17** – compliance praw autorskich przy zgłaszaniu wydarzeń z okładką. **Kolejność Stream D:** S-12 (done) → **S-17** → S-13 (duplikaty wymagają S-17).

## Outcome

Przy zgłoszeniu wydarzenia z okładką użytkownik wybiera źródło grafiki (Facebook / Instagram / Strona organizatora / Własna), akceptuje wymagane oświadczenie, a system zapisuje wybór i timestamp w bazie. Submit/upload okładki bez oświadczenia jest odrzucany (frontend + API Zod). Ogólna zgoda na opis pozostaje przy tworzeniu zgłoszenia fana (S-12). Regulamin: § o grafikach + §5.9 art. 29 dla opisów (ostrożne brzmienie, review przed deployem – nie porada prawna). **Fan + admin** – ten sam wzorzec okładki (decyzja planowania; roadmapa miała open question fan-only).

## Prerequisites

- **S-12** done (archived 2026-06-15, PR #29, issue #24).
- **S-13** blocked until S-17 ships.

## Key decisions (planning session 2026-06-15)

| Obszar                    | Decyzja                                                                                                           |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Model zgody               | Ogólny checkbox opisu zawsze + osobny dropdown/checkbox okładki gdy plik wybrany                                  |
| Walidacja okładki         | Endpoint upload cover (fan + admin), walidacja Zod                                                                |
| Formularz admina          | Fan + admin (override roadmapy fan-only)                                                                          |
| Art. 29 opisy             | Tylko regulamin/polityka – bez podpowiedzi w formularzu                                                           |
| Moderacja                 | Admin widzi źródło okładki i datę oświadczenia                                                                    |
| Retencja audytu           | Tak długo jak rekord wydarzenia                                                                                   |
| DB audyt okładki          | `cover_source`, `cover_declaration_kind`, `cover_copyright_declared_at`                                           |
| Brak oświadczenia okładki | Dialog: Tak = bez okładki, Nie = anuluj wysyłkę                                                                   |
| Tekst prawny              | Projekt §5.6–5.9 + polityka **zaakceptowany** 2026-06-15 (plan faza 4); §5.7 – odp. cywilna + informacyjnie karna |
