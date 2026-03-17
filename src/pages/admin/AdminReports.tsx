import { useState } from 'react'
import { liftUnits, workOrders, technicians, fncs } from '../../data'

interface ReportData {
  label: string
  value: number | string
}

function exportCSV(filename: string, headers: string[], rows: string[][]) {
  const bom = '\uFEFF'
  const csv = bom + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function AdminReports({ onUnitClick }: { onUnitClick?: (id: string) => void }) {
  const [reportType, setReportType] = useState<'parc' | 'ot' | 'techniciens' | 'fnc'>('parc')
  const [searchParc, setSearchParc] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [searchOT, setSearchOT] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterOTStatus, setFilterOTStatus] = useState('')

  const parcReport: ReportData[] = [
    { label: 'Unités totales', value: liftUnits.length },
    { label: 'Opérationnelles', value: liftUnits.filter(u => u.status === 'operational').length },
    { label: 'En retrofit', value: liftUnits.filter(u => u.status === 'en-retrofit').length },
    { label: 'En maintenance', value: liftUnits.filter(u => u.status === 'en-maintenance').length },
    { label: 'Bloquées', value: liftUnits.filter(u => u.status === 'bloque').length },
    { label: 'Taux disponibilité', value: `${Math.round((liftUnits.filter(u => u.status === 'operational').length / liftUnits.length) * 100)}%` },
  ]

  const otReport: ReportData[] = [
    { label: 'OT totaux', value: workOrders.length },
    { label: 'En cours', value: workOrders.filter(o => o.status === 'en-cours').length },
    { label: 'Planifiés', value: workOrders.filter(o => o.status === 'planifie').length },
    { label: 'Terminés', value: workOrders.filter(o => o.status === 'termine').length },
    { label: 'Attente pièces', value: workOrders.filter(o => o.status === 'en-attente-pieces').length },
    { label: 'OT critiques', value: workOrders.filter(o => o.priority === 'critique').length },
  ]

  const techReport: ReportData[] = [
    { label: 'Techniciens totaux', value: technicians.length },
    { label: 'Disponibles', value: technicians.filter(t => t.availability === 'disponible').length },
    { label: 'En intervention', value: technicians.filter(t => t.availability === 'en-intervention').length },
    { label: 'Mécaniciens', value: technicians.filter(t => t.skill === 'Mecanicien').length },
    { label: 'Électriciens', value: technicians.filter(t => t.skill === 'Electricien').length },
    { label: "Chefs d'équipe", value: technicians.filter(t => t.skill === "Chef d'equipe").length },
  ]

  const fncReport: ReportData[] = [
    { label: 'FNC totales', value: fncs.length },
    { label: 'Ouvertes', value: fncs.filter(f => f.status === 'ouverte').length },
    { label: 'Traitées', value: fncs.filter(f => f.status === 'traitee').length },
    { label: 'Clôturées', value: fncs.filter(f => f.status === 'cloturee').length },
  ]

  const reports: Record<string, { title: string; data: ReportData[] }> = {
    parc: { title: 'Rapport Parc LIFT', data: parcReport },
    ot: { title: 'Rapport Ordres de Travail', data: otReport },
    techniciens: { title: 'Rapport Techniciens', data: techReport },
    fnc: { title: 'Rapport Non-Conformités', data: fncReport },
  }

  const current = reports[reportType]

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">Administration</p>
          <h1 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)' }}>Rapports & Statistiques</h1>
        </div>
      </div>

      <div className="report-tabs">
        {([
          { id: 'parc', label: '📊 Parc', icon: '' },
          { id: 'ot', label: '🔧 OT', icon: '' },
          { id: 'techniciens', label: '👷 Techniciens', icon: '' },
          { id: 'fnc', label: '⚠️ FNC', icon: '' },
        ] as const).map(tab => (
          <button
            key={tab.id}
            type="button"
            className={`report-tab${reportType === tab.id ? ' active' : ''}`}
            onClick={() => setReportType(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>{current.title}</h2>
          </div>
          <span className="section-note">Données en temps réel</span>
        </div>

        <div className="report-grid">
          {current.data.map((item, i) => (
            <article key={i} className="report-card">
              <span className="report-label">{item.label}</span>
              <strong className="report-value">{item.value}</strong>
            </article>
          ))}
        </div>
      </section>

      {/* Detailed tables per report type */}
      {reportType === 'parc' && (
        <section className="panel">
          <div className="section-heading">
            <div><h2>Détail par unité</h2></div>
            <button type="button" className="btn-export" onClick={() => exportCSV(
              'parc-lift.csv',
              ['ID', 'Client', 'Site', 'Ville', 'Partie Fixe', 'Partie Mobile', 'Config actuelle', 'Config cible', 'Statut', 'Dernier service'],
              liftUnits.map(u => [u.id, u.client, u.site, u.city, u.partieFixeId, u.partieMobileId, `CONF ${u.currentConfig}`, u.targetConfig ? `CONF ${u.targetConfig}` : '', u.status, u.lastServiceDate])
            )}>📥 Exporter CSV</button>
          </div>
          <div className="table-filters">
            <input type="text" className="filter-input" placeholder="🔍 Rechercher (ID, client, site, ville...)" value={searchParc} onChange={e => setSearchParc(e.target.value)} />
            <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Tous les statuts</option>
              <option value="operational">Opérationnel</option>
              <option value="en-retrofit">En retrofit</option>
              <option value="en-maintenance">En maintenance</option>
              <option value="bloque">Bloqué</option>
            </select>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Client</th>
                <th>Site</th>
                <th>Ville</th>
                <th>Partie Fixe</th>
                <th>Partie Mobile</th>
                <th>Config actuelle</th>
                <th>Config cible</th>
                <th>Statut</th>
                <th>Dernier service</th>
              </tr>
            </thead>
            <tbody>
              {liftUnits
                .filter(u => {
                  const q = searchParc.toLowerCase()
                  if (q && ![u.id, u.client, u.site, u.city, u.partieFixeId, u.partieMobileId].some(f => f.toLowerCase().includes(q))) return false
                  if (filterStatus && u.status !== filterStatus) return false
                  return true
                })
                .map(u => (
                <tr key={u.id} onClick={() => onUnitClick?.(u.id)} style={{ cursor: 'pointer' }} className="clickable-row">
                  <td><strong>{u.id}</strong></td>
                  <td>{u.client}</td>
                  <td>{u.site}</td>
                  <td>{u.city}</td>
                  <td>{u.partieFixeId}</td>
                  <td>{u.partieMobileId}</td>
                  <td>CONF {u.currentConfig}</td>
                  <td>{u.targetConfig ? `CONF ${u.targetConfig}` : '—'}</td>
                  <td><span className={`pill ${u.status === 'operational' ? 'accent' : u.status === 'en-retrofit' ? 'warning' : 'danger'}`}>{u.status}</span></td>
                  <td className="op-meta">{u.lastServiceDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {reportType === 'ot' && (
        <section className="panel">
          <div className="section-heading">
            <div><h2>Détail par OT</h2></div>
            <button type="button" className="btn-export" onClick={() => exportCSV(
              'ordres-travail.csv',
              ['OT', 'Type', 'Unité', 'Site', 'Ville', 'Priorité', 'Statut', 'Avancement', 'Date planif.'],
              workOrders.map(ot => {
                const done = ot.operations.filter(op => op.status === 'fait').length
                const pct = ot.operations.length > 0 ? Math.round((done / ot.operations.length) * 100) : 0
                return [ot.id, ot.type, ot.unitId, ot.site, ot.city, ot.priority, ot.status, `${pct}%`, ot.plannedDate]
              })
            )}>📥 Exporter CSV</button>
          </div>
          <div className="table-filters">
            <input type="text" className="filter-input" placeholder="🔍 Rechercher (OT, unité, site...)" value={searchOT} onChange={e => setSearchOT(e.target.value)} />
            <select className="filter-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
              <option value="">Toutes priorités</option>
              <option value="critique">Critique</option>
              <option value="haute">Haute</option>
              <option value="normale">Normale</option>
              <option value="basse">Basse</option>
            </select>
            <select className="filter-select" value={filterOTStatus} onChange={e => setFilterOTStatus(e.target.value)}>
              <option value="">Tous statuts</option>
              <option value="en-cours">En cours</option>
              <option value="planifie">Planifié</option>
              <option value="termine">Terminé</option>
              <option value="en-attente-pieces">Attente pièces</option>
              <option value="annule">Annulé</option>
            </select>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>OT</th>
                <th>Type</th>
                <th>Unité</th>
                <th>Site</th>
                <th>Ville</th>
                <th>Priorité</th>
                <th>Statut</th>
                <th>Avancement</th>
                <th>Date planif.</th>
              </tr>
            </thead>
            <tbody>
              {workOrders
                .filter(ot => {
                  const q = searchOT.toLowerCase()
                  if (q && ![ot.id, ot.unitId, ot.site, ot.city, ot.type].some(f => f.toLowerCase().includes(q))) return false
                  if (filterPriority && ot.priority !== filterPriority) return false
                  if (filterOTStatus && ot.status !== filterOTStatus) return false
                  return true
                })
                .map(ot => {
                const done = ot.operations.filter(op => op.status === 'fait').length
                const pct = ot.operations.length > 0 ? Math.round((done / ot.operations.length) * 100) : 0
                return (
                  <tr key={ot.id}>
                    <td><strong>{ot.id}</strong></td>
                    <td>{ot.type}</td>
                    <td>{ot.unitId}</td>
                    <td>{ot.site}</td>
                    <td>{ot.city}</td>
                    <td><span className={`pill ${ot.priority === 'critique' ? 'danger' : ot.priority === 'haute' ? 'watch' : 'neutral'}`}>{ot.priority}</span></td>
                    <td>{ot.status}</td>
                    <td>{pct}%</td>
                    <td className="op-meta">{ot.plannedDate}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}
