import { useMemo, useState } from "react"
import { BookOpen, Lightbulb, Search, X } from "lucide-react"
import { cn } from "cn"
import { useAppStore } from "@/store/useAppStore"
import { LESSONS } from "@/data/lessons"
import { EVENTS } from "@/data/events"
import { WELL_BY_ID } from "@/data/wells"
import { EVENT_META } from "@/data/formations"
import { retrieve } from "@/lib/retrieval"
import { FormationChip, ScreenHeader, SeverityBadge, fmt } from "@/components/shared/Ui"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import type { DrillingEvent, Lesson } from "@/data/types"

const EVENT_TYPES = [
  { id: "mud_loss", label: "Mud Losses" },
  { id: "kick", label: "Kick" },
  { id: "stuck_pipe", label: "Stuck Pipe" },
  { id: "overpressure", label: "Overpressure" },
  { id: "cementing_issue", label: "Cementing" },
  { id: "torque_spike", label: "Torque" },
  { id: "hole_packoff", label: "Pack-off" },
]

export default function KnowledgeBase() {
  const kbQuery = useAppStore((s) => s.kbQuery)
  const setKbQuery = useAppStore((s) => s.setKbQuery)
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [formationFilter, setFormationFilter] = useState<string | null>(null)
  const [detail, setDetail] = useState<{ kind: "event" | "lesson"; ev?: DrillingEvent; ls?: Lesson } | null>(null)

  const isFiltering = kbQuery.trim().length > 0

  const results = useMemo(() => {
    if (isFiltering) {
      return retrieve(kbQuery, 20)
        .filter((c) => c.kind === "event" || c.kind === "lesson")
        .map((c) => ({
          kind: c.kind as "event" | "lesson",
          ev: c.event,
          ls: c.lesson,
          score: c.score,
        }))
    }
    return LESSONS.map((ls) => ({ kind: "lesson" as const, ev: undefined, ls, score: 0 }))
  }, [kbQuery, isFiltering])

  const filtered = results.filter((r) => {
    if (typeFilter) {
      const t = r.kind === "event" ? r.ev?.type : r.ls?.eventId ? EVENTS.find((e) => e.id === r.ls!.eventId)?.type : undefined
      if (t !== typeFilter) return false
    }
    if (formationFilter) {
      const f = r.kind === "event" ? r.ev?.formationId : r.ls?.formationId
      if (f !== formationFilter) return false
    }
    return true
  })

  return (
    <div className="space-y-4 p-5">
      <ScreenHeader
        title="Knowledge Repository"
        subtitle="Drilling events, lessons learned, and mitigation measures from every offset well"
      />

      {/* search + filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-72 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={kbQuery}
            onChange={(e) => setKbQuery(e.target.value)}
            placeholder="Search lessons, incidents, mitigations… try “losses in Barail” or “stuck pipe”"
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-9 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary/50"
          />
          {kbQuery && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setKbQuery("")}>
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setTypeFilter(null)}
          className={cn(
            "rounded-full border px-2.5 py-1 text-[11px] font-medium",
            typeFilter === null ? "border-primary/50 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          All types
        </button>
        {EVENT_TYPES.map((t) => (
          <button
            key={t.id}
            onClick={() => setTypeFilter(typeFilter === t.id ? null : t.id)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-medium",
              typeFilter === t.id ? "border-primary/50 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
        <span className="mx-1 w-px self-stretch bg-border" />
        <button
          onClick={() => setFormationFilter(null)}
          className={cn(
            "rounded-full border px-2.5 py-1 text-[11px] font-medium",
            formationFilter === null ? "border-primary/50 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          All formations
        </button>
        {["girujan", "tipam", "surma", "barail"].map((f) => (
          <button
            key={f}
            onClick={() => setFormationFilter(formationFilter === f ? null : f)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-medium",
              formationFilter === f ? "border-primary/50 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* results */}
      <div className="grid gap-3 lg:grid-cols-2">
        {filtered.length === 0 && (
          <div className="col-span-full grid place-items-center gap-2 rounded-xl border border-border bg-card py-14 text-center text-xs text-muted-foreground">
            <Search className="size-6 opacity-30" />
            Nothing matches those filters. Clear search or filters to browse all {LESSONS.length} lessons.
          </div>
        )}
        {filtered.map((r, i) => {
          if (r.kind === "lesson" && r.ls) {
            const ls = r.ls
            const well = ls.wellId ? WELL_BY_ID[ls.wellId] : undefined
            return (
              <button
                key={`ls-${ls.id}-${i}`}
                onClick={() => setDetail({ kind: "lesson", ls })}
                className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40"
              >
                <div className="flex items-start gap-3">
                  <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
                    <Lightbulb className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold">{ls.title}</span>
                      {isFiltering && r.score > 0 && (
                        <Badge variant="secondary" className="text-[9px]">match {r.score}</Badge>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{ls.lesson}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {well && <Badge variant="secondary" className="text-[9px]">{well.name}</Badge>}
                      {ls.formationId && <FormationChip id={ls.formationId} small />}
                      <span className="font-mono text-[10px] text-muted-foreground/70">{ls.sourceRef}</span>
                    </div>
                  </div>
                </div>
              </button>
            )
          }
          const ev = r.ev!
          const well = WELL_BY_ID[ev.wellId]
          const meta = EVENT_META[ev.type]
          return (
            <button
              key={`ev-${ev.id}-${i}`}
              onClick={() => setDetail({ kind: "event", ev })}
              className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40"
            >
              <div className="flex items-start gap-3">
                <div
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-[10px] font-bold"
                  style={{ backgroundColor: `${meta.color}1f`, color: meta.color }}
                >
                  {meta.label.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                      style={{ backgroundColor: `${meta.color}1f`, color: meta.color }}
                    >
                      {meta.label}
                    </span>
                    <SeverityBadge severity={ev.severity} />
                    <span className="font-mono text-[10px] text-muted-foreground">{fmt(ev.depthM)}</span>
                    {isFiltering && r.score > 0 && (
                      <Badge variant="secondary" className="text-[9px]">match {r.score}</Badge>
                    )}
                  </div>
                  <div className="mt-1 text-xs font-semibold">{ev.title}</div>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{ev.mitigation}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {well && <Badge variant="secondary" className="text-[9px]">{well.name}</Badge>}
                    <FormationChip id={ev.formationId} small />
                    <span className="font-mono text-[10px] text-muted-foreground/70">{ev.sourceRef}</span>
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          {detail?.kind === "lesson" && detail.ls && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="size-4 text-primary" /> {detail.ls.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Lesson</div>
                  <p className="mt-1 leading-relaxed text-foreground/90">{detail.ls.lesson}</p>
                </div>
                <div className="rounded-lg border border-primary/30 bg-primary/10 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-primary">Recommended action</div>
                  <p className="mt-1 leading-relaxed text-foreground/90">{detail.ls.recommendation}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {detail.ls.wellId && <Badge variant="secondary">{WELL_BY_ID[detail.ls.wellId]?.name}</Badge>}
                  {detail.ls.formationId && <FormationChip id={detail.ls.formationId} small />}
                  <span className="font-mono text-[10px] text-muted-foreground">{detail.ls.sourceRef}</span>
                </div>
              </div>
            </>
          )}
          {detail?.kind === "event" && detail.ev && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">{detail.ev.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {(() => {
                    const meta = EVENT_META[detail.ev!.type]
                    return (
                      <span
                        className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                        style={{ backgroundColor: `${meta.color}1f`, color: meta.color }}
                      >
                        {meta.label}
                      </span>
                    )
                  })()}
                  <SeverityBadge severity={detail.ev.severity} />
                  <FormationChip id={detail.ev.formationId} small />
                  <Badge variant="secondary">{fmt(detail.ev.depthM)}</Badge>
                  <Badge variant="secondary">{detail.ev.nptDays} d NPT</Badge>
                </div>
                <p className="leading-relaxed text-foreground/90">{detail.ev.description}</p>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Mitigation</div>
                  <p className="mt-1 leading-relaxed text-foreground/90">{detail.ev.mitigation}</p>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Outcome</div>
                  <p className="mt-1 leading-relaxed text-foreground/90">{detail.ev.outcome}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <Badge variant="secondary">{WELL_BY_ID[detail.ev.wellId]?.name}</Badge>
                  <span className="font-mono text-[10px] text-muted-foreground">{detail.ev.sourceRef} · {detail.ev.date}</span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
