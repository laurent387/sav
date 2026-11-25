import { SEQUENCE, STATUS_META, fmtMm, type VerificationStatus } from './analysis'

interface Props {
  status: ReadonlyMap<number, VerificationStatus>
  values: ReadonlyMap<number, number>
  selected: number | null
  onSelect: (screw: number) => void
}

const W = 720
const H = 240
const PAD = { l: 52, r: 14, t: 14, b: 34 }

/** Profil des mesures dans l'ordre d'acquisition. La courbe est interrompue
 *  là où une mesure manque : on ne relie jamais deux vis non adjacentes. */
export function ProfileChart({ status, values, selected, onSelect }: Props) {
  const pts = SEQUENCE.map((s, i) => ({ s, i, v: values.get(s) }))
  const known = pts.filter(p => p.v !== undefined) as { s: number; i: number; v: number }[]

  if (known.length === 0) {
    return <p className="geo-empty">Aucune mesure enregistrée pour l'instant.</p>
  }

  let min = Math.min(...known.map(p => p.v))
  let max = Math.max(...known.map(p => p.v))
  if (max - min < 0.2) { const mid = (max + min) / 2; min = mid - 0.1; max = mid + 0.1 }
  const span = max - min
  min -= span * 0.1
  max += span * 0.1

  const x = (i: number) => PAD.l + (i * (W - PAD.l - PAD.r)) / (SEQUENCE.length - 1)
  const y = (v: number) => PAD.t + ((max - v) * (H - PAD.t - PAD.b)) / (max - min)

  const segments: string[] = []
  let cur: string[] = []
  for (const p of pts) {
    if (p.v === undefined) { if (cur.length > 1) segments.push(cur.join(' ')); cur = []; continue }
    cur.push(`${x(p.i)},${y(p.v)}`)
  }
  if (cur.length > 1) segments.push(cur.join(' '))

  const ticks = Array.from({ length: 5 }, (_, k) => min + ((max - min) * k) / 4)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="geo-profile" role="img" aria-label="Profil des mesures dans l'ordre d'acquisition">
      {ticks.map(t => (
        <g key={t}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--border-soft)" />
          <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" className="geo-axis">{fmtMm(t, 2)}</text>
        </g>
      ))}
      <text x={PAD.l - 6} y={H - 12} textAnchor="end" className="geo-axis">vis / mm</text>
      {segments.map(d => <polyline key={d} points={d} fill="none" stroke="var(--text-soft)" strokeWidth={1.5} />)}
      {pts.map(p => (
        <text key={p.s} x={x(p.i)} y={H - 12} textAnchor="middle" className="geo-axis">{p.s}</text>
      ))}
      {known.map(p => {
        const st = status.get(p.s) ?? 'ok'
        return (
          <g key={p.s} className="geo-dial-point clickable" onClick={() => onSelect(p.s)} role="button" tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onSelect(p.s) }}>
            <title>{`Vis ${p.s} — ${fmtMm(p.v)} mm — ${STATUS_META[st].label}`}</title>
            {p.s === selected && <circle cx={x(p.i)} cy={y(p.v)} r={10} fill="none" stroke="var(--accent-strong)" strokeWidth={2.5} />}
            <circle cx={x(p.i)} cy={y(p.v)} r={6} fill={STATUS_META[st].color} stroke="#fff" strokeWidth={1.5} />
          </g>
        )
      })}
    </svg>
  )
}
