import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, datum, AANVRAAG_LABEL, type Aanvraag, type Pakket } from '../lib/supabase'
import NieuwKantoorDialog from '../components/NieuwKantoorDialog'

const KOLOMMEN: Aanvraag['status'][] = ['nieuw', 'contact', 'omgezet', 'afgewezen']

export default function Aanvragen() {
  const [aanvragen, setAanvragen] = useState<Aanvraag[]>([])
  const [pakketten, setPakketten] = useState<Pakket[]>([])
  const [omzetten, setOmzetten] = useState<Aanvraag | null>(null)

  const laad = async () => {
    const [a, p] = await Promise.all([supabase.from('aanvragen').select('*').order('created_at', { ascending: false }), supabase.from('pakketten').select('*').order('volgorde')])
    setAanvragen((a.data as Aanvraag[]) || []); setPakketten((p.data as Pakket[]) || [])
  }
  useEffect(() => { laad() }, [])

  const zetStatus = async (a: Aanvraag, status: Aanvraag['status']) => {
    await supabase.from('aanvragen').update({ status }).eq('id', a.id); laad()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-900">Aanvragen</h1>
      <p className="text-sm text-ink-600">Binnengekomen via coportaal.nl/aanvraag. Nieuw → in gesprek → omzetten naar kantoor.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {KOLOMMEN.map(kol => (
          <div key={kol} className="rounded-xl bg-navy-100/60 p-3">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-600">{AANVRAAG_LABEL[kol]} · {aanvragen.filter(a => a.status === kol).length}</p>
            <div className="space-y-3">
              {aanvragen.filter(a => a.status === kol).map(a => (
                <div key={a.id} className="card !p-4">
                  <p className="font-semibold text-navy-800">{a.kantoor}</p>
                  <p className="text-xs text-ink-600">{a.naam} · {a.email}{a.telefoon && ` · ${a.telefoon}`}</p>
                  <p className="mt-2 text-xs text-ink-600">
                    {a.pakket && <span className="badge bg-navy-50 text-navy-700 mr-1">{pakketten.find(p => p.slug === a.pakket)?.naam ?? a.pakket}</span>}
                    {a.gebruikers && <span>{a.gebruikers} gebr.</span>}{a.klanten && <span> · {a.klanten} klanten</span>}{a.boekhoudpakket && <span> · {a.boekhoudpakket}</span>}
                  </p>
                  {a.opmerking && <p className="mt-2 whitespace-pre-wrap text-xs text-ink-600">{a.opmerking}</p>}
                  <p className="mt-2 text-[11px] text-ink-400">{datum(a.created_at)}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {kol === 'nieuw' && <button className="btn-secondary !px-2 !py-1 text-xs" onClick={() => zetStatus(a, 'contact')}>In gesprek</button>}
                    {(kol === 'nieuw' || kol === 'contact') && <button className="btn-primary !px-2 !py-1 text-xs" onClick={() => setOmzetten(a)}>Omzetten</button>}
                    {(kol === 'nieuw' || kol === 'contact') && <button className="btn-secondary !px-2 !py-1 text-xs" onClick={() => zetStatus(a, 'afgewezen')}>Afwijzen</button>}
                    {kol === 'afgewezen' && <button className="btn-secondary !px-2 !py-1 text-xs" onClick={() => zetStatus(a, 'nieuw')}>Terug naar nieuw</button>}
                    {kol === 'omgezet' && a.kantoor_id && <Link to={`/kantoor/${a.kantoor_id}`} className="btn-secondary !px-2 !py-1 text-xs">Naar kantoor</Link>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {omzetten && <NieuwKantoorDialog pakketten={pakketten} aanvraag={omzetten} onSluit={() => setOmzetten(null)} onKlaar={() => { setOmzetten(null); laad() }} />}
    </div>
  )
}
