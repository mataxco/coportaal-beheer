---
name: openstaande-acties-mustafa
description: Lijst van handmatige acties die Mustafa zelf nog moet doen (stand 14-11-2026) plus open backlog voor Claude; bij elk gesprek even checken en bijwerken
metadata:
  node_type: memory
  type: project
  originSessionId: 42a68360-7a3f-427f-9b2f-8de9507360d7
  modified: 2026-11-14T14:36:22.592Z
---

# Openstaande acties (stand 14-11-2026)

**Mustafa zelf (Claude kan dit niet):**
1. **Outlook-account opnieuw koppelen** (portaal → Instellingen → E-mail → Koppelen) voor het nieuwe recht `Mail.ReadWrite`; nodig voor loonstukken/bijlagen > 3 MB via de Graph-conceptflow (send-email commit 59dffba, 14-11-2026). Ook op de demo-omgeving als daar een mailaccount gekoppeld is.
4. Oude Vercel-project `mataxco-portaal` verwijderen (optioneel).
5. Controleren of de mislukte mails van 12/13-11 (herinneringen 07:00 Al Gnwash / Kapsalon Adam, bankgegevens Amir Slagerij, contract Kapsalon Adam) alsnog verzonden zijn; anders handmatig opnieuw.
6. Documenten → SharePoint: bij het eerste nieuwe document per klant de klantmap kiezen (daarna automatisch). De 12 bestaande brieven zijn nog niet gekoppeld; via regelmenu "Opslaan in SharePoint" koppelen als gewenst.
7. Visueel nakijken (Claude kon niet inloggen in het browservenster): Documenten (bewerken, klantmap-blok), Klanten → tab Wacht op klant, Team → thuiswerken, Mijn Taken → Collega's (alleen zichtbaar als medewerker), Team → Urenregistratie (weergaven Uren/Verloning, toeslagen) en Instellingen → Team → Weekend en feestdagen.
8. Toeslagpercentages controleren (standaard za 150 %, zo/feestdag 200 %) en zo nodig aanpassen bij Instellingen → Team.

**Afgerond 14-11-2026 (avond):** Vercel Production Branch = `coportaal` (push naar die tak rolt demo.coportaal.nl automatisch uit); GitHub-repo's mataxco/coportaal-site en mataxco/coportaal-beheer gevuld; demo-sleutel in Vault via `python scripts/zet-kantoor-sleutel.py <ref>` (coportaal-beheer); beheer-app 'Status ophalen' werkt; CoPortaal-logo/favicon/titel op demo-login en als terugval in de zijbalk.

**Ook afgerond 14-11-2026 (laat):** coportaal.nl + www live op Vercel-project `coportaal-site` (auto-deploy vanaf main van mataxco/coportaal-site); DNS bij Cloud86 (A @ en * → 216.198.79.1, www CNAME → vercel-dns, mail A → 45.82.191.52, MX → mail.coportaal.nl); demo-kantoor heet in beheer "Administratiekantoor De Linde" (omgevingsnaam in demo-DB nog aanpassen bij het vullen); instelling 'Logo laten opgaan in de zijbalk' in beide portalen.

**Wacht op keuze Mustafa:** (a) kop loginpagina portaal.mataxco.nl: MaTaxCo Portaal of CoPortaal; (b) akkoord om demo te vullen met fictieve data; (c) KvK-nummer + adres voor footer website; (d) feedback op website-teksten, aanvraagformulier testen.

**Backlog Claude (nog te bouwen):**
- Beheer-app: volautomatisch "Nieuw kantoor" (project aanmaken, migreren, bootstrap-admin), "Update uitrollen naar alle kantoren", support-inlog, eigen SMTP/branding voor beheer-authmails, signups uit na eerste account, test-aanvraag "Testkantoor De Proef" verwijderen.
- Demo vullen met fictieve data; Importeren-menu (Jortt/SnelStart/Exact/AFAS via CSV).
- Website: screenshots/video's, KvK-footer, bedankpagina `/aanvraag/bedankt`.
- "Document laten ondertekenen" end-to-end in de browser verifiëren; handleiding-regel voor module-licenties.
- Loginpagina op productie toont de kop "CoPortaal" (committed Auth.tsx, white-label-sessie); checken of dat voor portaal.mataxco.nl gewenst is.
- Dev-server: `preview_start name: portaal-dev` start vite vanuit C:\Dev (tailwind-config niet gevonden → kale pagina). Werkend alternatief: `npx vite --port 8082` in C:\Dev\mataxco-portaal via Bash background + `preview_start url:`.

**Why:** Mustafa vroeg expliciet (14-11-2026) om te onthouden wat hij nog moet doen; hij doet eerst "portalen bijwerken" en de rest later.
**How to apply:** Bij een nieuwe sessie de lijst kort noemen als het relevant is; afgevinkte punten verwijderen. Zie [[coportaal-uitrol]] en [[deploy-migration-workflow]].
