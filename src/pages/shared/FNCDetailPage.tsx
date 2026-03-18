import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { type FNC } from '../../data'
import { useGmaoData } from '../../contexts/DataContext'

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

interface FNCExtended extends FNC {
  severity?: string
  category?: string
  correctiveAction?: string
  responsible?: string
  closedDate?: string
}

interface Props {
  fncId: string
  onBack: () => void
  onNavigateOT?: (id: string) => void
}

export function FNCDetailPage({ fncId, onBack, onNavigateOT }: Props) {
  const { fncs, workOrders, liftUnits, technicians } = useGmaoData()
  const [showEdit, setShowEdit] = useState(false)

  const rawFnc = fncs.find(f => f.id === fncId)
  const [localFnc, setLocalFnc] = useState<FNCExtended | null>(
    rawFnc ? { ...rawFnc, severity: (rawFnc as any).severity ?? 'Majeure', category: (rawFnc as any).category ?? '' } : null
  )

  if (!localFnc) {
    return (
      <div className="page-content">
        <button type="button" className="btn-back" onClick={onBack}>← Retour</button>
        <section className="panel" style={{ textAlign: 'center', padding: 60 }}>
          <h2>FNC introuvable</h2>
          <p style={{ color: 'var(--text-subtle)' }}>La fiche {fncId} n'existe pas.</p>
        </section>
      </div>
    )
  }

  const ot = workOrders.find(o => o.id === localFnc.workOrderId)
  const unit = ot ? liftUnits.find(u => u.id === ot.unitId) : null
  const techs = ot ? ot.technicianIds.map(id => technicians.find(t => t.id === id)).filter(Boolean) : []

  function updateStatus(newStatus: FncStatus) {
    setLocalFnc(prev => prev ? {
      ...prev,
      status: newStatus,
      closedDate: newStatus === 'cloturee' ? new Date().toISOString().slice(0, 10) : prev.closedDate,
    } : null)
  }

  function saveCorrectiveAction(action: string, responsible: string) {
    setLocalFnc(prev => prev ? { ...prev, correctiveAction: action, responsible } : null)
    setShowEdit(false)
  }

  return (
    <div className="page-content">
      <button type="button" className="btn-back" onClick={onBack}>← Retour à la liste</button>

      <div className="detail-page-header">
        <div>
          <p className="eyebrow">Fiche de Non-Conformité</p>
          <h1>{localFnc.id}</h1>
          <p className="detail-page-subtitle">{localFnc.description}</p>
        </div>
        <div className="detail-page-actions">
          <span className={statusPill[localFnc.status]} style={{ fontSize: '0.9rem', padding: '8px 16px' }}>
            {statusLabel[localFnc.status]}
          </span>
          {localFnc.severity && (
            <span className={`pill ${localFnc.severity === 'Critique' ? 'danger' : localFnc.severity === 'Majeure' ? 'warning' : 'neutral'}`}>
              {localFnc.severity}
            </span>
          )}
          {localFnc.category && <span className="pill accent">{localFnc.category}</span>}
        </div>
      </div>

      {/* Info grid */}
      <div className="detail-page-grid">
        <section className="panel detail-page-section">
          <h3>Informations</h3>
          <dl className="detail-grid">
            <div><dt>Référence pièce</dt><dd><strong>{localFnc.partReference}</strong></dd></div>
            <div><dt>Date de création</dt><dd>{localFnc.date}</dd></div>
            <div><dt>Statut</dt><dd><span className={statusPill[localFnc.status]}>{statusLabel[localFnc.status]}</span></dd></div>
            {localFnc.severity && <div><dt>Sévérité</dt><dd>{localFnc.severity}</dd></div>}
            {localFnc.category && <div><dt>Catégorie</dt><dd>{localFnc.category}</dd></div>}
            {localFnc.closedDate && <div><dt>Date clôture</dt><dd>{localFnc.closedDate}</dd></div>}
          </dl>
        </section>

        <section className="panel detail-page-section">
          <h3>OT lié</h3>
          {ot ? (
            <dl className="detail-grid">
              <div>
                <dt>Ordre de travail</dt>
                <dd>
                  <button type="button" className="link-btn" onClick={() => onNavigateOT?.(ot.id)}>
                    {ot.id}
                  </button>
                </dd>
              </div>
              <div><dt>Site</dt><dd>{ot.site}</dd></div>
              <div><dt>Ville</dt><dd>{ot.city}</dd></div>
              <div><dt>Client</dt><dd>{ot.client}</dd></div>
              <div><dt>Statut OT</dt><dd style={{ textTransform: 'capitalize' }}>{ot.status.replace(/-/g, ' ')}</dd></div>
            </dl>
          ) : (
            <p style={{ color: 'var(--text-subtle)' }}>Aucun OT lié</p>
          )}
        </section>
      </div>

      {/* Unit info */}
      {unit && (
        <section className="panel detail-page-section">
          <h3>Unité LIFT</h3>
          <dl className="detail-grid">
            <div><dt>Unité</dt><dd><strong>{unit.id}</strong></dd></div>
            <div><dt>Partie Fixe</dt><dd>{unit.partieFixeId}</dd></div>
            <div><dt>Partie Mobile</dt><dd>{unit.partieMobileId}</dd></div>
            <div><dt>Config actuelle</dt><dd>CONF {unit.currentConfig}</dd></div>
          </dl>
        </section>
      )}

      {/* Techniciens */}
      {techs.length > 0 && (
        <section className="panel detail-page-section">
          <h3>Techniciens concernés</h3>
          <div className="tech-chips">
            {techs.map(t => t && (
              <div key={t.id} className="tech-chip">
                <strong>{t.name}</strong>
                <span className="op-meta">{t.skill} · {t.city}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Corrective action */}
      <section className="panel detail-page-section">
        <h3>Action corrective</h3>
        {localFnc.correctiveAction ? (
          <div>
            <p>{localFnc.correctiveAction}</p>
            {localFnc.responsible && <p className="op-meta">Responsable : {localFnc.responsible}</p>}
          </div>
        ) : (
          <p style={{ color: 'var(--text-subtle)' }}>Aucune action corrective définie</p>
        )}
      </section>

      {/* Actions */}
      <section className="panel detail-page-section">
        <h3>Actions</h3>
        <div className="detail-page-action-bar">
          {localFnc.status === 'ouverte' && (
            <>
              <button type="button" className="btn-sm primary-action" onClick={() => setShowEdit(true)}>
                ✏️ Traiter cette FNC
              </button>
              <button type="button" className="btn-sm secondary-action" onClick={() => updateStatus('traitee')}>
                Passer en traitement
              </button>
            </>
          )}
          {localFnc.status === 'traitee' && (
            <>
              <button type="button" className="btn-sm primary-action" onClick={() => updateStatus('cloturee')}>
                ✅ Clôturer
              </button>
              <button type="button" className="btn-sm secondary-action" onClick={() => setShowEdit(true)}>
                ✏️ Modifier l'action
              </button>
            </>
          )}
          {localFnc.status === 'cloturee' && (
            <button type="button" className="btn-sm secondary-action" onClick={() => updateStatus('ouverte')}>
              🔄 Rouvrir
            </button>
          )}
        </div>
      </section>

      {/* Edit modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title={`Traiter ${localFnc.id}`} wide>
        <TreatForm fnc={localFnc} onSave={saveCorrectiveAction} onCancel={() => setShowEdit(false)} />
      </Modal>
    </div>
  )
}

function TreatForm({ fnc, onSave, onCancel }: { fnc: FNCExtended; onSave: (action: string, responsible: string) => void; onCancel: () => void }) {
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
          <textarea rows={4} value={action} onChange={e => setAction(e.target.value)} placeholder="Décrivez l'action corrective…" />
        </div>
        <div className="form-field full-width">
          <label>Responsable</label>
          <select value={responsible} onChange={e => setResponsible(e.target.value)}>
            <option value="">— Sélectionner —</option>
            {technicians.map(t => <option key={t.id} value={t.name}>{t.name} — {t.skill}</option>)}
          </select>
        </div>
      </div>
      <div className="form-actions">
        <button type="button" className="btn-sm secondary-action" onClick={onCancel}>Annuler</button>
        <button type="button" className="btn-sm primary-action" onClick={() => onSave(action, responsible)} disabled={!action.trim()}>
          Enregistrer
        </button>
      </div>
    </>
  )
}
