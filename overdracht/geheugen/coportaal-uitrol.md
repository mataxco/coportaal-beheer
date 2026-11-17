---
name: coportaal-uitrol
description: "CoPortaal (doorverkoop) staat los van portaal.mataxco.nl: één code, git-tak coportaal, Vercel, aparte Supabase-org; MaTaxCo-portaal blijft onaangeroerd"
metadata:
  node_type: memory
  type: project
  originSessionId: 42a68360-7a3f-427f-9b2f-8de9507360d7
  modified: 2026-11-09T21:08:37.171Z
---

Besluit 2026-11-09: het portaal wordt doorverkocht als **CoPortaal** op coportaal.nl, maar Mustafa's eigen portaal (portaal.mataxco.nl, Supabase `nvbpurdcfxggwcetkcxi`, deploy via scripts/deploy.sh naar cPanel) moet **intact blijven**. Gekozen: optie A, **één codebase met twee gescheiden uitrollen** (geen aparte kopie).

- Git-tak `coportaal` (aangemaakt vanaf main, op GitHub). Vercel bouwt **alleen** vanaf die tak; main blijft de MaTaxCo-uitrol.
- Harde regel: niets gaat naar portaal.mataxco.nl zonder dat het eerst op het CoPortaal-demokantoor heeft gedraaid.
- Elk kantoor een eigen Supabase-project (zie [[verkoopmodel-per-kantoor]]), in een **aparte Supabase-organisatie "CoPortaal"** (eerst gratis plan voor de demo), los van "mataxco's Org".
- Vercel krijgt nooit de env-waarden van de MaTaxCo-database; `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` komen uit env (niet hardcoded, gecontroleerd).
- App per kantoor op een subdomein (demo: demo.coportaal.nl); het hoofddomein coportaal.nl is voor de verkoopwebsite, die een **apart project/repo en aparte Claude-sessie** wordt.
- Vercel Hobby is niet voor commercieel gebruik: voor CoPortaal is Vercel Pro nodig.
- Eerste technische stappen daarna: white-label afronden op de coportaal-tak, installatiescript voor een nieuw kantoor, demokantoor met verzonnen gegevens.

**Stand 2026-11-09 (avond):**
- Demokantoor: Supabase-project `evjgcazjxhqsxvoamfag` ("CoPortaal demo", eu-west-1, in mataxco's Org). Alle 243 migraties + driftcorrecties erop, 52 edge functions, vault-secrets `edge_base_url`/`service_role_key` gezet, MaTaxCo-startwaarden verwijderd (nieuw_kantoor.sql). Schema gecontroleerd gelijk aan productie.
- Werkmap voor de tak: `C:\Dev\coportaal` (git worktree, gekoppeld aan de demo via supabase/.temp met skip-worktree). `C:\Dev\mataxco-portaal` blijft aan productie gekoppeld. Controleer vóór elke db-actie `supabase/.temp/project-ref`.
- Installatiescripts: `supabase/coportaal/migreer.sh <ref>` (weigert productie), `drift/<versie>_voor.sql`, `drift/_na.sql`, `nieuw_kantoor.sql`.
- Vercel: team "mataxco's projects" (Hobby), project `coportaal-demo`, Production Branch `coportaal`, domein demo.coportaal.nl (DNS bij Cloud86, zone coportaal.nl, CNAME demo → vercel). Oud Vercel-project `mataxco-portaal` (wijst naar productie-DB) moet nog verwijderd worden.
- Nog open: eerste beheerder aanmaken (bootstrap-scherm werkt), demo vullen met verzonnen data, paginatitel "MaTaxCo Portaal" in index.html is nog hardcoded (white-label van de andere sessie), Vercel Pro vóór commercieel gebruik.

## Beslissingen 11-11-2026
- Prijzen (excl. btw, per maand): **CoPortaal Compleet** €150 (basis + facturatie + loon, 3 gebruikers); **CoPortaal ALL** €199,95 (Compleet + KYC, 5 gebruikers); extra gebruiker €12,50. KYC is de enige losse module; geen losse prijzen per module meer.
- Logo: **C (verbinding)**.
- Wijzigingen aan het portaal moeten in beide systemen landen: main (portaal.mataxco.nl) én tak `coportaal` (cherry-pick + migratie op demo `evjgcazjxhqsxvoamfag`).
- Gewenst: centraal beheerportaal ("supportpagina") om alle kantoren te beheren en wijzigingen in hun omgevingen door te voeren (nog te ontwerpen/bouwen).

## CoPortaal Beheer (11-11-2026)
- App in `C:\Dev\coportaal-beheer` (Vite React TS + Tailwind 4 + supabase-js, poort 5180, git zonder remote). Eigen Supabase-project **coportaal-beheer** ref `assmaihnaojaulhtjkiq` (eu-central-1, $10/mnd, goedgekeurd door Mustafa).
- Tabellen: beheerders (RLS via `is_beheerder()` op jwt-email; info@mataxco.nl), pakketten (compleet/all), instellingen, kantoren, aanvragen, kantoor_acties. Migratie `supabase/migrations/20261111120000_beheer_basis.sql`.
- Edge functions (verify_jwt false, eigen check): `aanvraag` (publiek, site-formulier → aanvragen) en `beheer-actie` (licentie | status op een kantooromgeving via service-sleutel uit Vault `kantoor_<ref>_service_key`, rpc `kantoor_sleutel` alleen service_role).
- `preview_start name:` pakt in deze sessie altijd "portaal-dev" (8081) → dev server via Bash background + `preview_start url:`.
- Vault-write via CLI wordt door de auto-mode classifier geblokkeerd (Secret-Store Writes) → Mustafa voert het commando zelf uit.
