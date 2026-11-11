import { useState } from 'react'
import { supabase, type Aanvraag, type Pakket } from '../lib/supabase'

type Props = { pakketten: Pakket[]; aanvraag?: Aanvraag; onSluit: () => void; onKlaar: (id: string) => void }

const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)

export default function NieuwKantoorDialog({ pakketten, aanvraag, onSluit, onKlaar }: Props) {
  const [f, setF] = useState({
    naam: aanvraag?.kantoor ?? '', slug: slugify(aanvraag?.kantoor ?? ''), contact_naam: aanvraag?.naam ?? '', email: aanvraag?.email ?? '',
    telefoon: aanvraag?.telefoon ?? '', kvk: aanvraag?.kvk ?? '', pakket: aanvraag?.pakket ?? 'all', supabase_ref: '', notities: aanvraag?.opmerking ? `Uit aanvraag: ${aanvraag.opmerking}` : '',
  })
  const [extra, setExtra] = useState(() => {
    const p = pakketten.find(x => x.slug === (aanvraag?.pakket ?? 'all'))
    return Math.max(0, (aanvraag?.gebruikers ?? 0) - (p?.gebruikers_inbegrepen ?? 0))
  })
  const [fout, setFout] = useState<string | null>(null)
  const [bezig, setBezig] = useState(false)
  const zet = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })

  const opslaan = async (e: React.FormEvent) => {
    e.preventDefault(); setFout(null); setBezig(true)
    const { data, error } = await supabase.from('kantoren').insert({
      naam: f.naam.trim(), slug: f.slug || null, contact_naam: f.contact_naam || null, email: f.email || null, telefoon: f.telefoon || null, kvk: f.kvk || null,
      pakket: f.pakket, extra_gebruikers: extra, supabase_ref: f.supabase_ref.trim() || null, portaal_url: f.slug ? `https://${f.slug}.coportaal.nl` : null, notities: f.notities || null,
    }).select('id').single()
    if (error) { setFout(error.message.includes('duplicate') ? 'Deze slug of Supabase-ref bestaat al.' : error.message); setBezig(false); return }
    if (aanvraag) await supabase.from('aanvragen').update({ status: 'omgezet', kantoor_id: data.id }).eq('id', aanvraag.id)
    onKlaar(data.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 p-4" onClick={onSluit}>
      <form onSubmit={opslaan} className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-navy-900">{aanvraag ? 'Aanvraag omzetten naar kantoor' : 'Nieuw kantoor'}</h2>
        <p className="mt-1 text-sm text-ink-600">De omgeving zelf (Supabase-project, migraties, eerste beheerder) zet je nog via de scripts op; vul hier de ref in zodra hij er is.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div><label className="label">Kantoornaam</label><input className="veld" value={f.naam} onChange={e => setF({ ...f, naam: e.target.value, slug: f.slug || slugify(e.target.value) })} required /></div>
          <div><label className="label">Subdomein</label><div className="flex items-center gap-1"><input className="veld" value={f.slug} onChange={e => setF({ ...f, slug: slugify(e.target.value) })} /><span className="text-xs text-ink-400">.coportaal.nl</span></div></div>
          <div><label className="label">Contactpersoon</label><input className="veld" value={f.contact_naam} onChange={zet('contact_naam')} /></div>
          <div><label className="label">E-mailadres</label><input className="veld" type="email" value={f.email} onChange={zet('email')} /></div>
          <div><label className="label">Telefoon</label><input className="veld" value={f.telefoon} onChange={zet('telefoon')} /></div>
          <div><label className="label">KvK</label><input className="veld" value={f.kvk} onChange={zet('kvk')} /></div>
          <div><label className="label">Pakket</label><select className="veld" value={f.pakket} onChange={zet('pakket')}>{pakketten.map(p => <option key={p.slug} value={p.slug}>{p.naam} — {p.gebruikers_inbegrepen} gebruikers</option>)}</select></div>
          <div><label className="label">Extra gebruikers</label><input className="veld" type="number" min={0} value={extra} onChange={e => setExtra(Math.max(0, Number(e.target.value)))} /></div>
          <div className="sm:col-span-2"><label className="label">Supabase project-ref (mag leeg)</label><input className="veld font-mono" value={f.supabase_ref} onChange={zet('supabase_ref')} placeholder="bijv. evjgcazjxhqsxvoamfag" /></div>
          <div className="sm:col-span-2"><label className="label">Notities</label><textarea className="veld" rows={3} value={f.notities} onChange={zet('notities')} /></div>
        </div>
        {fout && <p className="mt-3 rounded-lg bg-gold-100 px-3 py-2 text-sm text-navy-800">{fout}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onSluit}>Annuleren</button>
          <button className="btn-primary" disabled={bezig || !f.naam.trim()}>{aanvraag ? 'Omzetten' : 'Aanmaken'}</button>
        </div>
      </form>
    </div>
  )
}
