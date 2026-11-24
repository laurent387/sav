// ═══════════════════════════════════════════════════════
// LIFT GMAO — Initialisation de la base de dev (Docker)
// Applique le schéma s'il est absent (base vide, ex. Render), puis insère les
// données de référence (seed.mjs) et la mission Belfort, une seule fois.
// Avec Docker, le schéma est déjà appliqué par docker-entrypoint-initdb.d.
// Run: node server/db/init-dev.mjs
// ═══════════════════════════════════════════════════════
import pg from 'pg'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dbConfig } from './pool.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function connectWithRetry(retries = 30) {
  for (let i = 1; ; i++) {
    const client = new pg.Client(dbConfig)
    try {
      await client.connect()
      return client
    } catch (err) {
      await client.end().catch(() => {})
      if (i >= retries) throw err
      console.log(`[INIT] Base injoignable (${err.message}), nouvel essai dans 2s...`)
      await new Promise(r => setTimeout(r, 2000))
    }
  }
}

async function ensureSchema(client) {
  const { rows } = await client.query("SELECT to_regclass('public.users') AS t")
  if (rows[0].t) return
  console.log('[INIT] Application du schéma...')
  await client.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'))
}

async function main() {
  const client = await connectWithRetry()
  try {
    await ensureSchema(client)
    const { rows } = await client.query('SELECT COUNT(*)::int AS n FROM users')
    if (rows[0].n > 0) {
      console.log('[INIT] Base déjà initialisée, rien à faire.')
      return
    }

    console.log('[INIT] Insertion des données de référence...')
    const seed = spawnSync(process.execPath, [path.join(__dirname, 'seed.mjs')], { stdio: 'inherit', env: process.env })
    if (seed.status !== 0) throw new Error('seed.mjs a échoué')

    console.log('[INIT] Insertion de la mission Belfort TR15 & TR18...')
    const sql = fs.readFileSync(path.join(__dirname, 'mission-belfort.sql'), 'utf8')
    await client.query('BEGIN')
    await client.query(sql)
    await client.query('COMMIT')
    console.log('[INIT] ✓ Base de dev prête')
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    await client.end()
  }
}

main().catch(err => {
  console.error('[INIT] ✗', err.message)
  process.exit(1)
})
