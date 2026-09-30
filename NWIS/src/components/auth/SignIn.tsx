import { useState } from "react"
import {
  Activity,
  BellRing,
  BrainCircuit,
  ChevronRight,
  Gauge,
  Map as MapIcon,
  Radio,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react"
import { cn } from "cn"
import { useAppStore, ROLE_LABELS, type Role } from "@/store/useAppStore"
import { ACTIVE_WELL } from "@/data/wells"

/** Device-local operator sign-in — the prototype is 100% client-side, so the
 *  "account" lives in localStorage (no backend, per the design constraint). */

const ROLES: Role[] = ["drilling-engineer", "toolpusher", "geologist", "viewer"]

const FEATURES = [
  { icon: Gauge, title: "Command Center", text: "Live depth, ROP & mud-weight with predictive risk outlook" },
  { icon: MapIcon, title: "Nearby Wells Map", text: "Offset intelligence ranked by relevance around the rig" },
  { icon: BrainCircuit, title: "NWIS Copilot", text: "Cited answers from every DDR, WCR & lesson learned" },
  { icon: BellRing, title: "Proactive Alerts", text: "Fires before the bit enters a historical incident zone" },
] as const

function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .slice(0, 2)
      .join("") || "OP"
  )
}

export default function SignIn() {
  const signIn = useAppStore((s) => s.signIn)
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<Role>("drilling-engineer")
  const [field, setField] = useState(ACTIVE_WELL.field)
  const [rig, setRig] = useState(ACTIVE_WELL.rigName)
  const [error, setError] = useState<string | null>(null)

  const submit = () => {
    const em = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setError("Enter a valid email address")
      return
    }
    if (mode === "signup" && name.trim().length < 2) {
      setError("Enter your full name")
      return
    }
    setError(null)
    // sign-in with a known device profile pre-fills identity from the email;
    // otherwise the profile is created from the entered details
    signIn({
      name: mode === "signup" ? name.trim() : name.trim() || em.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      email: em,
      role,
      field: field.trim() || ACTIVE_WELL.field,
      rig: rig.trim() || ACTIVE_WELL.rigName,
    })
  }

  const demo = () => {
    signIn({
      name: "Demo Operator",
      email: "operator@oil-india.in",
      role: "drilling-engineer",
      field: ACTIVE_WELL.field,
      rig: ACTIVE_WELL.rigName,
    })
  }

  const inputCls =
    "h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20"

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Brand hero ─────────────────────────────────────────────── */}
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden border-r border-border bg-card p-10 lg:flex">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" />
        <div
          className="pointer-events-none absolute -right-40 -top-40 size-[480px] rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, #22d3ee 0%, transparent 70%)" }}
        />

        <div className="relative flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-cyan-500/15 text-cyan-400 dark:text-cyan-300">
            <Activity className="size-6" />
          </div>
          <div>
            <div className="text-base font-bold tracking-tight">
              NWI<span className="text-cyan-500 dark:text-cyan-300">S</span>
            </div>
            <div className="text-[11px] text-muted-foreground">Nearby Wells Intelligence System</div>
          </div>
        </div>

        <div className="relative max-w-lg space-y-6">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="size-3" /> ERTMAC companion · Drilling Intelligence
            </div>
            <h1 className="text-3xl font-bold leading-tight tracking-tight">
              Institutional memory for the
              <span className="text-cyan-500 dark:text-cyan-300"> drilling floor</span>
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              NWIS turns decades of offset-well history — every kick, loss and stuck-pipe report — into
              live, cited guidance for the well that's drilling right now:{" "}
              <b className="text-foreground">{ACTIVE_WELL.name}</b>, {ACTIVE_WELL.field} field.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-xl border border-border bg-secondary/50 p-3.5">
                <Icon className="size-4 text-cyan-500 dark:text-cyan-300" />
                <div className="mt-2 text-xs font-semibold">{title}</div>
                <div className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{text}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center gap-2 text-[11px] text-muted-foreground">
          <Radio className="size-3.5 text-emerald-400" />
          Streaming rig telemetry · Rig #14 · Dikom, Upper Assam
          <ShieldCheck className="ml-3 size-3.5 text-cyan-500 dark:text-cyan-300" />
          100% On-Premise 
        </div>
      </div>

      {/* ── Form column ────────────────────────────────────────────── */}
      <div className="relative flex w-full flex-col items-center justify-center p-6 lg:w-[480px] lg:shrink-0">
        <div className="w-full max-w-sm">
          {/* mobile brand */}
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <div className="grid size-9 place-items-center rounded-lg bg-cyan-500/15 text-cyan-400 dark:text-cyan-300">
              <Activity className="size-5" />
            </div>
            <div className="text-sm font-bold">
              NWI<span className="text-cyan-500 dark:text-cyan-300">S</span>
            </div>
          </div>

          {/* mode tabs */}
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m)
                  setError(null)
                }}
                className={cn(
                  "rounded-lg py-2 text-xs font-semibold transition-colors",
                  mode === m ? "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "signin" ? "Sign in" : "Create profile"}
              </button>
            ))}
          </div>

          <h2 className="text-lg font-bold tracking-tight">
            {mode === "signin" ? "Welcome back, operator" : "Set up your operator profile"}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {mode === "signin"
              ? "Sign in with your OIL email to load your rig view."
              : "Your profile stays on this device — this prototype has no server."}
          </p>

          <div className="mt-5 space-y-3.5">
            {mode === "signup" && (
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold text-muted-foreground">Full name</label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                    placeholder="e.g. Priya Sharma"
                    className={cn(inputCls, "pl-9")}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold text-muted-foreground">Work email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="name@oil-india.in"
                type="email"
                className={inputCls}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold text-muted-foreground">Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={cn(inputCls, "cursor-pointer")}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold text-muted-foreground">Field</label>
                <input value={field} onChange={(e) => setField(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold text-muted-foreground">Rig</label>
                <input value={rig} onChange={(e) => setRig(e.target.value)} className={inputCls} />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}

            <button
              onClick={submit}
              className="flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-cyan-500 text-sm font-semibold text-cyan-950 shadow-[0_6px_24px_rgba(34,211,238,0.3)] transition-opacity hover:opacity-90 dark:bg-cyan-400"
            >
              {mode === "signin" ? "Sign in to Command Center" : "Create profile & continue"}
              <ChevronRight className="size-4" />
            </button>

            <button
              onClick={demo}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <span
                className="grid size-5 place-items-center rounded-full bg-cyan-500/20 text-[9px] font-bold text-cyan-600 dark:text-cyan-300"
                aria-hidden
              >
                {initialsOf("Demo Operator")}
              </span>
              Skip — explore as demo operator
            </button>
          </div>

          <p className="mt-5 text-center text-[10px] leading-relaxed text-muted-foreground">
            Prototype · identity is stored locally on this device only · no network account is created
          </p>
        </div>
      </div>
    </div>
  )
}
