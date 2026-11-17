---
name: verkoopmodel-per-kantoor
description: "Bij verkoop van het portaal krijgt elk kantoor een eigen, aparte Supabase-omgeving (geen gedeelde database); openbare inschrijving staat overal uit"
metadata:
  node_type: memory
  type: project
  originSessionId: 42a68360-7a3f-427f-9b2f-8de9507360d7
  modified: 2026-10-14T13:29:51.171Z
---

Mustafa wil het portaal (mataxco-portaal) later verkopen aan andere kantoren en kiest (2026-10-14) voor het advies: **elk kantoor een eigen, gescheiden omgeving** (eigen Supabase-project + eigen site), als SaaS. De code wordt niet overgedragen. Er komt een licentie, een verwerkersovereenkomst, een SLA, backups (PITR) en een pentest.

**Why:** volledige scheiding van klantdata per kantoor (AVG/Wwft) en eenvoudiger beveiligen dan multi-tenant RLS.

**How to apply:**
- Bouw nooit multi-tenant aannames in (geen kantoor_id-kolommen nodig). Alles kantoorspecifiek komt uit instellingen of sjablonen.
- Per nieuw kantoor moet in Supabase "Allow new users to sign up" UIT staan. De eerste beheerder komt via bootstrap-admin (check-bootstrap), daarna gaat alles via uitnodigingen of lokale gebruikers.
- Zelfinschrijving van klanten via de website komt binnen als aanvraag via een edge function, nooit als inlogaccount.
- Zie ook [[two-mataxco-repos]] en [[deploy-migration-workflow]].
