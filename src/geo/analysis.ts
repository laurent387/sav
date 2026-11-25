// ═══════════════════════════════════════════════════════
// Contrôle géométrique de la rotation — détection des mesures atypiques
//
// Aide à la détection uniquement : les seuils ne sont PAS des tolérances
// constructeur, et une alerte n'est jamais la preuve d'un défaut mécanique.
// Aucune mesure n'est jamais corrigée automatiquement.
// ═══════════════════════════════════════════════════════

/** Nombre de vis sur la couronne de rotation. */
export const SCREW_COUNT = 40

/** Ordre physique d'acquisition, sens antihoraire : 3 → 2 → 1 → 40 → 39 → … → 19. */
export const SEQUENCE: readonly number[] = [3, 2, 1, ...Array.from({ length: 22 }, (_, i) => 40 - i)]

export const MEASURED_SCREWS = new Set(SEQUENCE)

export const DEFAULT_THRESHOLDS: Thresholds = { local: 0.2, mean: 0.2 }

export const ALERT_MESSAGE =
  'Une variation importante a été détectée entre cette mesure et les mesures adjacentes. ' +
  'Veuillez vérifier la propreté des surfaces et le positionnement de l\'outillage avant de renouveler la mesure.'

export const CLEANING_CHECKLIST: readonly string[] = [
  'Dépoussiérer minutieusement la piste de roulement',
  'Nettoyer les dents de la crémaillère',
  'Nettoyer les surfaces de contact de l\'outillage de mesure',
  'Vérifier le positionnement de l\'outillage équipé du comparateur',
  'Vérifier l\'absence de corps étrangers sur les surfaces de mesure',
  'Renouveler la mesure',
]

export interface Thresholds {
  /** Seuil d'alerte entre deux vis adjacentes (mm). */
  local: number
  /** Seuil d'alerte par rapport à la moyenne des deux vis adjacentes (mm). */
  mean: number
}

export interface Measurement {
  screw: number
  value: number
  /** Une alerte a déjà été levée sur cette vis (indicateur persistant). */
  alertRaised: boolean
  /** Mesure confirmée par le technicien malgré l'écart. */
  confirmed: boolean
  vigilance: boolean
  observation?: string | null
  measuredAt?: string
  measuredBy?: string | null
}

export interface MeasurementEvent {
  id: number
  screw: number
  kind: 'mesure' | 'correction' | 'confirmation'
  oldValue: number | null
  newValue: number | null
  reason: string | null
  cleaning: string[]
  alertStatus: string | null
  observation: string | null
  technician: string | null
  createdAt: string
}

/** Statut de vérification (et non de conformité mécanique). */
export type VerificationStatus = 'non-mesure' | 'ok' | 'a-verifier' | 'confirme' | 'resolu'

export const STATUS_META: Record<VerificationStatus, { label: string; color: string }> = {
  'ok':         { label: 'Mesure enregistrée sans alerte', color: '#2f6fdb' },
  'a-verifier': { label: 'Mesure nécessitant une vérification', color: '#f08a24' },
  'confirme':   { label: 'Écart important confirmé après vérification', color: '#d93a3a' },
  'resolu':     { label: 'Mesure renouvelée, alerte résolue', color: '#2e9e5b' },
  'non-mesure': { label: 'Position non mesurée', color: '#a4adb5' },
}

export interface ScrewAnalysis {
  screw: number
  value: number | null
  /** Vis précédente dans l'ordre d'acquisition (adjacente physiquement). */
  prevScrew: number | null
  nextScrew: number | null
  prevValue: number | null
  nextValue: number | null
  /** Écart signé = mesure − vis précédente. */
  signedPrev: number | null
  absPrev: number | null
  /** Écart signé = mesure − vis suivante. */
  signedNext: number | null
  absNext: number | null
  /** Moyenne des deux vis adjacentes, si les deux sont mesurées. */
  neighborMean: number | null
  /** Écart signé = mesure − moyenne des deux voisines. */
  meanDev: number | null
  localExceeded: boolean
  meanExceeded: boolean
  alert: boolean
}

const round = (v: number) => Math.round(v * 1000) / 1000

/** Voisines physiques dans l'ordre d'acquisition. Les extrémités (3 et 19) n'en ont qu'une. */
export function neighborsOf(screw: number): { prev: number | null; next: number | null } {
  const i = SEQUENCE.indexOf(screw)
  if (i < 0) return { prev: null, next: null }
  return {
    prev: i > 0 ? SEQUENCE[i - 1] : null,
    next: i < SEQUENCE.length - 1 ? SEQUENCE[i + 1] : null,
  }
}

/**
 * Analyse une vis à partir des valeurs connues.
 * Une voisine non mesurée n'est jamais remplacée par une vis plus éloignée.
 */
export function analyzeScrew(screw: number, values: ReadonlyMap<number, number>, t: Thresholds): ScrewAnalysis {
  const { prev, next } = neighborsOf(screw)
  const value = values.get(screw) ?? null
  const prevValue = prev !== null ? values.get(prev) ?? null : null
  const nextValue = next !== null ? values.get(next) ?? null : null

  const signedPrev = value !== null && prevValue !== null ? round(value - prevValue) : null
  const signedNext = value !== null && nextValue !== null ? round(value - nextValue) : null
  const neighborMean = prevValue !== null && nextValue !== null ? round((prevValue + nextValue) / 2) : null
  const meanDev = value !== null && neighborMean !== null ? round(value - neighborMean) : null

  // Petite marge pour éviter les faux positifs dus à l'arrondi flottant (ex. 0,2000000001).
  const eps = 1e-9
  const absPrev = signedPrev !== null ? Math.abs(signedPrev) : null
  const absNext = signedNext !== null ? Math.abs(signedNext) : null
  const localExceeded = (absPrev ?? 0) > t.local + eps || (absNext ?? 0) > t.local + eps
  const meanExceeded = meanDev !== null && Math.abs(meanDev) > t.mean + eps

  return {
    screw, value, prevScrew: prev, nextScrew: next, prevValue, nextValue,
    signedPrev, absPrev, signedNext, absNext, neighborMean, meanDev,
    localExceeded, meanExceeded, alert: localExceeded || meanExceeded,
  }
}

export function valuesMap(measurements: readonly Measurement[]): Map<number, number> {
  return new Map(measurements.map(m => [m.screw, m.value]))
}

/**
 * Contrôle rétrospectif : après l'enregistrement de `screw`, vérifie si la vis
 * précédente forme un pic ou un creux isolé par rapport à ses deux voisines.
 */
export function retrospectiveCheck(screw: number, values: ReadonlyMap<number, number>, t: Thresholds): ScrewAnalysis | null {
  const { prev } = neighborsOf(screw)
  if (prev === null || !values.has(prev)) return null
  const a = analyzeScrew(prev, values, t)
  return a.meanExceeded ? a : null
}

export function correctionsByScrew(events: readonly MeasurementEvent[]): Map<number, MeasurementEvent[]> {
  const map = new Map<number, MeasurementEvent[]>()
  for (const e of events) {
    if (e.kind !== 'correction') continue
    const list = map.get(e.screw) ?? []
    list.push(e)
    map.set(e.screw, list)
  }
  return map
}

/**
 * Alerte non expliquée : un dépassement qui ne s'explique pas entièrement par une
 * voisine dont l'écart a déjà été confirmé par le technicien. Sans cette règle,
 * chaque écart réel confirmé maintiendrait ses deux voisines en alerte.
 */
export function hasUnexplainedAlert(a: ScrewAnalysis, confirmed: ReadonlySet<number>, t: Thresholds): boolean {
  if (!a.alert) return false
  const eps = 1e-9
  const prevOk = a.prevScrew !== null && confirmed.has(a.prevScrew)
  const nextOk = a.nextScrew !== null && confirmed.has(a.nextScrew)
  if ((a.absPrev ?? 0) > t.local + eps && !prevOk) return true
  if ((a.absNext ?? 0) > t.local + eps && !nextOk) return true
  if (a.meanExceeded && !prevOk && !nextOk) return true
  return false
}

/** Statut de vérification affiché pour une vis (recalculé à chaque changement). */
export function statusOf(
  m: Measurement | undefined, a: ScrewAnalysis | undefined, corrections: readonly MeasurementEvent[],
  confirmed: ReadonlySet<number> = new Set(), t: Thresholds = DEFAULT_THRESHOLDS,
): VerificationStatus {
  if (!m || !a || a.value === null) return 'non-mesure'
  if (m.confirmed) return 'confirme'
  if (hasUnexplainedAlert(a, confirmed, t)) return 'a-verifier'
  if (m.alertRaised && corrections.length > 0) return 'resolu'
  return 'ok'
}

export interface ControlAnalysis {
  byScrew: Map<number, ScrewAnalysis>
  status: Map<number, VerificationStatus>
  measuredCount: number
  /** Prochaine vis à mesurer dans le parcours normal, ou null si terminé. */
  nextToMeasure: number | null
}

export function analyzeControl(measurements: readonly Measurement[], events: readonly MeasurementEvent[], t: Thresholds): ControlAnalysis {
  const values = valuesMap(measurements)
  const byId = new Map(measurements.map(m => [m.screw, m]))
  const corr = correctionsByScrew(events)
  const confirmed = new Set(measurements.filter(m => m.confirmed).map(m => m.screw))
  const byScrew = new Map<number, ScrewAnalysis>()
  const status = new Map<number, VerificationStatus>()
  for (let s = 1; s <= SCREW_COUNT; s++) {
    if (MEASURED_SCREWS.has(s)) {
      const a = analyzeScrew(s, values, t)
      byScrew.set(s, a)
      status.set(s, statusOf(byId.get(s), a, corr.get(s) ?? [], confirmed, t))
    } else {
      status.set(s, 'non-mesure')
    }
  }
  return {
    byScrew,
    status,
    measuredCount: SEQUENCE.filter(s => values.has(s)).length,
    nextToMeasure: SEQUENCE.find(s => !values.has(s)) ?? null,
  }
}

export interface ControlSummary {
  atypicalDetected: number
  remeasured: number
  resolvedAfterCleaning: number
  confirmed: number
  attention: { screw: number; status: VerificationStatus; vigilance: boolean; observation?: string | null }[]
  corrections: MeasurementEvent[]
}

export function summarize(measurements: readonly Measurement[], events: readonly MeasurementEvent[], analysis: ControlAnalysis): ControlSummary {
  const corr = correctionsByScrew(events)
  const attention = measurements
    .filter(m => {
      const st = analysis.status.get(m.screw)
      return m.vigilance || st === 'a-verifier' || st === 'confirme'
    })
    .sort((x, y) => SEQUENCE.indexOf(x.screw) - SEQUENCE.indexOf(y.screw))
    .map(m => ({ screw: m.screw, status: analysis.status.get(m.screw) ?? 'ok', vigilance: m.vigilance, observation: m.observation }))

  return {
    atypicalDetected: measurements.filter(m => m.alertRaised).length,
    remeasured: corr.size,
    resolvedAfterCleaning: [...corr.entries()].filter(([screw, list]) =>
      analysis.status.get(screw) === 'resolu' && list.some(e => e.cleaning.length > 0)).length,
    confirmed: measurements.filter(m => m.confirmed).length,
    attention,
    corrections: events.filter(e => e.kind === 'correction'),
  }
}

/** Formate un écart signé en mm : « +0,080 », « −0,290 ». */
export function fmtSigned(v: number | null, digits = 3): string {
  if (v === null) return '—'
  const s = Math.abs(v).toFixed(digits).replace('.', ',')
  return v > 0 ? `+${s}` : v < 0 ? `−${s}` : s
}

export function fmtMm(v: number | null, digits = 3): string {
  return v === null ? '—' : v.toFixed(digits).replace('.', ',')
}
