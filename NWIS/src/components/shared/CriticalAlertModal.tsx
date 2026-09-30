import { BookMarked, Check, MapPin, ShieldAlert } from "lucide-react"
import { useAppStore } from "@/store/useAppStore"
import { WELL_BY_ID, STATUS_META } from "@/data/wells"
import { FORMATION_BY_ID } from "@/data/formations"
import { distanceFromActive } from "@/lib/geo"
import { eventsForWell } from "@/lib/risk"
import { fmt, SeverityBadge } from "@/components/shared/Ui"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

/** Highest historical severity among the source wells' events → risk %. */
function riskPercent(sourceWellIds: string[]): number {
  let worst = 0
  for (const id of sourceWellIds) {
    for (const ev of eventsForWell(id)) {
      const base = ev.severity === "critical" ? 92 : ev.severity === "severe" ? 78 : ev.severity === "moderate" ? 61 : 40
      worst = Math.max(worst, base)
    }
  }
  return Math.min(96, worst + sourceWellIds.length * 1)
}

export default function CriticalAlertModal() {
  const alert = useAppStore((s) => s.criticalAlert)
  const close = useAppStore((s) => s.closeCriticalAlert)
  const acknowledge = useAppStore((s) => s.acknowledgeAlert)
  const setPlaying = useAppStore((s) => s.setPlaying)
  const setScreen = useAppStore((s) => s.setScreen)

  if (!alert) return null

  const formation = FORMATION_BY_ID[alert.formationId]
  const evidenceRows = alert.sourceWellIds
    .map((id) => {
      const well = WELL_BY_ID[id]
      if (!well) return null
      const evs = eventsForWell(id)
      const matching =
        evs.find((e) => e.depthM >= alert.depthFromM - 250 && e.depthM <= alert.depthToM + 250) ??
        evs[0]
      if (!matching) return null
      return { well, ev: matching, distanceKm: distanceFromActive(well) }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  const risk = riskPercent(alert.sourceWellIds)

  const ackAndPause = () => {
    acknowledge(alert.id)
    setPlaying(false)
    close()
  }
  const viewEvidence = () => {
    acknowledge(alert.id)
    setScreen("well")
    close()
  }

  return (
    <div className="fixed inset-0 z-[1100] grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-destructive/50 bg-card shadow-[0_0_80px_rgba(239,68,68,0.25)]">
        {/* red header */}
        <div className="flex items-center gap-3 bg-destructive/15 px-5 py-4">
          <div className="grid size-10 place-items-center rounded-xl bg-destructive/20 text-destructive">
            <ShieldAlert className="size-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold uppercase tracking-widest text-destructive">
                Critical Risk
              </span>
              <span className="rounded bg-destructive/20 px-1.5 py-0.5 font-mono text-[10px] text-destructive">
                {fmt(alert.depthFromM)}–{fmt(alert.depthToM)}
              </span>
            </div>
            <div className="mt-0.5 text-sm font-bold text-foreground">{alert.title}</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-2xl font-extrabold tabular-nums text-destructive">{risk}%</div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">risk score</div>
          </div>
        </div>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto p-5">
          {/* evidence bullets */}
          <div>
            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Why this alert fired
            </div>
            <p className="text-xs leading-relaxed text-foreground/90">{alert.detail}</p>
            <div className="mt-2 space-y-1">
              {alert.sourceRefs.map((ref) => (
                <div key={ref} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <BookMarked className="size-3 shrink-0 text-destructive/70" />
                  <span className="font-mono">{ref}</span>
                </div>
              ))}
            </div>
          </div>

          {/* offsets table */}
          {evidenceRows.length > 0 && (
            <div>
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Matching historical events — offset wells
              </div>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border text-left text-[9px] uppercase tracking-wider text-muted-foreground">
                    <th className="pb-1.5">Well</th>
                    <th className="pb-1.5">Distance</th>
                    <th className="pb-1.5">Event</th>
                    <th className="pb-1.5">Depth</th>
                    <th className="pb-1.5">Severity</th>
                    <th className="pb-1.5">NPT</th>
                    <th className="pb-1.5">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {evidenceRows.map(({ well, ev, distanceKm }) => (
                    <tr key={ev.id} className="border-b border-border/40">
                      <td className="py-1.5 font-semibold">
                        <span className="flex items-center gap-1.5">
                          <span
                            className="size-2 rounded-full"
                            style={{ background: STATUS_META[well.status].color }}
                          />
                          {well.name}
                        </span>
                      </td>
                      <td className="py-1.5 font-mono tabular-nums text-muted-foreground">
                        {distanceKm.toFixed(1)} km
                      </td>
                      <td className="py-1.5">{ev.title}</td>
                      <td className="py-1.5 font-mono tabular-nums">{fmt(ev.depthM)}</td>
                      <td className="py-1.5">
                        <SeverityBadge severity={ev.severity} />
                      </td>
                      <td className="py-1.5 font-mono tabular-nums">{ev.nptDays} d</td>
                      <td className="py-1.5 font-mono text-[10px] text-muted-foreground">{ev.sourceRef}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* recommended actions */}
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-destructive">
              Recommended actions
            </div>
            <p className="text-xs leading-relaxed text-foreground/90">{alert.recommendation}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {formation && (
                <Badge variant="secondary" className="text-[9px]">
                  <span className="mr-1 inline-block size-2 rounded-full" style={{ background: formation.color }} />
                  {formation.name}
                </Badge>
              )}
              <Badge variant="secondary" className="text-[9px]">
                alert raised at {fmt(alert.depthFromM - 120)} (120 m lookahead)
              </Badge>
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-secondary/40 px-5 py-3">
          <span className="text-[10px] italic text-muted-foreground">
            Decision support only — final call rests with the drilling supervisor.
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" className="h-8 gap-1.5" onClick={viewEvidence}>
              <MapPin className="size-3.5" /> View Evidence
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={ackAndPause}
            >
              <Check className="size-3.5" /> Acknowledge & Pause
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
