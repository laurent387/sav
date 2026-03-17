import {
  liftUnits, workOrders, fncs, technicians, retrofitOperations,
  type Configuration, type LiftUnit,
} from '../../data'

function configPill(c: Configuration) {
  const map: Record<Configuration, string> = {
    "E'": 'danger', F: 'neutral', G: 'neutral', H: 'accent', I: 'accent',
  }
  return `pill ${map[c]}`
}

function unitStatusLabel(s: string) {
  const map: Record<string, string> = {
    operational: 'Opérationnel', 'en-retrofit': 'En retrofit',
    'en-maintenance': 'En maintenance', bloque: 'Bloqué',
  }
  return map[s] ?? s
}

function unitStatusPill(s: string) {
  const map: Record<string, string> = {
    operational: 'accent', 'en-retrofit': 'warning', 'en-maintenance': 'watch', bloque: 'danger',
  }
  return `pill ${map[s] ?? 'neutral'}`
}

function otStatusLabel(s: string) {
  const map: Record<string, string> = {
    planifie: 'Planifié', 'en-cours': 'En cours', 'en-attente-pieces': 'Attente pièces',
    termine: 'Terminé', annule: 'Annulé',
  }
  return map[s] ?? s
}

function otTypeBadge(t: string) {
  const map: Record<string, string> = {
    retrofit: 'danger', correctif: 'watch', preventif: 'accent', inspection: 'neutral',
  }
  return `pill ${map[t] ?? 'neutral'}`
}

interface TimelineEvent {
  date: string
  type: 'installation' | 'ot-cree' | 'ot-planifie' | 'operation' | 'fnc' | 'service'
  icon: string
  title: string
  detail: string
  status?: string
}

function buildTimeline(unit: LiftUnit): TimelineEvent[] {
  const events: TimelineEvent[] = []

  events.push({
    date: unit.installDate,
    type: 'installation',
    icon: '🏗️',
    title: 'Installation',
    detail: `Installation du ${unit.id} — ${unit.site}, ${unit.city} — CONF ${unit.currentConfig}`,
  })

  events.push({
    date: unit.lastServiceDate,
    type: 'service',
    icon: '🔧',
    title: 'Dernier service',
    detail: `Dernière maintenance enregistrée`,
  })

  const unitOTs = workOrders.filter(o => o.unitId === unit.id)
  for (const ot of unitOTs) {
    events.push({
      date: ot.createdDate,
      type: 'ot-cree',
      icon: '📋',
      title: `OT créé — ${ot.id}`,
      detail: ot.description,
      status: ot.status,
    })

    for (const wop of ot.operations) {
      if (wop.completedAt) {
        const op = retrofitOperations.find(o => o.id === wop.operationId)
        events.push({
          date: wop.completedAt,
          type: 'operation',
          icon: '✅',
          title: `Opération terminée — ${op?.title ?? wop.operationId}`,
          detail: `${ot.id} · ${op?.code ?? ''} · ${op?.estimatedHours ?? '?'}h`,
          status: wop.status,
        })
      }
    }

    // FNCs linked to this OT
    const otFncs = fncs.filter(f => f.workOrderId === ot.id)
    for (const f of otFncs) {
      events.push({
        date: f.date,
        type: 'fnc',
        icon: '⚠️',
        title: `FNC — ${f.id}`,
        detail: f.description,
        status: f.status,
      })
    }
  }

  events.sort((a, b) => b.date.localeCompare(a.date))
  return events
}

interface Props {
  unitId: string
  onBack: () => void
}

export function AdminUnitHistory({ unitId, onBack }: Props) {
  const unit = liftUnits.find(u => u.id === unitId)
  if (!unit) {
    return (
      <div className="page-content">
        <button type="button" className="secondary-action" onClick={onBack}>← Retour</button>
        <p style={{ textAlign: 'center', padding: 40, color: 'var(--text-subtle)' }}>Unité introuvable</p>
      </div>
    )
  }

  const unitOTs = workOrders.filter(o => o.unitId === unit.id)
  const unitFncs = fncs.filter(f => unitOTs.some(ot => ot.id === f.workOrderId))
  const timeline = buildTimeline(unit)

  const totalOps = unitOTs.reduce((s, ot) => s + ot.operations.length, 0)
  const doneOps = unitOTs.reduce((s, ot) => s + ot.operations.filter(op => op.status === 'fait').length, 0)

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <button type="button" className="secondary-action btn-sm" onClick={onBack} style={{ marginBottom: 8 }}>← Retour aux rapports</button>
          <p className="eyebrow">Historique machine</p>
          <h1 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)' }}>{unit.id}</h1>
        </div>
        <span className={unitStatusPill(unit.status)} style={{ fontSize: '0.9rem', padding: '8px 16px', alignSelf: 'start' }}>
          {unitStatusLabel(unit.status)}
        </span>
      </div>

      {/* Fiche signalétique */}
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Fiche signalétique</p>
            <h2>{unit.id} — {unit.serialNumber}</h2>
          </div>
        </div>
        <dl className="detail-grid">
          <div><dt>Client</dt><dd>{unit.client}</dd></div>
          <div><dt>Site</dt><dd>{unit.site}</dd></div>
          <div><dt>Ville</dt><dd>{unit.city}</dd></div>
          <div><dt>Partie Fixe</dt><dd><strong>{unit.partieFixeId}</strong></dd></div>
          <div><dt>Partie Mobile</dt><dd><strong>{unit.partieMobileId}</strong></dd></div>
          <div><dt>Config actuelle</dt><dd><span className={configPill(unit.currentConfig)}>CONF {unit.currentConfig}</span></dd></div>
          <div><dt>Config cible</dt><dd>{unit.targetConfig ? <span className={configPill(unit.targetConfig)}>CONF {unit.targetConfig}</span> : '—'}</dd></div>
          <div><dt>Installation</dt><dd>{unit.installDate}</dd></div>
          <div><dt>Dernier service</dt><dd>{unit.lastServiceDate}</dd></div>
        </dl>
      </section>

      {/* KPIs machine */}
      <div className="kpi-grid">
        <article className="kpi-card">
          <span className="kpi-icon">📋</span>
          <div>
            <span className="kpi-label">Ordres de travail</span>
            <strong className="kpi-value">{unitOTs.length}</strong>
            <span className="kpi-detail">{unitOTs.filter(o => o.status === 'en-cours').length} en cours</span>
          </div>
        </article>
        <article className="kpi-card">
          <span className="kpi-icon">⚙️</span>
          <div>
            <span className="kpi-label">Opérations</span>
            <strong className="kpi-value">{doneOps}/{totalOps}</strong>
            <span className="kpi-detail">{totalOps > 0 ? Math.round((doneOps / totalOps) * 100) : 0}% terminées</span>
          </div>
        </article>
        <article className={`kpi-card ${unitFncs.length > 0 ? 'kpi-warning' : ''}`}>
          <span className="kpi-icon">⚠️</span>
          <div>
            <span className="kpi-label">FNC</span>
            <strong className="kpi-value">{unitFncs.length}</strong>
            <span className="kpi-detail">{unitFncs.filter(f => f.status === 'ouverte').length} ouvertes</span>
          </div>
        </article>
        <article className="kpi-card kpi-accent">
          <span className="kpi-icon">📅</span>
          <div>
            <span className="kpi-label">Événements</span>
            <strong className="kpi-value">{timeline.length}</strong>
            <span className="kpi-detail">Historique complet</span>
          </div>
        </article>
      </div>

      {/* Ordres de travail détaillés */}
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Interventions</p>
            <h2>Ordres de travail — {unitOTs.length}</h2>
          </div>
        </div>

        {unitOTs.length === 0 ? (
          <p style={{ color: 'var(--text-subtle)', padding: 20 }}>Aucun OT enregistré pour cette unité</p>
        ) : (
          <div className="history-ot-list">
            {unitOTs.map(ot => {
              const done = ot.operations.filter(op => op.status === 'fait').length
              const pct = ot.operations.length > 0 ? Math.round((done / ot.operations.length) * 100) : 0
              const otTechs = ot.technicianIds.map(id => technicians.find(t => t.id === id)?.name).filter(Boolean)
              const otFncs = fncs.filter(f => f.workOrderId === ot.id)

              return (
                <article key={ot.id} className="history-ot-card">
                  <div className="history-ot-header">
                    <div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '1.1rem' }}>{ot.id}</strong>
                        <span className={otTypeBadge(ot.type)}>{ot.type}</span>
                        <span className={`pill ${ot.status === 'en-cours' ? 'warning' : ot.status === 'termine' ? 'accent' : ot.status === 'planifie' ? 'neutral' : 'danger'}`}>
                          {otStatusLabel(ot.status)}
                        </span>
                        <span className={`pill ${ot.priority === 'critique' ? 'danger' : ot.priority === 'haute' ? 'watch' : 'neutral'}`}>
                          {ot.priority}
                        </span>
                      </div>
                      <p style={{ marginTop: 6, color: 'var(--text-soft)' }}>{ot.description}</p>
                    </div>
                  </div>

                  <dl className="detail-grid" style={{ marginTop: 12 }}>
                    <div><dt>Créé le</dt><dd>{ot.createdDate}</dd></div>
                    <div><dt>Planifié le</dt><dd>{ot.plannedDate}</dd></div>
                    {ot.completedDate && <div><dt>Terminé le</dt><dd>{ot.completedDate}</dd></div>}
                    {ot.fromConfig && (
                      <div>
                        <dt>Configuration</dt>
                        <dd>
                          <span className={configPill(ot.fromConfig)}>CONF {ot.fromConfig}</span>
                          {ot.toConfig && <> → <span className={configPill(ot.toConfig)}>CONF {ot.toConfig}</span></>}
                        </dd>
                      </div>
                    )}
                    {otTechs.length > 0 && <div><dt>Technicien(s)</dt><dd>{otTechs.join(', ')}</dd></div>}
                  </dl>

                  {ot.operations.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <h4 style={{ marginBottom: 8 }}>Opérations ({done}/{ot.operations.length})</h4>
                      <div className="progress-track" style={{ marginBottom: 10 }}>
                        <span style={{ width: `${pct}%` }} />
                      </div>
                      <ul className="op-list">
                        {ot.operations.map(wop => {
                          const op = retrofitOperations.find(o => o.id === wop.operationId)
                          return (
                            <li key={wop.operationId} className="op-row">
                              <span className={`pill ${wop.status === 'fait' ? 'accent' : wop.status === 'en-cours' ? 'warning' : wop.status === 'bloque' ? 'danger' : 'neutral'}`} style={{ minWidth: 70, textAlign: 'center' }}>
                                {wop.status === 'fait' ? '✓ Fait' : wop.status === 'en-cours' ? '▶ En cours' : wop.status === 'bloque' ? '✕ Bloqué' : '○ Attente'}
                              </span>
                              <span className="op-title">{op?.title ?? wop.operationId}</span>
                              <span className="op-meta">{op?.code} · {op?.estimatedHours}h</span>
                              {wop.completedAt && <span className="op-meta">✓ {wop.completedAt}</span>}
                              {wop.notes && <span className="pill neutral" title={wop.notes}>Note</span>}
                              {wop.fncs.length > 0 && <span className="pill danger">{wop.fncs.length} FNC</span>}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}

                  {otFncs.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <h4 style={{ marginBottom: 8 }}>FNC associées</h4>
                      <div className="compact-list">
                        {otFncs.map(f => (
                          <div key={f.id} className="compact-item">
                            <div>
                              <span className="row-id">{f.id}</span>
                              <strong>{f.description.slice(0, 80)}{f.description.length > 80 ? '…' : ''}</strong>
                              <span className="op-meta">{f.partReference} · {f.date}</span>
                            </div>
                            <span className={`pill ${f.status === 'ouverte' ? 'danger' : f.status === 'traitee' ? 'warning' : 'accent'}`}>
                              {f.status === 'ouverte' ? 'Ouverte' : f.status === 'traitee' ? 'Traitée' : 'Clôturée'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* Timeline chronologique */}
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Chronologie</p>
            <h2>Historique complet — {timeline.length} événements</h2>
          </div>
        </div>

        <div className="history-timeline">
          {timeline.map((event, i) => (
            <div key={i} className="timeline-item">
              <div className="timeline-dot">
                <span>{event.icon}</span>
              </div>
              <div className="timeline-content">
                <div className="timeline-header">
                  <strong>{event.title}</strong>
                  <span className="op-meta">{event.date}</span>
                </div>
                <p className="timeline-detail">{event.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
