import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)

export type Pakket = { slug: string; naam: string; prijs_maand: number; gebruikers_inbegrepen: number; modules: string[]; volgorde: number }
export type Kantoor = {
  id: string; naam: string; slug: string | null; contact_naam: string | null; email: string | null; telefoon: string | null; kvk: string | null
  supabase_ref: string | null; portaal_url: string | null; pakket: string | null; extra_gebruikers: number
  status: 'inrichten' | 'actief' | 'opgeschort' | 'beeindigd'; actief_sinds: string | null; notities: string | null
  laatste_check: { naam?: string; modules?: string[]; gebruikers_actief?: number; plaats?: string; email?: string } | null
  laatste_check_op: string | null; created_at: string; updated_at: string
}
export type Aanvraag = {
  id: string; kantoor: string; kvk: string | null; naam: string | null; email: string; telefoon: string | null; gebruikers: number | null
  pakket: string | null; boekhoudpakket: string | null; klanten: number | null; opmerking: string | null; bron: string | null
  status: 'nieuw' | 'contact' | 'omgezet' | 'afgewezen'; kantoor_id: string | null; created_at: string
}
export type Actie = { id: string; kantoor_id: string; actie: string; details: unknown; gelukt: boolean | null; melding: string | null; uitgevoerd_door: string | null; created_at: string }

export const STATUS_LABEL: Record<Kantoor['status'], string> = { inrichten: 'Inrichten', actief: 'Actief', opgeschort: 'Opgeschort', beeindigd: 'Beëindigd' }
export const STATUS_KLEUR: Record<Kantoor['status'], string> = {
  inrichten: 'bg-gold-100 text-navy-800', actief: 'bg-teal-100 text-teal-600', opgeschort: 'bg-amber-100 text-amber-800', beeindigd: 'bg-gray-100 text-gray-600',
}
export const AANVRAAG_LABEL: Record<Aanvraag['status'], string> = { nieuw: 'Nieuw', contact: 'In gesprek', omgezet: 'Omgezet', afgewezen: 'Afgewezen' }

export const euro = (n: number) => '€ ' + n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const datum = (s: string | null) => (s ? new Date(s).toLocaleString('nl-NL', { dateStyle: 'medium', timeStyle: 'short' }) : '—')

/** Maandbedrag van een kantoor: pakketprijs + extra gebruikers */
export function maandbedrag(k: Kantoor, pakketten: Pakket[], extraPrijs: number) {
  const p = pakketten.find(x => x.slug === k.pakket)
  if (!p) return 0
  return p.prijs_maand + k.extra_gebruikers * extraPrijs
}

/** Roept de edge function beheer-actie aan met de sessie van de ingelogde beheerder */
export async function beheerActie(kantoor_id: string, actie: 'licentie' | 'status') {
  const { data, error } = await supabase.functions.invoke('beheer-actie', { body: { kantoor_id, actie } })
  if (error) {
    // supabase-js geeft bij een niet-2xx een generieke fout; de echte melding zit in de response-body.
    let melding = error.message
    const ctx = (error as { context?: unknown }).context
    try {
      if (ctx instanceof Response) { const j = await ctx.clone().json(); if (j?.error) melding = j.error }
      else if (ctx && typeof ctx === 'object' && 'error' in ctx && typeof (ctx as { error: unknown }).error === 'string') melding = (ctx as { error: string }).error
    } catch { /* body niet leesbaar: generieke melding houden */ }
    throw new Error(melding)
  }
  if (data?.error) throw new Error(data.error)
  return data as Record<string, unknown>
}
