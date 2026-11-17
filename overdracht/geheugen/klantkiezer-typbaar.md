---
name: klantkiezer-typbaar
description: "Overal waar een klant gekozen wordt moet je kunnen typen om te zoeken; gebruik de gedeelde KlantZoeker, nooit een scroll-Select"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 42a68360-7a3f-427f-9b2f-8de9507360d7
  modified: 2026-10-21T09:03:29.719Z
---

In het portaal (mataxco-portaal) moet elke plek waar je een klant kiest typbaar/zoekbaar zijn, zoals bij Documenten. Een shadcn `<Select>` met alle klanten om doorheen te scrollen is niet goed.

**Why:** de gebruiker heeft ~450 klanten; scrollen kost tijd. Hij merkte het op meerdere plekken op (Taak delegeren, Sneltaak) op 2026-10-21.

**How to apply:** gebruik `src/components/client/KlantZoeker.tsx` (props: value, onChange(id|null), klanten = eigen gefilterde lijst, leegLabel voor "Geen klant"). Zoekt op bedrijfsnaam, naam en KvK, accent-ongevoelig. Bouw nieuwe klantkeuzes nooit als Select.
