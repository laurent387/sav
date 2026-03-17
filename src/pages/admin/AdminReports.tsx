import { useState } from 'react'
import { liftUnits, workOrders, technicians, fncs } from '../../data'

interface ReportData {
  label: string
  value: number | string
}

export function AdminReports() {
  const [reportType, setReportType] = useState<'parc' | 'ot' | 'techniciens' | 'fnc'>('parc')

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
              {liftUnits.map(u => (
                <tr key={u.id}>
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
              {workOrders.map(ot => {
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
