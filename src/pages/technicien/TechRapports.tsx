import { useState, useRef } from 'react'
import { Modal } from '../../components/Modal'
import { useGmaoData } from '../../contexts/DataContext'

interface StepData {
  photo?: string
  commentaire?: string
}

interface OperationData {
  operationId: string
  steps: Record<number, StepData>
}

interface Rapport {
  id: string
  date: string
  otId: string
  site: string
  heuresTravail: number
  operations: string[]
  operationsData?: OperationData[]
  observations: string
  statut: 'brouillon' | 'soumis' | 'valide'
  problemes?: string
}

interface Props {
  technicianId: string
}

export function TechRapports({ technicianId }: Props) {
  const { workOrders, technicians, retrofitOperations } = useGmaoData()
  const tech = technicians.find(t => t.id === technicianId)
  const myOTs = workOrders.filter(o => o.technicianIds.includes(technicianId))

  const [rapports, setRapports] = useState<Rapport[]>([
    {
      id: 'RAP-001',
      date: '2026-03-17',
      otId: 'OT-2025-001',
      site: 'Gare du Nord',
      heuresTravail: 4.5,
      operations: ['OP-001', 'OP-002'],
      observations: 'Demi-lunes remplacées sans difficulté. Bord sensible installé, couple de serrage vérifié.',
      statut: 'soumis',
    },
    {
      id: 'RAP-002',
      date: '2026-03-16',
      otId: 'OT-2025-003',
      site: 'Matabiau',
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
  const [stepData, setStepData] = useState<Record<string, Record<number, StepData>>>({})
  const [expandedOp, setExpandedOp] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingPhotoKey, setPendingPhotoKey] = useState<{ opId: string; stepIdx: number } | null>(null)

  function updateStepData(opId: string, stepIdx: number, field: keyof StepData, value: string) {
    setStepData(prev => ({
      ...prev,
      [opId]: {
        ...prev[opId],
        [stepIdx]: { ...prev[opId]?.[stepIdx], [field]: value },
      },
    }))
  }

  function handlePhotoCapture(opId: string, stepIdx: number) {
    setPendingPhotoKey({ opId, stepIdx })
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !pendingPhotoKey) return
    const reader = new FileReader()
    reader.onload = () => {
      updateStepData(pendingPhotoKey.opId, pendingPhotoKey.stepIdx, 'photo', reader.result as string)
      setPendingPhotoKey(null)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function removePhoto(opId: string, stepIdx: number) {
    setStepData(prev => {
      const copy = { ...prev, [opId]: { ...prev[opId] } }
      if (copy[opId]?.[stepIdx]) {
        const { photo: _, ...rest } = copy[opId][stepIdx]
        copy[opId][stepIdx] = rest
      }
      return copy
    })
  }

  const selected = selectedId ? rapports.find(r => r.id === selectedId) : null

  function handleCreate() {
    if (!newOT || !newHeures || !newObs.trim()) return
    const ot = myOTs.find(o => o.id === newOT)
    const opsData: OperationData[] = newOps.map(opId => ({
      operationId: opId,
      steps: stepData[opId] ?? {},
    })).filter(od => Object.keys(od.steps).length > 0)
    const rap: Rapport = {
      id: `RAP-${String(rapports.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString().slice(0, 10),
      otId: newOT,
      site: ot ? ot.site : '',
      heuresTravail: parseFloat(newHeures),
      operations: newOps,
      operationsData: opsData.length > 0 ? opsData : undefined,
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
    setStepData({})
    setExpandedOp(null)
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
                  <h3>{r.otId}</h3>
                  <p className="op-meta">{r.site}</p>
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
                {selected.operations.map(opId => {
                  const op = retrofitOperations.find(o => o.id === opId)
                  const opData = selected.operationsData?.find(od => od.operationId === opId)
                  const hasStepData = opData && Object.keys(opData.steps).length > 0
                  return (
                    <div key={opId} className="detail-op-block">
                      <div className="detail-op-header">{op?.title ?? opId} <span className="op-meta">{op?.code}</span></div>
                      {hasStepData && op?.steps && (
                        <div className="detail-steps-list">
                          {op.steps.map((stepText, idx) => {
                            const sd = opData.steps[idx]
                            if (!sd?.photo && !sd?.commentaire) return null
                            return (
                              <div key={idx} className="detail-step-item">
                                <div className="detail-step-label">Étape {idx + 1}: {stepText}</div>
                                {sd.commentaire && <p className="detail-step-comment">💬 {sd.commentaire}</p>}
                                {sd.photo && <img src={sd.photo} alt={`Étape ${idx + 1}`} className="detail-step-photo" />}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
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
                <option key={ot.id} value={ot.id}>{ot.id} · {ot.site}</option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Heures travaillées</span>
            <input type="number" step="0.5" min="0.5" value={newHeures} onChange={e => setNewHeures(e.target.value)} required />
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          {newOT && (() => {
            const ot = myOTs.find(o => o.id === newOT)
            if (!ot || ot.operations.length === 0) return null
            return (
              <div className="form-field full-width">
                <span>Opérations effectuées</span>
                <div className="ops-checklist">
                  {ot.operations.map(wop => {
                    const op = retrofitOperations.find(o => o.id === wop.operationId)
                    const isChecked = newOps.includes(wop.operationId)
                    const isExpanded = expandedOp === wop.operationId && isChecked
                    return (
                      <div key={wop.operationId} className="op-checklist-item">
                        <div className="op-checklist-header">
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                if (e.target.checked) {
                                  setNewOps(prev => [...prev, wop.operationId])
                                  setExpandedOp(wop.operationId)
                                } else {
                                  setNewOps(prev => prev.filter(id => id !== wop.operationId))
                                  if (expandedOp === wop.operationId) setExpandedOp(null)
                                }
                              }}
                            />
                            {op?.title ?? wop.operationId}
                          </label>
                          {isChecked && op?.steps && (
                            <button
                              type="button"
                              className="btn-expand"
                              onClick={() => setExpandedOp(isExpanded ? null : wop.operationId)}
                            >
                              {isExpanded ? '▲ Masquer étapes' : '▼ Détailler étapes'}
                            </button>
                          )}
                        </div>
                        {isExpanded && op?.steps && (
                          <div className="step-details">
                            {op.steps.map((stepText, idx) => {
                              const sd = stepData[wop.operationId]?.[idx]
                              return (
                                <div key={idx} className="step-row">
                                  <div className="step-label">
                                    <span className="step-number">{idx + 1}</span>
                                    <span>{stepText}</span>
                                  </div>
                                  <div className="step-inputs">
                                    <div className="step-photo-zone">
                                      {sd?.photo ? (
                                        <div className="step-photo-preview">
                                          <img src={sd.photo} alt={`Étape ${idx + 1}`} />
                                          <button type="button" className="step-photo-remove" onClick={() => removePhoto(wop.operationId, idx)}>✕</button>
                                        </div>
                                      ) : (
                                        <button type="button" className="step-photo-btn" onClick={() => handlePhotoCapture(wop.operationId, idx)}>📷 Photo</button>
                                      )}
                                    </div>
                                    <input
                                      className="step-comment-input"
                                      type="text"
                                      placeholder="Commentaire…"
                                      value={sd?.commentaire ?? ''}
                                      onChange={e => updateStepData(wop.operationId, idx, 'commentaire', e.target.value)}
                                    />
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
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
