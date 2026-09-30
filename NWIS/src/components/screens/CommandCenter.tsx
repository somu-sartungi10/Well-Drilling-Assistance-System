import { useEffect, useMemo, useRef, useState } from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { AlertTriangle, Check, Pause, Play, FastForward, Rewind } from "lucide-react"
import { cn } from "cn"
import { useAppStore } from "@/store/useAppStore"
import { ACTIVE_WELL } from "@/data/wells"
import { FORMATION_BY_ID } from "@/data/formations"
import { riskProfile } from "@/lib/risk"
import { FormationChip, RiskBar, ScreenHeader, StatChip, fmt, riskColor } from "@/components/shared/Ui"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"

// ─── rolling history for live charts ───
function useHistory() {
  const depth = useAppStore((s) => s.liveDepthM)
  const rop = useAppStore((s) => s.rop)
  const mw = useAppStore((s) => s.mwPpg)
  const [hist, setHist] = useState<{ d: number; rop: number; mw: number }[]>([])
  const lastDepth = useRef(-1)

  useEffect(() => {
    if (depth === lastDepth.current) return
    lastDepth.current = depth
    setHist((h) => [...h.slice(-39), { d: depth, rop, mw }])
  }, [depth, rop, mw])

  return hist
}

const CHART_TIP = {
  contentStyle: {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    fontSize: 11,
  },
  labelStyle: { color: "hsl(var(--muted-foreground))" },
}

function formationAt(depth: number) {
  return depth >= 2995 ? "barail" : depth >= 2225 ? "surma" : depth >= 1265 ? "tipam" : "girujan"
}

export default function CommandCenter() {
  const liveDepth = useAppStore((s) => s.liveDepthM)
  const playing = useAppStore((s) => s.playing)
  const setPlaying = useAppStore((s) => s.setPlaying)
  const speed = useAppStore((s) => s.speed)
  const setSpeed = useAppStore((s) => s.setSpeed)
  const scrubDepth = useAppStore((s) => s.scrubDepth)
  const alerts = useAppStore((s) => s.alerts)
  const acknowledge = useAppStore((s) => s.acknowledgeAlert)
  const rop = useAppStore((s) => s.rop)
  const mw = useAppStore((s) => s.mwPpg)
  const hist = useHistory()

  const formationId = formationAt(liveDepth)
  const formation = FORMATION_BY_ID[formationId]
  const profile = useMemo(() => riskProfile(liveDepth), [liveDepth])
  const top3 = profile.slice(0, 3)
  const overall = Math.round(profile.reduce((s, r) => s + r.score, 0) / profile.length)

  // formation column data
  const column = useMemo(() => {
    const tops = ACTIVE_WELL.formationTops
    return [...tops]
      .sort((a, b) => b.depthM - a.depthM)
      .map((t, i, arr) => {
        const f = FORMATION_BY_ID[t.formationId]
        const top = t.depthM
        const bottom = i === 0 ? ACTIVE_WELL.tdM : arr[i - 1].depthM
        return { id: t.formationId, name: f.name, color: f.color, top, bottom, height: bottom - top }
      })
  }, [])

  // hazard bands ahead of the bit (amber = warning zones, red = critical)
  const hazardBands = useMemo(
    () => [
      { from: 2320, to: 2450, label: "seepage", level: "warning" as const },
      { from: 2560, to: 2720, label: "pack-off", level: "warning" as const },
      { from: 3050, to: 3220, label: "losses", level: "warning" as const },
      { from: 3150, to: 3260, label: "COAL SEAM", level: "critical" as const },
      { from: 3400, to: 3450, label: "kick", level: "critical" as const },
    ],
    [],
  )

  return (
    <div className="space-y-4 p-5">
      <ScreenHeader
        title="Command Center"
        subtitle={`${ACTIVE_WELL.name} · ${ACTIVE_WELL.field} field · Rig ${ACTIVE_WELL.rigName} · spudded ${ACTIVE_WELL.spudDate}`}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" className="h-8 gap-1.5" onClick={() => scrubDepth(Math.max(0, liveDepth - 200))}>
              <Rewind className="size-3.5" /> −200 m
            </Button>
            <Button size="sm" variant="secondary" className="h-8 gap-1.5" onClick={() => scrubDepth(Math.min(ACTIVE_WELL.tdM, liveDepth + 200))}>
              <FastForward className="size-3.5" /> +200 m
            </Button>
            <Button size="sm" className="h-8 gap-1.5" onClick={() => setPlaying(!playing)}>
              {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              {playing ? "Pause" : "Resume"}
            </Button>
          </div>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <StatChip label="Current depth" value={liveDepth.toLocaleString("en-IN")} sub="m MD" />
        <StatChip label="ROP" value={rop.toFixed(1)} sub="m/hr" />
        <StatChip label="Mud weight" value={mw.toFixed(1)} sub="ppg" />
        <StatChip label="Formation" value={formation.name.split(" ")[0]} sub={formation.lithology.split(" / ")[0]} accent={formation.color} />
        <StatChip
          label="Risk index"
          value={String(overall)}
          sub="/100"
          accent={riskColor(overall)}
        />
        <StatChip label="Open alerts" value={String(alerts.filter((a) => !a.acknowledged).length)} sub="active" accent="#f59e0b" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Risk panel */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Predictive Risk Outlook</h3>
            <span className="text-[10px] text-muted-foreground">offset-derived · 300 m window</span>
          </div>
          <div className="space-y-3">
            {profile.map((r) => (
              <div key={r.category}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium">{r.label}</span>
                  <span className="font-mono tabular-nums" style={{ color: riskColor(r.score) }}>
                    {r.score}
                  </span>
                </div>
                <RiskBar score={r.score} color={riskColor(r.score)} />
                {r.drivers[0] && <div className="mt-1 text-[10px] leading-snug text-muted-foreground">{r.drivers[0]}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Live depth column */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Wellbore Column · Live</h3>
            <span className="text-[10px] text-muted-foreground">formation tops vs bit</span>
          </div>
          <div className="flex gap-3">
            <div className="relative w-20 overflow-hidden rounded-lg border border-border" style={{ height: 280 }}>
              {column.map((seg) => (
                <div
                  key={seg.id}
                  className="absolute inset-x-0 flex items-center justify-center"
                  style={{
                    top: `${(seg.top / ACTIVE_WELL.tdM) * 100}%`,
                    height: `${(seg.height / ACTIVE_WELL.tdM) * 100}%`,
                    background: `linear-gradient(180deg, ${seg.color}cc, ${seg.color}88)`,
                  }}
                >
                  <span className="px-1 text-center text-[9px] font-bold text-white/90">{seg.name.split(" ")[0]}</span>
                </div>
              ))}
              {/* hazard bands ahead of the bit */}
              {hazardBands.map((h) => (
                <div
                  key={h.label}
                  title={`${h.label} — ${h.from}–${h.to} m`}
                  className="absolute inset-x-0 z-[5]"
                  style={{
                    top: `${(h.from / ACTIVE_WELL.tdM) * 100}%`,
                    height: `${((h.to - h.from) / ACTIVE_WELL.tdM) * 100}%`,
                    background:
                      h.level === "critical"
                        ? "repeating-linear-gradient(45deg, rgba(239,68,68,.55) 0 4px, rgba(239,68,68,.2) 4px 8px)"
                        : "repeating-linear-gradient(45deg, rgba(245,158,11,.45) 0 4px, rgba(245,158,11,.15) 4px 8px)",
                    borderTop: `1px dashed ${h.level === "critical" ? "#ef4444" : "#f59e0b"}`,
                    borderBottom: `1px dashed ${h.level === "critical" ? "#ef4444" : "#f59e0b"}`,
                  }}
                >
                  <span
                    className="absolute left-0.5 top-0.5 rounded px-0.5 text-[7px] font-black uppercase tracking-wide text-white"
                    style={{ backgroundColor: h.level === "critical" ? "#ef4444" : "#f59e0b" }}
                  >
                    {h.label}
                  </span>
                </div>
              ))}
              {/* bit position */}
              <div
                className="absolute inset-x-0 z-10 transition-all duration-700"
                style={{ top: `${(liveDepth / ACTIVE_WELL.tdM) * 100}%` }}
              >
                <div className="relative mx-auto h-0 w-full border-t-2 border-primary">
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground shadow">
                    BIT {fmt(liveDepth)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-2.5">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Currently drilling</div>
              <FormationChip id={formationId} />
              <p className="text-[11px] leading-relaxed text-muted-foreground">{formation.notes}</p>
              <div className="rounded-lg bg-secondary/60 p-2.5">
                <div className="text-[10px] font-semibold text-foreground/80">Recommended mud</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{formation.mudRecommendation}</div>
              </div>
              {top3[0] && top3[0].score >= 30 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    <AlertTriangle className="size-3" /> Watch
                  </div>
                  <div className="mt-0.5 text-[11px] text-foreground/90">
                    {top3[0].label} — {top3[0].drivers[0] ?? "offset history"}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live parameter charts */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">ROP trend</h3>
              <span className="font-mono text-xs tabular-nums text-primary">{rop.toFixed(1)} m/hr</span>
            </div>
            <div style={{ height: 96 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hist} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="d" hide />
                  <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip {...CHART_TIP} />
                  <Line type="monotone" dataKey="rop" stroke="#22d3ee" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Mud weight vs window</h3>
              <span className="font-mono text-xs tabular-nums text-primary">{mw.toFixed(1)} ppg</span>
            </div>
            <div style={{ height: 96 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hist} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="d" hide />
                  <YAxis domain={[8.5, 14]} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip {...CHART_TIP} />
                  <ReferenceLine y={13} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "frac", fontSize: 9, fill: "#ef4444" }} />
                  <Line type="monotone" dataKey="mw" stroke="#38bdf8" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Alert feed + sim controls */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-border bg-card xl:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold">Proactive Alert Feed</h3>
            <span className="text-[10px] text-muted-foreground">{alerts.length} total · {alerts.filter(a => !a.acknowledged).length} open</span>
          </div>
          <div className="max-h-72 space-y-2 overflow-y-auto p-3">
            {alerts.length === 0 && (
              <div className="grid place-items-center gap-2 py-10 text-center text-xs text-muted-foreground">
                <AlertTriangle className="size-6 opacity-30" />
                No alerts yet — the engine fires as the bit approaches historical incident zones. Try +200 m scrub.
              </div>
            )}
            {alerts.map((a) => (
              <div
                key={a.id}
                className={cn(
                  "rounded-lg border p-3",
                  a.level === "critical" ? "border-destructive/40 bg-destructive/5" : "border-amber-500/30 bg-amber-500/5",
                  a.acknowledged && "opacity-50",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                          a.level === "critical" ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-400",
                        )}
                      >
                        {a.level}
                      </span>
                      <span className="text-xs font-semibold">{a.title}</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{a.detail}</p>
                    <div className="mt-1.5 rounded bg-secondary/70 px-2 py-1 text-[11px] text-foreground/80">
                      <b>Do:</b> {a.recommendation}
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      Sources: {a.sourceRefs.join(" · ")}
                    </div>
                  </div>
                  {!a.acknowledged && (
                    <Button size="sm" variant="secondary" className="h-7 shrink-0 gap-1 text-[11px]" onClick={() => acknowledge(a.id)}>
                      <Check className="size-3" /> Ack
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Simulation controls */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold">Simulation Controls</h3>
          <p className="mt-1 text-[11px] text-muted-foreground">Demo scrub — jump the bit to any depth; alerts re-evaluate instantly.</p>
          <div className="mt-4 flex items-center gap-3">
            <Button size="icon" variant="secondary" className="size-8" onClick={() => setPlaying(!playing)}>
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            </Button>
            <Slider
              value={[liveDepth]}
              min={0}
              max={ACTIVE_WELL.tdM}
              step={10}
              onValueChange={(v) => scrubDepth(v[0])}
              className="flex-1"
            />
          </div>
          <div className="mt-2 flex justify-between text-[10px] font-mono text-muted-foreground">
            <span>0 m</span>
            <span className="text-primary">{fmt(liveDepth)}</span>
            <span>{ACTIVE_WELL.tdM.toLocaleString("en-IN")} m</span>
          </div>
          <div className="mt-4">
            <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Speed</div>
            <div className="flex gap-1.5">
              {[1, 2, 4].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={cn(
                    "flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors",
                    speed === s ? "border-primary/50 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-1.5">
            {[
              { label: "Surma", d: 2380 },
              { label: "Barail", d: 3020 },
              { label: "Kick", d: 3085 },
              { label: "Coal", d: 3195 },
            ].map((p) => (
              <button
                key={p.label}
                onClick={() => scrubDepth(p.d)}
                className="rounded-lg border border-border px-2 py-1.5 text-[10px] font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground"
              >
                {p.label}
                <div className="font-mono text-[9px] opacity-70">{p.d.toLocaleString("en-IN")}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
