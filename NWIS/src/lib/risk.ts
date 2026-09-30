import { FORMATION_BY_ID, FORMATIONS } from "@/data/formations"
import { EVENTS } from "@/data/events"
import { WELLS } from "@/data/wells"
import type { DrillingEvent, EventType } from "@/data/types"

// ─── Deterministic heuristic risk engine ─────────────────────────────────────
// Produces per-category risk scores for the active well at a given depth,
// derived purely from offset-well historical behavior. Fully deterministic —
// it presents like an ML model but runs offline with zero dependencies.

export const RISK_CATEGORIES: {
  id: EventType
  label: string
  color: string
  description: string
}[] = [
  { id: "mud_loss", label: "Mud Losses", color: "#f59e0b", description: "Seepage to total losses" },
  { id: "kick", label: "Kick", color: "#ef4444", description: "Influx from overpressured zones" },
  { id: "stuck_pipe", label: "Stuck Pipe", color: "#a855f7", description: "Differential or mechanical" },
  { id: "overpressure", label: "Overpressure", color: "#f97316", description: "Pore-pressure ramp" },
  { id: "cementing_issue", label: "Cementing", color: "#94a3b8", description: "Fallback / micro-annulus" },
  { id: "torque_spike", label: "Torque", color: "#eab308", description: "Tight hole / shale balls" },
]

const CATEGORY_IDS = new Set(RISK_CATEGORIES.map((c) => c.id))

/** Severity weight used when aggregating offset events. */
const SEVERITY_WEIGHT: Record<DrillingEvent["severity"], number> = {
  minor: 0.4,
  moderate: 0.7,
  severe: 1,
  critical: 1.25,
}

export interface RiskScore {
  category: EventType
  label: string
  color: string
  /** 0–100 */
  score: number
  /** supporting offset events, most relevant first */
  evidence: DrillingEvent[]
  /** short human explanation of the drivers */
  drivers: string[]
}

/** Offset events within ±lookaround of the depth, weighted by formation match. */
function evidenceFor(depthM: number, category: EventType, lookaheadM: number): {
  events: DrillingEvent[]
  drivers: string[]
} {
  const events: DrillingEvent[] = []
  const formationNow = FORMATION_BY_ID[currentFormationAt(depthM)]

  for (const ev of EVENTS) {
    if (ev.type !== category || !CATEGORY_IDS.has(ev.type)) continue
    // relevance window: same formation ± lookahead, or depth window in any formation
    const sameFormation = ev.formationId === formationNow?.id
    const withinDepth = Math.abs(ev.depthM - depthM) <= lookaheadM
    const formationNear = formationNow
      ? Math.abs(ev.depthM - (FORMATION_BY_ID[ev.formationId] ? depthM : depthM)) <= lookaheadM
      : false
    if (sameFormation || withinDepth || formationNear) events.push(ev)
  }

  events.sort((a, b) => {
    const fa = a.formationId === formationNow?.id ? 0 : 1
    const fb = b.formationId === formationNow?.id ? 0 : 1
    return fa - fb || Math.abs(a.depthM - depthM) - Math.abs(b.depthM - depthM)
  })

  const drivers: string[] = []
  if (formationNow) {
    const fmtEvents = EVENTS.filter((ev) => ev.formationId === formationNow.id && ev.type === category)
    if (fmtEvents.length > 0) {
      drivers.push(
        `${fmtEvents.length} incident${fmtEvents.length > 1 ? "s" : ""} in ${formationNow.name} across offset wells`,
      )
    }
    const nearest = events[0]
    if (nearest) {
      const delta = Math.round(nearest.depthM - depthM)
      drivers.push(
        delta >= 0
          ? `Nearest ${nearest.sourceRef.split("·")[0].trim()} event ${delta} m ahead`
          : `Nearest offset event ${Math.abs(delta)} m above current depth`,
      )
    }
  }
  return { events: events.slice(0, 5), drivers }
}

function currentFormationAt(depthM: number) {
  // Active-well tops; falls back to Surma if data missing
  const tops: [string, number][] = [
    ["girujan", 0],
    ["tipam", 1265],
    ["surma", 2225],
    ["barail", 2995],
  ]
  let current = "girujan"
  for (const [id, d] of tops) if (depthM >= d) current = id
  return current
}

/**
 * Score one risk category at a depth. Score blends:
 *  - formation-level historical frequency (dominant term)
 *  - depth-proximity of nearest incidents (±300 m core window)
 *  - severity weighting of evidence events
 */
export function riskAtDepth(depthM: number, category: EventType, lookaheadM = 300): RiskScore {
  const meta = RISK_CATEGORIES.find((c) => c.id === category)!
  const formationNow = currentFormationAt(depthM)
  const formation = FORMATION_BY_ID[formationNow]

  // formation-level base: events of this type in this formation across all wells
  const formationEvents = EVENTS.filter(
    (ev) => ev.type === category && ev.formationId === formationNow,
  )
  const wellCount = new Set(formationEvents.map((ev) => ev.wellId)).size
  const severitySum = formationEvents.reduce((s, ev) => s + SEVERITY_WEIGHT[ev.severity], 0)

  // depth-proximity term: events within ±lookahead regardless of formation
  const nearEvents = EVENTS.filter(
    (ev) => ev.type === category && Math.abs(ev.depthM - depthM) <= lookaheadM,
  )
  const proximityBoost = nearEvents.reduce((s, ev) => {
    const falloff = 1 - Math.abs(ev.depthM - depthM) / lookaheadM
    return s + SEVERITY_WEIGHT[ev.severity] * falloff
  }, 0)

  // typical-hazard prior from the formation table
  const hazardPrior = formation?.typicalHazards.includes(category) ? 12 : 0

  const raw = wellCount * 7 + severitySum * 5 + proximityBoost * 9 + hazardPrior
  const score = Math.min(97, Math.round(raw))

  const { events: evidence, drivers: dynDrivers } = evidenceFor(depthM, category, lookaheadM)
  const drivers = [...formation && formationEvents.length > 0
    ? [
        `${wellCount} offset well${wellCount > 1 ? "s" : ""} hit ${meta.label.toLowerCase()} in ${formation.name}`,
      ]
    : [],
    ...dynDrivers,
  ]

  return { category, label: meta.label, color: meta.color, score, evidence, drivers }
}

/** All categories scored for a depth, sorted by risk. */
export function riskProfile(depthM: number, lookaheadM = 300): RiskScore[] {
  return RISK_CATEGORIES.map((c) => riskAtDepth(depthM, c.id, lookaheadM)).sort(
    (a, b) => b.score - a.score,
  )
}

/** Field-level stats for a formation: which wells, max NPT, commonest event. */
export function formationRiskSummary(formationId: string) {
  const events = EVENTS.filter((ev) => ev.formationId === formationId)
  const wells = new Set(events.map((ev) => ev.wellId))
  const byType = new Map<EventType, number>()
  for (const ev of events) byType.set(ev.type, (byType.get(ev.type) ?? 0) + 1)
  const commonest = [...byType.entries()].sort((a, b) => b[1] - a[1])[0]
  return {
    totalEvents: events.length,
    wellsAffected: wells.size,
    totalNptDays: events.reduce((s, ev) => s + ev.nptDays, 0),
    commonestEvent: commonest ? commonest[0] : null,
    maxSeverity: events.some((ev) => ev.severity === "critical")
      ? ("critical" as const)
      : events.some((ev) => ev.severity === "severe")
        ? ("severe" as const)
        : events.length > 0
          ? ("moderate" as const)
          : ("minor" as const),
  }
}

/** Depth band table: events bucketed per 250 m for the correlation view. */
export function eventsByDepthBand(bandM = 250) {
  const bands = new Map<number, DrillingEvent[]>()
  for (const ev of EVENTS) {
    const band = Math.floor(ev.depthM / bandM) * bandM
    const list = bands.get(band) ?? []
    list.push(ev)
    bands.set(band, list)
  }
  return bands
}

/** Formations present in the dataset, shallow→deep. */
export const FORMATION_ORDER = FORMATIONS.map((f) => f.id)

/** Events for a well sorted by depth. */
export function eventsForWell(wellId: string): DrillingEvent[] {
  return EVENTS.filter((ev) => ev.wellId === wellId).sort((a, b) => a.depthM - b.depthM)
}

/** All offset wells that reported a given event type. */
export function wellsForEvent(type: EventType): typeof WELLS {
  const ids = new Set(EVENTS.filter((ev) => ev.type === type).map((ev) => ev.wellId))
  return WELLS.filter((w) => ids.has(w.id))
}
