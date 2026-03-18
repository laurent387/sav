import { createServer } from 'node:http'
import { query } from './db/pool.mjs'
import crypto from 'node:crypto'

const PORT  = Number(process.env.API_PORT || 5000)
const ORIGIN = process.env.CORS_ORIGIN || '*'

// ─── Helpers ───────────────────────────────────────────
function parsePgArray(val) {
  if (!val || val === '{}') return []
  if (Array.isArray(val)) return val
  // Strip outer braces and split, handling quoted values
  const inner = val.slice(1, -1)
  const result = []
  let current = '', inQuote = false
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i]
    if (ch === '"') { inQuote = !inQuote; continue }
    if (ch === ',' && !inQuote) { result.push(current); current = ''; continue }
    current += ch
  }
  if (current) result.push(current)
  return result
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Vary', 'Origin')
}

function json(res, status, data) {
  cors(res)
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(data))
  return true
}

function notFound(res) { return json(res, 404, { error: 'Not found' }) }
function badRequest(res, msg) { return json(res, 400, { error: msg }) }
function serverError(res, err) {
  console.error('[API]', err)
  if (!res.headersSent) json(res, 500, { error: 'Internal server error' })
}

async function readBody(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', chunk => {
      size += chunk.length
      if (size > limit) { req.destroy(); reject(new Error('Body too large')) }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())) }
      catch { reject(new Error('Invalid JSON')) }
    })
    req.on('error', reject)
  })
}

function parseUrl(raw) {
  const u = new URL(raw, 'http://localhost')
  return { path: u.pathname.replace(/\/+$/, ''), params: u.searchParams }
}

// Format PostgreSQL dates to YYYY-MM-DD strings
function fmtDate(d) {
  if (!d) return d
  if (d instanceof Date) return d.toISOString().slice(0, 10)
  if (typeof d === 'string' && d.includes('T')) return d.slice(0, 10)
  return d
}

// Simple token store (in-memory, for dev; replace with JWT in production)
const sessions = new Map()

function authenticate(req) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  return sessions.get(token) || null
}

// ─── Routes ────────────────────────────────────────────

async function handleAuth(req, res, path, method) {
  if (path === '/api/auth/login' && method === 'POST') {
    const body = await readBody(req)
    if (!body.username || !body.password) return badRequest(res, 'username and password required')

    const { rows } = await query(
      'SELECT id, username, email, full_name, role, active, password_hash FROM users WHERE username = $1 OR email = $1',
      [body.username]
    )
    if (rows.length === 0) return json(res, 401, { error: 'Identifiants invalides' })

    const user = rows[0]
    // Simple hash comparison (bcrypt in prod)
    const hash = crypto.createHash('sha256').update(body.password).digest('hex')
    if (user.password_hash !== hash) return json(res, 401, { error: 'Identifiants invalides' })
    if (!user.active) return json(res, 403, { error: 'Compte désactivé' })

    const token = crypto.randomUUID()
    const userPayload = {
      id: String(user.id),
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      active: user.active,
    }
    sessions.set(token, userPayload)

    return json(res, 200, {
      user: userPayload,
      token: { access_token: token, token_type: 'Bearer' },
    })
  }

  if (path === '/api/auth/logout' && method === 'POST') {
    const auth = req.headers.authorization
    if (auth?.startsWith('Bearer ')) sessions.delete(auth.slice(7))
    return json(res, 200, { ok: true })
  }

  if (path === '/api/auth/me' && method === 'GET') {
    const user = authenticate(req)
    if (!user) return json(res, 401, { error: 'Non authentifié' })
    return json(res, 200, user)
  }

  return null
}

async function handleLiftUnits(req, res, path, method, params) {
  if (path === '/api/lift-units' && method === 'GET') {
    let sql = `SELECT id, serial_number, client, site, city, partie_fixe_id, partie_mobile_id,
                      current_config, target_config, status, install_date, last_service_date
               FROM lift_units WHERE 1=1`
    const vals = []
    if (params.get('status')) { vals.push(params.get('status')); sql += ` AND status = $${vals.length}` }
    if (params.get('client')) { vals.push(params.get('client')); sql += ` AND client ILIKE '%' || $${vals.length} || '%'` }
    sql += ' ORDER BY id'
    const { rows } = await query(sql, vals)
    return json(res, 200, rows.map(r => ({
      id: r.id, serialNumber: r.serial_number, client: r.client, site: r.site, city: r.city,
      partieFixeId: r.partie_fixe_id, partieMobileId: r.partie_mobile_id,
      currentConfig: r.current_config, targetConfig: r.target_config,
      status: r.status, installDate: fmtDate(r.install_date), lastServiceDate: fmtDate(r.last_service_date),
    })))
  }

  const match = path.match(/^\/api\/lift-units\/([^/]+)$/)
  if (match && method === 'GET') {
    const { rows } = await query('SELECT * FROM lift_units WHERE id = $1', [match[1]])
    if (rows.length === 0) return notFound(res)
    const r = rows[0]
    return json(res, 200, {
      id: r.id, serialNumber: r.serial_number, client: r.client, site: r.site, city: r.city,
      partieFixeId: r.partie_fixe_id, partieMobileId: r.partie_mobile_id,
      currentConfig: r.current_config, targetConfig: r.target_config,
      status: r.status, installDate: fmtDate(r.install_date), lastServiceDate: fmtDate(r.last_service_date),
    })
  }

  return null
}

async function handleWorkOrders(req, res, path, method, params) {
  if (path === '/api/orders' && method === 'GET') {
    let sql = `SELECT wo.*, array_agg(DISTINCT wot.technician_id) FILTER (WHERE wot.technician_id IS NOT NULL) AS technician_ids
               FROM work_orders wo
               LEFT JOIN work_order_technicians wot ON wot.work_order_id = wo.id
               WHERE 1=1`
    const vals = []
    if (params.get('status')) { vals.push(params.get('status')); sql += ` AND wo.status = $${vals.length}` }
    if (params.get('unit_id')) { vals.push(params.get('unit_id')); sql += ` AND wo.unit_id = $${vals.length}` }
    if (params.get('priority')) { vals.push(params.get('priority')); sql += ` AND wo.priority = $${vals.length}` }
    sql += ' GROUP BY wo.id ORDER BY wo.created_date DESC'
    const { rows } = await query(sql, vals)

    // Fetch operations for each OT
    const otIds = rows.map(r => r.id)
    let opsMap = {}
    if (otIds.length > 0) {
      const { rows: ops } = await query(
        `SELECT woo.*, array_agg(woofnc.fnc_id) FILTER (WHERE woofnc.fnc_id IS NOT NULL) AS fnc_ids
         FROM work_order_operations woo
         LEFT JOIN work_order_operation_fncs woofnc ON woofnc.work_order_operation_id = woo.id
         WHERE woo.work_order_id = ANY($1)
         GROUP BY woo.id
         ORDER BY woo.id`, [otIds]
      )
      for (const op of ops) {
        if (!opsMap[op.work_order_id]) opsMap[op.work_order_id] = []
        opsMap[op.work_order_id].push({
          operationId: op.operation_id,
          status: op.status,
          technicianId: op.technician_id,
          completedAt: fmtDate(op.completed_at),
          notes: op.notes,
          fncs: op.fnc_ids || [],
        })
      }
    }

    return json(res, 200, rows.map(r => ({
      id: r.id, type: r.type, status: r.status, unitId: r.unit_id,
      client: r.client, site: r.site, city: r.city,
      createdDate: fmtDate(r.created_date), plannedDate: fmtDate(r.planned_date), completedDate: fmtDate(r.completed_date),
      fromConfig: r.from_config, toConfig: r.to_config,
      technicianIds: r.technician_ids || [],
      priority: r.priority, description: r.description, notes: r.notes,
      operations: opsMap[r.id] || [],
    })))
  }

  if (path === '/api/orders' && method === 'POST') {
    const body = await readBody(req)
    const { rows } = await query(
      `INSERT INTO work_orders (id, type, status, unit_id, client, site, city, created_date, planned_date, from_config, to_config, priority, description, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [body.id, body.type, body.status || 'planifie', body.unitId, body.client, body.site, body.city,
       body.createdDate, body.plannedDate, body.fromConfig, body.toConfig, body.priority || 'normale',
       body.description, body.notes]
    )
    if (body.technicianIds?.length) {
      for (const tid of body.technicianIds) {
        await query('INSERT INTO work_order_technicians (work_order_id, technician_id) VALUES ($1, $2)', [body.id, tid])
      }
    }
    if (body.operations?.length) {
      for (const opId of body.operations) {
        await query('INSERT INTO work_order_operations (work_order_id, operation_id, status) VALUES ($1, $2, $3)', [body.id, opId, 'attente'])
      }
    }
    return json(res, 201, rows[0])
  }

  // PUT /api/orders/:id/operations/:opId
  const opMatch = path.match(/^\/api\/orders\/([^/]+)\/operations\/([^/]+)$/)
  if (opMatch && method === 'PUT') {
    const body = await readBody(req)
    const [, otId, opId] = opMatch
    await query(
      `UPDATE work_order_operations SET status=$1, completed_at=$2 WHERE work_order_id=$3 AND operation_id=$4`,
      [body.status, body.completedAt, otId, opId]
    )
    return json(res, 200, { ok: true })
  }

  const match = path.match(/^\/api\/orders\/([^/]+)$/)
  if (match && method === 'PUT') {
    const body = await readBody(req)
    const id = match[1]
    await query(
      `UPDATE work_orders SET status=$1, priority=$2, description=$3, notes=$4, planned_date=$5, completed_date=$6
       WHERE id=$7`,
      [body.status, body.priority, body.description, body.notes, body.plannedDate, body.completedDate, id]
    )
    return json(res, 200, { ok: true })
  }

  return null
}

async function handleTechnicians(req, res, path, method) {
  if (path === '/api/technicians' && method === 'GET') {
    const { rows } = await query('SELECT * FROM technicians ORDER BY id')
    return json(res, 200, rows.map(r => ({
      id: r.id, name: r.name, skill: r.skill, city: r.city,
      availability: r.availability, activeOTs: r.active_ots,
    })))
  }
  return null
}

async function handleGammes(req, res, path, method) {
  if (path === '/api/gammes' && method === 'GET') {
    const { rows } = await query(
      `SELECT g.*, array_agg(gd.filename) FILTER (WHERE gd.filename IS NOT NULL) AS documents
       FROM gammes g LEFT JOIN gamme_documents gd ON gd.gamme_id = g.id
       GROUP BY g.id ORDER BY g.id`
    )
    return json(res, 200, rows.map(r => ({
      id: r.id, title: r.title, section: r.section, discipline: r.discipline,
      configs: Array.isArray(r.configs) ? r.configs : parsePgArray(r.configs),
      category: r.category, revision: r.revision,
      documents: r.documents?.filter(Boolean) || [],
    })))
  }
  return null
}

async function handleRetrofitOps(req, res, path, method) {
  if (path === '/api/retrofit-operations' && method === 'GET') {
    const { rows } = await query('SELECT * FROM retrofit_operations ORDER BY id')
    // Fetch parts
    const { rows: parts } = await query('SELECT * FROM operation_parts ORDER BY operation_id, id')
    const partsMap = {}
    for (const p of parts) {
      if (!partsMap[p.operation_id]) partsMap[p.operation_id] = []
      partsMap[p.operation_id].push({ designation: p.designation, quantity: p.quantity, reference: p.reference })
    }
    return json(res, 200, rows.map(r => ({
      id: r.id, code: r.code, title: r.title, estimatedHours: Number(r.estimated_hours),
      personnel: r.personnel, tools: r.tools, consumables: r.consumables, steps: r.steps,
      fromConfig: r.from_config, toConfig: r.to_config,
      parts: partsMap[r.id] || [],
    })))
  }
  return null
}

async function handlePartsAlerts(req, res, path, method) {
  if (path === '/api/parts-alerts' && method === 'GET') {
    const { rows } = await query('SELECT * FROM parts_alerts ORDER BY id')
    return json(res, 200, rows.map(r => ({
      id: r.id, designation: r.designation, reference: r.reference,
      stockActuel: r.stock_actuel, stockMin: r.stock_min,
      linkedOT: r.linked_ot, site: r.site,
    })))
  }
  return null
}

async function handleFncs(req, res, path, method) {
  if (path === '/api/fncs' && method === 'GET') {
    const { rows } = await query('SELECT * FROM fncs ORDER BY date DESC')
    return json(res, 200, rows.map(r => ({
      id: r.id, workOrderId: r.work_order_id, date: fmtDate(r.date),
      partReference: r.part_reference, description: r.description, status: r.status,
      severity: r.severity, category: r.category,
    })))
  }

  if (path === '/api/fncs' && method === 'POST') {
    const body = await readBody(req)
    const { rows } = await query(
      `INSERT INTO fncs (id, work_order_id, date, part_reference, description, status, severity, category)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [body.id, body.workOrderId, body.date, body.partReference, body.description, body.status || 'ouverte', body.severity || 'Majeure', body.category || 'Autre']
    )
    return json(res, 201, rows[0])
  }

  return null
}

// ─── Server ────────────────────────────────────────────

const server = createServer(async (req, res) => {
  const method = req.method
  if (method === 'OPTIONS') { cors(res); res.writeHead(204); res.end(); return }

  const { path, params } = parseUrl(req.url)

  if (path === '/health') return json(res, 200, { status: 'ok', timestamp: new Date().toISOString() })

  try {
    const result =
      await handleAuth(req, res, path, method) ??
      await handleLiftUnits(req, res, path, method, params) ??
      await handleWorkOrders(req, res, path, method, params) ??
      await handleTechnicians(req, res, path, method) ??
      await handleGammes(req, res, path, method) ??
      await handleRetrofitOps(req, res, path, method) ??
      await handlePartsAlerts(req, res, path, method) ??
      await handleFncs(req, res, path, method)

    if (result === null) notFound(res)
  } catch (err) {
    if (!res.headersSent) serverError(res, err)
  }
})

server.listen(PORT, () => {
  console.log(`[API] LIFT GMAO API running on http://localhost:${PORT}`)
  console.log(`[API] Health check: http://localhost:${PORT}/health`)
})
