---
name: vestigingen-fasering
description: "Vestigingen per klant — fase 1 live (2026-10-26), fase 2 BTW en fase 3 Loon per vestiging nog te bouwen; ontwerpbesluiten"
metadata:
  node_type: memory
  type: project
  originSessionId: 42a68360-7a3f-427f-9b2f-8de9507360d7
  modified: 2026-10-26T16:48:44.380Z
---

De gebruiker wil dat vestigingen VOLLEDIG doorwerken (keuze 2026-10-26): een vestiging met eigen OB-nummer = eigen BTW-regel in de workflow; met eigen LH-nummer = eigen werkgever in Loon.

- **Fase 1 (live, commit 89e62f5):** tabel `klant_vestigingen` (extra vestigingen; hoofdvestiging blijft op `clients`), blok op klantkaart/Bewerken/aanmeldformulier, KvK-ophalen via `kvk-lookup` `{vestigingen:true}` (Zoeken-API).
- **Fase 2 BTW (live, commit 27b676f):** vinkje `klant_vestigingen.eigen_btw_aangifte` (default false) — ALLEEN aangevinkt verandert er iets (expliciete wens gebruiker; geldt ook voor Loon: alleen bij een vinkje "eigen loonaangifte"). `btw_aangifte_status.vestiging_id` + UNIQUE NULLS NOT DISTINCT; regelKey in useBtwAangifte. fiscale_checklisten nog per klant (niet per vestiging). Klanten zoekbaar op vestigingen via `clients.vestigingen_zoek` (in geheugen, ClientsContext).
- **Fase 3 Loon (live, commit 1cb766f):** vinkje `eigen_loonaangifte`; trigger `vestiging_loon_werkgever_sync` maakt/activeert werkgever; `loon_werkgevers.vestiging_sleutel` (generated, nul-uuid = hoofdwerkgever) + unique (klant_id, vestiging_sleutel) — upserts gebruiken onConflict 'klant_id,vestiging_sleutel'; per-klant-code filtert `.is('vestiging_id', null)`. `employees.loon_werkgever_id` (leeg = hoofd). BTW-checklist per vestiging live (a137367). Oorspronkelijk plan fase 3: `loon_werkgevers` UNIQUE(klant_id) loslaten → eerst alle `onConflict klant_id`-paden herschrijven (RPC lh_aanvragen_na_akkoord, ClientsContext.updateClient, ClientDetail handleSaveClient/handleSaveLhEdit, useLoonWerkgevers auto-create/linkToClient/import). LH-status per werkgever, `employees.loon_werkgever_id`, `loon_verzendingen.loon_werkgever_id`, `haalWerkgeverId` vervangen, vestigingsnaam tonen in Loon.
- **Fase 4 (live, commit 5ed359b):** `facturen/periodieke_facturen.vestiging_id`, `factuurOntvanger` (src/lib/factuur/ontvanger.ts, ook inline in facturen-auto-verzenden), `VestigingKiezer` in factuur/periodiek, generator neemt vestiging over; afletteren met `extra_ibans/extra_namen`. Offertes nog niet per vestiging. Alle 4 fases klaar.

**Why:** klanten met meerdere vestigingen hebben meerdere LH-/OB-nummers. **How to apply:** bij doorbouwen deze volgorde aanhouden; nooit UNIQUE(klant_id) droppen voordat alle onConflict-paden om zijn. Zie [[handleiding-coportaal]].
