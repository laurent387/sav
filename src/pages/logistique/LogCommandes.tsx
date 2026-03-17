import { useState } from 'react'
import { Modal } from '../../components/Modal'

interface Commande {
  id: string
  date: string
  fournisseur: string
  references: { designation: string; reference: string; quantite: number; prixUnit: number }[]
  statut: 'brouillon' | 'envoyee' | 'confirmee' | 'livree'
  dateEstimee?: string
}

const initialCommandes: Commande[] = [
  {
    id: 'CMD-2026-001',
    date: '2026-03-10',
    fournisseur: 'ALSTOM Parts',
    references: [
      { designation: 'Motorisation Z', reference: '109414-0003-3200', quantite: 2, prixUnit: 1250 },
      { designation: 'Bord sensible', reference: 'ELE016/020A0V3', quantite: 3, prixUnit: 380 },
    ],
    statut: 'envoyee',
    dateEstimee: '2026-04-01',
  },
  {
    id: 'CMD-2026-002',
    date: '2026-03-12',
    fournisseur: 'SKF',
    references: [
      { designation: 'Chariot rotation CF10', reference: 'CF10', quantite: 4, prixUnit: 560 },
    ],
    statut: 'confirmee',
    dateEstimee: '2026-03-25',
  },
  {
    id: 'CMD-2026-003',
    date: '2026-03-15',
    fournisseur: 'Visserie Express',
    references: [
      { designation: 'VIS M4X20 NOIR', reference: 'ISO_07380', quantite: 100, prixUnit: 0.12 },
      { designation: 'ECROU M6', reference: 'ISO_04032', quantite: 200, prixUnit: 0.08 },
      { designation: 'Rondelle Cs M6', reference: 'ISO_645156', quantite: 100, prixUnit: 0.05 },
    ],
    statut: 'brouillon',
  },
]

const statusLabels: Record<Commande['statut'], string> = {
  brouillon: 'Brouillon',
  envoyee: 'Envoyée',
  confirmee: 'Confirmée',
  livree: 'Livrée',
}

const statusPill: Record<Commande['statut'], string> = {
  brouillon: 'neutral',
  envoyee: 'warning',
  confirmee: 'accent',
  livree: 'controlled',
}

export function LogCommandes() {
  const [commandes, setCommandes] = useState(initialCommandes)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState('Toutes')

  // Create form
  const [newFournisseur, setNewFournisseur] = useState('')
  const [newLines, setNewLines] = useState([{ designation: '', reference: '', quantite: 1, prixUnit: 0 }])

  const filtered = filter === 'Toutes' ? commandes : commandes.filter(c => c.statut === filter)
  const selected = selectedId ? commandes.find(c => c.id === selectedId) : null

  function addLine() {
    setNewLines(prev => [...prev, { designation: '', reference: '', quantite: 1, prixUnit: 0 }])
  }

  function updateLine(index: number, field: string, value: string | number) {
    setNewLines(prev => prev.map((l, i) => i === index ? { ...l, [field]: value } : l))
  }

  function removeLine(index: number) {
    setNewLines(prev => prev.filter((_, i) => i !== index))
  }

  function handleCreate() {
    if (!newFournisseur.trim() || newLines.length === 0) return
    const validLines = newLines.filter(l => l.designation.trim() && l.quantite > 0)
    if (validLines.length === 0) return
    const cmd: Commande = {
      id: `CMD-2026-${String(commandes.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString().slice(0, 10),
      fournisseur: newFournisseur,
      references: validLines,
      statut: 'brouillon',
    }
    setCommandes(prev => [cmd, ...prev])
    setShowCreate(false)
    setNewFournisseur('')
    setNewLines([{ designation: '', reference: '', quantite: 1, prixUnit: 0 }])
  }

  function updateStatus(id: string, newStatus: Commande['statut']) {
    setCommandes(prev => prev.map(c => c.id === id ? { ...c, statut: newStatus } : c))
  }

  const totalEnCours = commandes
    .filter(c => c.statut !== 'livree')
    .reduce((s, c) => s + c.references.reduce((s2, r) => s2 + r.quantite * r.prixUnit, 0), 0)

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">Logistique</p>
          <h1 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)' }}>Commandes fournisseurs</h1>
        </div>
        <div className="header-actions">
          <button type="button" className="primary-action" onClick={() => setShowCreate(true)}>+ Nouvelle commande</button>
        </div>
      </div>

      <div className="kpi-grid kpi-grid-3">
        <article className="kpi-card">
          <div>
            <span className="kpi-label">Commandes</span>
            <strong className="kpi-value">{commandes.length}</strong>
          </div>
        </article>
        <article className="kpi-card kpi-warning">
          <div>
            <span className="kpi-label">En attente</span>
            <strong className="kpi-value">{commandes.filter(c => c.statut === 'envoyee' || c.statut === 'confirmee').length}</strong>
          </div>
        </article>
        <article className="kpi-card">
          <div>
            <span className="kpi-label">Total en cours</span>
            <strong className="kpi-value">{totalEnCours.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</strong>
          </div>
        </article>
      </div>

      <div className="filters" style={{ marginBottom: 20 }}>
        {(['Toutes', 'brouillon', 'envoyee', 'confirmee', 'livree'] as const).map(s => (
          <button key={s} type="button" className={`view-chip${filter === s ? ' active' : ''}`} onClick={() => setFilter(s)}>
            {s === 'Toutes' ? 'Toutes' : statusLabels[s]}
          </button>
        ))}
      </div>

      <div className="commandes-layout">
        <div className="commandes-list">
          {filtered.map(cmd => {
            const total = cmd.references.reduce((s, r) => s + r.quantite * r.prixUnit, 0)
            return (
              <article
                key={cmd.id}
                className={`commande-card${selectedId === cmd.id ? ' selected' : ''}`}
                onClick={() => setSelectedId(cmd.id === selectedId ? null : cmd.id)}
              >
                <div className="commande-header">
                  <div>
                    <span className="row-id">{cmd.id}</span>
                    <h3>{cmd.fournisseur}</h3>
                  </div>
                  <span className={`pill ${statusPill[cmd.statut]}`}>{statusLabels[cmd.statut]}</span>
                </div>
                <div className="commande-footer">
                  <span className="op-meta">{cmd.date} · {cmd.references.length} réf.</span>
                  <strong>{total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</strong>
                </div>
              </article>
            )
          })}
        </div>

        {selected && (
          <aside className="detail-card">
            <div className="detail-header">
              <div>
                <span className="row-id">{selected.id}</span>
                <h3>{selected.fournisseur}</h3>
              </div>
              <select
                className="status-select"
                value={selected.statut}
                onChange={e => updateStatus(selected.id, e.target.value as Commande['statut'])}
              >
                {Object.entries(statusLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <dl className="detail-grid">
              <div><dt>Date</dt><dd>{selected.date}</dd></div>
              <div><dt>Livraison estimée</dt><dd>{selected.dateEstimee || '—'}</dd></div>
            </dl>
            <div className="detail-block">
              <h4>Lignes de commande</h4>
              <table className="data-table compact">
                <thead>
                  <tr><th>Désignation</th><th>Réf.</th><th>Qté</th><th>P.U.</th><th>Total</th></tr>
                </thead>
                <tbody>
                  {selected.references.map((r, i) => (
                    <tr key={i}>
                      <td>{r.designation}</td>
                      <td className="op-meta">{r.reference}</td>
                      <td>{r.quantite}</td>
                      <td>{r.prixUnit.toFixed(2)} €</td>
                      <td><strong>{(r.quantite * r.prixUnit).toFixed(2)} €</strong></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4}><strong>Total</strong></td>
                    <td><strong>{selected.references.reduce((s, r) => s + r.quantite * r.prixUnit, 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </aside>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouvelle commande" wide>
        <form className="form-grid" onSubmit={e => { e.preventDefault(); handleCreate() }}>
          <label className="form-field full-width">
            <span>Fournisseur</span>
            <input type="text" value={newFournisseur} onChange={e => setNewFournisseur(e.target.value)} required placeholder="Nom du fournisseur" />
          </label>

          <div className="form-field full-width">
            <span>Lignes de commande</span>
            {newLines.map((line, i) => (
              <div key={i} className="cmd-line">
                <input type="text" placeholder="Désignation" value={line.designation} onChange={e => updateLine(i, 'designation', e.target.value)} />
                <input type="text" placeholder="Référence" value={line.reference} onChange={e => updateLine(i, 'reference', e.target.value)} />
                <input type="number" placeholder="Qté" min={1} value={line.quantite} onChange={e => updateLine(i, 'quantite', parseInt(e.target.value) || 0)} style={{ width: 80 }} />
                <input type="number" placeholder="P.U. €" step="0.01" min={0} value={line.prixUnit} onChange={e => updateLine(i, 'prixUnit', parseFloat(e.target.value) || 0)} style={{ width: 100 }} />
                {newLines.length > 1 && (
                  <button type="button" className="btn-icon" onClick={() => removeLine(i)}>✕</button>
                )}
              </div>
            ))}
            <button type="button" className="secondary-action" style={{ marginTop: 8 }} onClick={addLine}>+ Ajouter une ligne</button>
          </div>

          <div className="form-actions">
            <button type="button" className="secondary-action" onClick={() => setShowCreate(false)}>Annuler</button>
            <button type="submit" className="primary-action">Créer la commande</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
