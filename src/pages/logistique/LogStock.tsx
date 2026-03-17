import { useMemo, useState } from 'react'
import { Modal } from '../../components/Modal'
import { useGmaoData } from '../../contexts/DataContext'

interface StockItem {
  id: string
  designation: string
  reference: string
  stockActuel: number
  stockMin: number
  emplacement: string
  fournisseur: string
  prixUnit: number
  derniereReception?: string
}

const baseStock: StockItem[] = [
  { id: 'STK-001', designation: 'Motorisation Z 109414-0003-3200', reference: '109414-0003-3200', stockActuel: 0, stockMin: 2, emplacement: 'Magasin Paris A3', fournisseur: 'ALSTOM Parts', prixUnit: 1250 },
  { id: 'STK-002', designation: 'Bord sensible ELE016/020A0V3', reference: 'ELE016/020A0V3', stockActuel: 1, stockMin: 3, emplacement: 'Magasin Bordeaux B1', fournisseur: 'ALSTOM Parts', prixUnit: 380 },
  { id: 'STK-003', designation: 'Chariot rotation CF10', reference: 'CF10', stockActuel: 2, stockMin: 4, emplacement: 'Magasin Paris A1', fournisseur: 'SKF', prixUnit: 560 },
  { id: 'STK-004', designation: 'VIS M4X20 NOIR', reference: 'ISO_07380', stockActuel: 150, stockMin: 50, emplacement: 'Magasin Paris C2', fournisseur: 'Visserie Express', prixUnit: 0.12 },
  { id: 'STK-005', designation: 'ECROU M6', reference: 'ISO_04032', stockActuel: 200, stockMin: 80, emplacement: 'Magasin Paris C2', fournisseur: 'Visserie Express', prixUnit: 0.08 },
  { id: 'STK-006', designation: 'Rondelle Cs M6', reference: 'ISO_645156', stockActuel: 180, stockMin: 60, emplacement: 'Magasin Paris C2', fournisseur: 'Visserie Express', prixUnit: 0.05 },
  { id: 'STK-007', designation: 'VIS TETE H M06X30', reference: 'ISO_1234', stockActuel: 45, stockMin: 20, emplacement: 'Magasin Lyon B3', fournisseur: 'Visserie Express', prixUnit: 0.18 },
  { id: 'STK-008', designation: 'Came ref 4206', reference: '4206', stockActuel: 3, stockMin: 2, emplacement: 'Magasin Paris A2', fournisseur: 'ALSTOM Parts', prixUnit: 95 },
]

const knownRefs = ['109414-0003-3200', 'ELE016/020A0V3', 'CF10', 'ISO_07380', 'ISO_04032', 'ISO_645156', 'ISO_1234', '4206']

export function LogStock() {
  const { partsAlerts, retrofitOperations } = useGmaoData()
  const initialStock = useMemo(() => [
    ...baseStock,
    ...retrofitOperations.flatMap(op => op.parts).filter((p, i, arr) =>
      arr.findIndex(x => x.reference === p.reference) === i &&
      !knownRefs.includes(p.reference)
    ).map((p, i) => ({
      id: `STK-${String(9 + i).padStart(3, '0')}`,
      designation: p.designation,
      reference: p.reference,
      stockActuel: Math.floor(Math.random() * 50) + 5,
      stockMin: 10,
      emplacement: 'Magasin Paris',
      fournisseur: 'Divers',
      prixUnit: Math.round(Math.random() * 20 * 100) / 100,
    })),
  ], [retrofitOperations])
  const [stock, setStock] = useState(initialStock)
  const [search, setSearch] = useState('')
  const [showLow, setShowLow] = useState(false)
  const [showReception, setShowReception] = useState(false)
  const [receptionItem, setReceptionItem] = useState<StockItem | null>(null)
  const [receptionQty, setReceptionQty] = useState('')

  const filtered = stock.filter(s => {
    const q = search.trim().toLowerCase()
    const matchSearch = !q || [s.designation, s.reference, s.emplacement].join(' ').toLowerCase().includes(q)
    const matchLow = !showLow || s.stockActuel <= s.stockMin
    return matchSearch && matchLow
  })

  const lowStockCount = stock.filter(s => s.stockActuel <= s.stockMin).length
  const totalValue = stock.reduce((s, item) => s + item.stockActuel * item.prixUnit, 0)

  function openReception(item: StockItem) {
    setReceptionItem(item)
    setReceptionQty('')
    setShowReception(true)
  }

  function handleReception() {
    if (!receptionItem || !receptionQty) return
    const qty = parseInt(receptionQty)
    if (isNaN(qty) || qty <= 0) return
    setStock(prev => prev.map(s =>
      s.id === receptionItem.id
        ? { ...s, stockActuel: s.stockActuel + qty, derniereReception: new Date().toISOString().slice(0, 10) }
        : s
    ))
    setShowReception(false)
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">Logistique</p>
          <h1 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)' }}>Gestion des stocks</h1>
        </div>
      </div>

      <div className="kpi-grid kpi-grid-3">
        <article className="kpi-card">
          <div>
            <span className="kpi-label">Références</span>
            <strong className="kpi-value">{stock.length}</strong>
          </div>
        </article>
        <article className={`kpi-card ${lowStockCount > 0 ? 'kpi-warning' : ''}`}>
          <div>
            <span className="kpi-label">Sous seuil</span>
            <strong className="kpi-value">{lowStockCount}</strong>
          </div>
        </article>
        <article className="kpi-card">
          <div>
            <span className="kpi-label">Valeur stock</span>
            <strong className="kpi-value">{totalValue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</strong>
          </div>
        </article>
      </div>

      <div className="filters" style={{ marginBottom: 20 }}>
        <input className="search-input" type="search" placeholder="Rechercher pièce, référence…" value={search} onChange={e => setSearch(e.target.value)} />
        <button
          type="button"
          className={`view-chip${showLow ? ' active' : ''}`}
          onClick={() => setShowLow(!showLow)}
        >
          {showLow ? `Sous seuil (${lowStockCount})` : 'Filtrer sous-seuil'}
        </button>
      </div>

      <section className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Désignation</th>
              <th>Référence</th>
              <th>Stock</th>
              <th>Seuil</th>
              <th>Emplacement</th>
              <th>Fournisseur</th>
              <th>P.U.</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id} className={item.stockActuel <= item.stockMin ? 'row-alert' : ''}>
                <td><strong>{item.designation}</strong></td>
                <td className="op-meta">{item.reference}</td>
                <td>
                  <span className={`pill ${item.stockActuel === 0 ? 'danger' : item.stockActuel <= item.stockMin ? 'warning' : 'accent'}`}>
                    {item.stockActuel}
                  </span>
                </td>
                <td>{item.stockMin}</td>
                <td className="op-meta">{item.emplacement}</td>
                <td className="op-meta">{item.fournisseur}</td>
                <td className="op-meta">{item.prixUnit.toFixed(2)} €</td>
                <td>
                  <button type="button" className="btn-sm primary-action" onClick={() => openReception(item)}>
                    + Réception
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Alertes liées aux OT */}
      {partsAlerts.length > 0 && (
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Urgences OT</p>
              <h2>Pièces en alerte liées aux OT</h2>
            </div>
          </div>
          <div className="compact-list">
            {partsAlerts.map(p => (
              <div key={p.id} className="compact-item alert-item">
                <div>
                  <strong>{p.designation}</strong>
                  <span className="op-meta">{p.reference} · OT {p.linkedOT} · {p.site}</span>
                </div>
                <span className={`pill ${p.stockActuel === 0 ? 'danger' : 'warning'}`}>
                  {p.stockActuel === 0 ? 'RUPTURE' : `${p.stockActuel}/${p.stockMin}`}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <Modal open={showReception} onClose={() => setShowReception(false)} title="Réception de pièces">
        {receptionItem && (
          <form className="form-grid" onSubmit={e => { e.preventDefault(); handleReception() }}>
            <div className="reception-info">
              <strong>{receptionItem.designation}</strong>
              <span className="op-meta">{receptionItem.reference}</span>
              <span>Stock actuel : <strong>{receptionItem.stockActuel}</strong></span>
            </div>
            <label className="form-field">
              <span>Quantité reçue</span>
              <input type="number" min="1" value={receptionQty} onChange={e => setReceptionQty(e.target.value)} required autoFocus />
            </label>
            <div className="form-actions">
              <button type="button" className="secondary-action" onClick={() => setShowReception(false)}>Annuler</button>
              <button type="submit" className="primary-action">Valider réception</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
