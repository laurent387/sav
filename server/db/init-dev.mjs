// ═══════════════════════════════════════════════════════
// LIFT GMAO — Initialisation de la base de dev (Docker)
// Le schéma est appliqué par le conteneur PostgreSQL au premier démarrage
// (docker-entrypoint-initdb.d). Ce script insère ensuite les données de
// référence (seed.mjs) puis la mission Belfort, une seule fois.
// Run: node server/db/init-dev.mjs
// ═══════════════════════════════════════════════════════
import pg from 'pg'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const config = {
  host:     process.env.PGHOST     || 'localhost',
  port:     Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || 'lift_gmao',
  user:     process.env.PGUSER     || 'lift',
  password: process.env.PGPASSWORD || 'lift',
}

async function waitForSchema(client, retries = 30) {
  for (let i = 0; i < retries; i++) {
    const { rows } = await client.query("SELECT to_regclass('public.users') AS t")
    if (rows[0].t) return
    console.log('[INIT] Schéma pas encore prêt, nouvel essai dans 2s...')
    await new Promise(r => setTimeout(r, 2000))
  }
  throw new Error('Schéma introuvable (server/db/schema.sql non appliqué ?)')
}

async function main() {
  const client = new pg.Client(config)
  await client.connect()
  try {
    await waitForSchema(client)
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
