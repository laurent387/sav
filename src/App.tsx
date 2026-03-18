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
import { AdminUnitHistory } from './pages/admin/AdminUnitHistory'

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
import { OTDetailPage } from './pages/shared/OTDetailPage'
import { FNCDetailPage } from './pages/shared/FNCDetailPage'

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
  const [historyUnitId, setHistoryUnitId] = useState<string | null>(null)
  const [detailView, setDetailView] = useState<{ type: 'ot' | 'fnc'; id: string } | null>(null)

  const techId = getTechnicianId(user)

  function handleMenuChange(id: string) {
    setActiveMenu(id)
    setHistoryUnitId(null)
    setDetailView(null)
  }

  function navigateToOT(id: string) {
    setDetailView({ type: 'ot', id })
  }

  function navigateToFNC(id: string) {
    setDetailView({ type: 'fnc', id })
  }

  function renderPage() {
    // Detail views (cross-role)
    if (detailView?.type === 'ot') {
      return <OTDetailPage otId={detailView.id} onBack={() => setDetailView(null)} onNavigateFnc={navigateToFNC} />
    }
    if (detailView?.type === 'fnc') {
      return <FNCDetailPage fncId={detailView.id} onBack={() => setDetailView(null)} onNavigateOT={navigateToOT} />
    }

    if (historyUnitId && user.role === 'admin') {
      return <AdminUnitHistory unitId={historyUnitId} onBack={() => setHistoryUnitId(null)} />
    }

    switch (user.role) {
      case 'admin':
        switch (activeMenu) {
          case 'users': return <AdminUsers />
          case 'fnc': return <FNCPage role="admin" onNavigateOT={navigateToOT} onNavigateFNC={navigateToFNC} />
          case 'reports': return <AdminReports onUnitClick={(id: string) => setHistoryUnitId(id)} />
          case 'config': return <AdminConfig />
          default: return <AdminDashboard onNavigateOT={navigateToOT} />
        }
      case 'bureau-etude':
        switch (activeMenu) {
          case 'ordres-travail': return <BEOrdresTravail onNavigateOT={navigateToOT} />
          case 'gammes': return <BEGammes />
          case 'fnc': return <FNCPage role="bureau-etude" onNavigateOT={navigateToOT} onNavigateFNC={navigateToFNC} />
          case 'parc': return <BEParc />
          default: return <BEDashboard onNavigateOT={navigateToOT} />
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
          case 'mes-ot': return <TechMesOT technicianId={techId} onNavigateOT={navigateToOT} />
          case 'fnc': return <FNCPage role="technicien" onNavigateOT={navigateToOT} onNavigateFNC={navigateToFNC} />
          case 'rapports': return <TechRapports technicianId={techId} />
          case 'gammes': return <TechGammes />
          default: return <TechDashboard technicianId={techId} onNavigateOT={navigateToOT} />
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
      onMenuChange={handleMenuChange}
    >
      {renderPage()}
    </DashboardLayout>
  )
}

export default App
