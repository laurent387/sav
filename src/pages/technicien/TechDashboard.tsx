import { workOrders, technicians, retrofitOperations, type Configuration } from '../../data'

function configPill(c: Configuration) {
  const map: Record<Configuration, string> = {
    "E'": 'danger', F: 'neutral', G: 'neutral', H: 'accent', I: 'accent',
  }
  return `pill ${map[c]}`
}

interface Props {
  technicianId: string
}

export function TechDashboard({ technicianId }: Props) {
  const tech = technicians.find(t => t.id === technicianId)
  const myOTs = workOrders.filter(o => o.technicianIds.includes(technicianId))
  const activeOTs = myOTs.filter(o => o.status === 'en-cours')
  const plannedOTs = myOTs.filter(o => o.status === 'planifie')

  // Mes opérations en cours
  const myOps = activeOTs.flatMap(ot =>
    ot.operations
      .filter(op => op.status === 'en-cours' && (!op.technicianId || op.technicianId === technicianId))
      .map(op => {
        const opDef = retrofitOperations.find(o => o.id === op.operationId)
        return { ot, op, opDef }
      })
  )

  const totalHToday = myOps.reduce((s, { opDef }) => s + (opDef?.estimatedHours ?? 0), 0)

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">Technicien</p>
          <h1 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)' }}>Bonjour, {tech?.name ?? 'Technicien'}</h1>
        </div>
      </div>

      <div className="kpi-grid">
        <article className="kpi-card kpi-accent">
          <span className="kpi-icon">🔧</span>
          <div>
            <span className="kpi-label">Mes OT actifs</span>
            <strong className="kpi-value">{activeOTs.length}</strong>
            <span className="kpi-detail">{myOps.length} opérations en cours</span>
          </div>
        </article>
        <article className="kpi-card">
          <span className="kpi-icon">📅</span>
          <div>
            <span className="kpi-label">OT planifiés</span>
            <strong className="kpi-value">{plannedOTs.length}</strong>
            <span className="kpi-detail">À venir</span>
          </div>
        </article>
        <article className="kpi-card">
          <span className="kpi-icon">⏱️</span>
          <div>
            <span className="kpi-label">Heures aujourd'hui</span>
            <strong className="kpi-value">{totalHToday.toFixed(1)}h</strong>
            <span className="kpi-detail">Estimées sur ops en cours</span>
          </div>
        </article>
        <article className="kpi-card">
          <span className="kpi-icon">📍</span>
          <div>
            <span className="kpi-label">Ville</span>
            <strong className="kpi-value">{tech?.city ?? '—'}</strong>
            <span className="kpi-detail">{tech?.skill ?? ''}</span>
          </div>
        </article>
      </div>

      {/* Opérations en cours */}
      {myOps.length > 0 && (
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">En cours</p>
              <h2>Opérations actives</h2>
            </div>
          </div>
          <div className="compact-list">
            {myOps.map(({ ot, op, opDef }) => (
              <div key={`${ot.id}-${op.operationId}`} className="compact-item">
                <div>
                  <strong>{opDef?.title ?? op.operationId}</strong>
                  <span className="op-meta">{ot.id} · {ot.site}, {ot.city} · {opDef?.estimatedHours}h</span>
                </div>
                <span className="pill warning">En cours</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* OT actifs */}
      <div className="two-col">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Terrain</p>
              <h2>OT en cours</h2>
            </div>
          </div>
          {activeOTs.length === 0 ? (
            <p style={{ color: 'var(--text-subtle)' }}>Aucun OT actif</p>
          ) : (
            <div className="compact-list">
              {activeOTs.map(ot => {
                const done = ot.operations.filter(op => op.status === 'fait').length
                const pct = ot.operations.length > 0 ? Math.round((done / ot.operations.length) * 100) : 0
                return (
                  <div key={ot.id} className="compact-item">
                    <div>
                      <strong>{ot.id}</strong>
                      <span>{ot.site} — {ot.city}</span>
                      <span className="op-meta">{ot.description.slice(0, 60)}…</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`pill ${ot.priority === 'critique' ? 'danger' : ot.priority === 'haute' ? 'watch' : 'neutral'}`}>{ot.priority}</span>
                      <div className="progress-track" style={{ height: 6, width: 80, marginTop: 6 }}>
                        <span style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Planning</p>
              <h2>OT à venir</h2>
            </div>
          </div>
          {plannedOTs.length === 0 ? (
            <p style={{ color: 'var(--text-subtle)' }}>Aucun OT planifié</p>
          ) : (
            <div className="compact-list">
              {plannedOTs.map(ot => (
                <div key={ot.id} className="compact-item">
                  <div>
                    <strong>{ot.id}</strong>
                    <span>{ot.site} — {ot.city}</span>
                    <span className="op-meta">{ot.plannedDate}</span>
                    {ot.fromConfig && (
                      <div className="gamme-configs" style={{ marginTop: 4 }}>
                        <span className={configPill(ot.fromConfig)}>CONF {ot.fromConfig}</span>
                        {ot.toConfig && <><span style={{ color: 'var(--text-subtle)' }}>→</span><span className={configPill(ot.toConfig)}>CONF {ot.toConfig}</span></>}
                      </div>
                    )}
                  </div>
                  <span className="pill neutral">Planifié</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
