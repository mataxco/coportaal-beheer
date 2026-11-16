-- ── Back-ups van alle kantooromgevingen ──────────────────────────────────────
-- Elke nacht maakt de back-uptaak (GitHub Actions, scripts/backup.mjs) per
-- kantoor een versleutelde dump van de database en een kopie van alle
-- bestanden. Hier staat het logboek; de bestanden zelf staan in twee
-- afgeschermde opslagbakken van deze beheeromgeving.

create table if not exists public.kantoor_backups (
  id             uuid primary key default gen_random_uuid(),
  kantoor_id     uuid not null references public.kantoren(id) on delete cascade,
  supabase_ref   text not null,
  gestart_op     timestamptz not null default now(),
  klaar_op       timestamptz,
  status         text not null default 'bezig' check (status in ('bezig','gelukt','mislukt')),
  -- pad(en) van de versleutelde databasedump in bucket 'backups'
  db_bestanden   text[] not null default '{}',
  db_bytes       bigint,
  tabellen       int,
  rijen          bigint,
  -- bestanden (documenten, facturen, …): totaal aanwezig en deze run gekopieerd
  bestanden_totaal     int,
  bestanden_gekopieerd int,
  bestanden_bytes      bigint,
  overgeslagen   int not null default 0,
  melding        text,
  bron           text not null default 'gepland'   -- gepland | handmatig
);

create index if not exists kantoor_backups_kantoor_idx on public.kantoor_backups (kantoor_id, gestart_op desc);

alter table public.kantoor_backups enable row level security;
drop policy if exists kantoor_backups_lezen on public.kantoor_backups;
create policy kantoor_backups_lezen on public.kantoor_backups
  for select to authenticated using (public.is_beheerder());
-- Schrijven doet alleen de back-uptaak (service-role).

-- Laatste geslaagde back-up per kantoor, voor het overzicht.
create or replace view public.kantoor_backup_stand
with (security_invoker = true) as
select distinct on (kantoor_id)
  kantoor_id, gestart_op, klaar_op, status, db_bytes, tabellen, rijen,
  bestanden_totaal, bestanden_bytes, melding
from public.kantoor_backups
where status = 'gelukt'
order by kantoor_id, gestart_op desc;

-- Afgeschermde opslag: alleen de service-role komt erbij (geen policies).
insert into storage.buckets (id, name, public)
values ('backups', 'backups', false), ('backup-bestanden', 'backup-bestanden', false)
on conflict (id) do nothing;
