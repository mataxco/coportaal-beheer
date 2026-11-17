# Overdracht naar een andere computer

Stand: 17-11-2026. Deze map zet een nieuwe Claude Code-sessie op een andere
computer in één keer op dezelfde stand als de vorige.

## Wat hier staat

- `geheugen/`: de geheugenbestanden van Claude (afspraken, werkwijze, openstaande
  acties, stand van elk deelproject). Bevatten geen sleutels of wachtwoorden.
- `white-label-onderhanden.patch`: niet-vastgelegde wijzigingen van een andere
  sessie in `mataxco-portaal` (index.html, src/App.tsx, src/contexts/AuthContext.tsx,
  src/pages/Auth.tsx). Bewust niet gecommit. Alleen toepassen als Mustafa dat vraagt.

## Mappen onder C:\Dev

| Map | Repo | Tak | Waarvoor |
|---|---|---|---|
| `mataxco-portaal` | mataxco/mataxco-portaal | `main` | portaal.mataxco.nl (productie, Supabase `nvbpurdcfxggwcetkcxi`) |
| `coportaal` | mataxco/mataxco-portaal | `coportaal` (git worktree) | demo.coportaal.nl (Supabase `evjgcazjxhqsxvoamfag`), Vercel deployt automatisch |
| `coportaal-site` | mataxco/coportaal-site | `main` | coportaal.nl |
| `coportaal-beheer` | mataxco/coportaal-beheer | `main` | beheer-app, back-ups (Supabase `assmaihnaojaulhtjkiq`) |

## Opzetten

1. Repos clonen of bijwerken (`git pull`) in bovenstaande mappen.
2. `coportaal` is een worktree van `mataxco-portaal`:
   `git -C C:\Dev\mataxco-portaal worktree add C:\Dev\coportaal coportaal`
3. `npm install` in `mataxco-portaal`, `coportaal-site` en `coportaal-beheer`.
4. `coportaal` deelt node_modules via een junction (cmd):
   `mklink /J C:\Dev\coportaal\node_modules C:\Dev\mataxco-portaal\node_modules`
5. Geheugen kopiëren naar de geheugenmap van de nieuwe sessie (alle `.md` uit `geheugen/`).
6. Supabase koppelen per map: `npx supabase link --project-ref <ref>`
   (mataxco-portaal → productie, coportaal → demo, coportaal-beheer → beheer).

## Wat niet via GitHub meekomt (Mustafa moet dit zelf doen)

- `.env` in `mataxco-portaal` en `coportaal-beheer`: zelf overzetten van de oude
  computer (niet via chat of e-mail).
- Inloggen: `gh auth login`, `npx supabase login`, FTP-gegevens voor `scripts/deploy.sh`.
- Het gespreksvenster zelf verhuist niet; het geheugen en dit document vervangen dat.

## Stand van het lopende werk

AMLR-klantacceptatie: stap 1, 2 en 3 staan op de demo (tak `coportaal`), niet op
productie. Volgende is stap 4. Details in `geheugen/amlr-klantacceptatie.md`.
Openstaande acties van Mustafa: `geheugen/openstaande-acties-mustafa.md`.
