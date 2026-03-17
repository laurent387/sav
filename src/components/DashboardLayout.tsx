import { type ReactNode, useState } from 'react'
import type { User } from '../types/auth'
import type { WorkOrder, FNC, PartAlert } from '../data'
import { useGmaoData } from '../contexts/DataContext'

interface LayoutProps {
  user: User
  onLogout: () => void
  menuItems: { id: string; label: string; icon: string }[]
  activeMenu: string
  onMenuChange: (id: string) => void
  children: ReactNode
}

function buildNotifications(workOrders: WorkOrder[], fncs: FNC[], partsAlerts: PartAlert[]) {
  const notifs: { id: string; icon: string; text: string; type: 'danger' | 'warning' | 'info' }[] = []
  const today = new Date()

  // OTs en retard (planned date passed, not completed)
  workOrders.forEach(ot => {
    if (ot.status !== 'termine' && ot.status !== 'annule') {
      const planned = new Date(ot.plannedDate)
      if (planned < today) {
        notifs.push({ id: `late-${ot.id}`, icon: '🔴', text: `OT ${ot.id} en retard (prévu ${ot.plannedDate}) — ${ot.site}`, type: 'danger' })
      }
    }
  })

  // OTs critiques
  workOrders.filter(ot => ot.priority === 'critique' && ot.status !== 'termine').forEach(ot => {
    notifs.push({ id: `crit-${ot.id}`, icon: '🚨', text: `OT critique ${ot.id} — ${ot.description.slice(0, 60)}…`, type: 'danger' })
  })

  // FNCs ouvertes
  fncs.filter(f => f.status === 'ouverte').forEach(f => {
    notifs.push({ id: `fnc-${f.id}`, icon: '⚠️', text: `FNC ${f.id} ouverte — ${f.description.slice(0, 60)}…`, type: 'warning' })
  })

  // Alertes pièces (stock < min)
  partsAlerts.forEach(pa => {
    notifs.push({ id: `part-${pa.id}`, icon: '📦', text: `Stock bas: ${pa.designation} (${pa.stockActuel}/${pa.stockMin}) — ${pa.site}`, type: 'warning' })
  })

  return notifs
}

export function DashboardLayout({ user, onLogout, menuItems, activeMenu, onMenuChange, children }: LayoutProps) {
  const { workOrders, fncs, partsAlerts } = useGmaoData()
  const [showNotifs, setShowNotifs] = useState(false)
  const notifications = buildNotifications(workOrders, fncs, partsAlerts)
  const notifCount = notifications.length
  const roleLabel: Record<string, string> = {
    admin: 'Administrateur',
    'bureau-etude': "Bureau d'Études",
    logistique: 'Logistique',
    technicien: 'Technicien',
  }

  const roleColor: Record<string, string> = {
    admin: '#f59e0b',
    'bureau-etude': '#3b82f6',
    logistique: '#10b981',
    technicien: '#ef4444',
  }

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">⬡</span>
          <div>
            <strong>LIFT GMAO</strong>
            <small>ALSTOM</small>
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`sidebar-item${activeMenu === item.id ? ' active' : ''}`}
              onClick={() => onMenuChange(item.id)}
            >
              <span className="sidebar-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-notif-area">
          <button type="button" className="sidebar-notif-btn" onClick={() => setShowNotifs(!showNotifs)}>
            <span>🔔</span>
            {notifCount > 0 && <span className="notif-badge">{notifCount}</span>}
          </button>
          {showNotifs && (
            <div className="notif-dropdown">
              <div className="notif-dropdown-header">
                <strong>Notifications</strong>
                <span className="notif-count">{notifCount}</span>
              </div>
              {notifications.length === 0 ? (
                <div className="notif-empty">Aucune notification</div>
              ) : (
                <div className="notif-list">
                  {notifications.map(n => (
                    <div key={n.id} className={`notif-item notif-${n.type}`}>
                      <span className="notif-icon">{n.icon}</span>
                      <span className="notif-text">{n.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="sidebar-user">
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user.fullName}</span>
            <span className="sidebar-user-role" style={{ background: roleColor[user.role] || '#6b7280' }}>
              {roleLabel[user.role] || user.role}
            </span>
          </div>
          <button type="button" className="sidebar-logout" onClick={onLogout}>Déconnexion</button>
        </div>
      </aside>

      <main className="dashboard-main">
        {children}
      </main>
    </div>
  )
}
