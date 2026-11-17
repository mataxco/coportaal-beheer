---
name: two-mataxco-repos
description: C:\Dev bevat twee verwarrende MaTaxCo-repos — het echte CRM-portaal vs het aparte account-pilot-x project
metadata: 
  node_type: memory
  type: project
  originSessionId: aa10af49-c594-4e4c-a62c-082f8d8f7ceb
---

`C:\Dev` bevat twee bijna identiek genoemde MaTaxCo-repositories die makkelijk te verwarren zijn:

- **`C:\Dev\mataxco-portaal`** — het echte CRM-portaal (portaal.mataxco.nl). Remote `github.com/mataxco/mataxco-portaal`, Supabase-ref `nvbpurdcfxggwcetkcxi` ("CRM"). Hieraan werkt de gebruiker. Op 2026-05-29 hierheen verplaatst vanuit `C:\Users\Mus\Downloads\account-pilot-x-main\account-pilot-x-main\` (was dubbel genest); node_modules opnieuw opgebouwd met `npm ci`.
- **`C:\Dev\account-pilot-x`** — een APART project (loon-import / Kennisbank). Remote `github.com/mataxco/account-pilot-x`, Supabase-ref `tjjkxoewqpfmmqxozoxk`. Niet aanraken tenzij expliciet gevraagd.

Beide komen uit Lovable.dev (de Downloads-zip heette `account-pilot-x-main`), vandaar de naamsoverlap. Controleer vóór een migratie, `supabase db push` of een deploy altijd dat je in `C:\Dev\mataxco-portaal` zit en dat `.env`/supabase-link naar `nvbpurdcfxggwcetkcxi` wijzen. Zie [[deploy-migration-workflow]].
