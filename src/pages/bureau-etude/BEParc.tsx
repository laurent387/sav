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

export function BEParc() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Tous')
  const [configFilter, setConfigFilter] = useState('Toutes')
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null)

  const filtered = liftUnits.filter(u => {
    const matchStatus = statusFilter === 'Tous' || u.status === statusFilter
    const matchConfig = configFilter === 'Toutes' || u.currentConfig === configFilter
    const q = search.trim().toLowerCase()
    const matchSearch = !q || [u.id, u.serialNumber, u.client, u.site, u.city].join(' ').toLowerCase().includes(q)
    return matchStatus && matchConfig && matchSearch
  })

  const selected = selectedUnit ? liftUnits.find(u => u.id === selectedUnit) : null
  const selectedOTs = selected ? workOrders.filter(o => o.unitId === selected.id) : []

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">Bureau d'Études</p>
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
        <select className="status-select" value={configFilter} onChange={e => setConfigFilter(e.target.value)}>
          <option value="Toutes">Toutes configs</option>
          {(["E'", 'F', 'G', 'H', 'I'] as const).map(c => (
            <option key={c} value={c}>CONF {c}</option>
          ))}
        </select>
      </div>

      <div className="parc-layout">
        <div className="asset-grid">
          {filtered.map(unit => (
            <article
              key={unit.id}
              className={`asset-card${selectedUnit === unit.id ? ' selected' : ''}`}
              onClick={() => setSelectedUnit(unit.id === selectedUnit ? null : unit.id)}
              style={{ cursor: 'pointer' }}
            >
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
            </article>
          ))}
        </div>

        {selected && (
          <aside className="detail-card" style={{ position: 'sticky', top: 20 }}>
            <div className="detail-header">
              <div>
                <p className="row-id">{selected.serialNumber}</p>
                <h3>{selected.id}</h3>
              </div>
              <span className={unitStatusPill(selected.status)}>{unitStatusLabel(selected.status)}</span>
            </div>
            <dl className="detail-grid">
              <div><dt>Client</dt><dd>{selected.client}</dd></div>
              <div><dt>Site</dt><dd>{selected.site}</dd></div>
              <div><dt>Ville</dt><dd>{selected.city}</dd></div>
              <div><dt>Partie Fixe</dt><dd>{selected.partieFixeId}</dd></div>
              <div><dt>Partie Mobile</dt><dd>{selected.partieMobileId}</dd></div>
              <div><dt>Config actuelle</dt><dd><span className={configPill(selected.currentConfig)}>CONF {selected.currentConfig}</span></dd></div>
              <div><dt>Config cible</dt><dd>{selected.targetConfig ? <span className={configPill(selected.targetConfig)}>CONF {selected.targetConfig}</span> : '—'}</dd></div>
              <div><dt>Installation</dt><dd>{selected.installDate}</dd></div>
              <div><dt>Dernier service</dt><dd>{selected.lastServiceDate}</dd></div>
            </dl>
            {selectedOTs.length > 0 && (
              <div className="detail-block">
                <h4>Ordres de travail ({selectedOTs.length})</h4>
                <div className="compact-list">
                  {selectedOTs.map(ot => {
                    const done = ot.operations.filter(op => op.status === 'fait').length
                    const pct = ot.operations.length > 0 ? Math.round((done / ot.operations.length) * 100) : 0
                    return (
                      <div key={ot.id} className="compact-item">
                        <div>
                          <strong>{ot.id}</strong>
                          <span className="op-meta">{ot.type} · {ot.status}</span>
                        </div>
                        {ot.operations.length > 0 && <span className="pill neutral">{pct}%</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}
