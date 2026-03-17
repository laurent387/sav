import { useState } from 'react'
import { Modal } from '../../components/Modal'
import type { UserRole } from '../../types/auth'

interface ManagedUser {
  id: string
  fullName: string
  email: string
  role: UserRole
  active: boolean
  lastLogin?: string
}

const initialUsers: ManagedUser[] = [
  { id: 'U-001', fullName: 'Laurent Martin', email: 'admin@lift.fr', role: 'admin', active: true, lastLogin: '2026-03-17' },
  { id: 'U-002', fullName: 'Sophie Dubois', email: 'be@lift.fr', role: 'bureau-etude', active: true, lastLogin: '2026-03-16' },
  { id: 'U-003', fullName: 'Marc Leroy', email: 'logistique@lift.fr', role: 'logistique', active: true, lastLogin: '2026-03-15' },
  { id: 'U-004', fullName: 'Ahmed Belkacem', email: 'tech@lift.fr', role: 'technicien', active: true, lastLogin: '2026-03-17' },
  { id: 'U-005', fullName: 'Fatima Zari', email: 'fatima.z@lift.fr', role: 'technicien', active: true, lastLogin: '2026-03-14' },
  { id: 'U-006', fullName: 'Pierre Moreau', email: 'pierre.m@lift.fr', role: 'bureau-etude', active: false },
]

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrateur',
  'bureau-etude': "Bureau d'Études",
  logistique: 'Logistique',
  technicien: 'Technicien',
}

const roleColors: Record<UserRole, string> = {
  admin: '#f59e0b',
  'bureau-etude': '#3b82f6',
  logistique: '#10b981',
  technicien: '#ef4444',
}

export function AdminUsers() {
  const [users, setUsers] = useState(initialUsers)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null)
  const [filterRole, setFilterRole] = useState<'Tous' | UserRole>('Tous')
  const [search, setSearch] = useState('')

  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formRole, setFormRole] = useState<UserRole>('technicien')

  const filtered = users.filter(u => {
    const matchRole = filterRole === 'Tous' || u.role === filterRole
    const q = search.trim().toLowerCase()
    const matchSearch = !q || [u.fullName, u.email, u.role].join(' ').toLowerCase().includes(q)
    return matchRole && matchSearch
  })

  function openCreate() {
    setEditingUser(null)
    setFormName('')
    setFormEmail('')
    setFormRole('technicien')
    setShowModal(true)
  }

  function openEdit(u: ManagedUser) {
    setEditingUser(u)
    setFormName(u.fullName)
    setFormEmail(u.email)
    setFormRole(u.role)
    setShowModal(true)
  }

  function handleSave() {
    if (!formName.trim() || !formEmail.trim()) return
    if (editingUser) {
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, fullName: formName, email: formEmail, role: formRole } : u))
    } else {
      const newUser: ManagedUser = {
        id: `U-${String(users.length + 1).padStart(3, '0')}`,
        fullName: formName,
        email: formEmail,
        role: formRole,
        active: true,
      }
      setUsers(prev => [...prev, newUser])
    }
    setShowModal(false)
  }

  function toggleActive(id: string) {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, active: !u.active } : u))
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">Administration</p>
          <h1 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)' }}>Gestion des utilisateurs</h1>
        </div>
        <div className="header-actions">
          <button type="button" className="primary-action" onClick={openCreate}>+ Nouvel utilisateur</button>
        </div>
      </div>

      <div className="filters" style={{ marginBottom: 20 }}>
        <input
          className="search-input"
          type="search"
          placeholder="Rechercher un utilisateur…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="status-select" value={filterRole} onChange={e => setFilterRole(e.target.value as typeof filterRole)}>
          <option value="Tous">Tous les rôles</option>
          {(Object.keys(roleLabels) as UserRole[]).map(r => (
            <option key={r} value={r}>{roleLabels[r]}</option>
          ))}
        </select>
      </div>

      <section className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Statut</th>
              <th>Dernière connexion</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className={!u.active ? 'row-inactive' : ''}>
                <td><strong>{u.fullName}</strong></td>
                <td>{u.email}</td>
                <td>
                  <span className="user-role-badge" style={{ background: roleColors[u.role] }}>
                    {roleLabels[u.role]}
                  </span>
                </td>
                <td>
                  <span className={`pill ${u.active ? 'accent' : 'neutral'}`}>
                    {u.active ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="op-meta">{u.lastLogin || '—'}</td>
                <td>
                  <div className="action-btns">
                    <button type="button" className="btn-icon" onClick={() => openEdit(u)} title="Modifier">✏️</button>
                    <button type="button" className="btn-icon" onClick={() => toggleActive(u.id)} title={u.active ? 'Désactiver' : 'Activer'}>
                      {u.active ? '🔒' : '🔓'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p style={{ textAlign: 'center', padding: 20, color: 'var(--text-subtle)' }}>Aucun utilisateur trouvé</p>}
      </section>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}>
        <form className="form-grid" onSubmit={e => { e.preventDefault(); handleSave() }}>
          <label className="form-field">
            <span>Nom complet</span>
            <input type="text" value={formName} onChange={e => setFormName(e.target.value)} required />
          </label>
          <label className="form-field">
            <span>Email</span>
            <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} required />
          </label>
          <label className="form-field">
            <span>Rôle</span>
            <select value={formRole} onChange={e => setFormRole(e.target.value as UserRole)}>
              {(Object.keys(roleLabels) as UserRole[]).map(r => (
                <option key={r} value={r}>{roleLabels[r]}</option>
              ))}
            </select>
          </label>
          <div className="form-actions">
            <button type="button" className="secondary-action" onClick={() => setShowModal(false)}>Annuler</button>
            <button type="submit" className="primary-action">
              {editingUser ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
