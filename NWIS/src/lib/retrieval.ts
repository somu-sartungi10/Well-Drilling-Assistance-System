import { EVENTS } from "@/data/events"
import { LESSONS } from "@/data/lessons"
import { WELLS, ACTIVE_WELL, WELL_BY_ID } from "@/data/wells"
import { FORMATIONS, EVENT_META } from "@/data/formations"
import { formationAtDepth } from "@/lib/geo"
import type { DrillingEvent, Lesson, Well } from "@/data/types"

// ─── Retrieval engine ────────────────────────────────────────────────────────
// Weighted token scoring over the full mock corpus. Shared by the Knowledge
// Base search and the copilot so they always agree.

export interface RetrievedChunk {
  kind: "event" | "lesson" | "well" | "formation"
  id: string
  score: number
  event?: DrillingEvent
  lesson?: Lesson
  well?: Well
  formationId?: string
  /** text snippets used for answer composition */
  title: string
  body: string
  sourceRef: string
  tags: string[]
}

const STOP = new Set([
  "what", "is", "the", "a", "an", "in", "at", "on", "of", "for", "to", "and", "or",
  "did", "do", "does", "any", "are", "were", "was", "have", "has", "with", "how",
  "which", "where", "when", "we", "our", "this", "that", "it", "there", "near",
  "here", "about", "me", "show", "give", "tell", "should", "i", "be", "will",
  "risk", "risks", "happened", "expected", "wells", "well", "offset", "current",
  "depth", "m", "meter", "meters", "problems", "problem", "issues", "issue",
])

/** Extra synonyms so queries like "loss circulation" hit "mud_loss". */
const SYNONYMS: Record<string, string[]> = {
  loss: ["mud_loss", "seepage", "lost"],
  losses: ["mud_loss", "seepage", "lost"],
  circulation: ["mud_loss"],
  kick: ["kick", "influx", "gas"],
  kicks: ["kick", "influx", "gas"],
  stuck: ["stuck_pipe", "pack-off", "packing"],
  pipe: ["stuck_pipe"],
  pack: ["pack-off"],
  packed: ["pack-off"],
  cement: ["cementing_issue", "fallback", "squeeze"],
  cementing: ["cementing_issue", "squeeze"],
  torque: ["torque_spike", "tight"],
  pressure: ["overpressure", "pore"],
  overpressure: ["overpressure"],
  gas: ["kick", "connection gas"],
  coal: ["coal", "pack-off"],
  clay: ["clay", "swelling", "pack-off"],
  fractured: ["fractured", "losses"],
  lesoons: ["lessons"],
  lesson: ["lessons"],
  lessons: ["lessons"],
}

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t))
}

export function expandedTokens(q: string): string[] {
  const base = tokenize(q)
  const out = new Set(base)
  for (const t of base) {
    const syn = SYNONYMS[t]
    if (syn) syn.forEach((s) => out.add(s))
    // numeric depth like "3100m" or "3100" or "3,100"
    if (/^\d{3,5}$/.test(t.replace(/,/g, ""))) out.add(`depth:${t.replace(/,/g, "")}`)
  }
  return [...out]
}

interface Scored {
  chunk: RetrievedChunk
  hits: Set<string>
}

function scoreChunk(chunk: RetrievedChunk, tokens: string[], raw: string): Scored {
  const hits = new Set<string>()
  let score = 0
  const haystackTitle = chunk.title.toLowerCase()
  const haystackBody = chunk.body.toLowerCase()
  const haystackTags = chunk.tags.join(" ").toLowerCase()
  const depthMatch = raw.match(/(\d{1,2}[,.]?\d{3})\s*(?:m|meter|metres|meters|tvd|md)?\b/)

  for (const t of tokens) {
    if (t.startsWith("depth:")) continue
    if (haystackTitle.includes(t)) score += 6
    if (haystackTags.includes(t)) score += 4
    if (haystackBody.includes(t)) score += 2
    if (chunk.kind === "formation" && chunk.title.toLowerCase().includes(t)) score += 3
    if (chunk.kind === "well" && chunk.well?.name.toLowerCase().includes(t)) score += 5
  }

  // explicit depth proximity boost
  if (depthMatch) {
    const qd = Number(depthMatch[1].replace(/,/g, ""))
    const evDepth = chunk.event?.depthM ?? chunk.lesson ? (chunk.event?.depthM ?? 0) : 0
    if (chunk.event) {
      const d = Math.abs(evDepth - qd)
      if (d <= 100) score += 10
      else if (d <= 250) score += 6
      else if (d <= 500) score += 3
    }
  }

  // formation-name hits
  for (const f of FORMATIONS) {
    const fname = f.name.toLowerCase()
    const short = f.id
    if (tokens.some((t) => fname.includes(t) || t === short)) {
      if (chunk.formationId === f.id || chunk.event?.formationId === f.id || chunk.lesson?.formationId === f.id) {
        score += 7
      }
    }
  }

  if (score > 0) hits.add("match")
  return { chunk: { ...chunk, score }, hits }
}

/** Build the searchable corpus once. */
export function buildCorpus(): RetrievedChunk[] {
  const chunks: RetrievedChunk[] = []

  for (const ev of EVENTS) {
    const well = WELL_BY_ID[ev.wellId]
    chunks.push({
      kind: "event",
      id: ev.id,
      score: 0,
      event: ev,
      well,
      title: `${EVENT_META[ev.type].label} — ${well?.name ?? ev.wellId} @ ${ev.depthM} m`,
      body: `${ev.title}. ${ev.description} Mitigation: ${ev.mitigation} Outcome: ${ev.outcome}`,
      sourceRef: ev.sourceRef,
      tags: [...ev.tags, ev.type.replace("_", " "), well?.name ?? "", well?.field ?? ""],
    })
  }

  for (const ls of LESSONS) {
    const well = ls.wellId ? WELL_BY_ID[ls.wellId] : undefined
    chunks.push({
      kind: "lesson",
      id: ls.id,
      score: 0,
      lesson: ls,
      well,
      title: ls.title,
      body: `${ls.lesson} Recommendation: ${ls.recommendation}`,
      sourceRef: ls.sourceRef,
      tags: [...ls.tags, "lesson", "lessons", "lesson learned", well?.name ?? ""],
    })
  }

  for (const f of FORMATIONS) {
    chunks.push({
      kind: "formation",
      id: f.id,
      score: 0,
      formationId: f.id,
      title: f.name,
      body: `${f.lithology}. ${f.notes} Recommended mud: ${f.mudRecommendation}`,
      sourceRef: "Field formation reference",
      tags: [f.id, f.name, f.lithology, ...f.typicalHazards.map((h) => h.replace("_", " "))],
    })
  }

  for (const w of [...WELLS, ACTIVE_WELL]) {
    chunks.push({
      kind: "well",
      id: w.id,
      score: 0,
      well: w,
      title: `${w.name} — ${w.field}`,
      body: `${w.status} ${w.type} well, TD ${w.tdM} m, spudded ${w.spudDate}. ${w.operatorEra}. Rig ${w.rigName}.`,
      sourceRef: "Well master data",
      tags: [w.name, w.field, w.status, w.type, w.rigName],
    })
  }

  return chunks
}

let corpusCache: RetrievedChunk[] | null = null
export function corpus(): RetrievedChunk[] {
  corpusCache ||= buildCorpus()
  return corpusCache
}

/** Main retrieval entry point. */
export function retrieve(query: string, limit = 8): RetrievedChunk[] {
  const tokens = expandedTokens(query)
  if (tokens.length === 0) return []
  const scored = corpus().map((c) => scoreChunk(c, tokens, query.toLowerCase()))
  return scored
    .filter((s) => s.chunk.score > 0)
    .sort((a, b) => b.chunk.score - a.chunk.score)
    .slice(0, limit)
    .map((s) => s.chunk)
}

/**
 * Depth-aware retrieval used by the copilot: if the query mentions "ahead",
 * "next", "below" etc., events below the live depth in offsets get boosted.
 */
export function retrieveWithContext(query: string, liveDepthM: number, limit = 8): RetrievedChunk[] {
  const base = retrieve(query, limit * 2)
  const q = query.toLowerCase()
  const directional = /\b(ahead|below|next|upcoming|deeper|downhole|further)\b/.test(q)
  if (!directional) return base.slice(0, limit)

  return base
    .map((c) => {
      if (c.event && c.event.depthM >= liveDepthM && c.event.depthM <= liveDepthM + 400) {
        return { ...c, score: c.score + 8 }
      }
      return c
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/** Current formation helper exported for the copilot context. */
export function currentFormation(depthM: number) {
  return formationAtDepth(ACTIVE_WELL, depthM)
}
