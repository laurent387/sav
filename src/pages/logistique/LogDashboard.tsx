import { liftUnits, workOrders, partsAlerts, retrofitOperations } from '../../data'

export function LogDashboard() {
  const unitsEnRetrofit = liftUnits.filter(u => u.status === 'en-retrofit').length
  const activeOTs = workOrders.filter(o => o.status === 'en-cours' || o.status === 'planifie').length
  const criticalAlerts = partsAlerts.filter(p => p.stockActuel === 0).length

  // Calculer les pièces nécessaires pour tous les OT en cours et planifiés
  const activeParts = workOrders
    .filter(o => o.status === 'en-cours' || o.status === 'planifie')
    .flatMap(ot => ot.operations.filter(op => op.status !== 'fait').flatMap(wop => {
      const op = retrofitOperations.find(o => o.id === wop.operationId)
      return op?.parts ?? []
    }))

  const partsSummary = new Map<string, { designation: string; reference: string; total: number }>()
  activeParts.forEach(p => {
    const existing = partsSummary.get(p.reference)
    if (existing) {
      existing.total += p.quantity
    } else {
      partsSummary.set(p.reference, { designation: p.designation, reference: p.reference, total: p.quantity })
    }
  })

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">Logistique</p>
          <h1 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)' }}>Tableau de bord logistique</h1>
        </div>
      </div>

      <div className="kpi-grid">
        <article className="kpi-card kpi-warning">
          <span className="kpi-icon">📦</span>
          <div>
            <span className="kpi-label">Alertes stock</span>
            <strong className="kpi-value">{partsAlerts.length}</strong>
            <span className="kpi-detail">{criticalAlerts} ruptures</span>
          </div>
        </article>
        <article className="kpi-card">
          <span className="kpi-icon">🔧</span>
          <div>
            <span className="kpi-label">OT à approvisionner</span>
            <strong className="kpi-value">{activeOTs}</strong>
            <span className="kpi-detail">En cours ou planifiés</span>
          </div>
        </article>
        <article className="kpi-card">
          <span className="kpi-icon">🏭</span>
          <div>
            <span className="kpi-label">Unités en retrofit</span>
            <strong className="kpi-value">{unitsEnRetrofit}</strong>
            <span className="kpi-detail">Nécessitent pièces</span>
          </div>
        </article>
        <article className="kpi-card kpi-accent">
          <span className="kpi-icon">📋</span>
          <div>
            <span className="kpi-label">Réf. à commander</span>
            <strong className="kpi-value">{partsSummary.size}</strong>
            <span className="kpi-detail">Références distinctes</span>
          </div>
        </article>
      </div>

      <div className="two-col">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Urgences</p>
              <h2>Alertes stock</h2>
            </div>
          </div>
          <div className="compact-list">
            {partsAlerts.map(p => (
              <div key={p.id} className="compact-item alert-item">
                <div>
                  <strong>{p.designation}</strong>
                  <span className="op-meta">{p.reference} · OT {p.linkedOT} · {p.site}</span>
                </div>
                <div className="stock-badge">
                  <span className={`pill ${p.stockActuel === 0 ? 'danger' : 'warning'}`}>
                    Stock: {p.stockActuel}/{p.stockMin}
                  </span>
                  {p.stockActuel === 0 && <span className="pill danger">RUPTURE</span>}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Besoins</p>
              <h2>Pièces requises (OT actifs)</h2>
            </div>
          </div>
          <div className="compact-list">
            {[...partsSummary.values()].map(p => (
              <div key={p.reference} className="compact-item">
                <div>
                  <strong>{p.designation}</strong>
                  <span className="op-meta">{p.reference}</span>
                </div>
                <span className="pill neutral">×{p.total}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
