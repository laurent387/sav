// ═══════════════════════════════════════════════════════
// API — Contrôle géométrique de la rotation
//
// Le serveur stocke les mesures et l'historique tels quels : aucune mesure
// n'est jamais corrigée automatiquement. Les écarts et alertes sont recalculés
// côté client à partir des valeurs (src/geo/analysis.ts).
// ═══════════════════════════════════════════════════════
import { getClient } from './db/pool.mjs'

// Ordre d'acquisition antihoraire : 3 → 2 → 1 → 40 → … → 19
const SEQUENCE = [3, 2, 1, ...Array.from({ length: 22 }, (_, i) => 40 - i)]
const SETTINGS_KEY = 'geo_rotation_thresholds'
const CONTROL_STATUSES = ['en-cours', 'termine']
const SETTINGS_ROLES = ['admin', 'bureau-etude']

const num = v => (v === null || v === undefined ? null : Number(v))
const isThreshold = v => typeof v === 'number' && Number.isFinite(v) && v > 0 && v < 10

function mapControl(r) {
  return {
    id: r.id, unitId: r.unit_id, rame: r.rame, workOrderId: r.work_order_id,
    thresholds: { local: num(r.local_threshold), mean: num(r.mean_threshold) },
    status: r.status, notes: r.notes,
    startedBy: r.started_by, startedAt: r.started_at, completedAt: r.completed_at,
    measuredCount: r.measured_count !== undefined ? Number(r.measured_count) : undefined,
    alertCount: r.alert_count !== undefined ? Number(r.alert_count) : undefined,
    confirmedCount: r.confirmed_count !== undefined ? Number(r.confirmed_count) : undefined,
  }
}

export function createGeoHandler({ query, json, badRequest, readBody, authenticate }) {
  async function loadControl(id) {
    const { rows } = await query('SELECT * FROM geo_controls WHERE id = $1', [id])
    if (!rows.length) return null
    const [m, e] = await Promise.all([
      query('SELECT * FROM geo_measurements WHERE control_id = $1', [id]),
      query('SELECT * FROM geo_measurement_events WHERE control_id = $1 ORDER BY created_at, id', [id]),
    ])
    return {
      ...mapControl(rows[0]),
      measurements: m.rows.map(r => ({
        screw: r.screw, value: num(r.value), alertRaised: r.alert_raised, confirmed: r.confirmed,
        vigilance: r.vigilance, observation: r.observation, measuredBy: r.measured_by, measuredAt: r.measured_at,
      })),
      events: e.rows.map(r => ({
        id: r.id, screw: r.screw, kind: r.kind, oldValue: num(r.old_value), newValue: num(r.new_value),
        reason: r.reason, cleaning: r.cleaning || [], alertStatus: r.alert_status,
        observation: r.observation, technician: r.technician, createdAt: r.created_at,
      })),
    }
  }

  async function getThresholds() {
    const { rows } = await query('SELECT value FROM app_settings WHERE key = $1', [SETTINGS_KEY])
    const v = rows[0]?.value || {}
    return { local: Number(v.local ?? 0.2), mean: Number(v.mean ?? 0.2) }
  }

  return async function handleGeo(req, res, path, method) {
    if (!path.startsWith('/api/geo/')) return null
    const user = authenticate(req)
    if (!user) return json(res, 401, { error: 'Non authentifié' })
    const who = user.fullName || user.username

    // ─── Paramètres (seuils par défaut) ───
    if (path === '/api/geo/settings' && method === 'GET') {
      return json(res, 200, { thresholds: await getThresholds() })
    }
    if (path === '/api/geo/settings' && method === 'PUT') {
      if (!SETTINGS_ROLES.includes(user.role)) return json(res, 403, { error: 'Réservé à l\'administrateur et au bureau d\'études' })
      const body = await readBody(req)
      if (!isThreshold(body.local) || !isThreshold(body.mean)) return badRequest(res, 'Seuils invalides (mm, > 0)')
      await query(
        `INSERT INTO app_settings (key, value, updated_at, updated_by) VALUES ($1, $2, now(), $3)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now(), updated_by = EXCLUDED.updated_by`,
        [SETTINGS_KEY, JSON.stringify({ local: body.local, mean: body.mean }), who],
      )
      return json(res, 200, { thresholds: await getThresholds() })
    }

    // ─── Contrôles ───
    if (path === '/api/geo/controls' && method === 'GET') {
      const { rows } = await query(`
        SELECT c.*,
               (SELECT COUNT(*) FROM geo_measurements m WHERE m.control_id = c.id) AS measured_count,
               (SELECT COUNT(*) FROM geo_measurements m WHERE m.control_id = c.id AND m.alert_raised) AS alert_count,
               (SELECT COUNT(*) FROM geo_measurements m WHERE m.control_id = c.id AND m.confirmed) AS confirmed_count
        FROM geo_controls c ORDER BY c.started_at DESC, c.id DESC`)
      return json(res, 200, rows.map(mapControl))
    }
    if (path === '/api/geo/controls' && method === 'POST') {
      const body = await readBody(req)
      const rame = String(body.rame || '').trim()
      if (!rame) return badRequest(res, 'Numéro de rame obligatoire')
      const t = await getThresholds()
      const { rows } = await query(
        `INSERT INTO geo_controls (unit_id, rame, work_order_id, local_threshold, mean_threshold, notes, started_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [body.unitId || null, rame, body.workOrderId || null, t.local, t.mean, body.notes || null, who],
      )
      return json(res, 201, await loadControl(rows[0].id))
    }

    const ctrlMatch = path.match(/^\/api\/geo\/controls\/(\d+)$/)
    if (ctrlMatch && method === 'GET') {
      const c = await loadControl(Number(ctrlMatch[1]))
      return c ? json(res, 200, c) : json(res, 404, { error: 'Contrôle introuvable' })
    }
    if (ctrlMatch && method === 'PUT') {
      const id = Number(ctrlMatch[1])
      const body = await readBody(req)
      const sets = []
      const vals = []
      const push = (col, v) => { vals.push(v); sets.push(`${col} = $${vals.length}`) }
      if (body.thresholds !== undefined) {
        if (!isThreshold(body.thresholds?.local) || !isThreshold(body.thresholds?.mean)) return badRequest(res, 'Seuils invalides (mm, > 0)')
        push('local_threshold', body.thresholds.local)
        push('mean_threshold', body.thresholds.mean)
      }
      if (body.status !== undefined) {
        if (!CONTROL_STATUSES.includes(body.status)) return badRequest(res, 'Statut invalide')
        push('status', body.status)
        sets.push(body.status === 'termine' ? 'completed_at = now()' : 'completed_at = NULL')
      }
      if (body.notes !== undefined) push('notes', body.notes)
      if (sets.length) {
        vals.push(id)
        await query(`UPDATE geo_controls SET ${sets.join(', ')} WHERE id = $${vals.length}`, vals)
      }
      const c = await loadControl(id)
      return c ? json(res, 200, c) : json(res, 404, { error: 'Contrôle introuvable' })
    }

    // ─── Mesure ou correction d'une vis ───
    const measMatch = path.match(/^\/api\/geo\/controls\/(\d+)\/measurements$/)
    if (measMatch && method === 'POST') {
      const id = Number(measMatch[1])
      const body = await readBody(req)
      const screw = Number(body.screw)
      const value = Number(body.value)
      if (!SEQUENCE.includes(screw)) return badRequest(res, 'Vis hors du parcours de mesure')
      if (!Number.isFinite(value) || value < 0 || value > 1000) return badRequest(res, 'Valeur de mesure invalide')
      const flagScrews = (Array.isArray(body.flagScrews) ? body.flagScrews : []).map(Number).filter(s => SEQUENCE.includes(s))
      const cleaning = (Array.isArray(body.cleaning) ? body.cleaning : []).map(String).slice(0, 20)
      const alertStatus = typeof body.alertStatus === 'string' ? body.alertStatus.slice(0, 20) : null

      const client = await getClient()
      try {
        await client.query('BEGIN')
        const ctrl = await client.query('SELECT status FROM geo_controls WHERE id = $1 FOR UPDATE', [id])
        if (!ctrl.rows.length) { await client.query('ROLLBACK'); return json(res, 404, { error: 'Contrôle introuvable' }) }
        if (ctrl.rows[0].status === 'termine') { await client.query('ROLLBACK'); return badRequest(res, 'Contrôle clôturé : rouvrez-le pour modifier une mesure') }

        const prev = await client.query('SELECT value FROM geo_measurements WHERE control_id = $1 AND screw = $2', [id, screw])
        const isCorrection = prev.rows.length > 0
        const oldValue = isCorrection ? num(prev.rows[0].value) : null
        const reason = isCorrection ? (String(body.reason || '').trim() || 'Renouvellement de la mesure') : null

        if (isCorrection) {
          // Nouvelle valeur saisie par le technicien : la confirmation précédente ne s'applique plus.
          await client.query(
            `UPDATE geo_measurements SET value = $3, confirmed = false, vigilance = COALESCE($4, vigilance),
                    measured_by = $5, measured_at = now()
             WHERE control_id = $1 AND screw = $2`,
            [id, screw, value, typeof body.vigilance === 'boolean' ? body.vigilance : null, who],
          )
        } else {
          await client.query(
            'INSERT INTO geo_measurements (control_id, screw, value, measured_by) VALUES ($1, $2, $3, $4)',
            [id, screw, value, who],
          )
        }
        if (flagScrews.length) {
          await client.query(
            'UPDATE geo_measurements SET alert_raised = true WHERE control_id = $1 AND screw = ANY($2::smallint[])',
            [id, flagScrews],
          )
        }
        await client.query(
          `INSERT INTO geo_measurement_events (control_id, screw, kind, old_value, new_value, reason, cleaning, alert_status, technician)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [id, screw, isCorrection ? 'correction' : 'mesure', oldValue, value, reason, JSON.stringify(cleaning), alertStatus, who],
        )
        await client.query('COMMIT')
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {})
        throw err
      } finally {
        client.release()
      }
      return json(res, 200, await loadControl(id))
    }

    // ─── Confirmation malgré l'écart ───
    const confMatch = path.match(/^\/api\/geo\/controls\/(\d+)\/measurements\/(\d+)\/confirm$/)
    if (confMatch && method === 'POST') {
      const id = Number(confMatch[1])
      const screw = Number(confMatch[2])
      const body = await readBody(req)
      const observation = String(body.observation || '').trim() || null
      const { rows } = await query(
        `UPDATE geo_measurements SET confirmed = true, vigilance = true, alert_raised = true, observation = $3
         WHERE control_id = $1 AND screw = $2 RETURNING value`,
        [id, screw, observation],
      )
      if (!rows.length) return json(res, 404, { error: 'Mesure introuvable' })
      await query(
        `INSERT INTO geo_measurement_events (control_id, screw, kind, new_value, reason, alert_status, observation, technician)
         VALUES ($1, $2, 'confirmation', $3, 'Mesure confirmée malgré l''écart', 'confirme', $4, $5)`,
        [id, screw, rows[0].value, observation, who],
      )
      return json(res, 200, await loadControl(id))
    }

    return null
  }
}
