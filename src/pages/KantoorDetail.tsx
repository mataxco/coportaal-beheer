import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, RefreshCw, ShieldCheck, ExternalLink, DatabaseBackup, AlertTriangle } from 'lucide-react'
import { supabase, beheerActie, datum, euro, maandbedrag, STATUS_KLEUR, STATUS_LABEL, BACKUP_ACTIES_URL, mb, type Actie, type Backup, type Kantoor, type Pakket } from '../lib/supabase'

export default function KantoorDetail() {
  const { id } = useParams()
  const [k, setK] = useState<Kantoor | null>(null)
  const [pakketten, setPakketten] = useState<Pakket[]>([])
  const [acties, setActies] = useState<Actie[]>([])
  const [backups, setBackups] = useState<Backup[]>([])
  const [extraPrijs, setExtraPrijs] = useState(12.5)
  const [bezig, setBezig] = useState<string | null>(null)
  const [melding, setMelding] = useState<{ ok: boolean; tekst: string } | null>(null)
  const [bewerk, setBewerk] = useState<Partial<Kantoor>>({})

  const laad = async () => {
    const [kk, p, a, i, b] = await Promise.all([
      supabase.from('kantoren').select('*').eq('id', id).single(),
      supabase.from('pakketten').select('*').order('volgorde'),
      supabase.from('kantoor_acties').select('*').eq('kantoor_id', id).order('created_at', { ascending: false }).limit(30),
      supabase.from('instellingen').select('*').eq('sleutel', 'prijs_extra_gebruiker').maybeSingle(),
      supabase.from('kantoor_backups').select('*').eq('kantoor_id', id).order('gestart_op', { ascending: false }).limit(8),
    ])
    setBackups((b.data as Backup[]) || [])
    setK(kk.data as Kantoor); setBewerk(kk.data as Kantoor); setPakketten((p.data as Pakket[]) || []); setActies((a.data as Actie[]) || [])
    if (i.data) setExtraPrijs(Number(i.data.waarde))
  }
  useEffect(() => { laad() }, [id])

  if (!k) return null
  const pakket = pakketten.find(x => x.slug === k.pakket)
  const gewijzigd = JSON.stringify(bewerk) !== JSON.stringify(k)

  const opslaan = async () => {
    setBezig('opslaan')
    const { error } = await supabase.from('kantoren').update({
      naam: bewerk.naam, slug: bewerk.slug || null, contact_naam: bewerk.contact_naam || null, email: bewerk.email || null, telefoon: bewerk.telefoon || null, kvk: bewerk.kvk || null,
      supabase_ref: bewerk.supabase_ref || null, portaal_url: bewerk.portaal_url || null, pakket: bewerk.pakket, extra_gebruikers: bewerk.extra_gebruikers ?? 0,
      status: bewerk.status, actief_sinds: bewerk.actief_sinds || null, notities: bewerk.notities || null,
    }).eq('id', k.id)
    setMelding(error ? { ok: false, tekst: error.message } : { ok: true, tekst: 'Opgeslagen.' + (bewerk.pakket !== k.pakket ? ' Pakket gewijzigd: klik op "Licentie doorvoeren" om het in de omgeving te zetten.' : '') })
    setBezig(null); laad()
  }
  const actie = async (a: 'licentie' | 'status') => {
    setBezig(a); setMelding(null)
    try {
      const r = await beheerActie(k.id, a)
      setMelding({ ok: true, tekst: a === 'licentie' ? `Licentie gezet: modules ${(r.modules as string[] | undefined)?.join(', ') || 'geen'}` : `Omgeving "${r.naam}": ${r.gebruikers_actief} actieve gebruikers, modules ${(r.modules as string[] | undefined)?.join(', ') || 'geen'}` })
    } catch (e) { setMelding({ ok: false, tekst: e instanceof Error ? e.message : String(e) }) }
    setBezig(null); laad()
  }
  const veld = (key: keyof Kantoor, label: string, type = 'text', mono = false) => (
    <div><label className="label">{label}</label><input className={`veld ${mono ? 'font-mono' : ''}`} type={type} value={(bewerk[key] as string) ?? ''} onChange={e => setBewerk({ ...bewerk, [key]: e.target.value })} /></div>
  )

  // Vergelijk gewenste modules (pakket) met wat de omgeving heeft (laatste check)
  const gewenst = pakket?.modules ?? []
  const werkelijk = k.laatste_check?.modules
  const inSync = werkelijk ? [...gewenst].sort().join() === [...werkelijk].sort().join() : null

  // Back-ups: laatste geslaagde en of die recent genoeg is (elke nacht hoort er één te komen).
  const laatsteGelukt = backups.find(x => x.status === 'gelukt')
  const uurOud = laatsteGelukt ? (Date.now() - new Date(laatsteGelukt.gestart_op).getTime()) / 3_600_000 : null
  const backupTeOud = !!k.supabase_ref && k.status !== 'beeindigd' && (uurOud == null || uurOud > 36)

  return (
    <div>
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-ink-600 hover:underline"><ArrowLeft className="h-4 w-4" />Kantoren</Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-navy-900">{k.naam}</h1>
        <span className={`badge ${STATUS_KLEUR[k.status]}`}>{STATUS_LABEL[k.status]}</span>
        {k.portaal_url && <a href={k.portaal_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-navy-600 hover:underline">{k.portaal_url.replace('https://', '')}<ExternalLink className="h-3.5 w-3.5" /></a>}
      </div>

      {melding && <p className={`mt-4 rounded-lg px-3 py-2 text-sm ${melding.ok ? 'bg-teal-100 text-teal-600' : 'bg-gold-100 text-navy-800'}`}>{melding.tekst}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="card">
          <h2 className="font-semibold text-navy-800">Gegevens en abonnement</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {veld('naam', 'Kantoornaam')}
            {veld('slug', 'Subdomein (zonder .coportaal.nl)')}
            {veld('contact_naam', 'Contactpersoon')}
            {veld('email', 'E-mailadres', 'email')}
            {veld('telefoon', 'Telefoon')}
            {veld('kvk', 'KvK')}
            <div><label className="label">Pakket</label><select className="veld" value={bewerk.pakket ?? ''} onChange={e => setBewerk({ ...bewerk, pakket: e.target.value })}><option value="">—</option>{pakketten.map(p => <option key={p.slug} value={p.slug}>{p.naam} — {euro(p.prijs_maand)}, {p.gebruikers_inbegrepen} gebruikers</option>)}</select></div>
            <div><label className="label">Extra gebruikers (à {euro(extraPrijs)})</label><input className="veld" type="number" min={0} value={bewerk.extra_gebruikers ?? 0} onChange={e => setBewerk({ ...bewerk, extra_gebruikers: Math.max(0, Number(e.target.value)) })} /></div>
            <div><label className="label">Status</label><select className="veld" value={bewerk.status} onChange={e => setBewerk({ ...bewerk, status: e.target.value as Kantoor['status'] })}>{Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            {veld('actief_sinds', 'Actief sinds', 'date')}
            {veld('supabase_ref', 'Supabase project-ref', 'text', true)}
            {veld('portaal_url', 'Portaal-URL')}
            <div className="sm:col-span-2"><label className="label">Notities</label><textarea className="veld" rows={3} value={bewerk.notities ?? ''} onChange={e => setBewerk({ ...bewerk, notities: e.target.value })} /></div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-ink-600">Maandbedrag: <strong className="text-navy-800">{euro(maandbedrag({ ...k, ...bewerk } as Kantoor, pakketten, extraPrijs))}</strong> excl. btw</p>
            <button className="btn-primary" disabled={!gewijzigd || bezig === 'opslaan'} onClick={opslaan}>Opslaan</button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="font-semibold text-navy-800">Omgeving</h2>
            {!k.supabase_ref ? (
              <p className="mt-2 text-sm text-ink-600">Nog geen Supabase-omgeving gekoppeld. Zet hem op met <code className="rounded bg-navy-50 px-1">migreer.sh</code>, vul de ref in en zet de service-sleutel in de Vault als <code className="rounded bg-navy-50 px-1">kantoor_&lt;ref&gt;_service_key</code>.</p>
            ) : (
              <>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                  <dt className="text-ink-400">Naam in omgeving</dt><dd>{k.laatste_check?.naam ?? '—'}</dd>
                  <dt className="text-ink-400">Modules</dt><dd>{werkelijk ? (werkelijk.join(', ') || 'alleen basis') : '—'}{inSync === false && <span className="badge ml-2 bg-gold-100 text-navy-800">wijkt af van pakket</span>}{inSync && <span className="badge ml-2 bg-teal-100 text-teal-600">klopt met pakket</span>}</dd>
                  <dt className="text-ink-400">Actieve gebruikers</dt><dd>{k.laatste_check?.gebruikers_actief ?? '—'}{pakket && k.laatste_check?.gebruikers_actief != null && k.laatste_check.gebruikers_actief > pakket.gebruikers_inbegrepen + k.extra_gebruikers && <span className="badge ml-2 bg-gold-100 text-navy-800">meer dan afgenomen</span>}</dd>
                  <dt className="text-ink-400">Laatste controle</dt><dd>{datum(k.laatste_check_op)}</dd>
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="btn-secondary" disabled={!!bezig} onClick={() => actie('status')}><RefreshCw className={`h-4 w-4 ${bezig === 'status' ? 'animate-spin' : ''}`} />Status ophalen</button>
                  <button className="btn-primary" disabled={!!bezig || !pakket} onClick={() => actie('licentie')}><ShieldCheck className="h-4 w-4" />Licentie doorvoeren</button>
                </div>
                <p className="mt-2 text-xs text-ink-400">Licentie doorvoeren zet de modules van het pakket ({gewenst.join(', ') || 'alleen basis'}) in de omgeving van dit kantoor.</p>
              </>
            )}
          </div>

          <div className="card">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-semibold text-navy-800"><DatabaseBackup className="h-4 w-4" /> Back-ups</h2>
              <a href={BACKUP_ACTIES_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-navy-700 hover:underline">Starten / herstellen <ExternalLink className="h-3 w-3" /></a>
            </div>
            {!k.supabase_ref ? (
              <p className="mt-3 text-sm text-ink-400">Nog geen omgeving gekoppeld; er valt nog niets te back-uppen.</p>
            ) : (
              <>
                {backupTeOud && (
                  <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-100 p-2 text-sm text-amber-800">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    {laatsteGelukt ? `Laatste geslaagde back-up is ${Math.round(uurOud!)} uur oud. Er hoort elke nacht een nieuwe te komen.` : 'Er is nog geen geslaagde back-up van deze omgeving.'}
                  </p>
                )}
                {laatsteGelukt && (
                  <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
                    <dt className="text-ink-400">Laatste geslaagde</dt><dd>{datum(laatsteGelukt.gestart_op)}</dd>
                    <dt className="text-ink-400">Database</dt><dd>{laatsteGelukt.tabellen ?? '—'} tabellen · {mb(laatsteGelukt.db_bytes)} versleuteld</dd>
                    <dt className="text-ink-400">Bestanden</dt><dd>{laatsteGelukt.bestanden_totaal ?? '—'} · {mb(laatsteGelukt.bestanden_bytes)}</dd>
                  </dl>
                )}
                <ul className="mt-3 space-y-1.5 text-sm">
                  {backups.map(b => (
                    <li key={b.id} className="flex gap-2">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${b.status === 'mislukt' ? 'bg-red-500' : b.status === 'bezig' ? 'bg-amber-400' : 'bg-teal-600'}`} />
                      <div className="min-w-0">
                        <p className="text-ink-900">{datum(b.gestart_op)} · {b.status === 'gelukt' ? 'gelukt' : b.status === 'bezig' ? 'bezig…' : 'mislukt'}{b.bron === 'handmatig' ? ' (handmatig)' : ''}</p>
                        {b.melding && <p className="break-words text-xs text-ink-400">{b.melding}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-ink-400">Elke nacht: database versleuteld (30 dagen dagelijks, 12 maanden maandelijks) en alle bestanden. Bij het kantoor verwijderde bestanden blijven nog 90 dagen terug te halen.</p>
              </>
            )}
          </div>

          <div className="card">
            <h2 className="font-semibold text-navy-800">Logboek</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {acties.map(a => (
                <li key={a.id} className="flex gap-2">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.gelukt === false ? 'bg-red-500' : 'bg-teal-600'}`} />
                  <div><p className="text-ink-900">{a.melding || a.actie}</p><p className="text-xs text-ink-400">{datum(a.created_at)} · {a.uitgevoerd_door}</p></div>
                </li>
              ))}
              {acties.length === 0 && <li className="text-ink-400">Nog geen acties.</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
