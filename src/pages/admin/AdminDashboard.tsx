import { useState } from 'react'
import {
  liftUnits, workOrders, technicians, fncs, gammes, partsAlerts,
  type Configuration,
} from '../../data'

function configPill(c: Configuration) {
  const map: Record<Configuration, string> = {
    "E'": 'danger', F: 'neutral', G: 'neutral', H: 'accent', I: 'accent',
  }
  return `pill ${map[c]}`
}

export function AdminDashboard() {
  const [period] = useState<'jour' | 'semaine' | 'mois'>('semaine')
  const unitsEnRetrofit = liftUnits.filter(u => u.status === 'en-retrofit').length
  const unitsOperational = liftUnits.filter(u => u.status === 'operational').length
  const activeOTs = workOrders.filter(o => o.status === 'en-cours').length
  const plannedOTs = workOrders.filter(o => o.status === 'planifie').length
  const techsDispo = technicians.filter(t => t.availability === 'disponible').length
  const openFNCs = fncs.filter(f => f.status === 'ouverte').length

  // Calcul taux d'avancement global retrofit
  const retrofitOTs = workOrders.filter(o => o.type === 'retrofit')
  const totalOps = retrofitOTs.reduce((s, ot) => s + ot.operations.length, 0)
  const doneOps = retrofitOTs.reduce((s, ot) => s + ot.operations.filter(op => op.status === 'fait').length, 0)
  const globalProgress = totalOps > 0 ? Math.round((doneOps / totalOps) * 100) : 0

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">Tableau de bord</p>
          <h1 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)' }}>Pilotage global</h1>
        </div>
        <div className="header-actions">
          <div className="period-switcher">
            {(['jour', 'semaine', 'mois'] as const).map(p => (
              <button key={p} type="button" className={`period-btn${period === p ? ' active' : ''}`}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <article className="kpi-card kpi-accent">
          <span className="kpi-icon">📊</span>
          <div>
            <span className="kpi-label">Parc total</span>
            <strong className="kpi-value">{liftUnits.length}</strong>
            <span className="kpi-detail">{unitsOperational} opérationnels · {unitsEnRetrofit} en retrofit</span>
          </div>
        </article>
        <article className="kpi-card">
          <span className="kpi-icon">🔧</span>
          <div>
            <span className="kpi-label">OT actifs</span>
            <strong className="kpi-value">{activeOTs}</strong>
            <span className="kpi-detail">{plannedOTs} planifiés</span>
          </div>
        </article>
        <article className="kpi-card">
          <span className="kpi-icon">👷</span>
          <div>
            <span className="kpi-label">Techniciens</span>
            <strong className="kpi-value">{technicians.length}</strong>
            <span className="kpi-detail">{techsDispo} disponibles</span>
          </div>
        </article>
        <article className="kpi-card kpi-warning">
          <span className="kpi-icon">⚠️</span>
          <div>
            <span className="kpi-label">Alertes</span>
            <strong className="kpi-value">{openFNCs + partsAlerts.length}</strong>
            <span className="kpi-detail">{openFNCs} FNC · {partsAlerts.length} pièces</span>
          </div>
        </article>
      </div>

      {/* Avancement global retrofit */}
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Retrofit E'→H</p>
            <h2>Avancement global — {globalProgress}%</h2>
          </div>
          <span className="section-note">{doneOps}/{totalOps} opérations terminées</span>
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
                  <span className="op-meta">{ot.site}</span>
                  <span className="op-meta">{ot.city}</span>
                </div>
                <div className="progress-track" style={{ height: 8 }}>
                  <span style={{ width: `${pct}%` }} />
                </div>
                <div className="retrofit-unit-footer">
                  {ot.fromConfig && <span className={configPill(ot.fromConfig)}>CONF {ot.fromConfig}</span>}
                  {ot.toConfig && <><span style={{ color: 'var(--text-subtle)' }}>→</span><span className={configPill(ot.toConfig)}>CONF {ot.toConfig}</span></>}
                  <span className="op-meta" style={{ marginLeft: 'auto' }}>{pct}% · {done}/{ot.operations.length}</span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Activité récente et Gammes */}
      <div className="two-col">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Activité</p>
              <h2>OT récents</h2>
            </div>
          </div>
          <div className="activity-list">
            {workOrders.slice(0, 5).map(ot => (
              <div key={ot.id} className="activity-item">
                <div className="activity-dot" data-status={ot.status} />
                <div className="activity-content">
                  <strong>{ot.id}</strong> — {ot.description.slice(0, 80)}…
                  <div className="activity-meta">
                    {ot.site} · {ot.city} · {ot.plannedDate} · <span className={`pill ${ot.priority === 'critique' ? 'danger' : ot.priority === 'haute' ? 'watch' : 'neutral'}`}>{ot.priority}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Documentation</p>
              <h2>Gammes — {gammes.length}</h2>
            </div>
          </div>
          <div className="compact-list">
            {gammes.slice(0, 8).map(g => (
              <div key={g.id} className="compact-item">
                <div>
                  <span className="row-id">{g.id}</span>
                  <strong>{g.title}</strong>
                </div>
                <span className={`pill ${g.discipline === 'MECA' ? 'accent' : 'neutral'}`}>{g.discipline}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
