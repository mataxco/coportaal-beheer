# Memory Index

- [Twee MaTaxCo-repos in C:\Dev](two-mataxco-repos.md) — echt CRM-portaal (mataxco-portaal, ref nvbpurdcfxggwcetkcxi) vs apart account-pilot-x; niet verwarren
- [Deploy- & migratie-workflow](deploy-migration-workflow.md) — Claude deployt standaard zelf; `npm run build:deploy` faalt op Windows (cmd kent geen bash) → `vite build` + `bash scripts/deploy.sh` via Git Bash
- [Commit + push na elke wijziging](commit-push-na-wijziging.md) — nooit meer ongecommit laten oplopen; deploy blijft een aparte, goed te keuren stap
- [Passanten-mechanisme](passanten-mechanisme.md) — eenmalige factuurontvangers = Gearchiveerd + relatie_actief false; factuurzoeker vindt ze nog
- [Overeenkomst nooit ongetekend](overeenkomst-nooit-ongetekend.md) — alleen getekend op kantoor of via digitale tekenflow; kantoor tekent niet; honorarium nooit stil € 0
- [Verkoopmodel: eigen omgeving per kantoor](verkoopmodel-per-kantoor.md) — geen gedeelde database; signup overal uit; eerste beheerder via bootstrap-admin
- [Vestigingen: fasering](vestigingen-fasering.md) — fase 1 live; fase 2 BTW en 3 Loon per vestiging open, volgorde + valkuilen
- [Klantkiezer altijd typbaar](klantkiezer-typbaar.md) — gebruik KlantZoeker, nooit een scroll-Select met klanten
- [Handleiding CoPortaal](handleiding-coportaal.md) — Claude Docs-document; bij elke gebruikerszichtbare wijziging hoofdstuk + wijzigingslog bijwerken
- [Extern-facturen / Jortt-betaalsync](extern-facturen-mollie-matching.md) — structureel opgelost: Jortt = bron van waarheid (cron 06:15); 120 facturen (€17.5k) écht open ter inning; Fix D (legacy-JWT) open
- [CoPortaal-uitrol](coportaal-uitrol.md) — doorverkoop op coportaal.nl via tak coportaal + Vercel + aparte Supabase-org; portaal.mataxco.nl blijft intact
- [Openstaande acties Mustafa](openstaande-acties-mustafa.md) — handmatige to-do (Outlook herkoppelen, Vault-sleutel, GitHub-repos, Vercel-branch) + backlog; bijwerken na afvinken
- [OAuth-scope-wijziging breekt refresh](oauth-scope-wijziging-breekt-refresh.md) — nieuwe Graph-scope nooit zomaar in refresh; terugvallen op oude set + refresh testen na deploy
- [Rooktest voor elke uitrol](rooktest-voor-elke-uitrol.md) — deploy.sh test alle pagina's (12 s) + PaginaVangnet/client_fouten; nieuwe pagina's toevoegen aan de test
- [Back-upsysteem](backup-systeem.md) — nachtelijke versleutelde back-up van alle kantoren via GitHub Actions (coportaal-beheer); herstel naar nieuwe omgeving; eerste run + hersteltest nog te bewijzen
- [AMLR-klantacceptatie](amlr-klantacceptatie.md) — compliance verborgen in "Nieuwe klant"/blok Acceptatie; stap 1 op demo (coportaal), productie na akkoord; stappen 2-4 open
