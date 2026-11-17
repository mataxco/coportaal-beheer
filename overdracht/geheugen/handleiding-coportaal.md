---
name: handleiding-coportaal
description: Gebruikershandleiding voor andere kantoren staat als Claude Docs-document; bij elke nieuwe/gewijzigde functie hoofdstuk + wijzigingslog bijwerken
metadata:
  node_type: memory
  type: project
  originSessionId: 42a68360-7a3f-427f-9b2f-8de9507360d7
  modified: 2026-10-16T15:59:09.849Z
---

Het portaal wordt verkocht onder de naam **CoPortaal**. De gebruikershandleiding staat als bewerkbaar Claude Docs-document "Handleiding CoPortaal": https://claude.ai/code/artifact/fd8435a6-8eda-4181-94bb-8d763d588fc9 (doc/project-id fd8435a6-8eda-4181-94bb-8d763d588fc9, tab-body node 86fcb7e6-3c06). Opgezet op 2026-10-16.

De opbouw: 20 hoofdstukken, van "Snel aan de slag" tot "Wijzigingslog". Het wijzigingslog is een tabel met datum · onderdeel · wijziging, nieuwste eerst.

**Why:** de gebruiker wil een basis die makkelijk mee kan groeien met de vele updates die nog komen.

**How to apply:**
- Lever je een functie op die gebruikers merken? Werk dan in hetzelfde werk het betreffende hoofdstuk bij en zet een regel bovenaan het wijzigingslog. Gebruik de docs-connector: eerst `read` met sinceRev, daarna gerichte `update`.
- Noem nooit MaTaxCo-specifieke gegevens in de handleiding; gebruik "het kantoor".
- Zie ook [[verkoopmodel-per-kantoor]].
