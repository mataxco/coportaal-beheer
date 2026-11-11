import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { supabase, euro, maandbedrag, STATUS_KLEUR, STATUS_LABEL, type Kantoor, type Pakket } from '../lib/supabase'
import NieuwKantoorDialog from '../components/NieuwKantoorDialog'

export default function Kantoren() {
  const [kantoren, setKantoren] = useState<Kantoor[]>([])
  const [pakketten, setPakketten] = useState<Pakket[]>([])
  const [extraPrijs, setExtraPrijs] = useState(12.5)
  const [nieuw, setNieuw] = useState(false)
  const [zoek, setZoek] = useState('')

  const laad = async () => {
    const [k, p, i] = await Promise.all([
      supabase.from('kantoren').select('*').order('naam'),
      supabase.from('pakketten').select('*').order('volgorde'),
      supabase.from('instellingen').select('*').eq('sleutel', 'prijs_extra_gebruiker').maybeSingle(),
    ])
    setKantoren((k.data as Kantoor[]) || []); setPakketten((p.data as Pakket[]) || [])
    if (i.data) setExtraPrijs(Number(i.data.waarde))
  }
  useEffect(() => { laad() }, [])

  const lijst = kantoren.filter(k => !zoek || `${k.naam} ${k.laatste_check?.plaats ?? ''} ${k.email ?? ''} ${k.supabase_ref ?? ''}`.toLowerCase().includes(zoek.toLowerCase()))
  const actief = kantoren.filter(k => k.status === 'actief')
  const mrr = actief.reduce((s, k) => s + maandbedrag(k, pakketten, extraPrijs), 0)

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Kantoren</h1>
          <p className="text-sm text-ink-600">{kantoren.length} kantoren · {actief.length} actief · {euro(mrr)} per maand</p>
        </div>
        <div className="flex gap-2">
          <input className="veld w-56" placeholder="Zoeken…" value={zoek} onChange={e => setZoek(e.target.value)} />
          <button className="btn-primary" onClick={() => setNieuw(true)}><Plus className="h-4 w-4" />Nieuw kantoor</button>
        </div>
      </div>

      <div className="card mt-6 overflow-x-auto !p-0">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-left text-xs font-semibold uppercase tracking-wide text-ink-600">
            <tr><th className="px-4 py-3">Kantoor</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Pakket</th><th className="px-4 py-3">Gebruikers</th><th className="px-4 py-3">Per maand</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Omgeving</th></tr>
          </thead>
          <tbody>
            {lijst.map(k => {
              const p = pakketten.find(x => x.slug === k.pakket)
              return (
                <tr key={k.id} className="border-t border-navy-100 hover:bg-navy-50/60">
                  <td className="px-4 py-3"><Link to={`/kantoor/${k.id}`} className="font-semibold text-navy-800 hover:underline">{k.naam}</Link>{k.slug && <span className="block text-xs text-ink-400">{k.slug}.coportaal.nl</span>}</td>
                  <td className="px-4 py-3 text-ink-600">{k.contact_naam}<span className="block text-xs text-ink-400">{k.email}</span></td>
                  <td className="px-4 py-3">{p?.naam ?? <span className="text-ink-400">—</span>}</td>
                  <td className="px-4 py-3">{p ? p.gebruikers_inbegrepen + k.extra_gebruikers : '—'}{k.laatste_check?.gebruikers_actief != null && <span className="text-xs text-ink-400"> ({k.laatste_check.gebruikers_actief} actief)</span>}</td>
                  <td className="px-4 py-3">{p ? euro(maandbedrag(k, pakketten, extraPrijs)) : '—'}</td>
                  <td className="px-4 py-3"><span className={`badge ${STATUS_KLEUR[k.status]}`}>{STATUS_LABEL[k.status]}</span></td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-600">{k.supabase_ref ?? <span className="text-ink-400">nog geen</span>}</td>
                </tr>
              )
            })}
            {lijst.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-ink-400">Nog geen kantoren. Maak het eerste aan, of zet een aanvraag om.</td></tr>}
          </tbody>
        </table>
      </div>

      {nieuw && <NieuwKantoorDialog pakketten={pakketten} onSluit={() => setNieuw(false)} onKlaar={() => { setNieuw(false); laad() }} />}
    </div>
  )
}
