import { useState } from 'react'
import { Modal } from '../../components/Modal'
import {
  type OTStatus, type OpStatus, type Configuration,
} from '../../data'
import { useGmaoData } from '../../contexts/DataContext'
import { ApiService } from '../../services/api'

function otStatusLabel(s: OTStatus) {
  const map: Record<OTStatus, string> = {
    planifie: 'Planifié', 'en-cours': 'En cours', 'en-attente-pieces': 'Attente pièces',
    termine: 'Terminé', annule: 'Annulé',
  }
  return map[s]
}

function otStatusPill(s: OTStatus) {
  const map: Record<OTStatus, string> = {
    planifie: 'neutral', 'en-cours': 'warning', 'en-attente-pieces': 'watch',
    termine: 'controlled', annule: 'danger',
  }
  return map[s]
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

function otTypeLabel(t: string) {
  const map: Record<string, string> = {
    retrofit: 'Retrofit', correctif: 'Correctif', preventif: 'Préventif', inspection: 'Inspection',
  }
  return map[t] ?? t
}

interface Props {
  otId: string
  onBack: () => void
  onNavigateFnc?: (id: string) => void
}

export function OTDetailPage({ otId, onBack, onNavigateFnc }: Props) {
  const { workOrders, technicians, retrofitOperations, liftUnits, fncs, refresh } = useGmaoData()
  const [showOpDetail, setShowOpDetail] = useState<string | null>(null)

  const ot = workOrders.find(o => o.id === otId)
  if (!ot) {
    return (
      <div className="page-content">
        <button type="button" className="btn-back" onClick={onBack}>← Retour</button>
        <section className="panel" style={{ textAlign: 'center', padding: 60 }}>
          <h2>OT introuvable</h2>
          <p style={{ color: 'var(--text-subtle)' }}>L'ordre de travail {otId} n'existe pas.</p>
        </section>
      </div>
    )
  }

  const unit = liftUnits.find(u => u.id === ot.unitId)
  const techs = ot.technicianIds.map(id => technicians.find(t => t.id === id)).filter(Boolean)
  const linkedFncs = fncs.filter(f => f.workOrderId === ot.id)
  const doneOps = ot.operations.filter(op => op.status === 'fait').length
  const totalOps = ot.operations.length
  const pct = totalOps > 0 ? Math.round((doneOps / totalOps) * 100) : 0

  async function updateOpStatus(opId: string, newStatus: OpStatus) {
    try {
      await ApiService.request(`/orders/${otId}/operations/${opId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus, completedAt: newStatus === 'fait' ? new Date().toISOString().slice(0, 10) : null }),
      })
      await refresh()
    } catch (err) {
      console.error('Erreur màj opération:', err)
    }
  }

  async function updateOTStatus(newStatus: OTStatus) {
    try {
      await ApiService.updateWorkOrder(otId, {
        status: newStatus,
        completedDate: newStatus === 'termine' ? new Date().toISOString().slice(0, 10) : null,
      })
      await refresh()
    } catch (err) {
      console.error('Erreur màj OT:', err)
    }
  }

  return (
    <div className="page-content">
      <button type="button" className="btn-back" onClick={onBack}>← Retour à la liste</button>

      <div className="detail-page-header">
        <div>
          <p className="eyebrow">{otTypeLabel(ot.type)} · {ot.priority}</p>
          <h1>{ot.id}</h1>
          <p className="detail-page-subtitle">{ot.description}</p>
        </div>
        <div className="detail-page-actions">
          <select
            className="status-select"
            value={ot.status}
            onChange={e => updateOTStatus(e.target.value as OTStatus)}
          >
            {(['planifie', 'en-cours', 'en-attente-pieces', 'termine', 'annule'] as const).map(s => (
              <option key={s} value={s}>{otStatusLabel(s)}</option>
            ))}
          </select>
          <span className={`pill ${otStatusPill(ot.status)}`} style={{ fontSize: '0.9rem', padding: '8px 16px' }}>
            {otStatusLabel(ot.status)}
          </span>
        </div>
      </div>

      {/* KPI row */}
      <div className="kpi-grid kpi-grid-4">
        <article className="kpi-card">
          <div>
            <span className="kpi-label">Progression</span>
            <strong className="kpi-value">{pct}%</strong>
            <span className="kpi-detail">{doneOps}/{totalOps} opérations</span>
          </div>
        </article>
        <article className="kpi-card">
          <div>
            <span className="kpi-label">Techniciens</span>
            <strong className="kpi-value">{techs.length}</strong>
          </div>
        </article>
        <article className="kpi-card">
          <div>
            <span className="kpi-label">FNC liées</span>
            <strong className="kpi-value">{linkedFncs.length}</strong>
          </div>
        </article>
        <article className={`kpi-card ${ot.priority === 'critique' ? 'kpi-warning' : ''}`}>
          <div>
            <span className="kpi-label">Priorité</span>
            <strong className="kpi-value" style={{ textTransform: 'capitalize' }}>{ot.priority}</strong>
          </div>
        </article>
      </div>

      {/* Info grid */}
      <div className="detail-page-grid">
        <section className="panel detail-page-section">
          <h3>Informations générales</h3>
          <dl className="detail-grid">
            <div><dt>Client</dt><dd>{ot.client}</dd></div>
            <div><dt>Site</dt><dd>{ot.site}</dd></div>
            <div><dt>Ville</dt><dd>{ot.city}</dd></div>
            <div><dt>Type</dt><dd><span className={`pill ${ot.type === 'retrofit' ? 'danger' : ot.type === 'correctif' ? 'watch' : 'accent'}`}>{otTypeLabel(ot.type)}</span></dd></div>
            <div><dt>Date création</dt><dd>{ot.createdDate}</dd></div>
            <div><dt>Date planifiée</dt><dd>{ot.plannedDate}</dd></div>
            {ot.completedDate && <div><dt>Date fin</dt><dd>{ot.completedDate}</dd></div>}
            {ot.fromConfig && (
              <div>
                <dt>Configuration</dt>
                <dd>
                  <span className={configPill(ot.fromConfig)}>CONF {ot.fromConfig}</span>
                  {ot.toConfig && <> → <span className={configPill(ot.toConfig)}>CONF {ot.toConfig}</span></>}
                </dd>
              </div>
            )}
          </dl>
        </section>

        <section className="panel detail-page-section">
          <h3>Unité LIFT</h3>
          {unit ? (
            <dl className="detail-grid">
              <div><dt>Unité</dt><dd><strong>{unit.id}</strong></dd></div>
              <div><dt>N° série</dt><dd>{unit.serialNumber}</dd></div>
              <div><dt>Partie Fixe</dt><dd>{unit.partieFixeId}</dd></div>
              <div><dt>Partie Mobile</dt><dd>{unit.partieMobileId}</dd></div>
              <div><dt>Config actuelle</dt><dd><span className={configPill(unit.currentConfig)}>CONF {unit.currentConfig}</span></dd></div>
              <div><dt>Statut</dt><dd style={{ textTransform: 'capitalize' }}>{unit.status.replace(/-/g, ' ')}</dd></div>
              <div><dt>Installation</dt><dd>{unit.installDate}</dd></div>
              <div><dt>Dernier service</dt><dd>{unit.lastServiceDate}</dd></div>
            </dl>
          ) : (
            <p style={{ color: 'var(--text-subtle)' }}>Unité non trouvée</p>
          )}
        </section>
      </div>

      {/* Technicians */}
      <section className="panel detail-page-section">
        <h3>Techniciens assignés ({techs.length})</h3>
        {techs.length > 0 ? (
          <div className="tech-chips">
            {techs.map(t => t && (
              <div key={t.id} className="tech-chip">
                <strong>{t.name}</strong>
                <span className="op-meta">{t.skill} · {t.city}</span>
                <span className={`pill ${t.availability === 'disponible' ? 'accent' : t.availability === 'en-intervention' ? 'warning' : 'danger'}`}>
                  {t.availability.replace(/-/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-subtle)' }}>Aucun technicien assigné</p>
        )}
      </section>

      {/* Operations */}
      {totalOps > 0 && (
        <section className="panel detail-page-section">
          <h3>Opérations ({doneOps}/{totalOps})</h3>
          <div className="progress-track" style={{ marginBottom: 16 }}>
            <span style={{ width: `${pct}%` }} />
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Opération</th>
                <th>Code</th>
                <th>Durée est.</th>
                <th>Statut</th>
                <th>Terminé le</th>
                <th>FNC</th>
              </tr>
            </thead>
            <tbody>
              {ot.operations.map(wop => {
                const op = retrofitOperations.find(o => o.id === wop.operationId)
                if (!op) return null
                return (
                  <tr key={wop.operationId} className="clickable-row" onClick={() => setShowOpDetail(wop.operationId)}>
                    <td><strong>{op.title}</strong></td>
                    <td className="op-meta">{op.code}</td>
                    <td>{op.estimatedHours}h</td>
                    <td>
                      <select
                        className="op-status-select"
                        value={wop.status}
                        onClick={e => e.stopPropagation()}
                        onChange={e => updateOpStatus(wop.operationId, e.target.value as OpStatus)}
                      >
                        {(['attente', 'en-cours', 'fait', 'bloque'] as const).map(s => (
                          <option key={s} value={s}>{opStatusLabel(s)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="op-meta">{wop.completedAt ?? '—'}</td>
                    <td>
                      {wop.fncs.length > 0 ? (
                        <span className="pill danger">{wop.fncs.length} FNC</span>
                      ) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* FNC liées */}
      {linkedFncs.length > 0 && (
        <section className="panel detail-page-section">
          <h3>Fiches de Non-Conformité liées ({linkedFncs.length})</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Réf. pièce</th>
                <th>Description</th>
                <th>Date</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {linkedFncs.map(f => (
                <tr
                  key={f.id}
                  className="clickable-row"
                  onClick={() => onNavigateFnc?.(f.id)}
                >
                  <td><strong>{f.id}</strong></td>
                  <td className="op-meta">{f.partReference}</td>
                  <td>{f.description.length > 60 ? f.description.slice(0, 60) + '…' : f.description}</td>
                  <td className="op-meta">{f.date}</td>
                  <td>
                    <span className={`pill ${f.status === 'ouverte' ? 'danger' : f.status === 'traitee' ? 'warning' : 'controlled'}`}>
                      {f.status === 'ouverte' ? 'Ouverte' : f.status === 'traitee' ? 'Traitée' : 'Clôturée'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Notes */}
      {ot.notes && (
        <section className="panel detail-page-section">
          <h3>Notes</h3>
          <p>{ot.notes}</p>
        </section>
      )}

      {/* Op detail modal */}
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
