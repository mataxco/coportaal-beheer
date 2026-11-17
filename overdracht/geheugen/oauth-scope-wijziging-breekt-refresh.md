---
name: oauth-scope-wijziging-breekt-refresh
description: Een nieuwe Microsoft Graph-scope in outlook-oauth mag nooit zomaar in de refresh-aanroep; bestaande refresh tokens geven dan AADSTS65001 en alle mail faalt
metadata:
  node_type: memory
  type: feedback
  originSessionId: 42a68360-7a3f-427f-9b2f-8de9507360d7
  modified: 2026-11-14T16:49:40.292Z
---

Op 14-11-2026 brak alle portaalmail ~1 uur nadat `Mail.ReadWrite` aan `SCOPES` in `supabase/functions/outlook-oauth/index.ts` was toegevoegd: de refresh-aanroep vroeg de nieuwe scope met een oud refresh token → `AADSTS65001 consent_required` → "OAuth token ongeldig of verlopen" voor iedere medewerker.

**Why:** Een refresh token geeft alleen de scopes terug waarvoor bij het koppelen toestemming is gegeven. Extra scopes vereisen een nieuwe interactieve koppeling (Instellingen → E-mail → Koppelen).

**How to apply:** Bij elke scope-uitbreiding: (1) refresh eerst met de volledige set, bij `consent_required` terugvallen op de oude set (zo staat het nu in `refreshAccessToken`, `SCOPES_OUD`); (2) direct na deploy een refresh testen via `select public.invoke_edge_function('outlook-oauth?action=refresh', '{"accountId":"…"}'::jsonb)` en `net._http_response` lezen; (3) Mustafa vragen het account opnieuw te koppelen. Zie [[openstaande-acties-mustafa]].
