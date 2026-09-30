import { useEffect } from "react"
import {
  Activity,
  Bell,
  BookOpen,
  FileText,
  Gauge,
  Map,
  Moon,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Pause,
  Play,
  Radio,
  Sun,
  X,
} from "lucide-react"
import { cn } from "cn"
import { useAppStore, type ScreenId } from "@/store/useAppStore"
import { useLiveSimulation } from "@/hooks/useLiveSimulation"
import { ACTIVE_WELL } from "@/data/wells"
import { FORMATION_BY_ID } from "@/data/formations"
import { fmt } from "@/components/shared/Ui"
import { Button } from "@/components/ui/button"
import CommandCenter from "@/components/screens/CommandCenter"
import MapScreen from "@/components/screens/MapScreen"
import WellIntel from "@/components/screens/WellIntel"
import KnowledgeBase from "@/components/screens/KnowledgeBase"
import { DocumentsTab } from "@/components/screens/DocumentViewer"
import Copilot from "@/components/copilot/Copilot"
import CriticalAlertModal from "@/components/shared/CriticalAlertModal"
import { ErrorBoundary } from "@/components/shared/ErrorBoundary"

const NAV: { id: ScreenId; label: string; icon: typeof Gauge }[] = [
  { id: "command", label: "Command Center", icon: Gauge },
  { id: "map", label: "Nearby Wells", icon: Map },
  { id: "well", label: "Well Intelligence", icon: Network },
  { id: "knowledge", label: "Knowledge Base", icon: BookOpen },
  { id: "documents", label: "Documents", icon: FileText },
]

export default function Shell() {
  useLiveSimulation()
  const screen = useAppStore((s) => s.screen)
  const setScreen = useAppStore((s) => s.setScreen)
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)
  const liveDepth = useAppStore((s) => s.liveDepthM)
  const playing = useAppStore((s) => s.playing)
  const setPlaying = useAppStore((s) => s.setPlaying)
  const alerts = useAppStore((s) => s.alerts)
  const toast = useAppStore((s) => s.toastAlert)
  const dismissToast = useAppStore((s) => s.dismissToast)
  const rop = useAppStore((s) => s.rop)
  const mw = useAppStore((s) => s.mwPpg)

  const formationId =
    liveDepth >= 2995 ? "barail" : liveDepth >= 2225 ? "surma" : liveDepth >= 1265 ? "tipam" : "girujan"
  const formation = FORMATION_BY_ID[formationId]
  const unack = alerts.filter((a) => !a.acknowledged).length

  // apply theme class to <html>
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
  }, [theme])

  // auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(dismissToast, 12000)
    return () => clearTimeout(id)
  }, [toast, dismissToast])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200",
          sidebarCollapsed ? "w-[64px]" : "w-56",
        )}
      >
        <div className={cn("flex items-center gap-2.5 border-b border-border px-3 py-4", sidebarCollapsed && "justify-center px-2")}>
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-cyan-500/15 text-cyan-400 dark:text-cyan-300">
            <Activity className="size-5" />
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <div className="text-sm font-bold tracking-tight">
                NWI<span className="text-cyan-400 dark:text-cyan-300">S</span>
              </div>
              <div className="truncate text-[10px] text-muted-foreground">Nearby Wells Intelligence</div>
            </div>
          )}
        </div>

        <nav className={cn("flex-1 space-y-1 p-2", sidebarCollapsed && "px-1.5")}>
          {NAV.map(({ id, label, icon: Icon }) => {
            const active = screen === id
            return (
              <button
                key={id}
                onClick={() => setScreen(id)}
                title={sidebarCollapsed ? label : undefined}
                className={cn(
                  "group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  sidebarCollapsed && "justify-center px-2",
                  active
                    ? "bg-cyan-500/12 text-cyan-600 dark:text-cyan-300"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                {/* left active indicator */}
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-cyan-400 dark:bg-cyan-300" />
                )}
                <Icon className="size-4 shrink-0" />
                {!sidebarCollapsed && label}
              </button>
            )
          })}
        </nav>

        <div className={cn("border-t border-border p-3", sidebarCollapsed && "px-2")}>
          {!sidebarCollapsed && (
            <div className="rounded-lg bg-secondary/60 p-2.5 text-[10px] leading-relaxed text-muted-foreground">
              <div className="font-semibold text-foreground/80">eRTMAC integration</div>
              Streaming · 1 Hz · Rig #14
            </div>
          )}

          {/* collapse toggle */}
          <button
            onClick={toggleSidebar}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            {!sidebarCollapsed && "Collapse"}
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-5">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={cn("size-2 rounded-full", playing ? "animate-pulse bg-emerald-400" : "bg-muted-foreground")} />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Live · {ACTIVE_WELL.name}
              </span>
            </div>
            <div className="flex items-baseline gap-3 font-mono text-sm tabular-nums">
              <span className="font-bold text-cyan-400 dark:text-cyan-300">{fmt(liveDepth)}</span>
              <span className="text-xs" style={{ color: formation?.color }}>
                {formation?.name}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-4 text-xs text-muted-foreground md:flex">
              <span>
                ROP <b className="text-cyan-400 dark:text-cyan-300">{rop.toFixed(1)}</b> m/hr
              </span>
              <span>
                MW <b className="text-cyan-400 dark:text-cyan-300">{mw.toFixed(1)}</b> ppg
              </span>
              <span className="flex items-center gap-1.5">
                <Radio className="size-3 text-emerald-400" /> eRTMAC
              </span>
            </div>
            <button
              onClick={() => setPlaying(!playing)}
              className={cn(
                "grid size-8 place-items-center rounded-lg border transition-colors",
                playing
                  ? "border-border text-muted-foreground hover:text-foreground"
                  : "border-cyan-500/40 bg-cyan-500/10 text-cyan-500 dark:text-cyan-300",
              )}
              title={playing ? "Pause simulation" : "Resume simulation"}
            >
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            </button>
            {/* theme toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-cyan-500 dark:hover:text-cyan-300"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <div className="relative">
              <Bell className="size-5 text-muted-foreground" />
              {unack > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid size-4 place-items-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                  {unack}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Screen */}
        <main className="min-h-0 flex-1 overflow-y-auto">
          <ErrorBoundary key={screen}>
            {screen === "command" && <CommandCenter />}
            {screen === "map" && <MapScreen />}
            {screen === "well" && <WellIntel />}
            {screen === "knowledge" && <KnowledgeBase />}
            {screen === "documents" && <DocumentsTab />}
          </ErrorBoundary>
        </main>
      </div>

      {/* Copilot drawer — isolated so a copilot crash can never blank the app */}
      <ErrorBoundary className="h-full w-full rounded-2xl">
        <Copilot />
      </ErrorBoundary>

      {/* Alert toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[1000] w-96 animate-in slide-in-from-bottom-4 rounded-xl border border-border bg-card shadow-2xl">
          <div className="flex items-start gap-3 p-4">
            <div
              className={cn(
                "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg",
                toast.level === "critical" ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-400",
              )}
            >
              <Bell className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                    toast.level === "critical"
                      ? "bg-destructive/15 text-destructive"
                      : "bg-amber-500/15 text-amber-400",
                  )}
                >
                  {toast.level}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  from {fmt(toast.depthFromM)}–{fmt(toast.depthToM)}
                </span>
              </div>
              <div className="mt-1 text-sm font-semibold leading-snug">{toast.title}</div>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{toast.detail}</p>
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => {
                    setScreen("command")
                    dismissToast()
                  }}
                >
                  Open feed
                </Button>
                <Button size="sm" variant="secondary" className="h-7 px-2.5 text-xs" onClick={dismissToast}>
                  Dismiss
                </Button>
              </div>
            </div>
            <button className="text-muted-foreground hover:text-foreground" onClick={dismissToast}>
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* full-screen critical risk modal */}
      <CriticalAlertModal />
    </div>
  )
}
