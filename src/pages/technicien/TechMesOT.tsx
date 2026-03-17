import { useState } from 'react'
import { Modal } from '../../components/Modal'
import {
  workOrders as initialWorkOrders, retrofitOperations, technicians,
  type OpStatus, type OTStatus, type Configuration,
} from '../../data'

function opStatusLabel(s: OpStatus) {
  const map: Record<OpStatus, string> = {
    attente: 'Attente', 'en-cours': 'En cours', fait: 'Fait', bloque: 'Bloqué',
  }
  return map[s]
}

function otStatusLabel(s: OTStatus) {
  const map: Record<OTStatus, string> = {
    planifie: 'Planifié', 'en-cours': 'En cours', 'en-attente-pieces': 'Attente pièces',
    termine: 'Terminé', annule: 'Annulé',
  }
  return map[s]
}

function configPill(c: Configuration) {
  const map: Record<Configuration, string> = {
    "E'": 'danger', F: 'neutral', G: 'neutral', H: 'accent', I: 'accent',
  }
  return `pill ${map[c]}`
}

interface Props {
  technicianId: string
}

export function TechMesOT({ technicianId }: Props) {
  const [workOrders, setWorkOrders] = useState(initialWorkOrders)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showOpDetail, setShowOpDetail] = useState<string | null>(null)
  const [showNotes, setShowNotes] = useState<{ otId: string; opId: string } | null>(null)
  const [noteText, setNoteText] = useState('')

  const tech = technicians.find(t => t.id === technicianId)
  const myOTs = workOrders.filter(o => o.technicianIds.includes(technicianId))
  const selected = selectedId ? myOTs.find(o => o.id === selectedId) : myOTs[0]

  function updateOpStatus(otId: string, opId: string, newStatus: OpStatus) {
    setWorkOrders(prev => prev.map(ot => {
      if (ot.id !== otId) return ot
      return {
        ...ot,
        operations: ot.operations.map(op =>
          op.operationId === opId
            ? { ...op, status: newStatus, completedAt: newStatus === 'fait' ? new Date().toISOString().slice(0, 10) : op.completedAt }
            : op
        ),
      }
    }))
  }

  function saveNote() {
    if (!showNotes || !noteText.trim()) return
    setWorkOrders(prev => prev.map(ot => {
      if (ot.id !== showNotes.otId) return ot
      return {
        ...ot,
        operations: ot.operations.map(op =>
          op.operationId === showNotes.opId ? { ...op, notes: noteText } : op
        ),
      }
    }))
    setShowNotes(null)
    setNoteText('')
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">Technicien — {tech?.name}</p>
          <h1 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)' }}>Mes ordres de travail</h1>
        </div>
      </div>

      {myOTs.length === 0 ? (
        <section className="panel" style={{ textAlign: 'center', padding: 60 }}>
          <h2>Aucun OT assigné</h2>
          <p style={{ color: 'var(--text-subtle)' }}>Vous n'avez pas d'ordres de travail assignés pour le moment.</p>
        </section>
      ) : (
        <div className="interventions-layout">
          <div className="intervention-list">
            {myOTs.map(ot => {
              const doneOps = ot.operations.filter(op => op.status === 'fait').length
              const pct = ot.operations.length > 0 ? Math.round((doneOps / ot.operations.length) * 100) : 0
              return (
                <button key={ot.id} type="button" className={`intervention-row${ot.id === selected?.id ? ' selected' : ''}`} onClick={() => setSelectedId(ot.id)}>
                  <div className="row-main">
                    <div>
                      <p className="row-id">{ot.id}</p>
                      <h3>{ot.site} — {ot.city}</h3>
                      <p>{ot.description.slice(0, 70)}…</p>
                    </div>
                    <div className="row-tags">
                      <span className={`pill ${ot.status === 'en-cours' ? 'warning' : ot.status === 'planifie' ? 'neutral' : 'accent'}`}>
                        {otStatusLabel(ot.status)}
                      </span>
                      <span className={`pill ${ot.priority === 'critique' ? 'danger' : ot.priority === 'haute' ? 'watch' : 'neutral'}`}>{ot.priority}</span>
                    </div>
                  </div>
                  <div className="row-meta">
                    <span>{ot.type}</span>
                    <span>{ot.plannedDate}</span>
                    {ot.operations.length > 0 && <span>{pct}% ({doneOps}/{ot.operations.length})</span>}
                  </div>
                </button>
              )
            })}
          </div>

          {selected && (
            <aside className="detail-card">
              <div className="detail-header">
                <div>
                  <p className="row-id">{selected.id}</p>
                  <h3>{selected.site} — {selected.city}</h3>
                </div>
                <span className={`pill ${selected.status === 'en-cours' ? 'warning' : 'neutral'}`}>
                  {otStatusLabel(selected.status)}
                </span>
              </div>

              <p className="detail-summary">{selected.description}</p>

              <dl className="detail-grid">
                <div><dt>Client</dt><dd>{selected.client}</dd></div>
                <div><dt>Priorité</dt><dd><span className={`pill ${selected.priority === 'critique' ? 'danger' : selected.priority === 'haute' ? 'watch' : 'neutral'}`}>{selected.priority}</span></dd></div>
                {selected.fromConfig && (
                  <div>
                    <dt>Configuration</dt>
                    <dd>
                      <span className={configPill(selected.fromConfig)}>CONF {selected.fromConfig}</span>
                      {selected.toConfig && <> → <span className={configPill(selected.toConfig)}>CONF {selected.toConfig}</span></>}
                    </dd>
                  </div>
                )}
                <div><dt>Date planif.</dt><dd>{selected.plannedDate}</dd></div>
              </dl>

              {selected.operations.length > 0 && (
                <div className="detail-block">
                  <h4>Mes opérations ({selected.operations.filter(o => o.status === 'fait').length}/{selected.operations.length})</h4>
                  <div className="progress-track" style={{ marginBottom: 12 }}>
                    <span style={{ width: `${Math.round((selected.operations.filter(o => o.status === 'fait').length / selected.operations.length) * 100)}%` }} />
                  </div>
                  <ul className="op-list">
                    {selected.operations.map(wop => {
                      const op = retrofitOperations.find(o => o.id === wop.operationId)
                      if (!op) return null
                      return (
                        <li key={wop.operationId} className="op-row op-row-interactive">
                          <select
                            className="op-status-select"
                            value={wop.status}
                            onChange={e => updateOpStatus(selected.id, wop.operationId, e.target.value as OpStatus)}
                          >
                            {(['attente', 'en-cours', 'fait', 'bloque'] as const).map(s => (
                              <option key={s} value={s}>{opStatusLabel(s)}</option>
                            ))}
                          </select>
                          <span className="op-title" style={{ cursor: 'pointer' }} onClick={() => setShowOpDetail(wop.operationId)}>
                            {op.title}
                          </span>
                          <span className="op-meta">{op.estimatedHours}h</span>
                          <button
                            type="button"
                            className="btn-icon"
                            title="Ajouter une note"
                            onClick={() => { setShowNotes({ otId: selected.id, opId: wop.operationId }); setNoteText(wop.notes ?? '') }}
                          >
                            📝
                          </button>
                          {wop.fncs.length > 0 && <span className="pill danger">{wop.fncs.length} FNC</span>}
                          {wop.notes && <span className="pill neutral" title={wop.notes}>Note</span>}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </aside>
          )}
        </div>
      )}

      {/* Modal détail opération */}
      <Modal open={!!showOpDetail} onClose={() => setShowOpDetail(null)} title="Fiche opération" wide>
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
              </dl>
              <h4>Outillage nécessaire</h4>
              <ul className="checklist">{op.tools.map((t, i) => <li key={i}>{t}</li>)}</ul>
              {op.parts.length > 0 && (
                <>
                  <h4>Pièces requises</h4>
                  <ul className="checklist">{op.parts.map((p, i) => <li key={i}>{p.designation} × {p.quantity} <span className="op-meta">{p.reference}</span></li>)}</ul>
                </>
              )}
              <h4>Étapes ({op.steps.length})</h4>
              <ol className="step-list">{op.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
            </div>
          )
        })()}
      </Modal>

      {/* Modal notes */}
      <Modal open={!!showNotes} onClose={() => setShowNotes(null)} title="Note d'intervention">
        <form className="form-grid" onSubmit={e => { e.preventDefault(); saveNote() }}>
          <label className="form-field full-width">
            <span>Note / Observation</span>
            <textarea rows={4} value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Ajouter une observation, un problème rencontré…" autoFocus />
          </label>
          <div className="form-actions">
            <button type="button" className="secondary-action" onClick={() => setShowNotes(null)}>Annuler</button>
            <button type="submit" className="primary-action">Enregistrer</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
