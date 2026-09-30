// ─── NWIS domain model ────────────────────────────────────────────────────────
// All data is synthetic, modeled on OIL's Upper Assam operations for realism.

export type WellStatus = "producing" | "drilling" | "suspended" | "pna" | "workover"

export type EventType =
  | "mud_loss"
  | "kick"
  | "stuck_pipe"
  | "fishing"
  | "torque_spike"
  | "cementing_issue"
  | "overpressure"
  | "hole_packoff"
  | "sidetrack"

export type Severity = "minor" | "moderate" | "severe" | "critical"

export interface Formation {
  /** e.g. "barail" */
  id: string
  name: string
  /** short lithology label for chips */
  lithology: string
  color: string
  /** typical hazards encountered in this formation across the field */
  typicalHazards: EventType[]
  /** recommended mud type for this interval */
  mudRecommendation: string
  /** field-level notes shown in UI */
  notes: string
}

/** A formation top in a specific well (depth is MD, TVD ≈ MD for these wells). */
export interface FormationTop {
  formationId: string
  depthM: number
}

export interface CasingString {
  size: string // e.g. '13-3/8"'
  depthM: number
  weight: string // e.g. "54.5 lb/ft"
  cementedTo: string // e.g. "Surface" | "1,050 m"
}

export interface Well {
  id: string
  name: string
  field: string
  lat: number
  lon: number
  status: WellStatus
  spudDate: string
  completionDate?: string
  tdM: number
  operatorEra: string
  type: "exploratory" | "development" | "injection"
  currentFormation: string | null // formationId for drilling wells
  formationTops: FormationTop[]
  casingProgram: CasingString[]
  mudProgram: { intervalM: string; mudType: string; weightPpg: string }[]
  /** historical peak mud weight used, for overpressure comparison */
  maxMudWeightPpg: number
  rigName: string
}

export interface DrillingEvent {
  id: string
  wellId: string
  type: EventType
  severity: Severity
  /** measured depth where event started */
  depthM: number
  /** depth where event was resolved (optional) */
  resolvedDepthM?: number
  formationId: string
  date: string
  title: string
  description: string
  mitigation: string
  outcome: string
  nptDays: number
  /** source document reference, e.g. "DDR 12/04/2018" */
  sourceRef: string
  /** tags used for retrieval */
  tags: string[]
}

export interface Lesson {
  id: string
  eventId?: string
  wellId?: string
  title: string
  formationId?: string
  /** plain-text lesson learned */
  lesson: string
  /** actionable recommendation */
  recommendation: string
  sourceRef: string
  tags: string[]
}

export interface ExtractedField {
  label: string
  value: string
  /** mock OCR/NLP extraction confidence */
  confidence: number
}

export interface WellDocument {
  id: string
  wellId: string
  kind: "WCR" | "DDR" | "MUD-LOG" | "CEMENT-REPORT"
  ref: string
  date: string
  pages: number
  /** mock "scanned" first-page excerpt */
  excerpt: string
  extracted: ExtractedField[]
  /** pipeline stage shown in the mock ingestion UI */
  pipelineStatus: "indexed" | "extracted" | "review"
}

export interface Alert {
  id: string
  /** severity mapped from risk engine */
  level: "info" | "warning" | "critical"
  title: string
  detail: string
  formationId: string
  /** depth window the alert applies to */
  depthFromM: number
  depthToM: number
  /** offset wells that experienced the issue */
  sourceWellIds: string[]
  /** matching lesson / recommendation text */
  recommendation: string
  sourceRefs: string[]
  createdAt: number
  acknowledged: boolean
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  text: string
  /** citations attached to assistant messages */
  citations?: { label: string; ref: string }[]
  /** follow-up chips shown under assistant answers */
  followUps?: string[]
  /** typewriter effect progress; undefined = complete */
  streaming?: boolean
}
