import { startTransition, useDeferredValue, useState } from 'react'
import { Modal } from '../../components/Modal'
import {
  workOrders as initialWorkOrders, technicians, retrofitOperations, liftUnits,
  type WorkOrder, type OTStatus, type OTType, type OTPriority, type OpStatus, type Configuration,
} from '../../data'

function otStatusLabel(s: OTStatus) {
  const map: Record<OTStatus, string> = {
    planifie: 'Planifié', 'en-cours': 'En cours', 'en-attente-pieces': 'Attente pièces',
    termine: 'Terminé', annule: 'Annulé',
  }
  return map[s]
}

function otTypeLabel(t: OTType) {
  const map: Record<OTType, string> = {
    retrofit: 'Retrofit', correctif: 'Correctif', preventif: 'Préventif', inspection: 'Inspection',
  }
  return map[t]
}

function opStatusLabel(s: OpStatus) {
  const map: Record<OpStatus, string> = {
    attente: 'Attente', 'en-cours': 'En cours', fait: 'Fait', bloque: 'Bloqué',
  }
  return map[s]
}

function configPill(c: Configuration) {
  const map: Record<Configuration, string> = {
    "E'": 'danger', F: 'neutral', G: 'neutral', H: 'accent', I: 'accent',
  }
  return `pill ${map[c]}`
}

export function BEOrdresTravail() {
  const [workOrders, setWorkOrders] = useState(initialWorkOrders)
  const [statusFilter, setStatusFilter] = useState('Tous')
  const [typeFilter, setTypeFilter] = useState('Tous')
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [selectedId, setSelectedId] = useState<string>(workOrders[0]?.id ?? '')
  const [showCreate, setShowCreate] = useState(false)
  const [showOpDetail, setShowOpDetail] = useState<string | null>(null)

  // Create form state
  const [newType, setNewType] = useState<OTType>('retrofit')
  const [newUnit, setNewUnit] = useState(liftUnits[0]?.id ?? '')
  const [newPriority, setNewPriority] = useState<OTPriority>('normale')
  const [newDesc, setNewDesc] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newTechs, setNewTechs] = useState<string[]>([])

  const filtered = workOrders.filter(ot => {
    const matchStatus = statusFilter === 'Tous' || ot.status === statusFilter
    const matchType = typeFilter === 'Tous' || ot.type === typeFilter
    const q = deferredSearch.trim().toLowerCase()
    const matchSearch = !q || [ot.id, ot.client, ot.site, ot.city, ot.description].join(' ').toLowerCase().includes(q)
    return matchStatus && matchType && matchSearch
  })

  const selected = filtered.find(o => o.id === selectedId) ?? filtered[0]

  function handleCreate() {
    if (!newDesc.trim() || !newDate) return
    const unit = liftUnits.find(u => u.id === newUnit)
    const newOT: WorkOrder = {
      id: `OT-2026-${String(workOrders.length + 1).padStart(3, '0')}`,
      type: newType,
      status: 'planifie',
      unitId: newUnit,
      client: unit?.client ?? 'ALSTOM',
      site: unit?.site ?? '',
      city: unit?.city ?? '',
      createdDate: new Date().toISOString().slice(0, 10),
      plannedDate: newDate,
      fromConfig: newType === 'retrofit' ? unit?.currentConfig : undefined,
      toConfig: newType === 'retrofit' ? (unit?.targetConfig ?? 'H') : undefined,
      operations: newType === 'retrofit' ? retrofitOperations.map(op => ({ operationId: op.id, status: 'attente' as OpStatus, fncs: [] })) : [],
      technicianIds: newTechs,
      priority: newPriority,
      description: newDesc,
    }
    setWorkOrders(prev => [newOT, ...prev])
    setSelectedId(newOT.id)
    setShowCreate(false)
    setNewDesc('')
    setNewDate('')
    setNewTechs([])
  }

  function updateOpStatus(otId: string, opId: string, newStatus: OpStatus) {
    setWorkOrders(prev => prev.map(ot => {
      if (ot.id !== otId) return ot
      return {
        ...ot,
        operations: ot.operations.map(op =>
          op.operationId === opId ? { ...op, status: newStatus, completedAt: newStatus === 'fait' ? new Date().toISOString().slice(0, 10) : op.completedAt } : op
        ),
      }
    }))
  }

  function updateOTStatus(otId: string, newStatus: OTStatus) {
    setWorkOrders(prev => prev.map(ot =>
      ot.id === otId ? { ...ot, status: newStatus, completedDate: newStatus === 'termine' ? new Date().toISOString().slice(0, 10) : ot.completedDate } : ot
    ))
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">Bureau d'Études</p>
          <h1 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)' }}>Ordres de travail</h1>
        </div>
        <div className="header-actions">
          <button type="button" className="primary-action" onClick={() => setShowCreate(true)}>+ Créer un OT</button>
        </div>
      </div>

      <div className="filters" style={{ marginBottom: 20 }}>
        <input className="search-input" type="search" value={search} placeholder="Rechercher…" onChange={e => setSearch(e.target.value)} />
        <select className="status-select" value={statusFilter} onChange={e => { startTransition(() => setStatusFilter(e.target.value)) }}>
          {['Tous', 'planifie', 'en-cours', 'en-attente-pieces', 'termine', 'annule'].map(s => (
            <option key={s} value={s}>{s === 'Tous' ? 'Tous statuts' : otStatusLabel(s as OTStatus)}</option>
          ))}
        </select>
        <select className="status-select" value={typeFilter} onChange={e => { startTransition(() => setTypeFilter(e.target.value)) }}>
          {['Tous', 'retrofit', 'correctif', 'preventif', 'inspection'].map(t => (
            <option key={t} value={t}>{t === 'Tous' ? 'Tous types' : otTypeLabel(t as OTType)}</option>
          ))}
        </select>
      </div>

      <div className="interventions-layout">
        <div className="intervention-list">
          {filtered.map(ot => {
            const doneOps = ot.operations.filter(op => op.status === 'fait').length
            const pct = ot.operations.length > 0 ? Math.round((doneOps / ot.operations.length) * 100) : 0
            return (
              <button key={ot.id} type="button" className={`intervention-row${ot.id === selected?.id ? ' selected' : ''}`} onClick={() => setSelectedId(ot.id)}>
                <div className="row-main">
                  <div>
                    <p className="row-id">{ot.id}</p>
                    <h3>{ot.unitId}</h3>
                    <p className="op-meta">{ot.site} · {ot.city}</p>
                    <p>{ot.client} · {ot.description.slice(0, 70)}…</p>
                  </div>
                  <div className="row-tags">
                    <span className={`pill ${ot.type === 'retrofit' ? 'danger' : ot.type === 'correctif' ? 'watch' : 'accent'}`}>{otTypeLabel(ot.type)}</span>
                    <span className={`pill ${ot.priority === 'critique' ? 'danger' : ot.priority === 'haute' ? 'watch' : 'neutral'}`}>{ot.priority}</span>
                  </div>
                </div>
                <div className="row-meta">
                  <span>{otStatusLabel(ot.status)}</span>
                  <span>{ot.plannedDate}</span>
                  {ot.operations.length > 0 && <span>{pct}%</span>}
                </div>
              </button>
            )
          })}
          {filtered.length === 0 && <p style={{ textAlign: 'center', padding: 40, color: 'var(--text-subtle)' }}>Aucun OT trouvé</p>}
        </div>

        {selected && (
          <aside className="detail-card">
            <div className="detail-header">
              <div>
                <p className="row-id">{selected.id}</p>
                <h3>{selected.unitId}</h3>
                <p className="op-meta">{selected.site} · {selected.city}</p>
              </div>
              <div className="detail-actions-top">
                <select
                  className="status-select"
                  value={selected.status}
                  onChange={e => updateOTStatus(selected.id, e.target.value as OTStatus)}
                >
                  {(['planifie', 'en-cours', 'en-attente-pieces', 'termine', 'annule'] as const).map(s => (
                    <option key={s} value={s}>{otStatusLabel(s)}</option>
                  ))}
                </select>
              </div>
            </div>

            <p className="detail-summary">{selected.description}</p>

            <dl className="detail-grid">
              <div><dt>Client</dt><dd>{selected.client}</dd></div>
              <div><dt>Site</dt><dd>{selected.site}</dd></div>
              <div><dt>Ville</dt><dd>{selected.city}</dd></div>
              {(() => { const u = liftUnits.find(u => u.id === selected.unitId); return u ? <><div><dt>Partie Fixe</dt><dd>{u.partieFixeId}</dd></div><div><dt>Partie Mobile</dt><dd>{u.partieMobileId}</dd></div></> : null })()}
              <div><dt>Type</dt><dd>{otTypeLabel(selected.type)}</dd></div>
              {selected.fromConfig && (
                <div>
                  <dt>Configuration</dt>
                  <dd>
                    <span className={configPill(selected.fromConfig)}>CONF {selected.fromConfig}</span>
                    {selected.toConfig && <> → <span className={configPill(selected.toConfig)}>CONF {selected.toConfig}</span></>}
                  </dd>
                </div>
              )}
              <div><dt>Technicien(s)</dt><dd>{selected.technicianIds.map(id => technicians.find(t => t.id === id)?.name).filter(Boolean).join(', ') || '—'}</dd></div>
              <div><dt>Planifié le</dt><dd>{selected.plannedDate}</dd></div>
              <div><dt>Priorité</dt><dd>{selected.priority}</dd></div>
            </dl>

            {selected.operations.length > 0 && (
              <div className="detail-block">
                <h4>Opérations ({selected.operations.filter(o => o.status === 'fait').length}/{selected.operations.length})</h4>
                <div className="progress-track" style={{ marginBottom: 12 }}>
                  <span style={{ width: `${Math.round((selected.operations.filter(o => o.status === 'fait').length / selected.operations.length) * 100)}%` }} />
                </div>
                <ul className="op-list">
                  {selected.operations.map(wop => {
                    const op = retrofitOperations.find(o => o.id === wop.operationId)
                    if (!op) return null
                    return (
                      <li key={wop.operationId} className="op-row">
                        <select
                          className="op-status-select"
                          value={wop.status}
                          onChange={e => updateOpStatus(selected.id, wop.operationId, e.target.value as OpStatus)}
                        >
                          {(['attente', 'en-cours', 'fait', 'bloque'] as const).map(s => (
                            <option key={s} value={s}>{opStatusLabel(s)}</option>
                          ))}
                        </select>
                        <span className="op-title" style={{ cursor: 'pointer' }} onClick={() => setShowOpDetail(wop.operationId)}>{op.title}</span>
                        <span className="op-meta">{op.estimatedHours}h</span>
                        {wop.fncs.length > 0 && <span className="pill danger">{wop.fncs.length} FNC</span>}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Modal Créer OT */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Créer un Ordre de Travail" wide>
        <form className="form-grid" onSubmit={e => { e.preventDefault(); handleCreate() }}>
          <label className="form-field">
            <span>Type</span>
            <select value={newType} onChange={e => setNewType(e.target.value as OTType)}>
              <option value="retrofit">Retrofit</option>
              <option value="correctif">Correctif</option>
              <option value="preventif">Préventif</option>
              <option value="inspection">Inspection</option>
            </select>
          </label>
          <label className="form-field">
            <span>Unité LIFT</span>
            <select value={newUnit} onChange={e => setNewUnit(e.target.value)}>
              {liftUnits.map(u => (
                <option key={u.id} value={u.id}>{u.id}</option>
              ))}
            </select>
          </label>
          {(() => {
            const u = liftUnits.find(x => x.id === newUnit)
            if (!u) return null
            return (
              <>
                <div className="form-field">
                  <span>Site</span>
                  <input type="text" value={u.site} readOnly className="config-input" />
                </div>
                <div className="form-field">
                  <span>Ville</span>
                  <input type="text" value={u.city} readOnly className="config-input" />
                </div>
                <div className="form-field">
                  <span>Partie Fixe</span>
                  <input type="text" value={u.partieFixeId} readOnly className="config-input" />
                </div>
                <div className="form-field">
                  <span>Partie Mobile</span>
                  <input type="text" value={u.partieMobileId} readOnly className="config-input" />
                </div>
                <div className="form-field">
                  <span>Config actuelle</span>
                  <input type="text" value={`CONF ${u.currentConfig}`} readOnly className="config-input" />
                </div>
              </>
            )
          })()}
          <label className="form-field">
            <span>Priorité</span>
            <select value={newPriority} onChange={e => setNewPriority(e.target.value as OTPriority)}>
              <option value="basse">Basse</option>
              <option value="normale">Normale</option>
              <option value="haute">Haute</option>
              <option value="critique">Critique</option>
            </select>
          </label>
          <label className="form-field">
            <span>Date planifiée</span>
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} required />
          </label>
          <label className="form-field full-width">
            <span>Description</span>
            <textarea rows={3} value={newDesc} onChange={e => setNewDesc(e.target.value)} required placeholder="Description de l'intervention…" />
          </label>
          <div className="form-field full-width">
            <span>Technicien(s)</span>
            <div className="checkbox-group">
              {technicians.map(t => (
                <label key={t.id} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={newTechs.includes(t.id)}
                    onChange={e => {
                      if (e.target.checked) setNewTechs(prev => [...prev, t.id])
                      else setNewTechs(prev => prev.filter(id => id !== t.id))
                    }}
                  />
                  {t.name} ({t.skill})
                </label>
              ))}
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="secondary-action" onClick={() => setShowCreate(false)}>Annuler</button>
            <button type="submit" className="primary-action">Créer l'OT</button>
          </div>
        </form>
      </Modal>

      {/* Modal détail opération */}
      <Modal open={!!showOpDetail} onClose={() => setShowOpDetail(null)} title="Détail opération" wide>
        {showOpDetail && (() => {
          const op = retrofitOperations.find(o => o.id === showOpDetail)
          if (!op) return <p>Opération non trouvée</p>
          return (
            <div className="op-detail">
              <div className="op-detail-header">
                <h3>{op.title}</h3>
                <span className="row-id">{op.code}</span>
              </div>
              <dl className="detail-grid">
                <div><dt>Durée estimée</dt><dd>{op.estimatedHours}h</dd></div>
                <div><dt>Personnel</dt><dd>{op.personnel} personne(s)</dd></div>
                <div><dt>De config</dt><dd><span className={configPill(op.fromConfig)}>CONF {op.fromConfig}</span></dd></div>
                <div><dt>Vers config</dt><dd><span className={configPill(op.toConfig)}>CONF {op.toConfig}</span></dd></div>
              </dl>
              <h4>Outillage</h4>
              <ul className="checklist">{op.tools.map((t, i) => <li key={i}>{t}</li>)}</ul>
              {op.parts.length > 0 && (<><h4>Pièces requises</h4><ul className="checklist">{op.parts.map((p, i) => <li key={i}>{p.designation} × {p.quantity} <span className="op-meta">{p.reference}</span></li>)}</ul></>)}
              {op.consumables.length > 0 && (<><h4>Consommables</h4><ul className="checklist">{op.consumables.map((c, i) => <li key={i}>{c}</li>)}</ul></>)}
              <h4>Étapes ({op.steps.length})</h4>
              <ol className="step-list">{op.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}
