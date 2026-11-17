---
name: deploy-migration-workflow
description: Hoe wijzigingen aan het MaTaxCo-portaal live gaan — build+deploy.sh (FTP), migraties via Supabase MCP, edge functions via MCP of deploy-functions.sh (token vereist)
metadata:
  node_type: memory
  type: feedback
  originSessionId: aa10af49-c594-4e4c-a62c-082f8d8f7ceb
  modified: 2026-08-15T20:32:31.592Z
---

Voor `C:\Dev\mataxco-portaal` ([[two-mataxco-repos]]), stand 16 aug 2026:

- **Frontend:** `npm run build` (PowerShell; `npm run build:deploy` faalt op Windows — cmd kent geen bash), daarna `bash scripts/deploy.sh` via de Bash-tool (Git Bash). FTP-gegevens komen uit `scripts/.deploy.env` (gitignored). Script uploadt assets vóór index.html en eindigt met een bundle-hash-verificatie — check dat de getoonde `index-*.js` de zojuist gebouwde is. Deploy = productie (portaal.mataxco.nl, echte klanten) → **akkoord vragen vóór deployen** (huidige afspraak sinds de desktop-overstap; Mustafa zegt meestal kortweg "deploy maar").
- **DB-migraties:** via Supabase MCP `apply_migration` (ref `nvbpurdcfxggwcetkcxi`) én hetzelfde SQL-bestand in `supabase/migrations/` committen (naamconventie `YYYYMMDDHHMMSS_naam.sql`).
- **Edge functions:** via MCP `deploy_edge_function` (LET OP: `verify_jwt` expliciet gelijk houden aan wat live staat — meestal false; true breekt cron-aanroepen door de legacy-JWT) of `bash scripts/deploy-functions.sh <naam>`. Dat script vereist `SUPABASE_ACCESS_TOKEN` in `.env` — **ontbreekt op de nieuwe desktop** (niet meeverhuisd); token aanmaken via Supabase-dashboard → Account → Access Tokens. Grote functiebestanden via een subagent laten deployen scheelt context.
- **Na elke wijziging: commit + push** ([[commit-push-na-wijziging]]).

**Why:** conventies staan niet (volledig) in de repo-CLAUDE.md en zijn op de nieuwe machine opnieuw geverifieerd.
**How to apply:** build → commit/push → (akkoord) → deploy; migraties altijd dubbel (live + repo).
