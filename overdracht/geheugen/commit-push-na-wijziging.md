---
name: commit-push-na-wijziging
description: Na elke code-wijziging in mataxco-portaal direct committen én pushen naar origin/main
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 42a68360-7a3f-427f-9b2f-8de9507360d7
  modified: 2026-08-13T10:05:39.365Z
---

Mustafa wil dat elke afgeronde wijziging in `mataxco-portaal` direct wordt vastgelegd: `git add` → `git commit` → **`git push origin main`**. Niet laten oplopen. Deployen blijft een aparte stap die apart goedgekeurd moet worden (productie, echte klanten).

**Why:** Bij de overstap naar de nieuwe desktop (13 aug 2026) bleek ~19 commits werk wél gepusht (origin/main stond op 5410f64), maar de lokale git in de gekopieerde map liep ver achter (oude HEAD 538ee7c, dangling objecten, ~205 untracked). Ongecommitte wijzigingen leven dan alleen op schijf → fragiel en verwarrend bij een machinewissel.

**How to apply:** Direct na een wijziging committen + pushen. Bij een desync: back-up de lokale wijzigingen, `git fetch` + `git reset --hard origin/main` (gitignored `.env`/`scripts/.deploy.env` blijven staan), dan de wijziging opnieuw toepassen. Zie [[deploy-migration-workflow]].
