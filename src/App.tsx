import { startTransition, useDeferredValue, useState } from 'react'
import './App.css'
import {
  fncs,
  gammes,
  liftUnits,
  partsAlerts,
  retrofitOperations,
  technicians,
  workOrders,
  type Configuration,
  type Discipline,
  type OTStatus,
  type OTType,
  type OpStatus,
  type Section,
} from './data'
import { useAuth } from './hooks/useAuth'
import { LoginPage } from './pages/LoginPage'

type View = 'overview' | 'ordres-travail' | 'parc' | 'gammes'

const views: Array<{ id: View; label: string }> = [
  { id: 'overview', label: 'Pilotage' },
  { id: 'ordres-travail', label: 'Ordres de travail' },
  { id: 'parc', label: 'Parc LIFT' },
  { id: 'gammes', label: 'Gammes' },
]

// Vues accessibles par rôle
const roleViews: Record<string, View[]> = {
  admin: ['overview', 'ordres-travail', 'parc', 'gammes'],
  'bureau-etude': ['overview', 'ordres-travail', 'parc', 'gammes'],
  logistique: ['overview', 'parc'],
  technicien: ['overview', 'ordres-travail'],
}

function configPill(c: Configuration) {
  const map: Record<Configuration, string> = {
    "E'": 'danger', F: 'neutral', G: 'neutral', H: 'accent', I: 'accent',
  }
  return `pill ${map[c]}`
}

function otStatusPill(s: OTStatus) {
  const map: Record<OTStatus, string> = {
    planifie: 'neutral', 'en-cours': 'warning', 'en-attente-pieces': 'danger',
    termine: 'controlled', annule: 'neutral',
  }
  return `pill ${map[s]}`
}

function otTypeLabel(t: OTType) {
  const map: Record<OTType, string> = {
    retrofit: 'Retrofit', correctif: 'Correctif', preventif: 'Préventif', inspection: 'Inspection',
  }
  return map[t]
}

function otStatusLabel(s: OTStatus) {
  const map: Record<OTStatus, string> = {
    planifie: 'Planifié', 'en-cours': 'En cours', 'en-attente-pieces': 'Attente pièces',
    termine: 'Terminé', annule: 'Annulé',
  }
  return map[s]
}

function opStatusPill(s: OpStatus) {
  const map: Record<OpStatus, string> = {
    attente: 'neutral', 'en-cours': 'warning', fait: 'controlled', bloque: 'danger',
  }
  return `pill ${map[s]}`
}

function opStatusLabel(s: OpStatus) {
  const map: Record<OpStatus, string> = {
    attente: 'Attente', 'en-cours': 'En cours', fait: 'Fait', bloque: 'Bloqué',
  }
  return map[s]
}

function unitStatusPill(s: string) {
  const map: Record<string, string> = {
    operational: 'accent', 'en-retrofit': 'warning', 'en-maintenance': 'watch', bloque: 'danger',
  }
  return `pill ${map[s] ?? 'neutral'}`
}

function unitStatusLabel(s: string) {
  const map: Record<string, string> = {
    operational: 'Opérationnel', 'en-retrofit': 'En retrofit',
    'en-maintenance': 'En maintenance', bloque: 'Bloqué',
  }
  return map[s] ?? s
}

function availabilityPill(a: string) {
  const map: Record<string, string> = {
    disponible: 'accent', 'en-intervention': 'warning', indisponible: 'neutral',
  }
  return `pill ${map[a] ?? 'neutral'}`
}

function otTypePill(t: OTType) {
  const map: Record<OTType, string> = {
    retrofit: 'danger', correctif: 'watch', preventif: 'accent', inspection: 'neutral',
  }
  return `pill ${map[t]}`
}

function totalEstimatedHours(opIds: string[]) {
  return opIds.reduce((sum, id) => {
    const op = retrofitOperations.find((o) => o.id === id)
    return sum + (op?.estimatedHours ?? 0)
  }, 0)
}

function App() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()

  // Si l'authentification est en cours, afficher un loader
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <p style={{ fontSize: '18px', marginBottom: '20px' }}>Chargement...</p>
        </div>
      </div>
    )
  }

  // Si l'utilisateur n'est pas connecté, afficher la page de login
  if (!isAuthenticated || !user) {
    return <LoginPage />
  }

  // Déterminer les vues accessibles pour ce rôle
  const userViews = roleViews[user.role] || ['overview']

  return <AppContent user={user} onLogout={logout} accessibleViews={userViews} />
}

function AppContent({
  user,
  onLogout,
  accessibleViews,
}: {
  user: any
  onLogout: () => void
  accessibleViews: View[]
}) {
  const [activeView, setActiveView] = useState<View>(accessibleViews[0] || 'overview')
  const [otStatusFilter, setOtStatusFilter] = useState('Tous')
  const [otTypeFilter, setOtTypeFilter] = useState('Tous')
  const [otSearch, setOtSearch] = useState('')
  const [selectedOTId, setSelectedOTId] = useState<string>(workOrders[0]?.id ?? '')

  const [gammeSection, setGammeSection] = useState<'Toutes' | Section>('Toutes')
  const [gammeDiscipline, setGammeDiscipline] = useState<'Toutes' | Discipline>('Toutes')
  const [gammeSearch, setGammeSearch] = useState('')

  const deferredOtSearch = useDeferredValue(otSearch)
  const deferredGammeSearch = useDeferredValue(gammeSearch)

  const unitsEnRetrofit = liftUnits.filter((u) => u.status === 'en-retrofit').length
  const unitsEnMaintenance = liftUnits.filter((u) => u.status === 'en-maintenance').length
  const activeOTs = workOrders.filter((o) => o.status === 'en-cours').length
  const openFNCs = fncs.filter((f) => f.status === 'ouverte').length

  const filteredOTs = workOrders.filter((ot) => {
    const matchStatus = otStatusFilter === 'Tous' || ot.status === otStatusFilter
    const matchType = otTypeFilter === 'Tous' || ot.type === otTypeFilter
    const q = deferredOtSearch.trim().toLowerCase()
    const matchSearch =
      !q ||
      [ot.id, ot.client, ot.site, ot.city, ot.description].join(' ').toLowerCase().includes(q)
    return matchStatus && matchType && matchSearch
  })

  const selectedOT =
    filteredOTs.find((o) => o.id === selectedOTId) ?? filteredOTs[0] ?? workOrders[0]

  const filteredGammes = gammes.filter((g) => {
    const matchSection = gammeSection === 'Toutes' || g.section === gammeSection
    const matchDiscipline = gammeDiscipline === 'Toutes' || g.discipline === gammeDiscipline
    const q = deferredGammeSearch.trim().toLowerCase()
    const matchSearch = !q || [g.id, g.title, g.category].join(' ').toLowerCase().includes(q)
    return matchSection && matchDiscipline && matchSearch
  })

  // Filtrer les vues affichables
  const displayViews = views.filter((v) => accessibleViews.includes(v.id))

  return (
    <div className="shell">
      <header className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">LIFT GMAO · ALSTOM</p>
          <h1>Pilotez le retrofit, la maintenance et le parc LIFT sur le terrain.</h1>
          <p className="hero-text">
            Suivi des ordres de travail, gammes d&apos;assemblage CONF E&apos;→H,
            traçabilité des configurations et gestion des FNC sur site client.
          </p>
          <div className="hero-actions">
            <button className="primary-action" type="button">Créer un OT</button>
            <button className="secondary-action" type="button">Nouvelle FNC</button>
          </div>
        </div>

        <div className="hero-stack">
          <article className="hero-kpi accent-card">
            <span>Unités en retrofit</span>
            <strong>{unitsEnRetrofit}</strong>
            <small>Plateformes LIFT en cours de mise à niveau CONF H</small>
          </article>
          <article className="hero-kpi">
            <span>OT actifs</span>
            <strong>{activeOTs}</strong>
            <small>Ordres de travail en cours sur le parc ALSTOM</small>
          </article>
          <article className="hero-kpi">
            <span>FNC ouvertes</span>
            <strong>{openFNCs}</strong>
            <small>Fiches de non-conformité à traiter en priorité</small>
          </article>
        </div>

        <div className="user-profile">
          <div className="user-info">
            <span className="user-name">{user.fullName}</span>
            <span className="user-role" style={{
              background: {
                admin: '#f59e0b',
                'bureau-etude': '#3b82f6',
                logistique: '#10b981',
                technicien: '#ef4444',
              }[user.role] || '#6b7280',
            }}>
              {user.role === 'bureau-etude' ? 'Bureau d\'Études' : user.role === 'technicien' ? 'Technicien' : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </span>
          </div>
          <button className="logout-btn" type="button" onClick={onLogout}>
            Déconnexion
          </button>
        </div>
      </header>

      <nav className="view-switcher" aria-label="Sections principales">
        {displayViews.map((view) => (
          <button
            key={view.id}
            type="button"
            className={view.id === activeView ? 'view-chip active' : 'view-chip'}
            onClick={() => {
              startTransition(() => setActiveView(view.id))
            }}
          >
            {view.label}
          </button>
        ))}
      </nav>

      <main className="workspace-grid">
        <section className="main-column">

          {/* ═══════════════════ PILOTAGE ═══════════════════ */}
          {activeView === 'overview' && (
            <>
              <section className="panel metrics-grid">
                <article className="metric-card">
                  <span className="metric-label">Parc total</span>
                  <strong>{liftUnits.length}</strong>
                  <p>Unités LIFT déployées chez ALSTOM.</p>
                </article>
                <article className="metric-card highlighted">
                  <span className="metric-label">En maintenance</span>
                  <strong>{unitsEnMaintenance}</strong>
                  <p>Unités immobilisées pour intervention corrective.</p>
                </article>
                <article className="metric-card">
                  <span className="metric-label">Gammes disponibles</span>
                  <strong>{gammes.length}</strong>
                  <p>Gammes d&apos;assemblage et fiches d&apos;instruction.</p>
                </article>
                <article className="metric-card highlighted">
                  <span className="metric-label">Alertes pièces</span>
                  <strong>{partsAlerts.length}</strong>
                  <p>Ruptures pouvant bloquer les opérations de retrofit.</p>
                </article>
              </section>

              <section className="panel split-panel">
                <div>
                  <div className="section-heading">
                    <div>
                      <p className="section-kicker">Terrain</p>
                      <h2>OT actifs</h2>
                    </div>
                    <span className="section-note">Aujourd&apos;hui</span>
                  </div>
                  <div className="tech-list">
                    {workOrders
                      .filter((o) => o.status === 'en-cours')
                      .map((ot) => {
                        const doneOps = ot.operations.filter((op) => op.status === 'fait').length
                        const pct =
                          ot.operations.length > 0
                            ? Math.round((doneOps / ot.operations.length) * 100)
                            : 0
                        return (
                          <article key={ot.id} className="tech-card">
                            <div>
                              <p className="row-id">{ot.id}</p>
                              <h3>
                                {ot.site} — {ot.city}
                              </h3>
                              <p>
                                {ot.client} · {ot.description.slice(0, 60)}…
                              </p>
                            </div>
                            <div className="tech-meta">
                              <span className={otTypePill(ot.type)}>{otTypeLabel(ot.type)}</span>
                              <span className="pill neutral">{pct}%</span>
                            </div>
                          </article>
                        )
                      })}
                  </div>
                </div>

                <div>
                  <div className="section-heading">
                    <div>
                      <p className="section-kicker">Stock</p>
                      <h2>Alertes pièces</h2>
                    </div>
                  </div>
                  <div className="parts-list">
                    {partsAlerts.map((part) => (
                      <article key={part.id} className="part-card">
                        <div>
                          <h3>{part.designation}</h3>
                          <p>
                            {part.reference} · OT {part.linkedOT} · {part.site}
                          </p>
                        </div>
                        <div className="part-status">
                          <span className="pill danger">
                            {part.stockActuel}/{part.stockMin} unité(s)
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </section>

              <section className="panel split-panel compact-gap">
                <div>
                  <div className="section-heading">
                    <div>
                      <p className="section-kicker">Configurations</p>
                      <h2>Répartition du parc</h2>
                    </div>
                  </div>
                  <div className="asset-watchlist">
                    {(['F', 'G', 'H', 'I', "E'"] as const).map((conf) => {
                      const count = liftUnits.filter((u) => u.currentConfig === conf).length
                      if (count === 0) return null
                      return (
                        <article key={conf} className="asset-alert">
                          <div>
                            <h3>CONF {conf}</h3>
                            <p>
                              {count} unité{count > 1 ? 's' : ''}
                            </p>
                          </div>
                          <span className={configPill(conf)}>CONF {conf}</span>
                        </article>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <div className="section-heading">
                    <div>
                      <p className="section-kicker">FNC</p>
                      <h2>Non-conformités</h2>
                    </div>
                  </div>
                  <div className="sla-list">
                    {fncs.map((fnc) => (
                      <article key={fnc.id} className="sla-item">
                        <div>
                          <h3>{fnc.id}</h3>
                          <p>{fnc.description.slice(0, 55)}…</p>
                        </div>
                        <span
                          className={`pill ${fnc.status === 'ouverte' ? 'danger' : fnc.status === 'traitee' ? 'warning' : 'controlled'}`}
                        >
                          {fnc.status}
                        </span>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            </>
          )}

          {/* ═══════════════════ ORDRES DE TRAVAIL ════════════════════ */}
          {activeView === 'ordres-travail' && (
            <section className="panel interventions-panel">
              <div className="section-heading">
                <div>
                  <p className="section-kicker">Terrain</p>
                  <h2>Ordres de travail</h2>
                </div>
                <div className="filters">
                  <input
                    className="search-input"
                    type="search"
                    value={otSearch}
                    placeholder="Rechercher par OT, site, client, description…"
                    onChange={(e) => setOtSearch(e.target.value)}
                  />
                  <select
                    className="status-select"
                    value={otStatusFilter}
                    onChange={(e) => {
                      startTransition(() => setOtStatusFilter(e.target.value))
                    }}
                  >
                    {(
                      ['Tous', 'planifie', 'en-cours', 'en-attente-pieces', 'termine', 'annule'] as const
                    ).map((s) => (
                      <option key={s} value={s}>
                        {s === 'Tous' ? 'Tous statuts' : otStatusLabel(s)}
                      </option>
                    ))}
                  </select>
                  <select
                    className="status-select"
                    value={otTypeFilter}
                    onChange={(e) => {
                      startTransition(() => setOtTypeFilter(e.target.value))
                    }}
                  >
                    {(['Tous', 'retrofit', 'correctif', 'preventif', 'inspection'] as const).map(
                      (t) => (
                        <option key={t} value={t}>
                          {t === 'Tous' ? 'Tous types' : otTypeLabel(t)}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>

              <div className="interventions-layout">
                <div className="intervention-list">
                  {filteredOTs.map((ot) => {
                    const doneOps = ot.operations.filter((op) => op.status === 'fait').length
                    const pct =
                      ot.operations.length > 0
                        ? Math.round((doneOps / ot.operations.length) * 100)
                        : 0
                    const estH = totalEstimatedHours(ot.operations.map((o) => o.operationId))
                    return (
                      <button
                        key={ot.id}
                        type="button"
                        className={
                          ot.id === selectedOT?.id
                            ? 'intervention-row selected'
                            : 'intervention-row'
                        }
                        onClick={() => setSelectedOTId(ot.id)}
                      >
                        <div className="row-main">
                          <div>
                            <p className="row-id">{ot.id}</p>
                            <h3>
                              {ot.site} — {ot.city}
                            </h3>
                            <p>
                              {ot.client} · {ot.description.slice(0, 70)}…
                            </p>
                          </div>
                          <div className="row-tags">
                            <span className={otTypePill(ot.type)}>{otTypeLabel(ot.type)}</span>
                            <span
                              className={`pill ${
                                ot.priority === 'critique'
                                  ? 'danger'
                                  : ot.priority === 'haute'
                                    ? 'watch'
                                    : 'neutral'
                              }`}
                            >
                              {ot.priority}
                            </span>
                          </div>
                        </div>
                        <div className="row-meta">
                          <span>{otStatusLabel(ot.status)}</span>
                          <span>{ot.plannedDate}</span>
                          {ot.operations.length > 0 && (
                            <span>
                              {pct}% · {estH.toFixed(1)}h estimées
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {selectedOT && (
                  <aside className="detail-card">
                    <div className="detail-header">
                      <div>
                        <p className="row-id">{selectedOT.id}</p>
                        <h3>
                          {selectedOT.site} — {selectedOT.city}
                        </h3>
                      </div>
                      <span className={otStatusPill(selectedOT.status)}>
                        {otStatusLabel(selectedOT.status)}
                      </span>
                    </div>

                    <p className="detail-summary">{selectedOT.description}</p>

                    <dl className="detail-grid">
                      <div>
                        <dt>Client</dt>
                        <dd>{selectedOT.client}</dd>
                      </div>
                      <div>
                        <dt>Type</dt>
                        <dd>{otTypeLabel(selectedOT.type)}</dd>
                      </div>
                      {selectedOT.fromConfig && (
                        <div>
                          <dt>Configuration</dt>
                          <dd>
                            <span className={configPill(selectedOT.fromConfig)}>
                              CONF {selectedOT.fromConfig}
                            </span>
                            {selectedOT.toConfig && (
                              <>
                                {' → '}
                                <span className={configPill(selectedOT.toConfig)}>
                                  CONF {selectedOT.toConfig}
                                </span>
                              </>
                            )}
                          </dd>
                        </div>
                      )}
                      <div>
                        <dt>Technicien(s)</dt>
                        <dd>
                          {selectedOT.technicianIds
                            .map((id) => technicians.find((t) => t.id === id)?.name)
                            .filter(Boolean)
                            .join(', ') || '—'}
                        </dd>
                      </div>
                      <div>
                        <dt>Planifié le</dt>
                        <dd>{selectedOT.plannedDate}</dd>
                      </div>
                      <div>
                        <dt>Priorité</dt>
                        <dd>{selectedOT.priority}</dd>
                      </div>
                    </dl>

                    {selectedOT.operations.length > 0 && (
                      <div className="detail-block">
                        <h4>
                          Opérations (
                          {selectedOT.operations.filter((o) => o.status === 'fait').length}/
                          {selectedOT.operations.length} faites)
                        </h4>
                        <div className="progress-track" style={{ marginBottom: 12 }}>
                          <span
                            style={{
                              width: `${Math.round(
                                (selectedOT.operations.filter((o) => o.status === 'fait').length /
                                  selectedOT.operations.length) *
                                  100,
                              )}%`,
                            }}
                          />
                        </div>
                        <ul className="op-list">
                          {selectedOT.operations.map((wop) => {
                            const op = retrofitOperations.find((o) => o.id === wop.operationId)
                            if (!op) return null
                            return (
                              <li key={wop.operationId} className="op-row">
                                <span className={opStatusPill(wop.status)}>
                                  {opStatusLabel(wop.status)}
                                </span>
                                <span className="op-title">{op.title}</span>
                                <span className="op-meta">
                                  {op.estimatedHours}h · {op.personnel}p
                                </span>
                                {wop.fncs.length > 0 && (
                                  <span className="pill danger">{wop.fncs.length} FNC</span>
                                )}
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )}

                    {selectedOT.operations.length > 0 &&
                      (() => {
                        const allParts = selectedOT.operations.flatMap((wop) => {
                          const op = retrofitOperations.find((o) => o.id === wop.operationId)
                          return op?.parts ?? []
                        })
                        if (allParts.length === 0) return null
                        return (
                          <div className="detail-block">
                            <h4>Pièces requises</h4>
                            <ul className="checklist">
                              {allParts.map((p, i) => (
                                <li key={i}>
                                  {p.designation} × {p.quantity}{' '}
                                  <span className="op-meta">{p.reference}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )
                      })()}
                  </aside>
                )}
              </div>
            </section>
          )}

          {/* ═══════════════════ PARC LIFT ════════════════════ */}
          {activeView === 'parc' && (
            <section className="panel asset-grid-panel">
              <div className="section-heading">
                <div>
                  <p className="section-kicker">Installed base</p>
                  <h2>Parc LIFT — {liftUnits.length} unités</h2>
                </div>
                <span className="section-note">
                  Client ALSTOM · Configurations E&apos;/F/G/H/I
                </span>
              </div>

              <div className="asset-grid">
                {liftUnits.map((unit) => {
                  const activeOT = workOrders.find(
                    (o) =>
                      o.unitId === unit.id &&
                      (o.status === 'en-cours' || o.status === 'planifie'),
                  )
                  return (
                    <article key={unit.id} className="asset-card">
                      <div className="asset-card-top">
                        <div>
                          <h3>{unit.id}</h3>
                          <p>
                            {unit.client} · {unit.site}, {unit.city}
                          </p>
                        </div>
                        <span className={unitStatusPill(unit.status)}>
                          {unitStatusLabel(unit.status)}
                        </span>
                      </div>

                      <dl className="asset-stats">
                        <div>
                          <dt>Conf actuelle</dt>
                          <dd>
                            <span className={configPill(unit.currentConfig)}>
                              CONF {unit.currentConfig}
                            </span>
                          </dd>
                        </div>
                        {unit.targetConfig && (
                          <div>
                            <dt>Conf cible</dt>
                            <dd>
                              <span className={configPill(unit.targetConfig)}>
                                CONF {unit.targetConfig}
                              </span>
                            </dd>
                          </div>
                        )}
                        <div>
                          <dt>Installé</dt>
                          <dd>{unit.installDate}</dd>
                        </div>
                        <div>
                          <dt>Dernier service</dt>
                          <dd>{unit.lastServiceDate}</dd>
                        </div>
                      </dl>

                      {unit.serialNumber && (
                        <p className="row-id" style={{ marginTop: 12 }}>
                          {unit.serialNumber}
                        </p>
                      )}

                      {activeOT && (
                        <div style={{ marginTop: 10 }}>
                          <span className={otStatusPill(activeOT.status)}>
                            {activeOT.id} · {otStatusLabel(activeOT.status)}
                          </span>
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            </section>
          )}

          {/* ═══════════════════ GAMMES ════════════════════ */}
          {activeView === 'gammes' && (
            <section className="panel">
              <div className="section-heading">
                <div>
                  <p className="section-kicker">Documentation</p>
                  <h2>Gammes d&apos;assemblage — {filteredGammes.length} résultats</h2>
                </div>
              </div>

              <div className="filters" style={{ marginBottom: 20 }}>
                <input
                  className="search-input"
                  type="search"
                  value={gammeSearch}
                  placeholder="Rechercher par titre, référence WP, catégorie…"
                  onChange={(e) => setGammeSearch(e.target.value)}
                />
                <select
                  className="status-select"
                  value={gammeSection}
                  onChange={(e) => {
                    startTransition(() =>
                      setGammeSection(e.target.value as 'Toutes' | Section),
                    )
                  }}
                >
                  {(['Toutes', 'PARTIE FIXE', 'PARTIE MOBILE'] as const).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <select
                  className="status-select"
                  value={gammeDiscipline}
                  onChange={(e) => {
                    startTransition(() =>
                      setGammeDiscipline(e.target.value as 'Toutes' | Discipline),
                    )
                  }}
                >
                  {(['Toutes', 'MECA', 'ELEC'] as const).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="gamme-grid">
                {filteredGammes.map((g) => (
                  <article key={g.id} className="gamme-card">
                    <div className="gamme-card-top">
                      <div>
                        <p className="row-id">{g.id}</p>
                        <h3>{g.title}</h3>
                        <p>
                          {g.section} · {g.category}
                        </p>
                      </div>
                      <div className="row-tags">
                        <span className={`pill ${g.discipline === 'MECA' ? 'accent' : 'neutral'}`}>
                          {g.discipline}
                        </span>
                      </div>
                    </div>
                    <div className="gamme-configs">
                      {g.configs.map((c) => (
                        <span key={c} className={configPill(c)}>
                          CONF {c}
                        </span>
                      ))}
                      <span className="pill neutral">Ind. {g.revision}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </section>

        {/* ═══════════════════ SIDE COLUMN ════════════════════ */}
        <aside className="side-column">
          <section className="panel side-panel">
            <div className="section-heading">
              <div>
                <p className="section-kicker">Techniciens</p>
                <h2>Disponibilités</h2>
              </div>
            </div>
            <div className="tech-list">
              {technicians.map((tech) => (
                <article key={tech.id} className="tech-card">
                  <div>
                    <h3>{tech.name}</h3>
                    <p>
                      {tech.skill} · {tech.city}
                    </p>
                  </div>
                  <div className="tech-meta">
                    <span className={availabilityPill(tech.availability)}>
                      {tech.availability === 'disponible'
                        ? 'Disponible'
                        : tech.availability === 'en-intervention'
                          ? 'En intervention'
                          : 'Indisponible'}
                    </span>
                    {tech.activeOTs > 0 && (
                      <span className="pill neutral">{tech.activeOTs} OT</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="panel side-panel">
            <div className="section-heading">
              <div>
                <p className="section-kicker">Qualité</p>
                <h2>Fiches FNC</h2>
              </div>
            </div>
            <div className="sla-list">
              {fncs.map((fnc) => (
                <article key={fnc.id} className="sla-item">
                  <div>
                    <h3>{fnc.id}</h3>
                    <p>{fnc.partReference}</p>
                    <p style={{ marginTop: 4, fontSize: '0.85rem' }}>
                      {fnc.description.slice(0, 60)}…
                    </p>
                  </div>
                  <span
                    className={`pill ${
                      fnc.status === 'ouverte'
                        ? 'danger'
                        : fnc.status === 'traitee'
                          ? 'warning'
                          : 'controlled'
                    }`}
                  >
                    {fnc.status}
                  </span>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </main>
    </div>
  )
}

export default App
