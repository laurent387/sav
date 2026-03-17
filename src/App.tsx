import { useState } from 'react'
import './App.css'
import { useAuth } from './hooks/useAuth'
import { LoginPage } from './pages/LoginPage'
import { DashboardLayout } from './components/DashboardLayout'
import type { User } from './types/auth'

// Admin pages
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { AdminUsers } from './pages/admin/AdminUsers'
import { AdminReports } from './pages/admin/AdminReports'
import { AdminConfig } from './pages/admin/AdminConfig'

// Bureau d'Études pages
import { BEDashboard } from './pages/bureau-etude/BEDashboard'
import { BEOrdresTravail } from './pages/bureau-etude/BEOrdresTravail'
import { BEGammes } from './pages/bureau-etude/BEGammes'
import { BEParc } from './pages/bureau-etude/BEParc'

// Logistique pages
import { LogDashboard } from './pages/logistique/LogDashboard'
import { LogStock } from './pages/logistique/LogStock'
import { LogCommandes } from './pages/logistique/LogCommandes'
import { LogParc } from './pages/logistique/LogParc'

// Technicien pages
import { TechDashboard } from './pages/technicien/TechDashboard'
import { TechMesOT } from './pages/technicien/TechMesOT'
import { TechRapports } from './pages/technicien/TechRapports'
import { TechGammes } from './pages/technicien/TechGammes'

// Shared pages
import { FNCPage } from './pages/shared/FNCPage'

const roleMenus: Record<string, { id: string; label: string; icon: string }[]> = {
  admin: [
    { id: 'dashboard', label: 'Tableau de bord', icon: '📊' },
    { id: 'users', label: 'Utilisateurs', icon: '👥' },
    { id: 'fnc', label: 'Fiches FNC', icon: '⚠️' },
    { id: 'reports', label: 'Rapports', icon: '📈' },
    { id: 'config', label: 'Configuration', icon: '⚙️' },
  ],
  'bureau-etude': [
    { id: 'dashboard', label: 'Vue d\'ensemble', icon: '📐' },
    { id: 'ordres-travail', label: 'Ordres de travail', icon: '📋' },
    { id: 'gammes', label: 'Gammes', icon: '📖' },
    { id: 'fnc', label: 'Fiches FNC', icon: '⚠️' },
    { id: 'parc', label: 'Parc LIFT', icon: '🏭' },
  ],
  logistique: [
    { id: 'dashboard', label: 'Tableau de bord', icon: '📦' },
    { id: 'stock', label: 'Stocks', icon: '🗄️' },
    { id: 'commandes', label: 'Commandes', icon: '🛒' },
    { id: 'parc', label: 'Parc LIFT', icon: '🏭' },
  ],
  technicien: [
    { id: 'dashboard', label: 'Mon tableau de bord', icon: '🏠' },
    { id: 'mes-ot', label: 'Mes OT', icon: '🔧' },
    { id: 'fnc', label: 'Fiches FNC', icon: '⚠️' },
    { id: 'rapports', label: 'Rapports', icon: '📝' },
    { id: 'gammes', label: 'Documentation', icon: '📖' },
  ],
}

// Map technicianId from user login
function getTechnicianId(user: User): string {
  const emailMap: Record<string, string> = {
    'tech@lift.fr': 'TECH-01',
    'fatima.z@lift.fr': 'TECH-02',
  }
  return emailMap[user.email] || 'TECH-01'
}

function App() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()

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

  if (!isAuthenticated || !user) {
    return <LoginPage />
  }

  return <RoleDashboard user={user} onLogout={logout} />
}

function RoleDashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const menus = roleMenus[user.role] || roleMenus.admin
  const [activeMenu, setActiveMenu] = useState(menus[0]?.id || 'dashboard')

  const techId = getTechnicianId(user)

  function renderPage() {
    switch (user.role) {
      case 'admin':
        switch (activeMenu) {
          case 'users': return <AdminUsers />
          case 'fnc': return <FNCPage role="admin" />
          case 'reports': return <AdminReports />
          case 'config': return <AdminConfig />
          default: return <AdminDashboard />
        }
      case 'bureau-etude':
        switch (activeMenu) {
          case 'ordres-travail': return <BEOrdresTravail />
          case 'gammes': return <BEGammes />
          case 'fnc': return <FNCPage role="bureau-etude" />
          case 'parc': return <BEParc />
          default: return <BEDashboard />
        }
      case 'logistique':
        switch (activeMenu) {
          case 'stock': return <LogStock />
          case 'commandes': return <LogCommandes />
          case 'parc': return <LogParc />
          default: return <LogDashboard />
        }
      case 'technicien':
        switch (activeMenu) {
          case 'mes-ot': return <TechMesOT technicianId={techId} />
          case 'fnc': return <FNCPage role="technicien" />
          case 'rapports': return <TechRapports technicianId={techId} />
          case 'gammes': return <TechGammes />
          default: return <TechDashboard technicianId={techId} />
        }
      default:
        return <AdminDashboard />
    }
  }

  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      menuItems={menus}
      activeMenu={activeMenu}
      onMenuChange={setActiveMenu}
    >
      {renderPage()}
    </DashboardLayout>
  )
}

export default App
