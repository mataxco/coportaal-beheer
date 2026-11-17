---
name: passanten-mechanisme
description: "Eenmalige factuurontvangers (passanten) in mataxco-portaal = workflow_status 'Gearchiveerd' + relatie_actief false"
metadata: 
  node_type: memory
  type: project
  originSessionId: 42a68360-7a3f-427f-9b2f-8de9507360d7
  modified: 2026-08-13T14:53:59.288Z
---

In `mataxco-portaal` worden eenmalige factuurontvangers ("passanten", bijv. de koper van een auto) als klantkaart aangemaakt met `workflow_status: 'Gearchiveerd'` + `relatie_actief: false` (13 aug 2026, vinkje in `FactuurDialog.tsx` bij de KvK-keuze). Zo blijven ze uit de klantenlijst en de actieve tellingen, maar de factuur-klantzoeker filtert bewust niet op status, dus factureren blijft werken. Let op: ze tellen mee in de "gearchiveerd"-telling van de klantenlijst. Voorbeeld: A28 Auto's (KvK 92875122). Zie ook [[commit-push-na-wijziging]].
