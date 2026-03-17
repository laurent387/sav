import { useDeferredValue, useState } from 'react'
import { gammes, retrofitOperations, type Configuration, type Section, type Discipline } from '../../data'

function configPill(c: Configuration) {
  const map: Record<Configuration, string> = {
    "E'": 'danger', F: 'neutral', G: 'neutral', H: 'accent', I: 'accent',
  }
  return `pill ${map[c]}`
}

export function TechGammes() {
  const [section, setSection] = useState<'Toutes' | Section>('Toutes')
  const [discipline, setDiscipline] = useState<'Toutes' | Discipline>('Toutes')
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [selectedOp, setSelectedOp] = useState<string | null>(null)

  const filtered = gammes.filter(g => {
    const matchSection = section === 'Toutes' || g.section === section
    const matchDisc = discipline === 'Toutes' || g.discipline === discipline
    const q = deferredSearch.trim().toLowerCase()
    const matchSearch = !q || [g.id, g.title, g.category].join(' ').toLowerCase().includes(q)
    return matchSection && matchDisc && matchSearch
  })

  const selectedOpDef = selectedOp ? retrofitOperations.find(o => o.id === selectedOp) : null

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">Technicien</p>
          <h1 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)' }}>Documentation technique</h1>
        </div>
      </div>

      {/* Opérations de retrofit rapides */}
      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="section-heading">
          <div>
            <p className="section-kicker">Fiches opérations</p>
            <h2>Retrofit E'→H — Accès rapide</h2>
          </div>
        </div>
        <div className="ops-quick-list">
          {retrofitOperations.map(op => (
            <button
              key={op.id}
              type="button"
              className={`op-quick-btn${selectedOp === op.id ? ' active' : ''}`}
              onClick={() => setSelectedOp(op.id === selectedOp ? null : op.id)}
            >
              <strong>{op.title}</strong>
              <span className="op-meta">{op.estimatedHours}h · {op.personnel}p</span>
            </button>
          ))}
        </div>

        {selectedOpDef && (
          <div className="op-detail" style={{ marginTop: 20, borderTop: '1px solid var(--border-soft)', paddingTop: 20 }}>
            <div className="op-detail-header">
              <h3>{selectedOpDef.title}</h3>
              <span className="row-id">{selectedOpDef.code}</span>
            </div>
            <dl className="detail-grid">
              <div><dt>Durée</dt><dd>{selectedOpDef.estimatedHours}h</dd></div>
              <div><dt>Personnel</dt><dd>{selectedOpDef.personnel}</dd></div>
              <div><dt>De</dt><dd><span className={configPill(selectedOpDef.fromConfig)}>CONF {selectedOpDef.fromConfig}</span></dd></div>
              <div><dt>Vers</dt><dd><span className={configPill(selectedOpDef.toConfig)}>CONF {selectedOpDef.toConfig}</span></dd></div>
            </dl>
            <h4>Outillage</h4>
            <ul className="checklist">{selectedOpDef.tools.map((t, i) => <li key={i}>{t}</li>)}</ul>
            {selectedOpDef.parts.length > 0 && (
              <><h4>Pièces</h4><ul className="checklist">{selectedOpDef.parts.map((p, i) => <li key={i}>{p.designation} × {p.quantity}</li>)}</ul></>
            )}
            <h4>Étapes</h4>
            <ol className="step-list">{selectedOpDef.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
          </div>
        )}
      </section>

      {/* Gammes d'assemblage */}
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Gammes d'assemblage</p>
            <h2>{filtered.length} documents</h2>
          </div>
        </div>

        <div className="filters" style={{ marginBottom: 16 }}>
          <input className="search-input" type="search" value={search} placeholder="Rechercher…" onChange={e => setSearch(e.target.value)} />
          <select className="status-select" value={section} onChange={e => setSection(e.target.value as typeof section)}>
            {(['Toutes', 'PARTIE FIXE', 'PARTIE MOBILE'] as const).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="status-select" value={discipline} onChange={e => setDiscipline(e.target.value as typeof discipline)}>
            {(['Toutes', 'MECA', 'ELEC'] as const).map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="gamme-grid">
          {filtered.map(g => (
            <article key={g.id} className="gamme-card">
              <div className="gamme-card-top">
                <div>
                  <p className="row-id">{g.id}</p>
                  <h3>{g.title}</h3>
                  <p>{g.section} · {g.category}</p>
                </div>
                <span className={`pill ${g.discipline === 'MECA' ? 'accent' : 'neutral'}`}>{g.discipline}</span>
              </div>
              <div className="gamme-configs">
                {g.configs.map(c => <span key={c} className={configPill(c)}>CONF {c}</span>)}
              </div>
              {g.documents && g.documents.length > 0 && (
                <div className="gamme-docs">
                  {g.documents.map(doc => (
                    <a
                      key={doc}
                      className="gamme-doc-link"
                      href={`${import.meta.env.BASE_URL}gammes/${encodeURIComponent(doc)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      📑 {doc.replace('.pptx', '')}
                    </a>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
