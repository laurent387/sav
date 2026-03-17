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

function DonutChart({ segments, size = 120, label }: {
  segments: { value: number; color: string; label: string }[]
  size?: number
  label: string
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0) return null
  let cumulative = 0
  const gradientParts = segments.map(seg => {
    const start = (cumulative / total) * 360
    cumulative += seg.value
    const end = (cumulative / total) * 360
    return `${seg.color} ${start}deg ${end}deg`
  })
  return (
    <div className="donut-wrapper">
      <div className="donut-chart" style={{ width: size, height: size, background: `conic-gradient(${gradientParts.join(', ')})` }}>
        <div className="donut-hole">
          <strong>{total}</strong>
          <small>{label}</small>
        </div>
      </div>
      <div className="donut-legend">
        {segments.filter(s => s.value > 0).map((seg, i) => (
          <div key={i} className="donut-legend-item">
            <span className="donut-legend-dot" style={{ background: seg.color }} />
            <span>{seg.label}: <strong>{seg.value}</strong></span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BarChart({ bars }: { bars: { label: string; value: number; max: number; color: string }[] }) {
  return (
    <div className="bar-chart">
      {bars.map((bar, i) => (
        <div key={i} className="bar-chart-row">
          <span className="bar-chart-label">{bar.label}</span>
          <div className="bar-chart-track">
            <div className="bar-chart-fill" style={{ width: `${bar.max > 0 ? (bar.value / bar.max) * 100 : 0}%`, background: bar.color }} />
          </div>
          <span className="bar-chart-value">{bar.value}</span>
        </div>
      ))}
    </div>
  )
}

export function AdminDashboard() {
  const [period] = useState<'jour' | 'semaine' | 'mois'>('semaine')
  const unitsEnRetrofit = liftUnits.filter(u => u.status === 'en-retrofit').length
  const unitsOperational = liftUnits.filter(u => u.status === 'operational').length
  const unitsMaintenance = liftUnits.filter(u => u.status === 'en-maintenance').length
  const unitsBloque = liftUnits.filter(u => u.status === 'bloque').length
  const activeOTs = workOrders.filter(o => o.status === 'en-cours').length
  const plannedOTs = workOrders.filter(o => o.status === 'planifie').length
  const techsDispo = technicians.filter(t => t.availability === 'disponible').length
  const openFNCs = fncs.filter(f => f.status === 'ouverte').length

  // Calcul taux d'avancement global retrofit
  const retrofitOTs = workOrders.filter(o => o.type === 'retrofit')
  const totalOps = retrofitOTs.reduce((s, ot) => s + ot.operations.length, 0)
  const doneOps = retrofitOTs.reduce((s, ot) => s + ot.operations.filter(op => op.status === 'fait').length, 0)
  const globalProgress = totalOps > 0 ? Math.round((doneOps / totalOps) * 100) : 0

  const otByType = {
    retrofit: workOrders.filter(o => o.type === 'retrofit').length,
    correctif: workOrders.filter(o => o.type === 'correctif').length,
    preventif: workOrders.filter(o => o.type === 'preventif').length,
    inspection: workOrders.filter(o => o.type === 'inspection').length,
  }
  const otByPriority = {
    critique: workOrders.filter(o => o.priority === 'critique').length,
    haute: workOrders.filter(o => o.priority === 'haute').length,
    normale: workOrders.filter(o => o.priority === 'normale').length,
    basse: workOrders.filter(o => o.priority === 'basse').length,
  }
  const techBySkill = technicians.reduce((acc, t) => {
    acc[t.skill] = (acc[t.skill] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const maxOTType = Math.max(...Object.values(otByType), 1)

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

      {/* Graphiques */}
      <div className="two-col">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Répartition</p>
              <h2>Statut du parc</h2>
            </div>
          </div>
          <DonutChart label="unités" segments={[
            { value: unitsOperational, color: '#10b981', label: 'Opérationnel' },
            { value: unitsEnRetrofit, color: '#f59e0b', label: 'En retrofit' },
            { value: unitsMaintenance, color: '#3b82f6', label: 'En maintenance' },
            { value: unitsBloque, color: '#ef4444', label: 'Bloqué' },
          ]} />
        </section>
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Analyse</p>
              <h2>OT par type</h2>
            </div>
          </div>
          <BarChart bars={[
            { label: 'Retrofit', value: otByType.retrofit, max: maxOTType, color: '#8b5cf6' },
            { label: 'Correctif', value: otByType.correctif, max: maxOTType, color: '#ef4444' },
            { label: 'Préventif', value: otByType.preventif, max: maxOTType, color: '#10b981' },
            { label: 'Inspection', value: otByType.inspection, max: maxOTType, color: '#3b82f6' },
          ]} />
        </section>
      </div>

      <div className="two-col">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Priorité</p>
              <h2>OT par niveau</h2>
            </div>
          </div>
          <DonutChart label="OT" segments={[
            { value: otByPriority.critique, color: '#ef4444', label: 'Critique' },
            { value: otByPriority.haute, color: '#f59e0b', label: 'Haute' },
            { value: otByPriority.normale, color: '#3b82f6', label: 'Normale' },
            { value: otByPriority.basse, color: '#10b981', label: 'Basse' },
          ]} />
        </section>
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Équipe</p>
              <h2>Techniciens par compétence</h2>
            </div>
          </div>
          <BarChart bars={Object.entries(techBySkill).map(([skill, count]) => ({
            label: skill, value: count, max: technicians.length,
            color: skill === 'Mecanicien' ? '#3b82f6' : skill === 'Electricien' ? '#f59e0b' : '#8b5cf6',
          }))} />
        </section>
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
