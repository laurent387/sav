import { startTransition, useDeferredValue, useState } from 'react'
import {
  type Configuration, type Section, type Discipline,
} from '../../data'
import { useGmaoData } from '../../contexts/DataContext'

function configPill(c: Configuration) {
  const map: Record<Configuration, string> = {
    "E'": 'danger', F: 'neutral', G: 'neutral', H: 'accent', I: 'accent',
  }
  return `pill ${map[c]}`
}

export function BEGammes() {
  const { gammes, retrofitOperations } = useGmaoData()
  const [section, setSection] = useState<'Toutes' | Section>('Toutes')
  const [discipline, setDiscipline] = useState<'Toutes' | Discipline>('Toutes')
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [selectedGamme, setSelectedGamme] = useState<string | null>(null)
  const [showOps, setShowOps] = useState(false)

  const filtered = gammes.filter(g => {
    const matchSection = section === 'Toutes' || g.section === section
    const matchDisc = discipline === 'Toutes' || g.discipline === discipline
    const q = deferredSearch.trim().toLowerCase()
    const matchSearch = !q || [g.id, g.title, g.category].join(' ').toLowerCase().includes(q)
    return matchSection && matchDisc && matchSearch
  })

  const selected = selectedGamme ? gammes.find(g => g.id === selectedGamme) : null

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">Bureau d'Études</p>
          <h1 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)' }}>Gammes & Documentation</h1>
        </div>
        <div className="header-actions">
          <button type="button" className={`secondary-action${showOps ? ' active' : ''}`} onClick={() => setShowOps(!showOps)}>
            {showOps ? 'Voir gammes' : 'Voir opérations retrofit'}
          </button>
        </div>
      </div>

      {!showOps ? (
        <>
          <div className="filters" style={{ marginBottom: 20 }}>
            <input className="search-input" type="search" value={search} placeholder="Rechercher par titre, ref, catégorie…" onChange={e => setSearch(e.target.value)} />
            <select className="status-select" value={section} onChange={e => startTransition(() => setSection(e.target.value as typeof section))}>
              {(['Toutes', 'PARTIE FIXE', 'PARTIE MOBILE'] as const).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="status-select" value={discipline} onChange={e => startTransition(() => setDiscipline(e.target.value as typeof discipline))}>
              {(['Toutes', 'MECA', 'ELEC'] as const).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="gammes-layout">
            <div className="gamme-grid">
              {filtered.map(g => (
                <article
                  key={g.id}
                  className={`gamme-card${selectedGamme === g.id ? ' selected' : ''}`}
                  onClick={() => setSelectedGamme(g.id === selectedGamme ? null : g.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="gamme-card-top">
                    <div>
                      <p className="row-id">{g.id}</p>
                      <h3>{g.title}</h3>
                      <p>{g.section} · {g.category}</p>
                    </div>
                    <div className="row-tags">
                      <span className={`pill ${g.discipline === 'MECA' ? 'accent' : 'neutral'}`}>{g.discipline}</span>
                    </div>
                  </div>
                  <div className="gamme-configs">
                    {g.configs.map(c => <span key={c} className={configPill(c)}>CONF {c}</span>)}
                    <span className="pill neutral">Ind. {g.revision}</span>
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
                          onClick={e => e.stopPropagation()}
                        >
                          📑 {doc.replace('.pptx', '')}
                        </a>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>

            {selected && (
              <aside className="detail-card" style={{ position: 'sticky', top: 20 }}>
                <div className="detail-header">
                  <div>
                    <p className="row-id">{selected.id}</p>
                    <h3>{selected.title}</h3>
                  </div>
                  <span className={`pill ${selected.discipline === 'MECA' ? 'accent' : 'neutral'}`}>{selected.discipline}</span>
                </div>
                <dl className="detail-grid">
                  <div><dt>Section</dt><dd>{selected.section}</dd></div>
                  <div><dt>Catégorie</dt><dd>{selected.category}</dd></div>
                  <div><dt>Révision</dt><dd>Ind. {selected.revision}</dd></div>
                  <div>
                    <dt>Configurations</dt>
                    <dd className="gamme-configs">{selected.configs.map(c => <span key={c} className={configPill(c)}>CONF {c}</span>)}</dd>
                  </div>
                </dl>
                <div className="detail-block">
                  <h4>Informations</h4>
                  <p style={{ color: 'var(--text-soft)' }}>
                    Gamme d'assemblage {selected.discipline === 'MECA' ? 'mécanique' : 'électrique'} pour
                    la {selected.section.toLowerCase()} du LIFT. Catégorie : {selected.category}.
                  </p>
                </div>
                {selected.documents && selected.documents.length > 0 && (
                  <div className="detail-block">
                    <h4>📎 Documents PowerPoint ({selected.documents.length})</h4>
                    <div className="gamme-docs-detail">
                      {selected.documents.map(doc => (
                        <a
                          key={doc}
                          className="gamme-doc-link-detail"
                          href={`${import.meta.env.BASE_URL}gammes/${encodeURIComponent(doc)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <span className="doc-icon">📑</span>
                          <span className="doc-name">{doc.replace('.pptx', '')}</span>
                          <span className="doc-download">↗</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </aside>
            )}
          </div>
        </>
      ) : (
        /* Opérations de retrofit */
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Retrofit E'→H</p>
              <h2>Opérations — {retrofitOperations.length} fiches</h2>
            </div>
          </div>
          <div className="ops-grid">
            {retrofitOperations.map(op => (
              <article key={op.id} className="op-card">
                <div className="op-card-header">
                  <div>
                    <span className="row-id">{op.code}</span>
                    <h3>{op.title}</h3>
                  </div>
                  <span className="pill neutral">{op.estimatedHours}h · {op.personnel}p</span>
                </div>
                <div className="op-card-body">
                  <div className="op-card-section">
                    <strong>Outillage :</strong>
                    <span>{op.tools.join(', ')}</span>
                  </div>
                  {op.parts.length > 0 && (
                    <div className="op-card-section">
                      <strong>Pièces :</strong>
                      <span>{op.parts.map(p => `${p.designation} ×${p.quantity}`).join(', ')}</span>
                    </div>
                  )}
                  <div className="op-card-section">
                    <strong>{op.steps.length} étapes</strong>
                  </div>
                </div>
                <div className="gamme-configs">
                  <span className={configPill(op.fromConfig)}>CONF {op.fromConfig}</span>
                  <span style={{ color: 'var(--text-subtle)' }}>→</span>
                  <span className={configPill(op.toConfig)}>CONF {op.toConfig}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
