import { useMemo, useState } from "react"
import {
  AlertTriangle,
  Calendar,
  FileText,
  Layers,
  MousePointerClick,
  Route,
  Search,
  Waves,
  X,
} from "lucide-react"
import { cn } from "cn"
import { useAppStore } from "@/store/useAppStore"
import { ACTIVE_WELL, WELLS, WELL_BY_ID } from "@/data/wells"
import { FORMATION_BY_ID, FORMATIONS, EVENT_META } from "@/data/formations"
import type { Well } from "@/data/types"
import { distanceFromActive } from "@/lib/geo"
import { eventsForWell } from "@/lib/risk"
import { FormationChip, ScreenHeader, SeverityBadge, fmt } from "@/components/shared/Ui"
import { Badge } from "@/components/ui/badge"
import { WellDocumentViewer } from "@/components/screens/DocumentViewer"

// ─── Tab vocabulary users actually understand ────────────────────────────────
type TabId = "programs" | "events" | "correlate" | "documents"
const TABS: { id: TabId; label: string; hint: string; icon: typeof Layers }[] = [
  { id: "programs", label: "Well design", hint: "Casing, cementing & mud program of the selected well", icon: Route },
  { id: "events", label: "What went wrong", hint: "Every recorded incident on this well, top to bottom", icon: AlertTriangle },
  { id: "correlate", label: "Compare with our well", hint: "Side-by-side geology & incidents against the live well", icon: Layers },
  { id: "documents", label: "Reports", hint: "Source documents this intelligence was extracted from", icon: FileText },
]

// ─── Left rail: pick a well ──────────────────────────────────────────────────
function WellRail({
  focusWell,
  onSelect,
}: {
  focusWell: Well
  onSelect: (id: string | null) => void
}) {
  const [q, setQ] = useState("")
  const list = useMemo(() => {
    const all = [ACTIVE_WELL, ...WELLS]
    const query = q.trim().toLowerCase()
    const filtered = query
      ? all.filter(
          (w) =>
            w.name.toLowerCase().includes(query) ||
            w.field.toLowerCase().includes(query) ||
            w.status.includes(query),
        )
      : all
    return [...filtered].sort((a, b) => {
      if (a.id === ACTIVE_WELL.id) return -1
      if (b.id === ACTIVE_WELL.id) return 1
      return distanceFromActive(a) - distanceFromActive(b)
    })
  }, [q])

  return (
    <div className="flex w-60 shrink-0 flex-col rounded-xl border border-border bg-card">
      <div className="border-b border-border p-3">
        <div className="text-xs font-semibold">Wells in this area</div>
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search DK, KTL, BHT…"
            className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-7 text-xs outline-none placeholder:text-muted-foreground/60 focus:border-primary/50"
          />
          {q && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setQ("")}
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {list.map((w) => {
          const evs = eventsForWell(w.id)
          const critical = evs.some((e) => e.severity === "critical")
          const active = w.id === ACTIVE_WELL.id
          const selected = focusWell.id === w.id
          return (
            <button
              key={w.id}
              onClick={() => onSelect(active ? null : w.id)}
              className={cn(
                "w-full rounded-lg border px-2.5 py-2 text-left transition-colors",
                selected
                  ? "border-primary/50 bg-primary/10"
                  : "border-transparent hover:bg-secondary",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={cn("text-xs font-bold", active && "text-sky-300")}>{w.name}</span>
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                  {active ? "OUR WELL" : `${distanceFromActive(w).toFixed(1)} km`}
                </span>
              </div>
              <div className="mt-0.5 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  {w.field} · {w.status === "pna" ? "P&A" : w.status} · TD {w.tdM.toLocaleString("en-IN")}
                </span>
                {critical && <span className="size-1.5 shrink-0 rounded-full bg-destructive" title="critical history" />}
              </div>
            </button>
          )
        })}
        {list.length === 0 && (
          <div className="px-2 py-6 text-center text-[11px] text-muted-foreground">No wells match “{q}”.</div>
        )}
      </div>
    </div>
  )
}

// ─── Focus-well fact card ────────────────────────────────────────────────────
function FactCard({ well }: { well: Well }) {
  const evs = eventsForWell(well.id)
  const npt = evs.reduce((s, e) => s + e.nptDays, 0)
  const active = well.id === ACTIVE_WELL.id
  const topBarail = well.formationTops.find((t) => t.formationId === "barail")?.depthM
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">{well.name}</span>
            {active ? (
              <Badge className="bg-sky-500/15 text-[10px] text-sky-300">▶ currently drilling</Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">
                {well.status === "pna" ? "P&A" : well.status}
              </Badge>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            <span>{well.field} field</span>
            <span className="flex items-center gap-1">
              <Calendar className="size-3" /> spud {well.spudDate}
            </span>
            <span>rig {well.rigName}</span>
            {!active && <span>{distanceFromActive(well).toFixed(1)} km from our well</span>}
          </div>
        </div>
        <div className="flex gap-4 text-center">
          <div>
            <div className="font-mono text-sm font-bold tabular-nums">{well.tdM.toLocaleString("en-IN")}</div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">TD (m)</div>
          </div>
          <div>
            <div className="font-mono text-sm font-bold tabular-nums">{well.maxMudWeightPpg}</div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">max MW (ppg)</div>
          </div>
          <div>
            <div className={cn("font-mono text-sm font-bold tabular-nums", npt > 5 && "text-destructive")}>
              {npt.toFixed(1)}
            </div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">NPT (days)</div>
          </div>
          <div>
            <div className="font-mono text-sm font-bold tabular-nums">{evs.length}</div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">incidents</div>
          </div>
        </div>
      </div>
      {topBarail && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
          <Waves className="size-3.5" style={{ color: FORMATION_BY_ID.barail.color }} />
          Key horizon — Barail top at <b className="text-foreground">{fmt(topBarail)}</b>
          <span className="text-border">|</span>
          Casing strings: {well.casingProgram.map((c) => c.size).join(" → ")}
        </div>
      )}
    </div>
  )
}

// ─── Well design (programs) ──────────────────────────────────────────────────
function ProgramsPanel({ well }: { well: Well }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-1 flex items-center gap-2">
          <Route className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Casing — sizes & depths</h3>
        </div>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Steel pipe cemented in the hole at each stage. Compare depths against our well to spot design differences.
        </p>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="pb-2">Size</th>
              <th className="pb-2">Set at</th>
              <th className="pb-2">Cemented to</th>
            </tr>
          </thead>
          <tbody>
            {well.casingProgram.map((c) => (
              <tr key={c.size} className="border-b border-border/50">
                <td className="py-2 font-semibold">{c.size}</td>
                <td className="py-2 font-mono tabular-nums">{fmt(c.depthM)}</td>
                <td className="py-2 text-muted-foreground">{c.cementedTo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-1 flex items-center gap-2">
          <Waves className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Mud program — fluid per section</h3>
        </div>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Drilling fluid type and weight used in each hole section.
        </p>
        <div className="space-y-2">
          {well.mudProgram.map((m) => (
            <div key={m.intervalM} className="rounded-lg bg-secondary/60 px-3 py-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono tabular-nums text-muted-foreground">{m.intervalM} m</span>
                <span className="font-mono text-primary">{m.weightPpg} ppg</span>
              </div>
              <div className="mt-0.5 font-medium">{m.mudType}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── What went wrong (events) ────────────────────────────────────────────────
function EventsPanel({ well }: { well: Well }) {
  const evs = eventsForWell(well.id)
  const maxDepth = Math.max(well.tdM, ...evs.map((e) => e.depthM))
  if (evs.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center text-xs text-muted-foreground">
        No incidents recorded for {well.name} — either a clean run or a pre-digital-era well.
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-1 flex items-center gap-2">
        <AlertTriangle className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Incident timeline — {well.name}</h3>
      </div>
      <p className="mb-4 text-[11px] text-muted-foreground">
        Shallowest to deepest. Each card shows what happened, how it was fixed, and what it cost in days.
      </p>
      <div className="relative space-y-3 pl-6">
        {/* depth rail */}
        <div className="absolute bottom-2 left-[9px] top-2 w-px bg-border" />
        {evs.map((ev) => {
          const meta = EVENT_META[ev.type]
          const pct = (ev.depthM / maxDepth) * 100
          return (
            <div key={ev.id} className="relative">
              <span
                className="absolute -left-6 top-3 grid size-[18px] place-items-center rounded-full border-2 border-card text-[8px] font-bold"
                style={{ backgroundColor: `${meta.color}22`, color: meta.color, boxShadow: `0 0 0 1.5px ${meta.color}55` }}
              >
                {meta.label.slice(0, 2).toUpperCase()}
              </span>
              <div className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                    style={{ backgroundColor: `${meta.color}1f`, color: meta.color }}
                  >
                    {meta.label}
                  </span>
                  <SeverityBadge severity={ev.severity} />
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {fmt(ev.depthM)}
                    {ev.resolvedDepthM ? `–${fmt(ev.resolvedDepthM)}` : ""} · depth marker {pct.toFixed(0)}%
                  </span>
                  {ev.nptDays > 0 && (
                    <Badge variant="secondary" className="text-[9px]">
                      {ev.nptDays} day{ev.nptDays > 1 ? "s" : ""} lost
                    </Badge>
                  )}
                </div>
                <div className="mt-1.5 text-xs font-semibold">{ev.title}</div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{ev.description}</p>
                <div className="mt-2 grid gap-1 rounded-md bg-secondary/50 p-2 text-[11px]">
                  <div>
                    <b className="text-foreground/80">How they fixed it:</b>{" "}
                    <span className="text-muted-foreground">{ev.mitigation}</span>
                  </div>
                  <div>
                    <b className="text-foreground/80">Result:</b>{" "}
                    <span className="text-muted-foreground">{ev.outcome}</span>
                  </div>
                </div>
                <div className="mt-1.5 font-mono text-[10px] text-muted-foreground/70">{ev.sourceRef}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Compare with our well (correlation) ─────────────────────────────────────
interface CompareWell {
  well: Well
  tops: Record<string, number>
  events: ReturnType<typeof eventsForWell>
}

function CorrelationPanel({ focusWell }: { focusWell: Well }) {
  const comparisonWellIds = useAppStore((s) => s.comparisonWellIds)
  const toggleComparisonWell = useAppStore((s) => s.toggleComparisonWell)
  const [detail, setDetail] = useState<{ well: Well; eventId: string } | null>(null)

  // always include focus well + our active well, then user picks
  const compareIds = useMemo(() => {
    const ids = new Set<string>([ACTIVE_WELL.id, focusWell.id])
    comparisonWellIds.slice(0, 2).forEach((id) => ids.add(id))
    return [...ids]
  }, [focusWell.id, comparisonWellIds])

  const wells: CompareWell[] = useMemo(
    () =>
      compareIds.map((id) => {
        const w = WELL_BY_ID[id]
        const tops: Record<string, number> = {}
        for (const t of w.formationTops) tops[t.formationId] = t.depthM
        return { well: w, tops, events: eventsForWell(id) }
      }),
    [compareIds],
  )

  // pixel scale: map each well's depths into a shared 0..1 column using its
  // own Barail top as the anchor (align geology, not absolute depth)
  const COL_H = 360
  const ANCHOR_Y = 0.68 // Barail top sits at 68% of column height
  const scaleFor = (w: CompareWell) => {
    const barail = w.tops.barail ?? w.well.tdM * 0.86
    return (depthM: number) => {
      if (depthM <= 0) return 0
      // shallow of Barail: compress linearly into the space above the anchor
      if (depthM <= barail) return (depthM / barail) * ANCHOR_Y
      // deep of Barail: stretch into the remaining space
      return ANCHOR_Y + ((depthM - barail) / (w.well.tdM - barail)) * (1 - ANCHOR_Y)
    }
  }

  const detailEvent = detail ? detail.well && eventsForWell(detail.well.id).find((e) => e.id === detail.eventId) : undefined

  // collision-avoided label positions per column: nudge labels apart when two
  // incidents land within 26px of each other on the shared scale
  const labelLayout = (w: CompareWell) => {
    const scale = scaleFor(w)
    const items = [...w.events]
      .map((ev) => ({ ev, y: scale(ev.depthM) * COL_H }))
      .sort((a, b) => a.y - b.y)
    for (let i = 1; i < items.length; i++) {
      if (items[i].y - items[i - 1].y < 26) items[i].y = items[i - 1].y + 26
    }
    return new Map(items.map((it) => [it.ev.id, it.y]))
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Layers className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Geology & incidents, side by side</h3>
            </div>
            <p className="max-w-xl text-[11px] leading-relaxed text-muted-foreground">
              Rock layers are stretched so the <b className="text-foreground/80">same formations line up
              horizontally</b> across wells — a red dot at the same height means “this trouble happened in the
              same layer elsewhere”. Absolute depths differ between wells; the layers are what matter.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Add to compare</span>
            {WELLS.filter((w) => w.id !== focusWell.id && w.id !== ACTIVE_WELL.id)
              .slice(0, 5)
              .map((w) => (
                <button
                  key={w.id}
                  onClick={() => toggleComparisonWell(w.id)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                    comparisonWellIds.includes(w.id)
                      ? "border-primary/50 bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  + {w.name}
                </button>
              ))}
          </div>
        </div>

        {/* columns */}
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {wells.map((w) => {
            const scale = scaleFor(w)
            const layout = labelLayout(w)
            const active = w.well.id === ACTIVE_WELL.id
            return (
              <div key={w.well.id} className="flex flex-1 gap-3" style={{ minWidth: 190 }}>
                {/* labels: incidents, collision-avoided */}
                <div className="relative w-28 shrink-0 text-right">
                  {w.events.map((ev) => {
                    const meta = EVENT_META[ev.type]
                    return (
                      <div
                        key={ev.id}
                        className="absolute right-0 rounded bg-card/80 px-1 py-0.5 text-[9px] leading-tight"
                        style={{ top: (layout.get(ev.id) ?? 0) - 6 }}
                      >
                        <span style={{ color: meta.color }}>●</span>{" "}
                        <span className="text-muted-foreground">
                          {meta.label} {fmt(ev.depthM)}
                        </span>
                      </div>
                    )
                  })}
                </div>
                {/* the column */}
                <div className="flex-1">
                  <div
                    className="relative overflow-hidden rounded-lg border border-border"
                    style={{ height: COL_H }}
                  >
                    {/* formation bands (only where the well has a top) */}
                    {FORMATIONS.map((f) => {
                      const top = w.tops[f.id]
                      if (top === undefined) return null // not yet drilled / not present
                      const deeper = FORMATIONS.filter((x) => (w.tops[x.id] ?? Infinity) > top)
                      const bottom = Math.min(
                        ...deeper.map((x) => w.tops[x.id]!),
                        w.well.tdM,
                      )
                      const y0 = scale(top) * COL_H
                      const y1 = scale(bottom) * COL_H
                      return (
                        <div
                          key={f.id}
                          className="absolute inset-x-0 flex items-center justify-center"
                          style={{
                            top: y0,
                            height: Math.max(0, y1 - y0),
                            background: `linear-gradient(180deg, ${f.color}cc, ${f.color}77)`,
                            opacity: active ? 1 : 0.72,
                          }}
                        >
                          <span className="px-1 text-center text-[9px] font-bold text-white/90">
                            {f.name.split(" ")[0]}
                          </span>
                        </div>
                      )
                    })}
                    {/* incident markers */}
                    {w.events.map((ev) => {
                      const meta = EVENT_META[ev.type]
                      const y = scale(ev.depthM) * COL_H
                      return (
                        <button
                          key={ev.id}
                          onClick={() => setDetail({ well: w.well, eventId: ev.id })}
                          title={`${meta.label} at ${fmt(ev.depthM)} — click for the story`}
                          className="absolute z-10 grid size-4 -translate-y-1/2 place-items-center rounded-full border-2 border-white/70 transition-transform hover:scale-125"
                          style={{ top: y, left: "50%", marginLeft: -8, backgroundColor: meta.color }}
                        />
                      )
                    })}
                    {/* Barail anchor guide (only for wells that have reached Barail) */}
                    {w.tops.barail !== undefined && (
                      <div
                        className="pointer-events-none absolute inset-x-0 border-t border-dashed border-white/25"
                        style={{ top: ANCHOR_Y * COL_H }}
                      />
                    )}
                    {/* casing shoe ticks */}
                    {w.well.casingProgram.map((c) => (
                      <div
                        key={c.size}
                        className="pointer-events-none absolute left-0 h-px w-4 bg-foreground/50"
                        style={{ top: scale(c.depthM) * COL_H }}
                        title={`${c.size} shoe at ${fmt(c.depthM)}`}
                      />
                    ))}
                    {/* TD */}
                    <div
                      className="pointer-events-none absolute inset-x-0 border-t-2 border-foreground/70"
                      style={{ top: scale(w.well.tdM) * COL_H }}
                    >
                      <span className="absolute right-1 -top-3.5 rounded bg-foreground/80 px-1 text-[8px] font-bold text-background">
                        TD {fmt(w.well.tdM)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-1.5 text-center">
                    <div className={cn("text-xs font-bold", active && "text-sky-300")}>{w.well.name}</div>
                    <div className="text-[9px] text-muted-foreground">
                      {active ? "our well (drilling)" : `${distanceFromActive(w.well).toFixed(1)} km · ${w.well.status === "pna" ? "P&A" : w.well.status}`}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-2 text-[10px] text-muted-foreground">
          <MousePointerClick className="size-3.5" />
          Click any dot for the full incident story · dashed line = Barail top anchor · side ticks = casing shoes
        </div>
      </div>

      {/* incident detail dialog */}
      {detail && detailEvent && (
        <div
          className="fixed inset-0 z-[1000] grid place-items-center bg-black/60 p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: `${EVENT_META[detailEvent.type].color}1f`,
                      color: EVENT_META[detailEvent.type].color,
                    }}
                  >
                    {EVENT_META[detailEvent.type].label}
                  </span>
                  <SeverityBadge severity={detailEvent.severity} />
                  <FormationChip id={detailEvent.formationId} small />
                </div>
                <h3 className="mt-2 text-sm font-bold">{detailEvent.title}</h3>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {detail.well.name} · {fmt(detailEvent.depthM)} · {detailEvent.date}
                </div>
              </div>
              <button className="text-muted-foreground hover:text-foreground" onClick={() => setDetail(null)}>
                <X className="size-4" />
              </button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-foreground/90">{detailEvent.description}</p>
            <div className="mt-3 space-y-1.5 rounded-lg bg-secondary/60 p-3 text-xs">
              <div>
                <b className="text-foreground/80">How they fixed it:</b>{" "}
                <span className="text-muted-foreground">{detailEvent.mitigation}</span>
              </div>
              <div>
                <b className="text-foreground/80">Result:</b>{" "}
                <span className="text-muted-foreground">{detailEvent.outcome}</span>
              </div>
              <div>
                <b className="text-foreground/80">Cost:</b>{" "}
                <span className="text-muted-foreground">{detailEvent.nptDays} days NPT</span>
              </div>
            </div>
            <div className="mt-2 font-mono text-[10px] text-muted-foreground/70">{detailEvent.sourceRef}</div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function WellIntel() {
  const selectedWellId = useAppStore((s) => s.selectedWellId)
  const setSelectedWellId = useAppStore((s) => s.setSelectedWellId)
  const [tab, setTab] = useState<TabId>("correlate")

  const focusWell = (selectedWellId ? WELLS.find((w) => w.id === selectedWellId) : undefined) ?? ACTIVE_WELL
  const tabMeta = TABS.find((t) => t.id === tab)!

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Well Intelligence"
        subtitle="Pick a well on the left, then explore its design, its incidents, and how it compares with ours"
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4 p-5 lg:flex-row">
        <WellRail focusWell={focusWell} onSelect={setSelectedWellId} />

        <div className="min-w-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <FactCard well={focusWell} />

          {/* tabs with plain-language labels */}
          <div className="flex flex-wrap gap-1.5">
            {TABS.map((t) => {
              const Icon = t.icon
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                    tab === t.id
                      ? "border-primary/50 bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" />
                  {t.label}
                </button>
              )
            })}
          </div>
          <p className="-mt-2 text-[11px] text-muted-foreground">{tabMeta.hint}</p>

          {tab === "programs" && <ProgramsPanel well={focusWell} />}
          {tab === "events" && <EventsPanel well={focusWell} />}
          {tab === "correlate" && <CorrelationPanel focusWell={focusWell} />}
          {tab === "documents" && <WellDocumentViewer wellId={focusWell.id} />}
        </div>
      </div>
    </div>
  )
}
