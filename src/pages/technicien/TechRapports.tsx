import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { workOrders, technicians, retrofitOperations } from '../../data'

interface Rapport {
  id: string
  date: string
  otId: string
  site: string
  heuresTravail: number
  operations: string[]
  observations: string
  statut: 'brouillon' | 'soumis' | 'valide'
  problemes?: string
}

interface Props {
  technicianId: string
}

export function TechRapports({ technicianId }: Props) {
  const tech = technicians.find(t => t.id === technicianId)
  const myOTs = workOrders.filter(o => o.technicianIds.includes(technicianId))

  const [rapports, setRapports] = useState<Rapport[]>([
    {
      id: 'RAP-001',
      date: '2026-03-17',
      otId: 'OT-2025-001',
      site: 'Gare du Nord, Paris',
      heuresTravail: 4.5,
      operations: ['OP-001', 'OP-002'],
      observations: 'Demi-lunes remplacées sans difficulté. Bord sensible installé, couple de serrage vérifié.',
      statut: 'soumis',
    },
    {
      id: 'RAP-002',
      date: '2026-03-16',
      otId: 'OT-2025-003',
      site: 'Matabiau, Toulouse',
      heuresTravail: 6,
      operations: ['OP-003'],
      observations: 'Motorisation Z en cours de diagnostic. Vibration confirmée sur tambour.',
      problemes: 'Vibration anormale — attente pièce de remplacement.',
      statut: 'valide',
    },
  ])

  const [showCreate, setShowCreate] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Create form
  const [newOT, setNewOT] = useState(myOTs[0]?.id ?? '')
  const [newHeures, setNewHeures] = useState('')
  const [newOps, setNewOps] = useState<string[]>([])
  const [newObs, setNewObs] = useState('')
  const [newProb, setNewProb] = useState('')

  const selected = selectedId ? rapports.find(r => r.id === selectedId) : null

  function handleCreate() {
    if (!newOT || !newHeures || !newObs.trim()) return
    const ot = myOTs.find(o => o.id === newOT)
    const rap: Rapport = {
      id: `RAP-${String(rapports.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString().slice(0, 10),
      otId: newOT,
      site: ot ? `${ot.site}, ${ot.city}` : '',
      heuresTravail: parseFloat(newHeures),
      operations: newOps,
      observations: newObs,
      problemes: newProb || undefined,
      statut: 'brouillon',
    }
    setRapports(prev => [rap, ...prev])
    setShowCreate(false)
    setNewHeures('')
    setNewOps([])
    setNewObs('')
    setNewProb('')
  }

  function submitRapport(id: string) {
    setRapports(prev => prev.map(r => r.id === id ? { ...r, statut: 'soumis' } : r))
  }

  const totalHeures = rapports.reduce((s, r) => s + r.heuresTravail, 0)

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">Technicien — {tech?.name}</p>
          <h1 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)' }}>Rapports d'intervention</h1>
        </div>
        <div className="header-actions">
          <button type="button" className="primary-action" onClick={() => setShowCreate(true)}>+ Nouveau rapport</button>
        </div>
      </div>

      <div className="kpi-grid kpi-grid-3">
        <article className="kpi-card">
          <div>
            <span className="kpi-label">Rapports</span>
            <strong className="kpi-value">{rapports.length}</strong>
          </div>
        </article>
        <article className="kpi-card">
          <div>
            <span className="kpi-label">Heures totales</span>
            <strong className="kpi-value">{totalHeures}h</strong>
          </div>
        </article>
        <article className="kpi-card kpi-warning">
          <div>
            <span className="kpi-label">À soumettre</span>
            <strong className="kpi-value">{rapports.filter(r => r.statut === 'brouillon').length}</strong>
          </div>
        </article>
      </div>

      <div className="rapports-layout">
        <div className="rapports-list">
          {rapports.map(r => (
            <article
              key={r.id}
              className={`rapport-card${selectedId === r.id ? ' selected' : ''}`}
              onClick={() => setSelectedId(r.id === selectedId ? null : r.id)}
            >
              <div className="rapport-header">
                <div>
                  <span className="row-id">{r.id}</span>
                  <h3>{r.otId} — {r.site}</h3>
                </div>
                <span className={`pill ${r.statut === 'brouillon' ? 'neutral' : r.statut === 'soumis' ? 'warning' : 'accent'}`}>
                  {r.statut === 'brouillon' ? 'Brouillon' : r.statut === 'soumis' ? 'Soumis' : 'Validé'}
                </span>
              </div>
              <div className="rapport-footer">
                <span className="op-meta">{r.date} · {r.heuresTravail}h · {r.operations.length} ops</span>
                {r.problemes && <span className="pill danger" style={{ fontSize: '0.7rem' }}>Problème</span>}
              </div>
            </article>
          ))}
        </div>

        {selected && (
          <aside className="detail-card">
            <div className="detail-header">
              <div>
                <span className="row-id">{selected.id}</span>
                <h3>{selected.otId}</h3>
              </div>
              <div>
                <span className={`pill ${selected.statut === 'brouillon' ? 'neutral' : selected.statut === 'soumis' ? 'warning' : 'accent'}`}>
                  {selected.statut === 'brouillon' ? 'Brouillon' : selected.statut === 'soumis' ? 'Soumis' : 'Validé'}
                </span>
                {selected.statut === 'brouillon' && (
                  <button type="button" className="primary-action btn-sm" style={{ marginLeft: 8 }} onClick={() => submitRapport(selected.id)}>
                    Soumettre
                  </button>
                )}
              </div>
            </div>

            <dl className="detail-grid">
              <div><dt>Date</dt><dd>{selected.date}</dd></div>
              <div><dt>Site</dt><dd>{selected.site}</dd></div>
              <div><dt>Heures</dt><dd><strong>{selected.heuresTravail}h</strong></dd></div>
              <div><dt>OT</dt><dd>{selected.otId}</dd></div>
            </dl>

            {selected.operations.length > 0 && (
              <div className="detail-block">
                <h4>Opérations effectuées</h4>
                <ul className="checklist">
                  {selected.operations.map(opId => {
                    const op = retrofitOperations.find(o => o.id === opId)
                    return <li key={opId}>{op?.title ?? opId} <span className="op-meta">{op?.code}</span></li>
                  })}
                </ul>
              </div>
            )}

            <div className="detail-block">
              <h4>Observations</h4>
              <p style={{ color: 'var(--text-soft)' }}>{selected.observations}</p>
            </div>

            {selected.problemes && (
              <div className="detail-block" style={{ background: 'rgb(211 74 43 / 8%)', padding: 12, borderRadius: 12 }}>
                <h4 style={{ color: '#9c341c' }}>Problèmes signalés</h4>
                <p style={{ color: '#9c341c' }}>{selected.problemes}</p>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Modal nouveau rapport */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouveau rapport d'intervention" wide>
        <form className="form-grid" onSubmit={e => { e.preventDefault(); handleCreate() }}>
          <label className="form-field">
            <span>Ordre de travail</span>
            <select value={newOT} onChange={e => setNewOT(e.target.value)}>
              {myOTs.map(ot => (
                <option key={ot.id} value={ot.id}>{ot.id} — {ot.site}, {ot.city}</option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Heures travaillées</span>
            <input type="number" step="0.5" min="0.5" value={newHeures} onChange={e => setNewHeures(e.target.value)} required />
          </label>
          {newOT && (() => {
            const ot = myOTs.find(o => o.id === newOT)
            if (!ot || ot.operations.length === 0) return null
            return (
              <div className="form-field full-width">
                <span>Opérations effectuées</span>
                <div className="checkbox-group">
                  {ot.operations.map(wop => {
                    const op = retrofitOperations.find(o => o.id === wop.operationId)
                    return (
                      <label key={wop.operationId} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={newOps.includes(wop.operationId)}
                          onChange={e => {
                            if (e.target.checked) setNewOps(prev => [...prev, wop.operationId])
                            else setNewOps(prev => prev.filter(id => id !== wop.operationId))
                          }}
                        />
                        {op?.title ?? wop.operationId}
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          })()}
          <label className="form-field full-width">
            <span>Observations</span>
            <textarea rows={3} value={newObs} onChange={e => setNewObs(e.target.value)} required placeholder="Travaux effectués, conditions, remarques…" />
          </label>
          <label className="form-field full-width">
            <span>Problèmes rencontrés (optionnel)</span>
            <textarea rows={2} value={newProb} onChange={e => setNewProb(e.target.value)} placeholder="Difficultés, pièces manquantes, anomalies…" />
          </label>
          <div className="form-actions">
            <button type="button" className="secondary-action" onClick={() => setShowCreate(false)}>Annuler</button>
            <button type="submit" className="primary-action">Créer le rapport</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
