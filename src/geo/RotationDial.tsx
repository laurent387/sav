import { SCREW_COUNT, MEASURED_SCREWS, STATUS_META, fmtMm, type VerificationStatus } from './analysis'

interface Props {
  status: ReadonlyMap<number, VerificationStatus>
  values: ReadonlyMap<number, number>
  vigilance: ReadonlySet<number>
  target: number | null
  selected: number | null
  onSelect: (screw: number) => void
}

const SIZE = 340
const C = SIZE / 2
const R = 128

/** Position d'une vis : vis 1 en haut, numérotation croissante dans le sens horaire
 *  (le parcours 3 → 2 → 1 → 40 → … → 19 se lit donc dans le sens antihoraire). */
function pos(screw: number, radius: number) {
  const a = ((screw - 1) * 2 * Math.PI) / SCREW_COUNT
  return { x: C + radius * Math.sin(a), y: C - radius * Math.cos(a) }
}

export function RotationDial({ status, values, vigilance, target, selected, onSelect }: Props) {
  const screws = Array.from({ length: SCREW_COUNT }, (_, i) => i + 1)
  const measured = [...MEASURED_SCREWS].filter(s => values.has(s)).length

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="geo-dial" role="img" aria-label="Représentation circulaire des vis de la couronne de rotation">
      <circle cx={C} cy={C} r={R} fill="none" stroke="var(--border-strong)" strokeWidth={10} />
      {/* Sens d'acquisition antihoraire */}
      <path d={`M ${pos(5, R - 26).x} ${pos(5, R - 26).y} A ${R - 26} ${R - 26} 0 0 0 ${pos(1.5, R - 26).x} ${pos(1.5, R - 26).y}`}
        fill="none" stroke="var(--text-subtle)" strokeWidth={1.5} markerEnd="url(#geo-arrow)" />
      <defs>
        <marker id="geo-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--text-subtle)" />
        </marker>
      </defs>
      <text x={C} y={C - 8} textAnchor="middle" className="geo-dial-count">{measured}/{MEASURED_SCREWS.size}</text>
      <text x={C} y={C + 14} textAnchor="middle" className="geo-dial-sub">vis mesurées</text>

      {screws.map(s => {
        const st = status.get(s) ?? 'non-mesure'
        const p = pos(s, R)
        const label = pos(s, R + 22)
        const clickable = MEASURED_SCREWS.has(s)
        const v = values.get(s)
        const title = `Vis ${s} — ${STATUS_META[st].label}${v !== undefined ? ` — ${fmtMm(v)} mm` : ''}${vigilance.has(s) ? ' — vigilance' : ''}`
        return (
          <g key={s}
            className={clickable ? 'geo-dial-point clickable' : 'geo-dial-point'}
            onClick={clickable ? () => onSelect(s) : undefined}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            onKeyDown={clickable ? e => { if (e.key === 'Enter' || e.key === ' ') onSelect(s) } : undefined}
          >
            <title>{title}</title>
            {s === target && <circle cx={p.x} cy={p.y} r={14} fill="none" stroke="var(--ink)" strokeWidth={2} strokeDasharray="3 2" />}
            {s === selected && <circle cx={p.x} cy={p.y} r={14} fill="none" stroke="var(--accent-strong)" strokeWidth={3} />}
            <circle cx={p.x} cy={p.y} r={clickable ? 9 : 6} fill={STATUS_META[st].color} stroke="#fff" strokeWidth={1.5} opacity={clickable ? 1 : 0.55} />
            {vigilance.has(s) && <text x={p.x} y={p.y + 3.5} textAnchor="middle" className="geo-dial-flag">!</text>}
            <text x={label.x} y={label.y + 4} textAnchor="middle" className={clickable ? 'geo-dial-label' : 'geo-dial-label muted'}>{s}</text>
          </g>
        )
      })}
    </svg>
  )
}
