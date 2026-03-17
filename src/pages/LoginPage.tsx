import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import type { UserRole } from '../types/auth'
import '../styles/LoginPage.css'

export function LoginPage() {
  const { login, isLoading, error } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    if (!username || !password) {
      setLocalError('Veuillez remplir tous les champs')
      return
    }

    try {
      await login(username, password)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de connexion'
      setLocalError(message)
    }
  }

  const handleQuickLogin = (credentials: { user: string; pass: string; role: UserRole }) => {
    setUsername(credentials.user)
    setPassword(credentials.pass)
  }

  return (
    <div className="login-container">
      <div className="login-wrapper">
        <div className="login-card">
          <div className="login-header">
            <h1>LIFT GMAO</h1>
            <p>Gestion de Maintenance Assistée par Ordinateur</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="username">Identifiant</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nom d'utilisateur ou email"
                disabled={isLoading}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Mot de passe</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe"
                disabled={isLoading}
              />
            </div>

            {(localError || error) && (
              <div className="error-message">
                {localError || error}
              </div>
            )}

            <button type="submit" disabled={isLoading} className="btn-login">
              {isLoading ? 'Connexion en cours...' : 'Se connecter'}
            </button>
          </form>

          <div className="login-divider">Comptes de test</div>

          <div className="test-accounts">
            <TestAccountButton
              role="admin"
              label="Admin"
              username="admin"
              password="admin123"
              onClick={() =>
                handleQuickLogin({ user: 'admin', pass: 'admin123', role: 'admin' })
              }
            />
            <TestAccountButton
              role="bureau-etude"
              label="Bureau d'Études"
              username="be@lift.fr"
              password="be123"
              onClick={() =>
                handleQuickLogin({ user: 'be@lift.fr', pass: 'be123', role: 'bureau-etude' })
              }
            />
            <TestAccountButton
              role="logistique"
              label="Logistique"
              username="logistique@lift.fr"
              password="log123"
              onClick={() =>
                handleQuickLogin({
                  user: 'logistique@lift.fr',
                  pass: 'log123',
                  role: 'logistique',
                })
              }
            />
            <TestAccountButton
              role="technicien"
              label="Technicien"
              username="tech@lift.fr"
              password="tech123"
              onClick={() =>
                handleQuickLogin({ user: 'tech@lift.fr', pass: 'tech123', role: 'technicien' })
              }
            />
          </div>

          <div className="login-footer">
            <p className="text-muted">
              Serveur: <strong>87.106.26.179</strong>
            </p>
            <p className="text-muted small">
              En développement, les comptes de test utilisent des données locales
            </p>
          </div>
        </div>

        <div className="login-info">
          <div className="info-card">
            <h3>Rôles disponibles</h3>
            <ul>
              <li>
                <strong>Admin</strong> – Accès complet, gestion système
              </li>
              <li>
                <strong>Bureau d'Études</strong> – Création OT, gammes, retrofit
              </li>
              <li>
                <strong>Logistique</strong> – Gestion stock, pièces, alertes
              </li>
              <li>
                <strong>Technicien</strong> – Exécution OT, mise à jour statuts
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function TestAccountButton({
  role,
  label,
  username,
  onClick,
}: {
  role: UserRole
  label: string
  username: string
  onClick: () => void
}) {
  return (
    <button className={`test-account-btn role-${role}`} onClick={onClick} type="button">
      <div className="account-label">{label}</div>
      <div className="account-creds">{username}</div>
    </button>
  )
}
