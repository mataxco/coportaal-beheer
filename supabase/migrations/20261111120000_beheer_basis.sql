-- CoPortaal Beheer: centrale administratie van alle kantooromgevingen.
-- Eén rij per kantoor; de kantoren zelf draaien in hun eigen Supabase-project.

create extension if not exists pgcrypto;

-- Wie mag in het beheerportaal (op e-mailadres van de Supabase-inlog)
create table public.beheerders (
  email text primary key,
  naam text,
  created_at timestamptz not null default now()
);

create or replace function public.is_beheerder() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.beheerders b where lower(b.email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

-- Pakketten en prijzen (één plek; de site en het beheer rekenen hiermee)
create table public.pakketten (
  slug text primary key,                     -- 'compleet' | 'all'
  naam text not null,
  prijs_maand numeric(8,2) not null,
  gebruikers_inbegrepen int not null,
  modules text[] not null,                   -- modules die in kantoor_config.modules komen
  volgorde int not null default 0
);
insert into public.pakketten (slug, naam, prijs_maand, gebruikers_inbegrepen, modules, volgorde) values
  ('compleet', 'CoPortaal Compleet', 150.00, 3, array['facturatie','loon'], 1),
  ('all',      'CoPortaal ALL',      199.95, 5, array['kyc','facturatie','loon'], 2);

create table public.instellingen (
  sleutel text primary key,
  waarde text not null
);
insert into public.instellingen values ('prijs_extra_gebruiker', '12.50'), ('inrichting_eenmalig', '495');

-- Kantoren
create table public.kantoren (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  slug text unique,                          -- subdomein: <slug>.coportaal.nl
  contact_naam text,
  email text,
  telefoon text,
  kvk text,
  supabase_ref text unique,                  -- project-ref van de kantooromgeving
  portaal_url text,
  pakket text references public.pakketten(slug),
  extra_gebruikers int not null default 0,
  status text not null default 'inrichten'
    check (status in ('inrichten','actief','opgeschort','beeindigd')),
  actief_sinds date,
  notities text,
  laatste_check jsonb,                       -- resultaat van de laatste statuscontrole (modules, gebruikers, versie)
  laatste_check_op timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Aanvragen van de website
create table public.aanvragen (
  id uuid primary key default gen_random_uuid(),
  kantoor text not null,
  kvk text,
  naam text,
  email text not null,
  telefoon text,
  gebruikers int,
  pakket text,
  boekhoudpakket text,
  klanten int,
  opmerking text,
  bron text default 'site',
  status text not null default 'nieuw'
    check (status in ('nieuw','contact','omgezet','afgewezen')),
  kantoor_id uuid references public.kantoren(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Logboek van beheeracties per kantoor (licentie gezet, update uitgerold, ...)
create table public.kantoor_acties (
  id uuid primary key default gen_random_uuid(),
  kantoor_id uuid not null references public.kantoren(id) on delete cascade,
  actie text not null,
  details jsonb,
  gelukt boolean,
  melding text,
  uitgevoerd_door text,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger kantoren_updated_at before update on public.kantoren
  for each row execute function public.set_updated_at();

-- RLS: alleen beheerders, en alles
alter table public.beheerders enable row level security;
alter table public.pakketten enable row level security;
alter table public.instellingen enable row level security;
alter table public.kantoren enable row level security;
alter table public.aanvragen enable row level security;
alter table public.kantoor_acties enable row level security;

create policy beheerders_lezen on public.beheerders for select to authenticated using (public.is_beheerder());
create policy pakketten_alles on public.pakketten for all to authenticated using (public.is_beheerder()) with check (public.is_beheerder());
create policy instellingen_alles on public.instellingen for all to authenticated using (public.is_beheerder()) with check (public.is_beheerder());
create policy kantoren_alles on public.kantoren for all to authenticated using (public.is_beheerder()) with check (public.is_beheerder());
create policy aanvragen_alles on public.aanvragen for all to authenticated using (public.is_beheerder()) with check (public.is_beheerder());
create policy acties_alles on public.kantoor_acties for all to authenticated using (public.is_beheerder()) with check (public.is_beheerder());

-- Service-sleutels van kantooromgevingen staan in de Vault:
--   naam = 'kantoor_<supabase_ref>_service_key'
-- Alleen de service role (edge functions) mag ze lezen.
create or replace function public.kantoor_sleutel(p_ref text) returns text
language sql stable security definer set search_path = public, vault as $$
  select decrypted_secret from vault.decrypted_secrets
  where name = 'kantoor_' || p_ref || '_service_key' limit 1;
$$;
revoke all on function public.kantoor_sleutel(text) from public, anon, authenticated;
grant execute on function public.kantoor_sleutel(text) to service_role;

-- Eerste beheerder
insert into public.beheerders (email, naam) values ('info@mataxco.nl', 'Mustafa Ali');
