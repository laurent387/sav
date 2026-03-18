import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { type FNC } from '../../data'
import { useGmaoData } from '../../contexts/DataContext'
import { ApiService } from '../../services/api'

type FncStatus = FNC['status']

const statusLabel: Record<FncStatus, string> = {
  ouverte: 'Ouverte',
  traitee: 'Traitée',
  cloturee: 'Clôturée',
}

const statusPill: Record<FncStatus, string> = {
  ouverte: 'pill danger',
  traitee: 'pill warning',
  cloturee: 'pill controlled',
}

const severityOptions = ['Mineure', 'Majeure', 'Critique'] as const
type Severity = typeof severityOptions[number]

const categoryOptions = ['Pièce défectueuse', 'Vibration', 'Défaut visuel', 'Non-conformité dimensionnelle', 'Problème électrique', 'Autre'] as const

interface FNCExtended extends FNC {
  severity?: Severity
  category?: string
  correctiveAction?: string
  responsible?: string
  closedDate?: string
  photos?: string[]
}

export function FNCPage({ role }: { role: string }) {
  const { fncs, workOrders, liftUnits, technicians, refresh } = useGmaoData()
  const [fncList, setFncList] = useState<FNCExtended[]>(
    fncs.map(f => ({ ...f, severity: (f as any).severity ?? 'Majeure' as Severity, category: (f as any).category ?? 'Vibration' }))
  )
  const [statusFilter, setStatusFilter] = useState<'Tous' | FncStatus>('Tous')
  const [search, setSearch] = useState('')
  const [selectedFnc, setSelectedFnc] = useState<FNCExtended | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState<FNCExtended | null>(null)

  // New FNC form state
  const [newFnc, setNewFnc] = useState({
    workOrderId: '',
    partReference: '',
    description: '',
    severity: 'Majeure' as Severity,
    category: categoryOptions[0] as string,
  })

  const filtered = fncList.filter(f => {
    const matchStatus = statusFilter === 'Tous' || f.status === statusFilter
    const q = search.trim().toLowerCase()
    const matchSearch = !q || [f.id, f.partReference, f.description, f.workOrderId].join(' ').toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  const openCount = fncList.filter(f => f.status === 'ouverte').length
  const treatedCount = fncList.filter(f => f.status === 'traitee').length
  const closedCount = fncList.filter(f => f.status === 'cloturee').length

  async function createFnc() {
    if (!newFnc.description.trim() || !newFnc.partReference.trim()) return
    const id = `FNC-${new Date().getFullYear()}-${String(fncList.length + 1).padStart(3, '0')}`
    const payload = {
      id,
      workOrderId: newFnc.workOrderId || null,
      date: new Date().toISOString().slice(0, 10),
      partReference: newFnc.partReference,
      description: newFnc.description,
      status: 'ouverte',
      severity: newFnc.severity,
      category: newFnc.category,
    }
    try {
      await ApiService.createFnc(payload)
      await refresh()
      setFncList(prev => [{ ...payload, workOrderId: payload.workOrderId ?? '—' } as FNCExtended, ...prev])
    } catch (err) {
      console.error('Erreur création FNC:', err)
    }
    setShowCreate(false)
    setNewFnc({ workOrderId: '', partReference: '', description: '', severity: 'Majeure', category: categoryOptions[0] })
  }

  function updateStatus(fncId: string, newStatus: FncStatus) {
    setFncList(prev => prev.map(f =>
      f.id === fncId
        ? { ...f, status: newStatus, closedDate: newStatus === 'cloturee' ? new Date().toISOString().slice(0, 10) : f.closedDate }
        : f
    ))
    if (selectedFnc?.id === fncId) {
      setSelectedFnc(prev => prev ? { ...prev, status: newStatus } : null)
    }
  }

  function saveCorrectiveAction(fncId: string, action: string, responsible: string) {
    setFncList(prev => prev.map(f =>
      f.id === fncId ? { ...f, correctiveAction: action, responsible } : f
    ))
    setShowEdit(null)
  }

  function getLinkedOT(otId: string) {
    return workOrders.find(o => o.id === otId)
  }

  function getLinkedUnit(otId: string) {
    const ot = getLinkedOT(otId)
    if (!ot) return null
    return liftUnits.find(u => u.id === ot.unitId)
  }

  const canEdit = role === 'admin' || role === 'bureau-etude'

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">Qualité</p>
          <h2>Fiches de Non-Conformité</h2>
        </div>
        <div className="header-actions">
          <button type="button" className="btn-sm primary-action" onClick={() => setShowCreate(true)}>
            + Nouvelle FNC
          </button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="kpi-grid-3">
        <article className="kpi-card kpi-warning">
          <span className="kpi-icon">🔴</span>
          <div>
            <span className="kpi-label">Ouvertes</span>
            <strong className="kpi-value">{openCount}</strong>
            <span className="kpi-detail">À traiter en priorité</span>
          </div>
        </article>
        <article className="kpi-card">
          <span className="kpi-icon">🟡</span>
          <div>
            <span className="kpi-label">En traitement</span>
            <strong className="kpi-value">{treatedCount}</strong>
            <span className="kpi-detail">Action corrective en cours</span>
          </div>
        </article>
        <article className="kpi-card kpi-accent">
          <span className="kpi-icon">🟢</span>
          <div>
            <span className="kpi-label">Clôturées</span>
            <strong className="kpi-value">{closedCount}</strong>
            <span className="kpi-detail">Résolues et archivées</span>
          </div>
        </article>
      </div>

      {/* Filters */}
      <section className="panel">
        <div className="filters" style={{ justifyContent: 'start' }}>
          <input
            className="search-input"
            type="search"
            placeholder="Rechercher par ID, pièce, OT, description…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="status-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as 'Tous' | FncStatus)}
          >
            <option value="Tous">Tous statuts</option>
            <option value="ouverte">Ouvertes</option>
            <option value="traitee">En traitement</option>
            <option value="cloturee">Clôturées</option>
          </select>
        </div>
      </section>

      {/* FNC List */}
      <div className="fnc-grid">
        {filtered.length === 0 ? (
          <p style={{ color: 'var(--text-subtle)', padding: 20, textAlign: 'center', gridColumn: '1 / -1' }}>
            Aucune FNC trouvée
          </p>
        ) : (
          filtered.map(fnc => {
            const ot = getLinkedOT(fnc.workOrderId)
            const unit = getLinkedUnit(fnc.workOrderId)
            return (
              <article
                key={fnc.id}
                className="fnc-card"
                onClick={() => setSelectedFnc(fnc)}
                role="button"
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter') setSelectedFnc(fnc) }}
              >
                <div className="fnc-card-header">
                  <div>
                    <span className="row-id">{fnc.id}</span>
                    <h3>{fnc.description.length > 80 ? fnc.description.slice(0, 80) + '…' : fnc.description}</h3>
                  </div>
                  <span className={statusPill[fnc.status]}>{statusLabel[fnc.status]}</span>
                </div>

                <div className="fnc-card-body">
                  <div className="fnc-tags">
                    <span className="pill neutral">{fnc.partReference}</span>
                    {fnc.severity && (
                      <span className={`pill ${fnc.severity === 'Critique' ? 'danger' : fnc.severity === 'Majeure' ? 'warning' : 'neutral'}`}>
                        {fnc.severity}
                      </span>
                    )}
                    {fnc.category && <span className="pill accent">{fnc.category}</span>}
                  </div>

                  <div className="fnc-card-meta">
                    <span>📅 {fnc.date}</span>
                    {ot && <span>🔧 {ot.id} · {ot.site}</span>}
                    {unit && <span>🏭 {unit.id} · PF {unit.partieFixeId} · PM {unit.partieMobileId}</span>}
                  </div>
                </div>

                {fnc.correctiveAction && (
                  <div className="fnc-card-action">
                    <span className="fnc-action-label">Action corrective :</span>
                    <span>{fnc.correctiveAction.slice(0, 60)}{fnc.correctiveAction.length > 60 ? '…' : ''}</span>
                  </div>
                )}
              </article>
            )
          })
        )}
      </div>

      {/* ═══════════ DETAIL MODAL ═══════════ */}
      <Modal open={!!selectedFnc} onClose={() => setSelectedFnc(null)} title={selectedFnc?.id ?? 'FNC'} wide>
        {selectedFnc && (() => {
          const ot = getLinkedOT(selectedFnc.workOrderId)
          const unit = getLinkedUnit(selectedFnc.workOrderId)
          const techs = ot ? ot.technicianIds.map(id => technicians.find(t => t.id === id)?.name).filter(Boolean) : []

          return (
            <div className="fnc-detail">
              <div className="fnc-detail-status">
                <span className={statusPill[selectedFnc.status]} style={{ fontSize: '0.9rem', padding: '8px 16px' }}>
                  {statusLabel[selectedFnc.status]}
                </span>
                {selectedFnc.severity && (
                  <span className={`pill ${selectedFnc.severity === 'Critique' ? 'danger' : selectedFnc.severity === 'Majeure' ? 'warning' : 'neutral'}`}>
                    Sévérité : {selectedFnc.severity}
                  </span>
                )}
                {selectedFnc.category && <span className="pill accent">{selectedFnc.category}</span>}
              </div>

              <section className="fnc-detail-section">
                <h4>Description</h4>
                <p>{selectedFnc.description}</p>
              </section>

              <div className="detail-grid">
                <div>
                  <dt>Référence pièce</dt>
                  <dd><strong>{selectedFnc.partReference}</strong></dd>
                </div>
                <div>
                  <dt>Date de création</dt>
                  <dd>{selectedFnc.date}</dd>
                </div>
                <div>
                  <dt>OT lié</dt>
                  <dd>
                    {ot ? (
                      <span>{ot.id}</span>
                    ) : (
                      <span style={{ color: 'var(--text-subtle)' }}>Aucun OT lié</span>
                    )}
                  </dd>
                </div>
                {ot && <div><dt>Site</dt><dd>{ot.site}</dd></div>}
                {ot && <div><dt>Ville</dt><dd>{ot.city}</dd></div>}
                <div>
                  <dt>Unité LIFT</dt>
                  <dd>
                    {unit ? (
                      <span>{unit.id}</span>
                    ) : (
                      <span style={{ color: 'var(--text-subtle)' }}>—</span>
                    )}
                  </dd>
                </div>
                {unit && <div><dt>Partie Fixe</dt><dd>{unit.partieFixeId}</dd></div>}
                {unit && <div><dt>Partie Mobile</dt><dd>{unit.partieMobileId}</dd></div>}
                {techs.length > 0 && (
                  <div>
                    <dt>Technicien(s)</dt>
                    <dd>{techs.join(', ')}</dd>
                  </div>
                )}
                {selectedFnc.closedDate && (
                  <div>
                    <dt>Date de clôture</dt>
                    <dd>{selectedFnc.closedDate}</dd>
                  </div>
                )}
              </div>

              {selectedFnc.correctiveAction && (
                <section className="fnc-detail-section">
                  <h4>Action corrective</h4>
                  <p>{selectedFnc.correctiveAction}</p>
                  {selectedFnc.responsible && (
                    <p className="text-muted">Responsable : {selectedFnc.responsible}</p>
                  )}
                </section>
              )}

              {/* Action buttons */}
              <div className="fnc-detail-actions">
                {selectedFnc.status === 'ouverte' && canEdit && (
                  <>
                    <button
                      type="button"
                      className="btn-sm primary-action"
                      onClick={() => { setShowEdit(selectedFnc); setSelectedFnc(null) }}
                    >
                      ✏️ Traiter cette FNC
                    </button>
                    <button
                      type="button"
                      className="btn-sm secondary-action"
                      onClick={() => updateStatus(selectedFnc.id, 'traitee')}
                    >
                      Passer en traitement
                    </button>
                  </>
                )}
                {selectedFnc.status === 'traitee' && canEdit && (
                  <>
                    <button
                      type="button"
                      className="btn-sm primary-action"
                      onClick={() => updateStatus(selectedFnc.id, 'cloturee')}
                    >
                      ✅ Clôturer
                    </button>
                    <button
                      type="button"
                      className="btn-sm secondary-action"
                      onClick={() => { setShowEdit(selectedFnc); setSelectedFnc(null) }}
                    >
                      ✏️ Modifier l'action corrective
                    </button>
                  </>
                )}
                {selectedFnc.status === 'cloturee' && canEdit && (
                  <button
                    type="button"
                    className="btn-sm secondary-action"
                    onClick={() => updateStatus(selectedFnc.id, 'ouverte')}
                  >
                    🔄 Rouvrir
                  </button>
                )}
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* ═══════════ CREATE MODAL ═══════════ */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouvelle Fiche de Non-Conformité" wide>
        <div className="form-grid">
          <div className="form-field">
            <label>OT lié</label>
            <select value={newFnc.workOrderId} onChange={e => setNewFnc(p => ({ ...p, workOrderId: e.target.value }))}>
              <option value="">— Aucun OT —</option>
              {workOrders.map(ot => (
                <option key={ot.id} value={ot.id}>{ot.id} · {ot.site} · {ot.city}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>Référence pièce *</label>
            <input
              type="text"
              value={newFnc.partReference}
              onChange={e => setNewFnc(p => ({ ...p, partReference: e.target.value }))}
              placeholder="Ex: 109414-0003-3200"
            />
          </div>
          <div className="form-field">
            <label>Sévérité</label>
            <select value={newFnc.severity} onChange={e => setNewFnc(p => ({ ...p, severity: e.target.value as Severity }))}>
              {severityOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Catégorie</label>
            <select value={newFnc.category} onChange={e => setNewFnc(p => ({ ...p, category: e.target.value }))}>
              {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-field full-width">
            <label>Description de la non-conformité *</label>
            <textarea
              rows={4}
              value={newFnc.description}
              onChange={e => setNewFnc(p => ({ ...p, description: e.target.value }))}
              placeholder="Décrivez la non-conformité constatée, les conditions de détection, l'impact potentiel…"
            />
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn-sm secondary-action" onClick={() => setShowCreate(false)}>Annuler</button>
          <button
            type="button"
            className="btn-sm primary-action"
            onClick={createFnc}
            disabled={!newFnc.description.trim() || !newFnc.partReference.trim()}
          >
            Créer la FNC
          </button>
        </div>
      </Modal>

      {/* ═══════════ EDIT / TREAT MODAL ═══════════ */}
      <Modal open={!!showEdit} onClose={() => setShowEdit(null)} title={`Traiter ${showEdit?.id ?? ''}`} wide>
        {showEdit && <TreatFNCForm fnc={showEdit} onSave={saveCorrectiveAction} onCancel={() => setShowEdit(null)} />}
      </Modal>
    </div>
  )
}

function TreatFNCForm({ fnc, onSave, onCancel }: { fnc: FNCExtended; onSave: (id: string, action: string, responsible: string) => void; onCancel: () => void }) {
  const { technicians } = useGmaoData()
  const [action, setAction] = useState(fnc.correctiveAction || '')
  const [responsible, setResponsible] = useState(fnc.responsible || '')

  return (
    <>
      <section className="fnc-detail-section" style={{ marginBottom: 20 }}>
        <h4>Non-conformité</h4>
        <p>{fnc.description}</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <span className="pill neutral">{fnc.partReference}</span>
          <span className="pill neutral">{fnc.date}</span>
        </div>
      </section>

      <div className="form-grid">
        <div className="form-field full-width">
          <label>Action corrective *</label>
          <textarea
            rows={4}
            value={action}
            onChange={e => setAction(e.target.value)}
            placeholder="Décrivez l'action corrective à mettre en place…"
          />
        </div>
        <div className="form-field full-width">
          <label>Responsable de l'action</label>
          <select value={responsible} onChange={e => setResponsible(e.target.value)}>
            <option value="">— Sélectionner —</option>
            {technicians.map(t => <option key={t.id} value={t.name}>{t.name} — {t.skill}</option>)}
          </select>
        </div>
      </div>
      <div className="form-actions">
        <button type="button" className="btn-sm secondary-action" onClick={onCancel}>Annuler</button>
        <button
          type="button"
          className="btn-sm primary-action"
          onClick={() => onSave(fnc.id, action, responsible)}
          disabled={!action.trim()}
        >
          Enregistrer
        </button>
      </div>
    </>
  )
}
