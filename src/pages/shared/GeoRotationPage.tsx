import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal } from '../../components/Modal'
import { useGmaoData } from '../../contexts/DataContext'
import { ApiService } from '../../services/api'
import type { UserRole } from '../../types/auth'
import {
  SEQUENCE, MEASURED_SCREWS, STATUS_META, ALERT_MESSAGE, CLEANING_CHECKLIST,
  analyzeControl, analyzeScrew, retrospectiveCheck, hasUnexplainedAlert, summarize, valuesMap, fmtMm, fmtSigned,
  type Measurement, type MeasurementEvent, type ScrewAnalysis, type Thresholds, type VerificationStatus,
} from '../../geo/analysis'
import { RotationDial } from '../../geo/RotationDial'
import { ProfileChart } from '../../geo/ProfileChart'
import '../../geo/geo.css'

interface ControlSummaryRow {
  id: number
  unitId: string | null
  rame: string
  workOrderId: string | null
  thresholds: Thresholds
  status: 'en-cours' | 'termine'
  startedBy: string | null
  startedAt: string
  completedAt: string | null
  notes: string | null
  measuredCount?: number
  alertCount?: number
  confirmedCount?: number
}

interface Control extends ControlSummaryRow {
  measurements: Measurement[]
  events: MeasurementEvent[]
}

const SETTINGS_ROLES: UserRole[] = ['admin', 'bureau-etude']

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

function parseMm(raw: string): number | null {
  const v = Number(raw.replace(',', '.').trim())
  return raw.trim() !== '' && Number.isFinite(v) && v >= 0 ? v : null
}

function StatusPill({ status }: { status: VerificationStatus }) {
  return (
    <span className="geo-status" style={{ ['--geo-color' as string]: STATUS_META[status].color }}>
      <span className="geo-status-dot" />{STATUS_META[status].label}
    </span>
  )
}

function Legend() {
  return (
    <div className="geo-legend">
      {(Object.keys(STATUS_META) as VerificationStatus[]).map(s => (
        <span key={s}><span className="geo-status-dot" style={{ background: STATUS_META[s].color }} />{STATUS_META[s].label}</span>
      ))}
      <p className="geo-disclaimer">Ces couleurs sont des statuts de vérification des relevés, pas une validation de conformité mécanique.</p>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// Page : liste des contrôles + paramètres
// ═══════════════════════════════════════════════════════

export function GeoRotationPage({ role }: { role: UserRole }) {
  const { liftUnits, workOrders } = useGmaoData()
  const [controls, setControls] = useState<ControlSummaryRow[]>([])
  const [openId, setOpenId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ rame: '', unitId: '', workOrderId: '' })
  const [settings, setSettings] = useState<Thresholds | null>(null)
  const [settingsDraft, setSettingsDraft] = useState({ local: '', mean: '' })
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null)
  const canEditSettings = SETTINGS_ROLES.includes(role)

  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let alive = true
    Promise.all([ApiService.getGeoControls<ControlSummaryRow[]>(), ApiService.getGeoSettings()])
      .then(([list, s]) => {
        if (!alive) return
        setControls(list)
        setSettings(s.thresholds)
        setSettingsDraft({ local: String(s.thresholds.local), mean: String(s.thresholds.mean) })
        setError(null)
      })
      .catch(e => { if (alive) setError(e instanceof Error ? e.message : 'API indisponible') })
    return () => { alive = false }
  }, [reloadKey])

  async function handleCreate() {
    if (!form.rame.trim()) return
    try {
      const c = await ApiService.createGeoControl<Control>({
        rame: form.rame.trim(), unitId: form.unitId || undefined, workOrderId: form.workOrderId || undefined,
      })
      setShowCreate(false)
      setForm({ rame: '', unitId: '', workOrderId: '' })
      setOpenId(c.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Création impossible')
    }
  }

  async function saveSettings() {
    const local = parseMm(settingsDraft.local)
    const mean = parseMm(settingsDraft.mean)
    if (!local || !mean) { setSettingsMsg('Seuils invalides'); return }
    try {
      const s = await ApiService.updateGeoSettings({ local, mean })
      setSettings(s.thresholds)
      setSettingsMsg('Seuils enregistrés — ils s\'appliquent aux nouveaux contrôles.')
    } catch (e) {
      setSettingsMsg(e instanceof Error ? e.message : 'Enregistrement impossible')
    }
  }

  if (openId !== null) {
    return <ControlView controlId={openId} role={role} onBack={() => { setOpenId(null); setReloadKey(k => k + 1) }} />
  }

  return (
    <div className="page-content geo-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Rotation — contrôle géométrique</p>
          <h1 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)' }}>Contrôles de la couronne</h1>
        </div>
        <div className="header-actions">
          <button type="button" className="primary-action" onClick={() => setShowCreate(true)}>+ Nouveau contrôle</button>
        </div>
      </div>

      {error && <section className="panel geo-error">⚠️ {error}</section>}

      <section className="panel">
        {controls.length === 0 ? (
          <p className="geo-empty">Aucun contrôle pour l'instant. Créez-en un pour commencer le relevé des vis.</p>
        ) : (
          <div className="geo-table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Rame</th><th>Unité</th><th>OT</th><th>Début</th><th>Technicien</th><th>Avancement</th><th>Alertes</th><th>Confirmés</th><th>Statut</th></tr>
              </thead>
              <tbody>
                {controls.map(c => (
                  <tr key={c.id} className="clickable-row" onClick={() => setOpenId(c.id)}>
                    <td className="row-id">{c.rame}</td>
                    <td>{c.unitId ?? '—'}</td>
                    <td>{c.workOrderId ?? '—'}</td>
                    <td>{fmtDateTime(c.startedAt)}</td>
                    <td>{c.startedBy ?? '—'}</td>
                    <td>{c.measuredCount ?? 0}/{MEASURED_SCREWS.size}</td>
                    <td>{c.alertCount ? <span className="pill warning">{c.alertCount}</span> : '0'}</td>
                    <td>{c.confirmedCount ? <span className="pill danger">{c.confirmedCount}</span> : '0'}</td>
                    <td><span className={`pill ${c.status === 'termine' ? 'neutral' : 'accent'}`}>{c.status === 'termine' ? 'Clôturé' : 'En cours'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <h2 className="geo-h2">Paramètres de détection</h2>
        <p className="geo-disclaimer">
          Ces seuils sont une aide à la détection des mesures atypiques, <strong>pas une tolérance constructeur</strong>.
          Ils sont copiés dans chaque nouveau contrôle.
        </p>
        <div className="form-grid">
          <div className="form-field">
            <label>Seuil local entre deux vis adjacentes (mm)</label>
            <input inputMode="decimal" value={settingsDraft.local} disabled={!canEditSettings}
              onChange={e => setSettingsDraft(d => ({ ...d, local: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>Seuil d'écart à la moyenne des deux voisines (mm)</label>
            <input inputMode="decimal" value={settingsDraft.mean} disabled={!canEditSettings}
              onChange={e => setSettingsDraft(d => ({ ...d, mean: e.target.value }))} />
          </div>
        </div>
        {canEditSettings ? (
          <div className="form-actions">
            <button type="button" className="secondary-action" onClick={saveSettings}>Enregistrer les seuils</button>
            {settingsMsg && <span className="geo-muted">{settingsMsg}</span>}
          </div>
        ) : (
          <p className="geo-muted">Seuils actuels : {fmtMm(settings?.local ?? null, 2)} mm / {fmtMm(settings?.mean ?? null, 2)} mm — modifiables par l'administrateur ou le bureau d'études.</p>
        )}
      </section>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouveau contrôle géométrique">
        <div className="form-grid">
          <div className="form-field">
            <label>Rame *</label>
            <input value={form.rame} placeholder="ex. 1009" onChange={e => setForm(f => ({ ...f, rame: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>Unité LIFT</label>
            <select value={form.unitId} onChange={e => setForm(f => ({ ...f, unitId: e.target.value }))}>
              <option value="">— Non renseignée —</option>
              {liftUnits.map(u => <option key={u.id} value={u.id}>{u.id} · {u.site}</option>)}
            </select>
          </div>
          <div className="form-field full-width">
            <label>OT lié</label>
            <select value={form.workOrderId} onChange={e => setForm(f => ({ ...f, workOrderId: e.target.value }))}>
              <option value="">— Aucun OT —</option>
              {workOrders.filter(o => !form.unitId || o.unitId === form.unitId).map(o => (
                <option key={o.id} value={o.id}>{o.id} · {o.site}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="geo-muted">Parcours de mesure (sens antihoraire) : {SEQUENCE.join(' → ')}.</p>
        <div className="form-actions">
          <button type="button" className="secondary-action" onClick={() => setShowCreate(false)}>Annuler</button>
          <button type="button" className="primary-action" disabled={!form.rame.trim()} onClick={handleCreate}>Démarrer le contrôle</button>
        </div>
      </Modal>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// Contrôle : saisie guidée, alertes, historique, synthèse
// ═══════════════════════════════════════════════════════

type AlertState = {
  screw: number
  value: number
  analysis: ScrewAnalysis
  retro: ScrewAnalysis | null
  step: 'alert' | 'remeasure' | 'cleaning' | 'confirm'
}

function ControlView({ controlId, role, onBack }: { controlId: number; role: UserRole; onBack: () => void }) {
  const [control, setControl] = useState<Control | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [input, setInput] = useState('')
  const [revisit, setRevisit] = useState<number | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [alert, setAlert] = useState<AlertState | null>(null)
  const [modalValue, setModalValue] = useState('')
  const [cleaningDone, setCleaningDone] = useState<Set<string>>(new Set())
  const [observation, setObservation] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [thrDraft, setThrDraft] = useState<{ local: string; mean: string } | null>(null)
  const [revisitCleaning, setRevisitCleaning] = useState<Set<string>>(new Set())
  const [revisitReason, setRevisitReason] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const canEditThresholds = SETTINGS_ROLES.includes(role)

  useEffect(() => {
    ApiService.getGeoControl<Control>(controlId)
      .then(c => { setControl(c); setError(null) })
      .catch(e => setError(e instanceof Error ? e.message : 'Chargement impossible'))
  }, [controlId])

  const measurements = useMemo(() => control?.measurements ?? [], [control])
  const events = useMemo(() => control?.events ?? [], [control])
  const thresholds = useMemo(() => control?.thresholds ?? { local: 0.2, mean: 0.2 }, [control])
  // Recalcul complet (différentiels, statuts, statistiques) à chaque changement.
  const analysis = useMemo(() => analyzeControl(measurements, events, thresholds), [measurements, events, thresholds])
  const summary = useMemo(() => summarize(measurements, events, analysis), [measurements, events, analysis])
  const values = useMemo(() => valuesMap(measurements), [measurements])
  const byScrew = useMemo(() => new Map(measurements.map(m => [m.screw, m])), [measurements])
  const vigilance = useMemo(() => new Set(measurements.filter(m => m.vigilance).map(m => m.screw)), [measurements])
  const closed = control?.status === 'termine'
  const target = revisit ?? analysis.nextToMeasure

  useEffect(() => { if (!alert) inputRef.current?.focus() }, [target, alert])

  if (error && !control) return <div className="page-content"><section className="panel geo-error">⚠️ {error}</section></div>
  if (!control) return <div className="page-content"><p className="geo-muted">Chargement…</p></div>

  async function save(screw: number, value: number, opts: { reason?: string; cleaning?: string[] } = {}) {
    if (!control) return
    const isCorrection = byScrew.has(screw)
    const nextValues = new Map(values).set(screw, value)
    // Les écarts dus uniquement à une voisine déjà confirmée ne relancent pas d'alerte.
    const confirmedSet = new Set(measurements.filter(m => m.confirmed && m.screw !== screw).map(m => m.screw))
    const raw = analyzeScrew(screw, nextValues, thresholds)
    const a = { ...raw, alert: hasUnexplainedAlert(raw, confirmedSet, thresholds) }
    const retroRaw = retrospectiveCheck(screw, nextValues, thresholds)
    const retro = retroRaw && !confirmedSet.has(retroRaw.screw) && hasUnexplainedAlert(retroRaw, confirmedSet, thresholds) ? retroRaw : null
    const wasFlagged = byScrew.get(screw)?.alertRaised ?? false
    const flagScrews = [...(a.alert ? [screw] : []), ...(retro ? [retro.screw] : [])]
    const alertStatus = a.alert ? 'a-verifier' : isCorrection && wasFlagged ? 'resolu' : 'ok'

    setBusy(true)
    try {
      const updated = await ApiService.saveGeoMeasurement<Control>(control.id, {
        screw, value, flagScrews, alertStatus,
        reason: isCorrection ? opts.reason ?? 'Renouvellement de la mesure' : undefined,
        cleaning: opts.cleaning,
        vigilance: isCorrection && !a.alert ? false : undefined,
      })
      setControl(updated)
      setError(null)
      setInput('')
      setModalValue('')
      setCleaningDone(new Set())
      setObservation('')
      if (a.alert || retro) {
        setAlert({ screw, value, analysis: a, retro, step: 'alert' })
      } else {
        setAlert(null)
        if (revisit === screw) {
          setRevisit(null)
          setRevisitCleaning(new Set())
          setRevisitReason('')
          setNotice(isCorrection && wasFlagged
            ? `Vis ${screw} : mesure renouvelée, alerte résolue. Reprise du parcours normal.`
            : `Vis ${screw} : mesure renouvelée. Reprise du parcours normal.`)
        } else {
          setNotice(null)
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible')
    } finally {
      setBusy(false)
    }
  }

  async function confirmDespite() {
    if (!control || !alert) return
    setBusy(true)
    try {
      const updated = await ApiService.confirmGeoMeasurement<Control>(control.id, alert.screw, observation)
      setControl(updated)
      if (revisit === alert.screw) setRevisit(null)
      setNotice(`Vis ${alert.screw} : mesure confirmée malgré l'écart, indicateur de vigilance posé.`)
      setAlert(null)
      setObservation('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Confirmation impossible')
    } finally {
      setBusy(false)
    }
  }

  function submitMain() {
    const v = parseMm(input)
    if (v === null || target === null) return
    if (revisit === null) { save(target, v); return }
    const reason = revisitReason.trim()
      || (revisitCleaning.size ? 'Nettoyage et renouvellement de la mesure' : 'Renouvellement de la mesure')
    save(target, v, { reason, cleaning: [...revisitCleaning] })
  }

  function startRevisit(screw: number) {
    setRevisit(screw)
    setRevisitCleaning(new Set())
    setRevisitReason('')
    setSelected(null)
    setAlert(null)
    setInput('')
    setNotice(`Recontrôle temporaire de la vis ${screw}. Le parcours normal reprendra ensuite.`)
  }

  async function setStatus(status: 'en-cours' | 'termine') {
    if (!control) return
    setControl(await ApiService.updateGeoControl<Control>(control.id, { status }))
  }

  async function saveThresholds() {
    if (!control || !thrDraft) return
    const local = parseMm(thrDraft.local)
    const mean = parseMm(thrDraft.mean)
    if (!local || !mean) return
    setControl(await ApiService.updateGeoControl<Control>(control.id, { thresholds: { local, mean } }))
    setThrDraft(null)
  }

  const selM = selected !== null ? byScrew.get(selected) : undefined
  const selA = selected !== null ? analysis.byScrew.get(selected) : undefined
  const selEvents = selected !== null ? events.filter(e => e.screw === selected) : []

  return (
    <div className="page-content geo-page">
      <div className="page-header">
        <div>
          <button type="button" className="btn-back geo-no-print" onClick={onBack}>← Retour aux contrôles</button>
          <p className="eyebrow">Contrôle géométrique de la rotation{control.unitId ? ` — ${control.unitId}` : ''}{control.workOrderId ? ` — ${control.workOrderId}` : ''}</p>
          <h1 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)' }}>Rame {control.rame}</h1>
          <p className="geo-muted">Démarré le {fmtDateTime(control.startedAt)} par {control.startedBy ?? '—'}{closed ? ` · clôturé le ${fmtDateTime(control.completedAt)}` : ''}</p>
        </div>
        <div className="header-actions geo-no-print">
          <button type="button" className="secondary-action" onClick={() => window.print()}>Imprimer le rapport</button>
          {closed
            ? <button type="button" className="secondary-action" onClick={() => setStatus('en-cours')}>Rouvrir</button>
            : <button type="button" className="primary-action" onClick={() => setStatus('termine')}>Clôturer le contrôle</button>}
        </div>
      </div>

      {error && <section className="panel geo-error">⚠️ {error}</section>}

      <div className="geo-thresholds panel">
        <span>Seuil local : <strong>{fmtMm(thresholds.local, 2)} mm</strong></span>
        <span>Seuil écart à la moyenne : <strong>{fmtMm(thresholds.mean, 2)} mm</strong></span>
        <span className="geo-muted">Aide à la détection — pas une tolérance constructeur.</span>
        {canEditThresholds && !closed && !thrDraft && (
          <button type="button" className="geo-link geo-no-print" onClick={() => setThrDraft({ local: String(thresholds.local), mean: String(thresholds.mean) })}>Modifier</button>
        )}
        {thrDraft && (
          <span className="geo-thr-edit">
            <input inputMode="decimal" value={thrDraft.local} onChange={e => setThrDraft({ ...thrDraft, local: e.target.value })} aria-label="Seuil local" />
            <input inputMode="decimal" value={thrDraft.mean} onChange={e => setThrDraft({ ...thrDraft, mean: e.target.value })} aria-label="Seuil moyenne" />
            <button type="button" className="secondary-action" onClick={saveThresholds}>OK</button>
            <button type="button" className="geo-link" onClick={() => setThrDraft(null)}>Annuler</button>
          </span>
        )}
      </div>

      <div className="geo-layout">
        <section className="panel geo-entry geo-no-print">
          {closed ? (
            <p className="geo-muted">Contrôle clôturé. Rouvrez-le pour saisir ou renouveler une mesure.</p>
          ) : target === null ? (
            <>
              <h2 className="geo-h2">Parcours terminé</h2>
              <p className="geo-muted">Les {MEASURED_SCREWS.size} vis du parcours sont mesurées. Cliquez sur une vis pour consulter son historique ou renouveler sa mesure.</p>
            </>
          ) : (
            <>
              {revisit !== null && (
                <div className="geo-revisit">
                  Recontrôle de la vis <strong>{revisit}</strong> (mesure actuelle {fmtMm(values.get(revisit) ?? null)} mm)
                  <button type="button" className="geo-link" onClick={() => { setRevisit(null); setNotice(null) }}>Reprendre le parcours</button>
                </div>
              )}
              {revisit !== null && values.has(revisit) && (
                <details className="geo-revisit-details">
                  <summary>Nettoyage effectué et motif ({revisitCleaning.size} opération{revisitCleaning.size > 1 ? 's' : ''})</summary>
                  <div className="geo-check-grid">
                    {CLEANING_CHECKLIST.filter(c => c !== 'Renouveler la mesure').map(c => (
                      <label key={c}>
                        <input type="checkbox" checked={revisitCleaning.has(c)} onChange={() => setRevisitCleaning(prev => {
                          const n = new Set(prev)
                          if (n.has(c)) n.delete(c)
                          else n.add(c)
                          return n
                        })} /> {c}
                      </label>
                    ))}
                  </div>
                  <input className="geo-reason" value={revisitReason} onChange={e => setRevisitReason(e.target.value)}
                    placeholder="Motif (facultatif) — par défaut : renouvellement / nettoyage et renouvellement" />
                </details>
              )}
              <p className="eyebrow">{revisit !== null ? 'Vis à recontrôler' : 'Prochaine vis à mesurer'}</p>
              <div className="geo-target">Vis {target}</div>
              <p className="geo-muted">
                Voisines : {(() => {
                  const a = analysis.byScrew.get(target)
                  const left = a?.prevScrew != null ? `vis ${a.prevScrew} (${fmtMm(a.prevValue)} mm)` : '—'
                  const right = a?.nextScrew != null ? `vis ${a.nextScrew} (${fmtMm(a.nextValue)} mm)` : '—'
                  return `${left} · ${right}`
                })()}
              </p>
              <form className="geo-input-row" onSubmit={e => { e.preventDefault(); submitMain() }}>
                <input ref={inputRef} inputMode="decimal" placeholder="Mesure en mm, ex. 3,95" value={input}
                  onChange={e => setInput(e.target.value)} aria-label={`Mesure de la vis ${target} en mm`} />
                <button type="submit" className="primary-action" disabled={busy || parseMm(input) === null}>Enregistrer</button>
              </form>
            </>
          )}
          {notice && <p className="geo-notice">{notice}</p>}
        </section>

        <section className="panel geo-dial-panel">
          <RotationDial status={analysis.status} values={values} vigilance={vigilance} target={closed ? null : target} selected={selected} onSelect={setSelected} />
        </section>
      </div>

      <Legend />

      <section className="panel">
        <h2 className="geo-h2">Profil des mesures (ordre d'acquisition)</h2>
        <ProfileChart status={analysis.status} values={values} selected={selected} onSelect={setSelected} />
      </section>

      <section className="panel">
        <h2 className="geo-h2">Relevé et écarts</h2>
        <div className="geo-table-wrap">
          <table className="data-table geo-table">
            <thead>
              <tr><th>Vis</th><th>Mesure (mm)</th><th>Écart vis préc.</th><th>Écart vis suiv.</th><th>Écart / moyenne voisines</th><th>Statut</th><th /></tr>
            </thead>
            <tbody>
              {SEQUENCE.map(s => {
                const a = analysis.byScrew.get(s)
                const m = byScrew.get(s)
                const st = analysis.status.get(s) ?? 'non-mesure'
                const over = (v: number | null, lim: number) => v !== null && Math.abs(v) > lim + 1e-9
                return (
                  <tr key={s} className="clickable-row" onClick={() => setSelected(s)}>
                    <td className="row-id">{s}{m?.vigilance && <span className="geo-vig" title="Vigilance"> ⚑</span>}</td>
                    <td>{fmtMm(a?.value ?? null)}</td>
                    <td className={over(a?.signedPrev ?? null, thresholds.local) ? 'geo-over' : ''}>{fmtSigned(a?.signedPrev ?? null)}</td>
                    <td className={over(a?.signedNext ?? null, thresholds.local) ? 'geo-over' : ''}>{fmtSigned(a?.signedNext ?? null)}</td>
                    <td className={over(a?.meanDev ?? null, thresholds.mean) ? 'geo-over' : ''}>{fmtSigned(a?.meanDev ?? null)}</td>
                    <td><StatusPill status={st} /></td>
                    <td className="geo-no-print"><button type="button" className="geo-link" onClick={e => { e.stopPropagation(); setSelected(s) }}>Historique</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel geo-summary">
        <h2 className="geo-h2">Synthèse du contrôle</h2>
        <div className="kpi-grid kpi-grid-4">
          <div className="kpi-card"><p className="kpi-label">Mesures atypiques détectées</p><p className="kpi-value">{summary.atypicalDetected}</p></div>
          <div className="kpi-card"><p className="kpi-label">Mesures renouvelées</p><p className="kpi-value">{summary.remeasured}</p></div>
          <div className="kpi-card"><p className="kpi-label">Alertes résolues après nettoyage</p><p className="kpi-value">{summary.resolvedAfterCleaning}</p></div>
          <div className="kpi-card"><p className="kpi-label">Écarts importants confirmés</p><p className="kpi-value">{summary.confirmed}</p></div>
        </div>

        <h3 className="geo-h3">Vis nécessitant une attention particulière</h3>
        {summary.attention.length === 0 ? <p className="geo-muted">Aucune.</p> : (
          <ul className="geo-attention">
            {summary.attention.map(x => (
              <li key={x.screw}>
                <button type="button" className="geo-link" onClick={() => setSelected(x.screw)}>Vis {x.screw}</button>
                {' '}<StatusPill status={x.status} />{x.vigilance && ' ⚑ vigilance'}{x.observation ? ` — « ${x.observation} »` : ''}
              </li>
            ))}
          </ul>
        )}

        <h3 className="geo-h3">Historique des corrections</h3>
        {summary.corrections.length === 0 ? <p className="geo-muted">Aucune correction.</p> : (
          <div className="geo-table-wrap">
            <table className="data-table">
              <thead><tr><th>Vis</th><th>Initiale</th><th>Nouvelle</th><th>Correction</th><th>Date</th><th>Motif</th><th>Nettoyage</th><th>Technicien</th><th>Statut</th></tr></thead>
              <tbody>
                {summary.corrections.map(e => (
                  <tr key={e.id}>
                    <td className="row-id">{e.screw}</td>
                    <td>{fmtMm(e.oldValue)}</td>
                    <td>{fmtMm(e.newValue)}</td>
                    <td>{e.oldValue !== null && e.newValue !== null ? fmtSigned(Math.round((e.newValue - e.oldValue) * 1000) / 1000) : '—'}</td>
                    <td>{fmtDateTime(e.createdAt)}</td>
                    <td>{e.reason ?? '—'}</td>
                    <td>{e.cleaning.length ? e.cleaning.join(' ; ') : '—'}</td>
                    <td>{e.technician ?? '—'}</td>
                    <td>{e.alertStatus ? <StatusPill status={(e.alertStatus === 'resolu' || e.alertStatus === 'a-verifier' || e.alertStatus === 'confirme' || e.alertStatus === 'ok') ? e.alertStatus : 'ok'} /> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="geo-disclaimer">
          Une alerte signale une mesure à vérifier : elle n'est jamais, à elle seule, la preuve d'un défaut mécanique.
          Aucune mesure n'est corrigée automatiquement.
        </p>
      </section>

      {/* ═══ Fenêtre d'alerte ═══ */}
      <Modal open={alert !== null} onClose={() => setAlert(null)} wide
        title={alert ? (alert.analysis.alert ? `Variation importante — vis ${alert.screw}` : `Contrôle rétrospectif — vis ${alert.retro?.screw}`) : ''}>
        {alert && (
          <div className="geo-alert">
            {alert.analysis.alert && (
              <>
                <p className="geo-alert-msg">{ALERT_MESSAGE}</p>
                <table className="data-table geo-alert-table">
                  <tbody>
                    <tr><th>Vis concernée</th><td>{alert.screw}</td></tr>
                    <tr><th>Nouvelle mesure</th><td><strong>{fmtMm(alert.value)} mm</strong></td></tr>
                    <tr><th>Vis précédente</th><td>{alert.analysis.prevScrew !== null && alert.analysis.prevValue !== null
                      ? <>vis {alert.analysis.prevScrew} : {fmtMm(alert.analysis.prevValue)} mm — écart <span className={(alert.analysis.absPrev ?? 0) > thresholds.local + 1e-9 ? 'geo-over' : ''}>{fmtSigned(alert.analysis.signedPrev)} mm (|{fmtMm(alert.analysis.absPrev)}|)</span></>
                      : 'non mesurée'}</td></tr>
                    <tr><th>Vis suivante</th><td>{alert.analysis.nextScrew !== null && alert.analysis.nextValue !== null
                      ? <>vis {alert.analysis.nextScrew} : {fmtMm(alert.analysis.nextValue)} mm — écart <span className={(alert.analysis.absNext ?? 0) > thresholds.local + 1e-9 ? 'geo-over' : ''}>{fmtSigned(alert.analysis.signedNext)} mm (|{fmtMm(alert.analysis.absNext)}|)</span></>
                      : 'non mesurée'}</td></tr>
                    <tr><th>Moyenne des voisines</th><td>{alert.analysis.neighborMean !== null
                      ? <>{fmtMm(alert.analysis.neighborMean)} mm — écart <span className={alert.analysis.meanExceeded ? 'geo-over' : ''}>{fmtSigned(alert.analysis.meanDev)} mm</span></>
                      : 'indisponible (une seule voisine mesurée)'}</td></tr>
                    <tr><th>Seuils configurés</th><td>local {fmtMm(thresholds.local, 2)} mm · moyenne {fmtMm(thresholds.mean, 2)} mm</td></tr>
                  </tbody>
                </table>
              </>
            )}

            {alert.retro && (
              <div className="geo-retro">
                <strong>Contrôle rétrospectif :</strong> la vis {alert.retro.screw} ({fmtMm(alert.retro.value)} mm) présente un écart de{' '}
                <strong>{fmtSigned(alert.retro.meanDev)} mm</strong> par rapport à la moyenne de ses deux voisines ({fmtMm(alert.retro.neighborMean)} mm).
                Elle forme un {(alert.retro.meanDev ?? 0) > 0 ? 'pic' : 'creux'} isolé : il est conseillé de la contrôler à nouveau.
                <div className="form-actions">
                  <button type="button" className="secondary-action" onClick={() => startRevisit(alert.retro!.screw)}>Recontrôler la vis {alert.retro.screw}</button>
                  {!alert.analysis.alert && <button type="button" className="geo-link" onClick={() => setAlert(null)}>Continuer le parcours</button>}
                </div>
              </div>
            )}

            {alert.analysis.alert && alert.step === 'alert' && (
              <>
                <h3 className="geo-h3">Procédure de vérification</h3>
                <ol className="geo-checklist">{CLEANING_CHECKLIST.map(c => <li key={c}>{c}</li>)}</ol>
                <div className="geo-actions">
                  <button type="button" className="secondary-action" onClick={() => setAlert({ ...alert, step: 'remeasure' })}>Refaire la mesure</button>
                  <button type="button" className="primary-action" onClick={() => setAlert({ ...alert, step: 'cleaning' })}>Nettoyage effectué – Nouvelle mesure</button>
                  <button type="button" className="geo-danger" onClick={() => setAlert({ ...alert, step: 'confirm' })}>Confirmer la mesure malgré l'écart</button>
                </div>
              </>
            )}

            {alert.step === 'cleaning' && (
              <>
                <h3 className="geo-h3">Opérations de nettoyage effectuées</h3>
                <div className="geo-check-grid">
                  {CLEANING_CHECKLIST.filter(c => c !== 'Renouveler la mesure').map(c => (
                    <label key={c}>
                      <input type="checkbox" checked={cleaningDone.has(c)} onChange={() => setCleaningDone(prev => {
                        const n = new Set(prev)
                        if (n.has(c)) n.delete(c)
                        else n.add(c)
                        return n
                      })} /> {c}
                    </label>
                  ))}
                </div>
              </>
            )}

            {(alert.step === 'remeasure' || alert.step === 'cleaning') && (
              <form className="geo-input-row" onSubmit={e => {
                e.preventDefault()
                const v = parseMm(modalValue)
                if (v === null) return
                save(alert.screw, v, alert.step === 'cleaning'
                  ? { reason: 'Nettoyage et renouvellement de la mesure', cleaning: [...cleaningDone] }
                  : { reason: 'Renouvellement de la mesure' })
              }}>
                <input autoFocus inputMode="decimal" placeholder={`Nouvelle mesure vis ${alert.screw} (mm)`} value={modalValue}
                  onChange={e => setModalValue(e.target.value)} aria-label="Nouvelle mesure en mm" />
                <button type="submit" className="primary-action" disabled={busy || parseMm(modalValue) === null || (alert.step === 'cleaning' && cleaningDone.size === 0)}>
                  Enregistrer la nouvelle mesure
                </button>
                <button type="button" className="geo-link" onClick={() => setAlert({ ...alert, step: 'alert' })}>Retour</button>
              </form>
            )}

            {alert.step === 'confirm' && (
              <>
                <p className="geo-muted">La mesure de {fmtMm(alert.value)} mm sera conservée telle quelle, avec un indicateur de vigilance sur la vis {alert.screw}.</p>
                <div className="form-field full-width">
                  <label>Observation</label>
                  <textarea rows={3} value={observation} onChange={e => setObservation(e.target.value)}
                    placeholder="ex. Mesure renouvelée 2 fois après nettoyage, écart reproductible." />
                </div>
                <div className="geo-actions">
                  <button type="button" className="geo-link" onClick={() => setAlert({ ...alert, step: 'alert' })}>Retour</button>
                  <button type="button" className="geo-danger" disabled={busy} onClick={confirmDespite}>Confirmer la mesure malgré l'écart</button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* ═══ Historique d'une vis ═══ */}
      <Modal open={selected !== null && alert === null} onClose={() => setSelected(null)} title={`Vis ${selected ?? ''}`} wide>
        {selected !== null && (
          <div className="geo-alert">
            <p><StatusPill status={analysis.status.get(selected) ?? 'non-mesure'} />{selM?.vigilance && <strong className="geo-vig"> ⚑ Vigilance</strong>}</p>
            {selM ? (
              <table className="data-table geo-alert-table">
                <tbody>
                  <tr><th>Mesure actuelle</th><td><strong>{fmtMm(selM.value)} mm</strong> — {fmtDateTime(selM.measuredAt)} par {selM.measuredBy ?? '—'}</td></tr>
                  <tr><th>Écart vis préc. ({selA?.prevScrew ?? '—'})</th><td>{fmtSigned(selA?.signedPrev ?? null)} mm</td></tr>
                  <tr><th>Écart vis suiv. ({selA?.nextScrew ?? '—'})</th><td>{fmtSigned(selA?.signedNext ?? null)} mm</td></tr>
                  <tr><th>Écart / moyenne voisines</th><td>{fmtSigned(selA?.meanDev ?? null)} mm</td></tr>
                  {selM.observation && <tr><th>Observation</th><td>{selM.observation}</td></tr>}
                </tbody>
              </table>
            ) : <p className="geo-muted">Vis non mesurée.</p>}

            <h3 className="geo-h3">Historique</h3>
            {selEvents.length === 0 ? <p className="geo-muted">Aucun événement.</p> : (
              <ul className="geo-history">
                {selEvents.map(e => (
                  <li key={e.id}>
                    <span className="geo-muted">{fmtDateTime(e.createdAt)} · {e.technician ?? '—'}</span><br />
                    {e.kind === 'mesure' && <>Mesure initiale : <strong>{fmtMm(e.newValue)} mm</strong></>}
                    {e.kind === 'correction' && <>Correction : {fmtMm(e.oldValue)} → <strong>{fmtMm(e.newValue)} mm</strong> ({e.oldValue !== null && e.newValue !== null ? fmtSigned(Math.round((e.newValue - e.oldValue) * 1000) / 1000) : '—'} mm) — {e.reason}</>}
                    {e.kind === 'confirmation' && <>Mesure confirmée malgré l'écart{e.observation ? ` — « ${e.observation} »` : ''}</>}
                    {e.cleaning.length > 0 && <><br /><span className="geo-muted">Nettoyage : {e.cleaning.join(' ; ')}</span></>}
                  </li>
                ))}
              </ul>
            )}
            {!closed && MEASURED_SCREWS.has(selected) && (
              <div className="geo-actions">
                <button type="button" className="primary-action" onClick={() => startRevisit(selected)}>
                  {selM ? 'Renouveler la mesure' : 'Mesurer cette vis'}
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
