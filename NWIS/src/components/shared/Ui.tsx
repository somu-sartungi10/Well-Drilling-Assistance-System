import type { ReactNode } from "react"
import { cn } from "cn"
import { FORMATION_BY_ID } from "@/data/formations"
import type { Severity } from "@/data/types"

export const fmt = (m: number) => `${m.toLocaleString("en-IN")} m`

export function severityColor(s: Severity): string {
  return s === "critical" ? "#ef4444" : s === "severe" ? "#f97316" : s === "moderate" ? "#eab308" : "#22c55e"
}

export function ScreenHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function StatChip({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span className="text-lg font-semibold tabular-nums" style={accent ? { color: accent } : undefined}>
          {value}
        </span>
        {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
      </div>
    </div>
  )
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const color = severityColor(severity)
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: `${color}1f`, color }}
    >
      {severity}
    </span>
  )
}

export function FormationChip({ id, small }: { id: string; small?: boolean }) {
  const f = FORMATION_BY_ID[id]
  if (!f) return null
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2 py-0.5 font-medium",
        small ? "text-[10px]" : "text-xs",
      )}
    >
      <span className="size-2 rounded-full" style={{ backgroundColor: f.color }} />
      {f.name}
    </span>
  )
}

export function RiskBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${score}%`, backgroundColor: color }}
      />
    </div>
  )
}

export function riskColor(score: number): string {
  return score >= 70 ? "#ef4444" : score >= 45 ? "#f97316" : score >= 25 ? "#eab308" : "#22c55e"
}
