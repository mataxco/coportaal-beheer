---
name: rooktest-voor-elke-uitrol
description: "Portaal mag nooit ongetest live; rooktest (12 s) zit verplicht in scripts/deploy.sh, PaginaVangnet vangt crashes; nieuwe pagina's toevoegen aan de rooktest"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 42a68360-7a3f-427f-9b2f-8de9507360d7
  modified: 2026-11-16T13:02:31.152Z
---

Op 14-11-2026 gingen door Claude drie dingen stuk op productie (mail door OAuth-scope, Mijn Taken blanco door variabele vóór declaratie, Klanten blanco door ontbrekende import). Mustafa: "Aub voorkomen, dit kan cruciaal zijn" en "het moet niet 8 minuten per wijziging kosten".

**Why:** tsc-uitvoer werd met `grep … | head` afgekapt, waardoor echte fouten (TS2304/TS2448) onzichtbaar bleven; in de browser testen kon niet (geen ingelogde sessie).

**How to apply:**
- `scripts/deploy.sh` draait nu zelf `src/test/paginas.smoke.test.tsx` (elke pagina als admin én medewerker, ~12 s) en weigert uit te rollen bij een crash of als `dist/` ouder is dan `src/`. Nooit `SKIP_ROOKTEST=1` gebruiken zonder dat Mustafa het vraagt.
- Nieuwe pagina/route → toevoegen aan de lijst `PAGINAS` in die test. Nieuwe velden uit `useAuth` → ook in de nep-`useAuth` van de test.
- In die test geen `act()` om de render (laat volgende tests hangen); pagina's worden in `beforeAll` voorgeladen.
- Nooit tsc-fouten wegfilteren met `head`; controleer na elke wijziging expliciet op `TS2304|TS2448|TS2552|TS2307` over de hele codebase.
- `PaginaVangnet` (in `ProtectedRoute` en `main.tsx`) toont een melding i.p.v. blanco en schrijft naar tabel `client_fouten`; bij een klacht eerst daar kijken: `select created_at, pad, melding from client_fouten order by created_at desc limit 20`.
- De coportaal-worktree (C:\Dev\coportaal) deelt sinds 16-11-2026 node_modules met main via een junction (junction naar de node_modules-map van mataxco-portaal); vóór die datum gaf `npx tsc` daar ten onrechte "0 fouten". Baseline nu ~30 TS-fouten; KlantZoeker.test faalt daar alleen door ontbrekende .env. Vercel draait de rooktest nog niet. Zie [[coportaal-uitrol]], [[oauth-scope-wijziging-breekt-refresh]].
