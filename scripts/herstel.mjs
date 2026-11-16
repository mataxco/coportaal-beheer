// Een back-up terughalen.
//
//   node scripts/herstel.mjs --bron <project-ref> [--backup laatste|<stempel>] [--uit <map>]
//        [--bestanden-naar <project-ref>]
//
// Haalt de versleutelde databasedump op, ontsleutelt en pakt uit naar <map>
// (roles.sql, schema.sql, data.sql). Staat HERSTEL_DB_URL in de omgeving, dan
// wordt de dump daar ook ingelezen. Dat hoort een LEGE, nieuwe omgeving te zijn:
// het inlezen stopt bij de eerste fout, dus een bestaande omgeving wordt niet
// stilletjes overschreven.
// Met --bestanden-naar worden alle bestanden uit de back-up teruggezet in de
// opslagbakken van die omgeving (bestaande bestanden met dezelfde naam worden
// vervangen).
//
// Nodig: SUPABASE_ACCESS_TOKEN, BACKUP_WACHTWOORD, BEHEER_REF (+ openssl, tar, psql).

import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const CLI = process.env.SUPABASE_BIN || 'supabase'
const args = process.argv.slice(2)
const arg = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null }
const BRON = arg('--bron')
const KEUZE = arg('--backup') || 'laatste'
const UIT = resolve(arg('--uit') || `herstel-${BRON}`)
const BESTANDEN_NAAR = arg('--bestanden-naar')
const { BEHEER_REF, BACKUP_WACHTWOORD, HERSTEL_DB_URL } = process.env

if (!BRON || !BEHEER_REF || !BACKUP_WACHTWOORD || !process.env.SUPABASE_ACCESS_TOKEN) {
  console.error('Gebruik: node scripts/herstel.mjs --bron <ref> [--backup laatste|<stempel>] [--uit <map>] [--bestanden-naar <ref>]')
  console.error('Nodig in de omgeving: SUPABASE_ACCESS_TOKEN, BACKUP_WACHTWOORD, BEHEER_REF')
  process.exit(2)
}

function run(cmd, a, opties = {}) {
  const r = spawnSync(cmd, a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 256 * 1024 * 1024, shell: process.platform === 'win32', env: process.env, cwd: opties.cwd, timeout: 60 * 60_000 })
  if (r.error) throw new Error(`${cmd}: ${r.error.message}`)
  if (r.status !== 0) throw new Error(`${cmd} mislukte (${r.status}): ${(r.stderr || r.stdout || '').trim().slice(-600)}`)
  return r.stdout
}
function sleutel(ref) {
  const uit = run(CLI, ['projects', 'api-keys', '--project-ref', ref, '-o', 'json'])
  const k = JSON.parse(uit.slice(uit.indexOf('['))).find(x => x.name === 'service_role' || x.id === 'service_role')?.api_key
  if (!k) throw new Error(`Geen service-sleutel voor ${ref}`)
  if (process.env.GITHUB_ACTIONS) console.log(`::add-mask::${k}`)
  return k
}
const klant = (ref, s) => createClient(`https://${ref}.supabase.co`, s, { auth: { persistSession: false, autoRefreshToken: false } })

const beheer = klant(BEHEER_REF, sleutel(BEHEER_REF))

// 1. Welke back-up?
const { data: mappen, error } = await beheer.storage.from('backups').list(`${BRON}/db`, { limit: 1000, sortBy: { column: 'name', order: 'desc' } })
if (error || !mappen?.length) { console.error(`✗ Geen back-ups gevonden voor ${BRON}.`); process.exit(1) }
const namen = mappen.map(m => m.name).sort().reverse()
const stempel = KEUZE === 'laatste' ? namen[0] : namen.find(n => n.startsWith(KEUZE))
if (!stempel) { console.error(`✗ Back-up "${KEUZE}" niet gevonden. Beschikbaar: ${namen.slice(0, 10).join(', ')}`); process.exit(1) }
console.log(`▶ Back-up ${stempel} van ${BRON}`)

// 2. Ophalen, samenvoegen, ontsleutelen, uitpakken
mkdirSync(UIT, { recursive: true })
const { data: delen } = await beheer.storage.from('backups').list(`${BRON}/db/${stempel}`, { limit: 100, sortBy: { column: 'name', order: 'asc' } })
const stukken = []
for (const d of (delen ?? []).sort((a, b) => a.name.localeCompare(b.name))) {
  const { data, error: dl } = await beheer.storage.from('backups').download(`${BRON}/db/${stempel}/${d.name}`)
  if (dl || !data) { console.error(`✗ Ophalen ${d.name}: ${dl?.message}`); process.exit(1) }
  stukken.push(Buffer.from(await data.arrayBuffer()))
}
writeFileSync(join(UIT, 'db.tar.gz.enc'), Buffer.concat(stukken))
run('openssl', ['enc', '-d', '-aes-256-cbc', '-pbkdf2', '-iter', '200000', '-in', join(UIT, 'db.tar.gz.enc'), '-out', join(UIT, 'db.tar.gz'), '-pass', 'env:BACKUP_WACHTWOORD'])
run('tar', ['-xzf', 'db.tar.gz'], { cwd: UIT })
console.log(`  ✓ uitgepakt in ${UIT} (roles.sql, schema.sql, data.sql)`)

// 3. Inlezen in de doeldatabase (alleen als HERSTEL_DB_URL is gezet)
if (HERSTEL_DB_URL) {
  console.log('▶ Database inlezen in de doelomgeving…')
  run('psql', ['--single-transaction', '--variable', 'ON_ERROR_STOP=1',
    '--file', join(UIT, 'roles.sql'), '--file', join(UIT, 'schema.sql'),
    '--command', 'SET session_replication_role = replica', '--file', join(UIT, 'data.sql'),
    '--dbname', HERSTEL_DB_URL])
  console.log('  ✓ database hersteld')
} else {
  console.log('ℹ HERSTEL_DB_URL is niet gezet: de database is niet ingelezen. Inlezen kan met:')
  console.log('  psql --single-transaction --variable ON_ERROR_STOP=1 --file roles.sql --file schema.sql --command "SET session_replication_role = replica" --file data.sql --dbname "<verbinding van de nieuwe omgeving>"')
}

// 4. Bestanden terugzetten
if (BESTANDEN_NAAR) {
  console.log(`▶ Bestanden terugzetten naar ${BESTANDEN_NAAR}…`)
  const doel = klant(BESTANDEN_NAAR, sleutel(BESTANDEN_NAAR))
  const { data: bakken } = await beheer.storage.from('backup-bestanden').list(BRON, { limit: 100 })
  let n = 0, fout = 0
  for (const bak of bakken ?? []) {
    const { data: bestaand } = await doel.storage.getBucket(bak.name)
    if (!bestaand) await doel.storage.createBucket(bak.name, { public: false })
    const stapel = [`${BRON}/${bak.name}`]
    while (stapel.length) {
      const map = stapel.pop()
      for (let offset = 0; ; offset += 1000) {
        const { data } = await beheer.storage.from('backup-bestanden').list(map, { limit: 1000, offset })
        for (const item of data ?? []) {
          const pad = `${map}/${item.name}`
          if (item.id === null || item.metadata == null) { stapel.push(pad); continue }
          const { data: blob, error: dl } = await beheer.storage.from('backup-bestanden').download(pad)
          if (dl || !blob) { fout++; continue }
          const doelPad = pad.slice(`${BRON}/${bak.name}/`.length)
          const { error: up } = await doel.storage.from(bak.name).upload(doelPad, Buffer.from(await blob.arrayBuffer()), { contentType: item.metadata.mimetype || 'application/octet-stream', upsert: true })
          if (up) fout++; else n++
        }
        if (!data || data.length < 1000) break
      }
    }
  }
  console.log(`  ✓ ${n} bestanden teruggezet${fout ? `, ${fout} mislukt` : ''}`)
  if (fout) process.exit(1)
}
console.log('✓ Klaar.')
