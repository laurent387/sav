import { useState } from 'react'
import {
  liftUnits, workOrders, gammes, fncs, partsAlerts,
  type Configuration,
} from '../../data'

function configPill(c: Configuration) {
  const map: Record<Configuration, string> = {
    "E'": 'danger', F: 'neutral', G: 'neutral', H: 'accent', I: 'accent',
  }
  return `pill ${map[c]}`
}

export function BEDashboard() {
  const [_] = useState(0)
  void _
  const unitsEnRetrofit = liftUnits.filter(u => u.status === 'en-retrofit').length
  const activeOTs = workOrders.filter(o => o.status === 'en-cours').length
  const plannedOTs = workOrders.filter(o => o.status === 'planifie').length
  const openFNCs = fncs.filter(f => f.status === 'ouverte').length

  const retrofitOTs = workOrders.filter(o => o.type === 'retrofit')
  const totalOps = retrofitOTs.reduce((s, ot) => s + ot.operations.length, 0)
  const doneOps = retrofitOTs.reduce((s, ot) => s + ot.operations.filter(op => op.status === 'fait').length, 0)
  const globalProgress = totalOps > 0 ? Math.round((doneOps / totalOps) * 100) : 0

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">Bureau d'Études</p>
          <h1 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)' }}>Vue d'ensemble</h1>
        </div>
      </div>

      <div className="kpi-grid">
        <article className="kpi-card kpi-accent">
          <span className="kpi-icon">📐</span>
          <div>
            <span className="kpi-label">Retrofit en cours</span>
            <strong className="kpi-value">{unitsEnRetrofit}</strong>
            <span className="kpi-detail">Unités en cours de mise à niveau</span>
          </div>
        </article>
        <article className="kpi-card">
          <span className="kpi-icon">📋</span>
          <div>
            <span className="kpi-label">OT actifs</span>
            <strong className="kpi-value">{activeOTs}</strong>
            <span className="kpi-detail">{plannedOTs} planifiés</span>
          </div>
        </article>
        <article className="kpi-card">
          <span className="kpi-icon">📖</span>
          <div>
            <span className="kpi-label">Gammes</span>
            <strong className="kpi-value">{gammes.length}</strong>
            <span className="kpi-detail">Documents techniques</span>
          </div>
        </article>
        <article className="kpi-card kpi-warning">
          <span className="kpi-icon">⚠️</span>
          <div>
            <span className="kpi-label">FNC / Alertes</span>
            <strong className="kpi-value">{openFNCs}</strong>
            <span className="kpi-detail">{partsAlerts.length} alertes pièces</span>
          </div>
        </article>
      </div>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Avancement</p>
            <h2>Programme Retrofit E'→H — {globalProgress}%</h2>
          </div>
        </div>
        <div className="progress-track" style={{ height: 14 }}>
          <span style={{ width: `${globalProgress}%` }} />
        </div>

        <div className="retrofit-summary">
          {retrofitOTs.map(ot => {
            const done = ot.operations.filter(op => op.status === 'fait').length
            const pct = ot.operations.length > 0 ? Math.round((done / ot.operations.length) * 100) : 0
            return (
              <div key={ot.id} className="retrofit-unit">
                <div className="retrofit-unit-header">
                  <strong>{ot.unitId}</strong>
                  <span className="op-meta">{ot.site} · {ot.city}</span>
                  <span className={`pill ${ot.status === 'en-cours' ? 'warning' : 'neutral'}`}>{ot.status}</span>
                </div>
                <div className="progress-track" style={{ height: 8 }}>
                  <span style={{ width: `${pct}%` }} />
                </div>
                <div className="retrofit-unit-footer">
                  {ot.fromConfig && <span className={configPill(ot.fromConfig)}>CONF {ot.fromConfig}</span>}
                  {ot.toConfig && <><span style={{ color: 'var(--text-subtle)' }}>→</span><span className={configPill(ot.toConfig)}>CONF {ot.toConfig}</span></>}
                  <span className="op-meta" style={{ marginLeft: 'auto' }}>{pct}% · {done}/{ot.operations.length} ops</span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <div className="two-col">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Qualité</p>
              <h2>FNC ouvertes</h2>
            </div>
          </div>
          {fncs.filter(f => f.status === 'ouverte').length === 0 ? (
            <p style={{ color: 'var(--text-subtle)' }}>Aucune FNC ouverte</p>
          ) : (
            <div className="compact-list">
              {fncs.filter(f => f.status === 'ouverte').map(f => (
                <div key={f.id} className="compact-item">
                  <div>
                    <span className="row-id">{f.id}</span>
                    <strong>{f.description.slice(0, 60)}…</strong>
                    <span className="op-meta">{f.partReference} · {f.date}</span>
                  </div>
                  <span className="pill danger">Ouverte</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Stock</p>
              <h2>Alertes pièces</h2>
            </div>
          </div>
          <div className="compact-list">
            {partsAlerts.map(p => (
              <div key={p.id} className="compact-item">
                <div>
                  <strong>{p.designation}</strong>
                  <span className="op-meta">{p.reference} · {p.site}</span>
                </div>
                <span className="pill danger">{p.stockActuel}/{p.stockMin}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
