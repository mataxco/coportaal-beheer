---
name: backup-systeem
description: Nachtelijke back-up van alle kantoren (incl. MaTaxCo zelf) via GitHub Actions in repo mataxco/coportaal-beheer; herstel altijd naar een nieuwe lege omgeving
metadata:
  node_type: memory
  type: project
  originSessionId: 42a68360-7a3f-427f-9b2f-8de9507360d7
  modified: 2026-11-16T10:57:31.847Z
---

Gebouwd 16-11-2026 op verzoek van Mustafa ("ingebouwd backup systeem, voor mijn portaal en dat van klanten, zodat ik altijd kan resetten").

- Code: `C:\Dev\coportaal-beheer` → `scripts/backup.mjs`, `scripts/herstel.mjs`, `.github/workflows/backup.yml` (cron 02:30 UTC) en `herstel.yml`, uitleg in `BACKUP.md`.
- Leest kantoren uit beheer-tabel `kantoren` (ref assmaihnaojaulhtjkiq); MaTaxCo's productie (nvbpurdcfxggwcetkcxi) staat daar als "MaTaxCo B.V." alleen voor de back-up. Log in `kantoor_backups`, kaart "Back-ups" op de kantoorpagina in de beheer-app.
- Database: `supabase db dump` (vereist Docker → draait alleen in GitHub Actions, niet op Mustafa's pc), AES-256 versleuteld met secret `BACKUP_WACHTWOORD`, naar bucket `backups` + artifact (30 d). Bestanden → bucket `backup-bestanden`; buckets op `-temp` overgeslagen; bij kantoor verwijderde bestanden 90 d in `_verwijderd/`.
- GitHub-instellingen die Mustafa zelf moet zetten: secrets `SUPABASE_ACCESS_TOKEN`, `BACKUP_WACHTWOORD` (ook in zijn wachtwoordmanager!), variable `BEHEER_REF`.

**Why:** uitval bij een kantoor mag nooit dataverlies betekenen; herstel naar een nieuwe omgeving voorkomt dat een mislukt herstel de bestaande data raakt.
**How to apply:** Stand 16-11: bestandendeel lokaal getest tegen de demo; de databasedump is pas bewezen na de eerste geslaagde run in GitHub — eerst die run controleren (tabel `kantoor_backups`) voordat je zegt dat het werkt. Een echte hersteltest naar een wegwerpproject is nog niet gedaan. Zie [[coportaal-uitrol]], [[openstaande-acties-mustafa]].
