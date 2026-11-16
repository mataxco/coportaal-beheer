// Nachtelijke back-up van alle kantooromgevingen (en van de beheeromgeving zelf).
//
// Per kantoor uit de tabel `kantoren`:
//   1. database: rollen + schema + data via `supabase db dump`, ingepakt en
//      versleuteld (AES-256, wachtwoord = BACKUP_WACHTWOORD), naar bucket `backups`;
//   2. bestanden: elke opslagbak van het kantoor wordt bijgewerkt in bucket
//      `backup-bestanden` (alleen nieuwe/gewijzigde bestanden; wat bij het kantoor
//      verwijderd is, blijft hier staan);
//   3. logregel in `kantoor_backups`, zichtbaar in de beheer-app.
//
// Nodig in de omgeving:
//   SUPABASE_ACCESS_TOKEN  persoonlijke toegangssleutel van het Supabase-account
//   BACKUP_WACHTWOORD      versleutelwachtwoord (bewaar dit ook buiten GitHub!)
//   BEHEER_REF             project-ref van de beheeromgeving
// Optioneel: --ref <project-ref> (alleen dat kantoor), --bron handmatig
//
// Kantoren worden uit de database gelezen: een nieuw kantoor doet vanzelf mee.

import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, statSync, rmSync, mkdirSync, copyFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const CLI = process.env.SUPABASE_BIN || 'supabase'
const BEHEER_REF = process.env.BEHEER_REF
const WACHTWOORD = process.env.BACKUP_WACHTWOORD
const UIT_MAP = process.env.BACKUP_UIT || ''            // map voor een extra kopie (GitHub-artifact)
const DEEL = 40 * 1024 * 1024                            // uploads in delen van 40 MB
const MAX_BESTAND = 45 * 1024 * 1024                     // grotere bestanden slaan we over (en melden we)
const BEWAAR_DAGEN = 30                                  // dagelijkse back-ups
const BEWAAR_MAANDEN_DAGEN = 365                         // die van de 1e van de maand
const BEWAAR_VERWIJDERD_DAGEN = 90                       // bij het kantoor verwijderde bestanden
// Tijdelijke opslag (bv. KYC-uploads vóór beoordeling) hoort niet in een back-up.
const SLA_BUCKET_OVER = b => /(^|[-_])(temp|tmp)$/i.test(b)

const args = process.argv.slice(2)
const argWaarde = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null }
const ALLEEN_REF = argWaarde('--ref')
const BRON = argWaarde('--bron') || 'gepland'
// Alleen de bestanden bijwerken (geen databasedump); handig om lokaal te testen zonder Docker.
const ALLEEN_BESTANDEN = args.includes('--alleen-bestanden')

{
  // Zeg precies wat er ontbreekt (nooit de waarden zelf), zodat het in GitHub meteen duidelijk is.
  const mist = []
  if (process.env.GITHUB_ACTIONS && !process.env.SUPABASE_ACCESS_TOKEN) mist.push('secret SUPABASE_ACCESS_TOKEN ontbreekt (Settings → Secrets and variables → Actions → tab Secrets)')
  if (!WACHTWOORD) mist.push('secret BACKUP_WACHTWOORD ontbreekt (tab Secrets)')
  else if (WACHTWOORD.length < 16) mist.push(`secret BACKUP_WACHTWOORD is te kort (${WACHTWOORD.length} tekens, minstens 16)`)
  if (!BEHEER_REF) mist.push('variable BEHEER_REF ontbreekt (tab Variables, niet Secrets)')
  if (mist.length) {
    for (const m of mist) console.error(`::error::${m}`)
    console.error('✗ Back-up niet gestart: ' + mist.join(' | '))
    process.exit(2)
  }
}

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)

function run(cmd, cmdArgs, opties = {}) {
  const r = spawnSync(cmd, cmdArgs, {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 256 * 1024 * 1024,
    shell: process.platform === 'win32', timeout: opties.timeout ?? 20 * 60_000, env: process.env, cwd: opties.cwd,
  })
  if (r.error) throw new Error(`${cmd}: ${r.error.message}`)
  if (r.status !== 0) throw new Error(`${cmd} ${cmdArgs[0] ?? ''} mislukte (${r.status}): ${(r.stderr || r.stdout || '').trim().slice(-400)}`)
  return r.stdout
}

/** Service-sleutel van een project ophalen (komt nooit in de log). */
function serviceSleutel(ref) {
  const uit = run(CLI, ['projects', 'api-keys', '--project-ref', ref, '-o', 'json'], { timeout: 120_000 })
  const lijst = JSON.parse(uit.slice(uit.indexOf('[')))
  const k = lijst.find(x => x.name === 'service_role' || x.id === 'service_role')?.api_key
  if (!k) throw new Error(`Geen service-sleutel gevonden voor ${ref}`)
  if (process.env.GITHUB_ACTIONS) console.log(`::add-mask::${k}`)
  return k
}

const klant = (ref, sleutel) => createClient(`https://${ref}.supabase.co`, sleutel, { auth: { persistSession: false, autoRefreshToken: false } })

/** Alle bestanden in een opslagbak (recursief): pad → grootte. */
async function lijstBestanden(sb, bucket, prefix = '') {
  const uit = new Map()
  const stapel = [prefix]
  while (stapel.length) {
    const map = stapel.pop()
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await sb.storage.from(bucket).list(map, { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } })
      if (error) throw new Error(`lijst ${bucket}/${map}: ${error.message}`)
      for (const item of data ?? []) {
        const pad = map ? `${map}/${item.name}` : item.name
        if (item.id === null || item.metadata == null) stapel.push(pad)           // map
        else uit.set(pad, { grootte: Number(item.metadata.size ?? 0), type: item.metadata.mimetype || 'application/octet-stream' })
      }
      if (!data || data.length < 1000) break
    }
  }
  return uit
}

async function parallel(items, n, fn) {
  let i = 0
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const k = i++; await fn(items[k]) }
  }))
}

/** Database dumpen, inpakken, versleutelen, controleren en uploaden. */
async function backupDatabase(ref, beheer, stempel) {
  const map = mkdtempSync(join(tmpdir(), `bk-${ref}-`))
  try {
    run(CLI, ['db', 'dump', `--remote=${ref}`, '-f', join(map, 'roles.sql'), '--role-only'])
    run(CLI, ['db', 'dump', `--remote=${ref}`, '-f', join(map, 'schema.sql')])
    run(CLI, ['db', 'dump', `--remote=${ref}`, '-f', join(map, 'data.sql'), '--data-only', '--use-copy'])

    const schema = readFileSync(join(map, 'schema.sql'), 'utf8')
    const tabellen = (schema.match(/^CREATE TABLE /gm) || []).length
    if (tabellen === 0) throw new Error('De schemadump bevat geen tabellen; back-up afgekeurd.')
    const data = readFileSync(join(map, 'data.sql'), 'utf8')
    const kopieen = (data.match(/^COPY /gm) || []).length
    if (kopieen === 0) throw new Error('De datadump bevat geen gegevens; back-up afgekeurd.')
    // Ruwe telling van datarijen: regels binnen de COPY-blokken.
    let rijen = 0, binnen = false
    for (const regel of data.split('\n')) {
      if (regel.startsWith('COPY ')) { binnen = true; continue }
      if (regel === '\\.') { binnen = false; continue }
      if (binnen) rijen++
    }

    run('tar', ['-czf', 'db.tar.gz', 'roles.sql', 'schema.sql', 'data.sql'], { cwd: map })
    run('openssl', ['enc', '-aes-256-cbc', '-pbkdf2', '-iter', '200000', '-salt', '-in', join(map, 'db.tar.gz'), '-out', join(map, 'db.tar.gz.enc'), '-pass', 'env:BACKUP_WACHTWOORD'])
    // Proef op de som: ontsleutelen en uitpakken moet lukken, anders is de back-up niets waard.
    run('openssl', ['enc', '-d', '-aes-256-cbc', '-pbkdf2', '-iter', '200000', '-in', join(map, 'db.tar.gz.enc'), '-out', join(map, 'proef.tar.gz'), '-pass', 'env:BACKUP_WACHTWOORD'])
    const inhoud = run('tar', ['-tzf', 'proef.tar.gz'], { cwd: map })
    if (!inhoud.includes('data.sql')) throw new Error('Controle na versleutelen mislukt.')

    const versleuteld = readFileSync(join(map, 'db.tar.gz.enc'))
    const paden = []
    for (let i = 0, deel = 0; i < versleuteld.length; i += DEEL, deel++) {
      const pad = `${ref}/db/${stempel}/db.tar.gz.enc.part${String(deel).padStart(3, '0')}`
      const { error } = await beheer.storage.from('backups').upload(pad, versleuteld.subarray(i, i + DEEL), { contentType: 'application/octet-stream', upsert: true })
      if (error) throw new Error(`upload ${pad}: ${error.message}`)
      paden.push(pad)
    }
    if (UIT_MAP) {
      mkdirSync(UIT_MAP, { recursive: true })
      copyFileSync(join(map, 'db.tar.gz.enc'), join(UIT_MAP, `${ref}_${stempel}.tar.gz.enc`))
    }
    return { paden, bytes: statSync(join(map, 'db.tar.gz.enc')).size, tabellen, rijen }
  } finally {
    rmSync(map, { recursive: true, force: true })
  }
}

/** Bestanden van het kantoor bijwerken in de back-upopslag. */
async function backupBestanden(ref, kantoorSb, beheer) {
  const { data: buckets, error } = await kantoorSb.storage.listBuckets()
  if (error) throw new Error(`opslagbakken ophalen: ${error.message}`)
  let totaal = 0, gekopieerd = 0, bytes = 0, overgeslagen = 0
  const fouten = []
  const vandaag = new Date().toISOString().slice(0, 10)
  let verplaatst = 0
  for (const b of buckets ?? []) {
    if (SLA_BUCKET_OVER(b.id)) { log(`   ${b.id}: overgeslagen (tijdelijke opslag)`); continue }
    const bron = await lijstBestanden(kantoorSb, b.id)
    const doel = await lijstBestanden(beheer, 'backup-bestanden', `${ref}/${b.id}`)
    const teDoen = []
    for (const [pad, info] of bron) {
      totaal++; bytes += info.grootte
      const bestaand = doel.get(`${ref}/${b.id}/${pad}`)
      if (bestaand && bestaand.grootte === info.grootte) continue
      if (info.grootte > MAX_BESTAND) { overgeslagen++; continue }
      teDoen.push([pad, info])
    }
    await parallel(teDoen, 6, async ([pad, info]) => {
      try {
        const { data, error: dl } = await kantoorSb.storage.from(b.id).download(pad)
        if (dl || !data) throw new Error(dl?.message || 'leeg')
        const { error: up } = await beheer.storage.from('backup-bestanden')
          .upload(`${ref}/${b.id}/${pad}`, Buffer.from(await data.arrayBuffer()), { contentType: info.type, upsert: true })
        if (up) throw new Error(up.message)
        gekopieerd++
      } catch (e) {
        fouten.push(`${b.id}/${pad}: ${e.message}`)
      }
    })
    // Bij het kantoor verwijderd: nog 90 dagen bewaren in _verwijderd/<datum>/, daarna echt weg.
    // Zo blijft herstel mogelijk én wordt een bewaartermijn (AVG) niet door de back-up omzeild.
    const weg = [...doel.keys()].filter(p => !bron.has(p.slice(`${ref}/${b.id}/`.length)))
    await parallel(weg, 6, async (pad) => {
      const { error: mv } = await beheer.storage.from('backup-bestanden')
        .move(pad, `${ref}/_verwijderd/${vandaag}/${pad.slice(ref.length + 1)}`)
      if (!mv) verplaatst++
    })
    log(`   ${b.id}: ${bron.size} bestanden, ${teDoen.length} bijgewerkt${weg.length ? `, ${weg.length} verwijderd bij kantoor` : ''}`)
  }
  // Verwijderde bestanden ouder dan de bewaartermijn definitief opruimen.
  const { data: dagen } = await beheer.storage.from('backup-bestanden').list(`${ref}/_verwijderd`, { limit: 1000 })
  for (const d of dagen ?? []) {
    const t = Date.parse(d.name)
    if (!Number.isFinite(t) || (Date.now() - t) / 86_400_000 <= BEWAAR_VERWIJDERD_DAGEN) continue
    const oud = await lijstBestanden(beheer, 'backup-bestanden', `${ref}/_verwijderd/${d.name}`)
    const paden = [...oud.keys()]
    for (let i = 0; i < paden.length; i += 500) await beheer.storage.from('backup-bestanden').remove(paden.slice(i, i + 500))
  }
  return { totaal, gekopieerd, bytes, overgeslagen, fouten, verplaatst }
}

/** Oude databasedumps opruimen: 30 dagen dagelijks, de 1e van de maand een jaar. */
async function ruimOp(ref, beheer) {
  const { data } = await beheer.storage.from('backups').list(`${ref}/db`, { limit: 1000 })
  const nu = Date.now()
  for (const map of data ?? []) {
    const m = /^(\d{4})-(\d{2})-(\d{2})_/.exec(map.name)
    if (!m) continue
    const dagen = (nu - Date.UTC(+m[1], +m[2] - 1, +m[3])) / 86_400_000
    const maandelijks = m[3] === '01'
    if (dagen <= BEWAAR_DAGEN || (maandelijks && dagen <= BEWAAR_MAANDEN_DAGEN)) continue
    const { data: delen } = await beheer.storage.from('backups').list(`${ref}/db/${map.name}`, { limit: 100 })
    if (delen?.length) await beheer.storage.from('backups').remove(delen.map(d => `${ref}/db/${map.name}/${d.name}`))
  }
}

// ── Hoofdprogramma ───────────────────────────────────────────────────────────
const stempel = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '')
const beheer = klant(BEHEER_REF, serviceSleutel(BEHEER_REF))

let q = beheer.from('kantoren').select('id, naam, supabase_ref, status').not('supabase_ref', 'is', null).neq('status', 'beeindigd')
if (ALLEEN_REF) q = q.eq('supabase_ref', ALLEEN_REF)
const { data: kantoren, error: kErr } = await q
if (kErr) { console.error('✗ Kantoren ophalen mislukt:', kErr.message); process.exit(1) }

let mislukt = 0
for (const k of kantoren ?? []) {
  log(`▶ ${k.naam} (${k.supabase_ref})`)
  const { data: rij } = await beheer.from('kantoor_backups')
    .insert({ kantoor_id: k.id, supabase_ref: k.supabase_ref, bron: BRON }).select('id').single()
  try {
    const db = ALLEEN_BESTANDEN
      ? { paden: [], bytes: null, tabellen: null, rijen: null }
      : await backupDatabase(k.supabase_ref, beheer, stempel)
    if (!ALLEEN_BESTANDEN) log(`   database: ${db.tabellen} tabellen, ~${db.rijen} rijen, ${(db.bytes / 1048576).toFixed(1)} MB versleuteld`)
    const kantoorSb = klant(k.supabase_ref, serviceSleutel(k.supabase_ref))
    const f = await backupBestanden(k.supabase_ref, kantoorSb, beheer)
    await ruimOp(k.supabase_ref, beheer)
    const melding = [
      ALLEEN_BESTANDEN ? 'alleen bestanden (geen databasedump)' : null,
      f.overgeslagen ? `${f.overgeslagen} bestand(en) groter dan 45 MB overgeslagen` : null,
      f.fouten.length ? `${f.fouten.length} bestand(en) niet gekopieerd: ${f.fouten.slice(0, 3).join('; ')}` : null,
    ].filter(Boolean).join(' · ') || null
    await beheer.from('kantoor_backups').update({
      status: f.fouten.length > 20 ? 'mislukt' : 'gelukt', klaar_op: new Date().toISOString(),
      db_bestanden: db.paden, db_bytes: db.bytes, tabellen: db.tabellen, rijen: db.rijen,
      bestanden_totaal: f.totaal, bestanden_gekopieerd: f.gekopieerd, bestanden_bytes: f.bytes,
      overgeslagen: f.overgeslagen, melding,
    }).eq('id', rij.id)
    if (f.fouten.length > 20) mislukt++
    log(`   ✓ klaar: ${f.totaal} bestanden (${(f.bytes / 1048576).toFixed(0)} MB), ${f.gekopieerd} gekopieerd`)
  } catch (e) {
    mislukt++
    console.error(`   ✗ ${k.naam}: ${e.message}`)
    if (rij?.id) await beheer.from('kantoor_backups').update({ status: 'mislukt', klaar_op: new Date().toISOString(), melding: String(e.message).slice(0, 900) }).eq('id', rij.id)
  }
}

// De beheeromgeving zelf (kantorenlijst, aanvragen, sleutels): alleen de database.
if (!ALLEEN_REF && !ALLEEN_BESTANDEN) {
  try {
    log('▶ Beheeromgeving')
    const db = await backupDatabase(BEHEER_REF, beheer, stempel)
    await ruimOp(BEHEER_REF, beheer)
    log(`   ✓ ${db.tabellen} tabellen, ${(db.bytes / 1048576).toFixed(1)} MB`)
  } catch (e) {
    mislukt++
    console.error(`   ✗ beheeromgeving: ${e.message}`)
  }
}

if (mislukt) { console.error(`✗ ${mislukt} back-up(s) mislukt.`); process.exit(1) }
log(`✓ Alle back-ups gelukt (${(kantoren ?? []).length} kantoor/kantoren + beheer).`)
