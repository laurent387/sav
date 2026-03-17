import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  host:     process.env.PGHOST     || 'localhost',
  port:     Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || 'lift_gmao',
  user:     process.env.PGUSER     || 'lift',
  password: process.env.PGPASSWORD || 'lift',
  max: 20,
  idleTimeoutMillis: 30000,
})

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error', err)
})

export async function query(text, params) {
  const start = Date.now()
  const res = await pool.query(text, params)
  const duration = Date.now() - start
  if (duration > 500) console.warn(`[DB] Slow query (${duration}ms): ${text.slice(0, 80)}`)
  return res
}

export async function getClient() {
  return pool.connect()
}

export default pool
