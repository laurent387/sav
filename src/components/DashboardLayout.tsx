import { type ReactNode } from 'react'
import type { User } from '../types/auth'

interface LayoutProps {
  user: User
  onLogout: () => void
  menuItems: { id: string; label: string; icon: string }[]
  activeMenu: string
  onMenuChange: (id: string) => void
  children: ReactNode
}

export function DashboardLayout({ user, onLogout, menuItems, activeMenu, onMenuChange, children }: LayoutProps) {
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
