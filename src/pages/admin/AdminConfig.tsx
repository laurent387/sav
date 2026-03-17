import { useState } from 'react'

interface SystemConfig {
  key: string
  label: string
  value: string
  category: string
  type: 'text' | 'select' | 'number' | 'toggle'
  options?: string[]
}

const initialConfig: SystemConfig[] = [
  { key: 'company_name', label: 'Nom société', value: 'LIFT GMAO', category: 'Général', type: 'text' },
  { key: 'client_principal', label: 'Client principal', value: 'ALSTOM', category: 'Général', type: 'text' },
  { key: 'default_config_target', label: 'Configuration cible par défaut', value: 'H', category: 'Retrofit', type: 'select', options: ["E'", 'F', 'G', 'H', 'I'] },
  { key: 'ot_auto_assign', label: 'Assignation auto des OT', value: 'true', category: 'Ordres de travail', type: 'toggle' },
  { key: 'fnc_auto_notify', label: 'Notification auto FNC', value: 'true', category: 'Qualité', type: 'toggle' },
  { key: 'stock_alert_threshold', label: 'Seuil alerte stock', value: '2', category: 'Logistique', type: 'number' },
  { key: 'maintenance_interval', label: 'Intervalle maintenance préventive (jours)', value: '180', category: 'Maintenance', type: 'number' },
  { key: 'session_timeout', label: 'Timeout session (min)', value: '30', category: 'Sécurité', type: 'number' },
  { key: 'language', label: 'Langue', value: 'Français', category: 'Général', type: 'select', options: ['Français', 'English'] },
  { key: 'timezone', label: 'Fuseau horaire', value: 'Europe/Paris', category: 'Général', type: 'text' },
]

export function AdminConfig() {
  const [config, setConfig] = useState(initialConfig)
  const [saved, setSaved] = useState(false)
  const [activeCategory, setActiveCategory] = useState('Tous')

  const categories = ['Tous', ...new Set(config.map(c => c.category))]

  const filtered = activeCategory === 'Tous' ? config : config.filter(c => c.category === activeCategory)

  function updateValue(key: string, value: string) {
    setConfig(prev => prev.map(c => c.key === key ? { ...c, value } : c))
    setSaved(false)
  }

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">Administration</p>
          <h1 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)' }}>Configuration système</h1>
        </div>
        <div className="header-actions">
          <button type="button" className={`primary-action${saved ? ' saved' : ''}`} onClick={handleSave}>
            {saved ? '✓ Enregistré' : 'Enregistrer'}
          </button>
        </div>
      </div>

      <div className="config-tabs">
        {categories.map(cat => (
          <button
            key={cat}
            type="button"
            className={`view-chip${activeCategory === cat ? ' active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <section className="panel">
        <div className="config-list">
          {filtered.map(item => (
            <div key={item.key} className="config-item">
              <div className="config-info">
                <strong>{item.label}</strong>
                <span className="op-meta">{item.category}</span>
              </div>
              <div className="config-control">
                {item.type === 'text' && (
                  <input
                    type="text"
                    className="config-input"
                    value={item.value}
                    onChange={e => updateValue(item.key, e.target.value)}
                  />
                )}
                {item.type === 'number' && (
                  <input
                    type="number"
                    className="config-input config-input-sm"
                    value={item.value}
                    onChange={e => updateValue(item.key, e.target.value)}
                  />
                )}
                {item.type === 'select' && (
                  <select
                    className="config-input"
                    value={item.value}
                    onChange={e => updateValue(item.key, e.target.value)}
                  >
                    {item.options?.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}
                {item.type === 'toggle' && (
                  <button
                    type="button"
                    className={`toggle-switch${item.value === 'true' ? ' on' : ''}`}
                    onClick={() => updateValue(item.key, item.value === 'true' ? 'false' : 'true')}
                  >
                    <span className="toggle-knob" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
