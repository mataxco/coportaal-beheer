# Back-up en herstel

Elke nacht (03:30 wintertijd) maakt GitHub Actions een back-up van **elk kantoor in de
tabel `kantoren`** en van de beheeromgeving zelf. Een nieuw kantoor doet vanzelf mee
zodra het een project-ref heeft.

## Wat wordt bewaard

| Onderdeel | Waar | Hoe lang |
|---|---|---|
| Database (rollen, schema, alle gegevens incl. gebruikers) | bucket `backups`, versleuteld (AES-256) | 30 dagen dagelijks, de 1e van elke maand 12 maanden |
| Dezelfde versleutelde dump, tweede kopie buiten Supabase | GitHub Actions-artifact | 30 dagen |
| Bestanden (documenten, facturen, logo's, …) | bucket `backup-bestanden` | zolang ze bij het kantoor bestaan |
| Bij het kantoor verwijderde bestanden | `backup-bestanden/<ref>/_verwijderd/<datum>/` | 90 dagen |

Tijdelijke opslag (bakken die eindigen op `-temp`, zoals KYC-uploads vóór beoordeling)
wordt bewust niet meegenomen.

De status staat in de beheer-app op de pagina van het kantoor (kaart **Back-ups**).
Mislukt een nacht, dan mailt GitHub de eigenaar van de repo.

## Instellingen in GitHub (eenmalig)

Repo → Settings → Secrets and variables → Actions:

- Secret `SUPABASE_ACCESS_TOKEN`: persoonlijke toegangssleutel van het Supabase-account
  dat bij alle omgevingen kan.
- Secret `BACKUP_WACHTWOORD`: lang, willekeurig wachtwoord (minstens 16 tekens).
  **Bewaar dit ook in je wachtwoordmanager.** Zonder dit wachtwoord is geen enkele
  databaseback-up te openen, ook niet door Supabase, GitHub of de bouwer.
- Variable `BEHEER_REF`: project-ref van de beheeromgeving.

## Nu een back-up maken

Actions → **Back-up kantoren** → Run workflow. Laat `ref` leeg voor alle kantoren of vul
één project-ref in.

## Herstellen

Herstellen gaat altijd naar een **nieuwe, lege omgeving**. De oude omgeving blijft
onaangeroerd, zodat een mislukt herstel niets erger maakt.

1. Maak in Supabase een nieuw project (zelfde regio).
2. Kopieer daar de databaseverbinding (Project Settings → Database → Connection string,
   "Session pooler") en zet die als secret `HERSTEL_DB_URL` in deze repo.
3. Actions → **Back-up herstellen** → Run workflow:
   - `bron`: project-ref van het kantoor dat je terugzet
   - `backup`: `laatste` of een datum (bijv. `2026-11-16`)
   - `bestanden_naar`: project-ref van het nieuwe project (zet ook de bestanden terug)
   - `bevestig`: typ `HERSTEL`
4. Zet de edge functions en de Vault-geheimen van het portaal in het nieuwe project
   (`supabase functions deploy`, zie de portaal-repo) en wijs het portaal naar het nieuwe
   project (omgevingsvariabelen `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`).
5. Pas in de beheer-app de project-ref van het kantoor aan en verwijder het secret
   `HERSTEL_DB_URL` weer.

Alleen de bestanden bekijken of één tabel terughalen kan ook lokaal:

```bash
node scripts/herstel.mjs --bron <project-ref> --backup laatste --uit ./herstel
```

Dat ontsleutelt en pakt uit naar `./herstel` (roles.sql, schema.sql, data.sql) zonder
iets in te lezen.

## Wat niet in de back-up zit

- Edge functions en hun code: die staan in de portaal-repo op GitHub.
- Vault-geheimen (API-sleutels van Mollie, Microsoft, …): die staan versleuteld in de
  database en gaan mee in de dump, maar zijn alleen leesbaar in een project met dezelfde
  Vault-sleutel. Na een herstel naar een nieuw project moeten koppelingen (Outlook,
  Mollie, SharePoint) opnieuw worden ingesteld.
