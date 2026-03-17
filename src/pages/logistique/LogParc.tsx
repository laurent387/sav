import { useState } from 'react'
import { liftUnits, workOrders, type Configuration } from '../../data'

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

export function LogParc() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Tous')

  const filtered = liftUnits.filter(u => {
    const matchStatus = statusFilter === 'Tous' || u.status === statusFilter
    const q = search.trim().toLowerCase()
    const matchSearch = !q || [u.id, u.serialNumber, u.client, u.site, u.city].join(' ').toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">Logistique</p>
          <h1 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)' }}>Parc LIFT — {liftUnits.length} unités</h1>
        </div>
      </div>

      <div className="filters" style={{ marginBottom: 20 }}>
        <input className="search-input" type="search" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="status-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="Tous">Tous statuts</option>
          <option value="operational">Opérationnel</option>
          <option value="en-retrofit">En retrofit</option>
          <option value="en-maintenance">En maintenance</option>
          <option value="bloque">Bloqué</option>
        </select>
      </div>

      <div className="asset-grid">
        {filtered.map(unit => {
          const activeOT = workOrders.find(o => o.unitId === unit.id && (o.status === 'en-cours' || o.status === 'planifie'))
          return (
            <article key={unit.id} className="asset-card">
              <div className="asset-card-top">
                <div>
                  <h3>{unit.id}</h3>
                  <p>{unit.client}</p>
                  <p className="op-meta">{unit.site} · {unit.city}</p>
                </div>
                <span className={unitStatusPill(unit.status)}>{unitStatusLabel(unit.status)}</span>
              </div>
              <dl className="asset-stats">
                <div><dt>Partie Fixe</dt><dd>{unit.partieFixeId}</dd></div>
                <div><dt>Partie Mobile</dt><dd>{unit.partieMobileId}</dd></div>
                <div><dt>Conf actuelle</dt><dd><span className={configPill(unit.currentConfig)}>CONF {unit.currentConfig}</span></dd></div>
                {unit.targetConfig && <div><dt>Conf cible</dt><dd><span className={configPill(unit.targetConfig)}>CONF {unit.targetConfig}</span></dd></div>}
                <div><dt>Installé</dt><dd>{unit.installDate}</dd></div>
                <div><dt>Dernier service</dt><dd>{unit.lastServiceDate}</dd></div>
              </dl>
              <p className="row-id" style={{ marginTop: 8 }}>{unit.serialNumber}</p>
              {activeOT && (
                <div style={{ marginTop: 10 }}>
                  <span className={`pill ${activeOT.status === 'en-cours' ? 'warning' : 'neutral'}`}>
                    {activeOT.id} · {activeOT.status}
                  </span>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
