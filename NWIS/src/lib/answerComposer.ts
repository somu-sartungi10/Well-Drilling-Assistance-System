import { FORMATION_BY_ID, EVENT_META } from "@/data/formations"
import { ACTIVE_WELL } from "@/data/wells"
import { currentFormation, retrieveWithContext, corpus, type RetrievedChunk } from "@/lib/retrieval"
import { riskProfile } from "@/lib/risk"
import { alertRules } from "@/store/useAppStore"

// ─── Deterministic answer composer (offline RAG-style) ───────────────────────
// Retrieval provides the chunks; this composes a natural-language answer with
// citations. No LLM required — it always works, demo or not.

export interface ComposedAnswer {
  text: string
  citations: { label: string; ref: string }[]
  followUps: string[]
}

interface Intent {
  kind:
    | "risk_overview"
    | "formation_query"
    | "event_type_query"
    | "well_query"
    | "depth_query"
    | "lesson_query"
    | "general"
}

function detectIntent(q: string): Intent {
  const s = q.toLowerCase()
  if (/\b(risk|risks|outlook|expect|ahead|caution|careful)\b/.test(s) && !/lesson/.test(s)) return { kind: "risk_overview" }
  if (/\b(barail|tipam|girujan|surma|formation|formation top|transition)\b/.test(s)) return { kind: "formation_query" }
  if (/\b(lessons?|learned|best practices?|mitigations?|recommendations?|sops?)\b/.test(s)) return { kind: "lesson_query" }
  if (/\b(kick|kicks|loss|losses|stuck|pack|cement|torque|fishing|overpressure|influx)\b/.test(s)) return { kind: "event_type_query" }
  if (/\b(dk-|ktl-|mrn-|bht-|well)\b/.test(s)) return { kind: "well_query" }
  if (/\d{3,5}/.test(s)) return { kind: "depth_query" }
  return { kind: "general" }
}

function fmtDepth(m: number): string {
  return m.toLocaleString("en-IN")
}

function chunkCitation(c: RetrievedChunk): { label: string; ref: string } {
  if (c.event) return { label: c.event.wellId.toUpperCase(), ref: c.event.sourceRef }
  if (c.lesson) return { label: c.lesson.wellId?.toUpperCase() ?? "KB", ref: c.lesson.sourceRef }
  if (c.well) return { label: c.well.name, ref: "Well master data" }
  return { label: c.title, ref: c.sourceRef }
}

/** Summarize an event in one sentence for embedding in answers. */
function eventSentence(c: RetrievedChunk): string {
  const ev = c.event!
  const meta = EVENT_META[ev.type]
  const label = meta?.label ?? ev.type.replace(/_/g, " ")
  const well = c.well?.name ?? ev.wellId
  const depth = fmtDepth(ev.depthM)
  const formation = FORMATION_BY_ID[ev.formationId]?.name ?? ev.formationId
  const sev = ev.severity !== "minor" ? ev.severity : "minor"
  return `${label} (${sev}) in ${well} at ${depth} m in the ${formation}${
    ev.nptDays > 0 ? `, ${ev.nptDays} day${ev.nptDays > 1 ? "s" : ""} NPT` : ""
  }`
}

/**
 * Compose an answer from a query + live context. Intents map to different
 * templates so answers feel purpose-built rather than generic.
 */
export function composeAnswer(query: string, liveDepthM: number): ComposedAnswer {
  const intent = detectIntent(query)
  const chunks = retrieveWithContext(query, liveDepthM, 8)
  const formationNow = currentFormation(liveDepthM)
  const formationName = formationNow ? FORMATION_BY_ID[formationNow]?.name ?? formationNow : "—"
  const citations: ComposedAnswer["citations"] = []
  const followUps: string[] = []
  const parts: string[] = []
  const seen = new Set<string>()

  const pushChunk = (c: RetrievedChunk) => {
    const key = c.id
    if (seen.has(key) || citations.length >= 4) return false
    seen.add(key)
    citations.push(chunkCitation(c))
    return true
  }

  if (intent.kind === "risk_overview" || intent.kind === "general") {
    const profile = riskProfile(liveDepthM).filter((r) => r.score >= 25)
    const lead = profile[0]
    if (lead) {
      parts.push(
        `**At ${fmtDepth(liveDepthM)} m (${formationName}), the dominant offset-derived risk is ${lead.label.toLowerCase()} (score ${lead.score}/100).**`,
      )
      const withEvents = profile.filter((r) => r.evidence.length > 0).slice(0, 3)
      for (const r of withEvents) {
        const ev = r.evidence[0]
        const c = chunks.find((ch) => ch.event?.id === ev.id)
        if (c && pushChunk(c)) {
          parts.push(`• ${eventSentence(c)} — "${ev.mitigation}"`)
        }
      }
      if (lead.drivers.length > 0) {
        parts.push(`Key drivers: ${lead.drivers.join("; ")}.`)
      }
      followUps.push("What lessons apply here?", "Show me the nearest wells", "What mud program is recommended?")
    } else {
      parts.push(
        `No significant offset-derived risks flagged at ${fmtDepth(liveDepthM)} m (${formationName}). Historical incidents cluster deeper — the Barail section from ~3,000 m is where most field NPT originated.`,
      )
      followUps.push("What happened in Barail on offset wells?", "What risks lie ahead?", "Show Barail lessons")
    }
  }

  if (intent.kind === "formation_query") {
    const fChunks = chunks.filter((c) => c.kind === "formation" || c.event?.formationId === (chunks.find((ch) => ch.kind === "formation")?.formationId ?? ""))
    const formationChunk = chunks.find((c) => c.kind === "formation")
    const fid = formationChunk?.formationId ?? formationNow
    const f = fid ? FORMATION_BY_ID[fid] : undefined
    if (f) {
      const evs = chunks.filter((c) => c.event?.formationId === f.id).slice(0, 3)
      parts.push(
        `**${f.name}** (${f.lithology}). ${f.notes}`,
      )
      parts.push(`Recommended mud: ${f.mudRecommendation}.`)
      if (evs.length > 0) {
        parts.push("Offset-well history in this formation:")
        for (const c of evs) {
          if (pushChunk(c)) parts.push(`• ${eventSentence(c)}`)
        }
      } else {
        parts.push("No specific incidents indexed for this formation in nearby wells.")
      }
      followUps.push(`What lessons apply in the ${f.name}?`, "What risks ahead?", "Which wells drilled it best?")
    } else if (fChunks.length > 0) {
      parts.push(`Found ${fChunks.length} formation-related items in the corpus.`)
    }
  }

  if (intent.kind === "event_type_query") {
    const evChunks = chunks.filter((c) => c.kind === "event").slice(0, 4)
    if (evChunks.length > 0) {
      parts.push(
        `**${evChunks.length} relevant historical incident${evChunks.length > 1 ? "s" : ""} found in nearby wells:**`,
      )
      for (const c of evChunks) {
        if (pushChunk(c)) {
          parts.push(`• ${eventSentence(c)} — "${c.event!.title}"`)
        }
      }
      const lessons = chunks.filter((c) => c.kind === "lesson").slice(0, 1)
      if (lessons[0]) {
        parts.push(`Key lesson: ${lessons[0].lesson!.recommendation}`)
        pushChunk(lessons[0])
      }
      followUps.push("Show the full lesson", "How deep was it exactly?", "Which formation was it in?")
    } else {
      parts.push("I couldn't find indexed incidents matching that description in the current corpus.")
      followUps.push("What risks ahead?", "Show all lessons")
    }
  }

  if (intent.kind === "lesson_query") {
    let lsChunks = chunks.filter((c) => c.kind === "lesson")
    if (lsChunks.length === 0) {
      // vague phrasing ("what lessons apply here?") — fall back to lessons
      // tagged for the formation we're drilling, else the corpus-wide pool
      const pool = corpus().filter((c) => c.kind === "lesson")
      const near = formationNow ? pool.filter((c) => c.lesson?.formationId === formationNow) : []
      lsChunks = (near.length > 0 ? near : pool).slice(0, 3)
    } else lsChunks = lsChunks.slice(0, 3)
    if (lsChunks.length > 0) {
      parts.push("**Most relevant lessons learned:**")
      for (const c of lsChunks) {
        if (pushChunk(c)) {
          parts.push(`• **${c.lesson!.title}** — ${c.lesson!.lesson}`)
          parts.push(`  ↳ Do this: ${c.lesson!.recommendation}`)
        }
      }
      followUps.push("Which wells does this apply to?", "What risks ahead?", "Show the source report")
    }
  }

  if (intent.kind === "well_query") {
    const wellChunks = chunks.filter((c) => c.kind === "well" || c.event).slice(0, 4)
    if (wellChunks.length > 0) {
      const wellChunk = wellChunks.find((c) => c.kind === "well")
      if (wellChunk?.well) {
        const w = wellChunk.well
        parts.push(
          `**${w.name}** (${w.field}) — ${w.status}, ${w.type} well, TD ${fmtDepth(w.tdM)} m, spudded ${w.spudDate}. ${w.operatorEra}.`,
        )
        parts.push(`Casing: ${w.casingProgram.map((c) => `${c.size} @ ${fmtDepth(c.depthM)} m`).join(" · ")}`)
        pushChunk(wellChunk)
      }
      const evs = wellChunks.filter((c) => c.event).slice(0, 3)
      if (evs.length > 0) {
        parts.push("Operational history:")
        for (const c of evs) if (pushChunk(c)) parts.push(`• ${eventSentence(c)}`)
      }
      followUps.push("Compare its mud program to ours", "What events did it have?", "How far is it from us?")
    }
  }

  if (intent.kind === "depth_query") {
    // Depth questions about our own well = "what's ahead of the bit?"
    // Pull the store's hazard windows (same data the alert engine uses) and
    // list every zone at/below the asked depth, most urgent first.
    const askedDepth = Number(query.match(/(\d{1,2}[,.]?\d{3})/)?.[1]?.replace(/[,.]/g, "") ?? liveDepthM)
    const zones = alertRules()
      .filter(({ rule }) => rule.depthToM >= Math.max(askedDepth, liveDepthM) - 50)
      .sort((a, b) => a.rule.depthFromM - b.rule.depthFromM)
      .slice(0, 4)

    if (zones.length > 0) {
      parts.push(
        `**Ahead-of-bit hazard map from ${fmtDepth(Math.max(askedDepth, liveDepthM))} m (${formationName}):**`,
      )
      for (const { rule, category } of zones) {
        const meta = EVENT_META[category]
        const label = meta?.label ?? category.replace(/_/g, " ")
        const critical = category === "kick" || category === "hole_packoff"
        parts.push(
          `• ${critical ? "CRITICAL" : "warning"} — ${label} zone ${fmtDepth(rule.depthFromM)}–${fmtDepth(rule.depthToM)} m (${rule.key.replace(/-/g, " ")})`,
        )
        const c = chunks.find((ch) => ch.event && ch.event.type === category)
        if (c && pushChunk(c)) {
          parts.push(`  ↳ ${eventSentence(c)}`)
        }
      }
      const worst = zones.find((z) => z.category === "kick" || z.category === "hole_packoff") ?? zones[0]
      const src = chunks.find((ch) => ch.event)
      if (src?.event) {
        parts.push(`**Highest-consequence zone:** ${fmtDepth(worst.rule.depthFromM)} m — plan mitigation before crossing ${fmtDepth(worst.rule.depthFromM - 120)} m.`)
      }
      followUps.push("What lessons apply ahead?", "Show risk outlook", "What mud program is recommended?")
    } else {
      const evChunks = chunks.filter((c) => c.event).slice(0, 4)
      if (evChunks.length > 0) {
        parts.push(`**Around ${fmtDepth(askedDepth)} m and nearby depths in offset wells:**`)
        for (const c of evChunks) if (pushChunk(c)) parts.push(`• ${eventSentence(c)}`)
        followUps.push("What happened next?", "What lessons apply?", "Show risk outlook")
      }
    }
  }

  // fallback if nothing matched any intent template
  if (parts.length === 0) {
    const fallback = chunks.slice(0, 3)
    if (fallback.length > 0) {
      parts.push("Here's the closest information I found in the corpus:")
      for (const c of fallback) {
        if (pushChunk(c)) {
          parts.push(`• ${c.kind === "event" ? eventSentence(c) : `**${c.title}** — ${c.body.slice(0, 160)}…`}`)
        }
      }
      followUps.push("What risks ahead?", "Show lessons", "What formation are we in?")
    } else {
      parts.push(
        `I couldn't find anything in the corpus for that. Try asking about formations (Barail, Tipam, Surma, Girujan), event types (losses, kicks, stuck pipe), depths, or well names (DK-1, KTL-1, BHT-1…).`,
      )
      followUps.push("What risks ahead?", "Show Barail lessons", "Which wells are nearby?")
    }
  }

  const contextLine = `*Context: live depth ${fmtDepth(liveDepthM)} m, drilling in ${formationName} — ${ACTIVE_WELL.name}.*`

  // "Sources:" footer — real mock document refs behind every cited chunk
  const sourceRefs = [...new Set(citations.map((c) => c.ref))].slice(0, 5)
  const sourcesLine = sourceRefs.length > 0 ? `Sources: ${sourceRefs.join(" · ")}` : "Sources: field formation reference · well master data"

  return { text: `${parts.join("\n")}\n\n${sourcesLine}\n${contextLine}`, citations, followUps }
}
