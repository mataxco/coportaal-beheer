---
name: amlr-klantacceptatie
description: "AMLR/Wwft-compliance wordt onzichtbaar ingebouwd in de klantacceptatie (blok op de klantkaart), geen aparte module; stap 1 staat op de demo, productie pas na akkoord"
metadata:
  node_type: memory
  type: project
  originSessionId: 42a68360-7a3f-427f-9b2f-8de9507360d7
  modified: 2026-11-16T14:51:02.507Z
---

Mustafa wil (16-11-2026) géén aparte AMLR-module/"portaal in het portaal". Alles wat de AMLR (per 10-07-2027, vervangt Wwft) vraagt, hangt aan "Nieuwe klant": klant start **in acceptatie**, blok "Acceptatie" op de klantkaart (boven het KYC-blok), pas daarna "Klant accepteren". Hits → taak in Mijn Taken; signalen → bestaande dashboard "Vraagt aandacht"; instellingen → Instellingen → Integraties; opleidingsregister → Team → HR+. Mustafa is zelf nalevingsfunctionaris.

**Stand:** stap 1 gebouwd op tak `coportaal` + demo-DB (commit e2f7b04): migratie `20261116120000_aml_fundament.sql` (aml_settings, aml_rollen, aml_dossiers, aml_entities, aml_persons, aml_ownership, aml_identity_verifications, aml_audit_log append-only met triggers), `src/lib/amlUbo.ts` (+tests 25,00 vs 24,99), `useAcceptatie`, `AcceptatieBlok`. NIET op main/productie.

**Stap 2 (16-11-2026, commit db4df45, alleen tak `coportaal` + demo-DB):** migratie `20261116150000_aml_screening.sql` (aml_lijsten, aml_lijst_vermeldingen/-namen met pg_trgm, aml_screenings, aml_hits; functies aml_screen_dossier, aml_herscreen_alles, aml_lijst_laad/activeer, aml_hit_beoordeel, aml_screen_nu; cron 03:10/03:13/03:16), edge function `aml-lijst-sync` (parser.ts gedeeld met de browser en vitest), `SanctielijstenDialog` in Instellingen → Integraties, screening + treffers beoordelen in `AcceptatieBlok`. VN en NL syncen automatisch; EU alleen via geheim `EU_FSF_URL` (Mustafa zet die zelf, nooit in chat) of handmatige upload in het scherm. Op de demo is zijn EU-bestand van 23-10-2026 via SQL geladen. Uploadknop en schermen zijn NIET in de browser getest (geen sessie). Handleiding pas bijwerken bij productie.

**Stap 3 (16-11-2026, alleen tak `coportaal` + demo-DB):** migratie `20261116170000_aml_risico.sql` (aml_settings.risicofactoren/grenzen/blokkeer_*, aml_risicobeoordelingen versies, rpc `aml_risico_vastleggen`, dossier.risico_klasse + volgende_herbeoordeling, blokkade-triggers op facturen/periodieke_facturen (alleen als auth.uid() gezet is) en ondertekenverzoeken (alleen opdrachtovereenkomst)), `src/lib/amlRisico.ts` (+test), risicodialoog in `AcceptatieBlok`. De standaardfactoren/gewichten zijn een voorstel van Claude; Mustafa moet ze als nalevingsfunctionaris nog goedkeuren. PEP = alleen vraag + eigen verklaring (geen PEP-lijst). Automatische facturatie wordt bewust niet geblokkeerd. Bestaande tabellen `client_ubos`/`client_holdings` worden nog niet gebruikt om personen voor te vullen.

**Nog te doen:** ~~stap 3~~ risico/PEP/blokkades (geen overeenkomst/factuur zolang niet geaccepteerd), stap 4 PDF-dossierverantwoording (lettertype Tw Cen MT is licentie → bestand van Mustafa of vrij alternatief), ketens via tussenholdings in de UI, remediëring 625 bestaande klanten.

**Why:** hij wil het werk verborgen in de bestaande flow; bestaande klanten mogen niet ineens geblokkeerd raken (geen dossier = bestaande klant).
**How to apply:** eerst op demo laten zien, pas na akkoord naar main (beide versies). Alle drempels in `aml_settings`, niets hardcoden. Zie [[coportaal-uitrol]], [[rooktest-voor-elke-uitrol]].
