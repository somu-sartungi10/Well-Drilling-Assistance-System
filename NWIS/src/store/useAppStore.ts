import { create } from "zustand"
import { ACTIVE_WELL } from "@/data/wells"
import type { Alert, ChatMessage } from "@/data/types"

export type ScreenId = "command" | "map" | "well" | "knowledge" | "documents"
export type Theme = "dark" | "light"

interface AlertRule {
  key: string
  depthFromM: number
  depthToM: number
}

interface AppState {
  // navigation
  screen: ScreenId
  setScreen: (s: ScreenId) => void

  // chrome
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  theme: Theme
  setTheme: (t: Theme) => void

  // map / proximity
  radiusKm: number
  setRadiusKm: (r: number) => void
  selectedWellId: string | null
  setSelectedWellId: (id: string | null) => void

  // well intelligence
  comparisonWellIds: string[]
  toggleComparisonWell: (id: string) => void

  // knowledge base filters
  kbQuery: string
  setKbQuery: (q: string) => void
  kbTypeFilter: string | null
  setKbTypeFilter: (t: string | null) => void

  // live simulation
  liveDepthM: number
  playing: boolean
  speed: number
  rop: number
  mwPpg: number
  setPlaying: (p: boolean) => void
  setSpeed: (s: number) => void
  scrubDepth: (d: number) => void
  tick: () => void

  // alerts
  alerts: Alert[]
  acknowledgeAlert: (id: string) => void
  toastAlert: Alert | null
  dismissToast: () => void
  firedRuleKeys: Set<string>
  _firedKeys: Set<string>

  /** Critical alert modal (full-screen). Holds the alert being escalated. */
  criticalAlert: Alert | null
  openCriticalAlert: (a: Alert) => void
  closeCriticalAlert: () => void

  // copilot
  copilotOpen: boolean
  setCopilotOpen: (open: boolean) => void
  messages: ChatMessage[]
  askCopilot: (q: string, assistantId?: string) => void
  finishStreaming: (id: string) => void
}

/** Alert rules: (window, category) pairs derived from historical incident zones
 *  relative to the active well's planned trajectory. Seeded at depth 1900. */
export function alertRules(): { rule: AlertRule; category: string }[] {
  return [
    // Upper Surma seepage zone (KTL-4 analogue + MRN-1)
    { rule: { key: "surma-seepage", depthFromM: 2320, depthToM: 2450 }, category: "mud_loss" },
    // Surma transition clay pack-off (KTL-3)
    { rule: { key: "surma-packoff", depthFromM: 2560, depthToM: 2720 }, category: "hole_packoff" },
    // Differential sticking clean sands (DK-2)
    { rule: { key: "surma-diff-stick", depthFromM: 2200, depthToM: 2320 }, category: "stuck_pipe" },
    // Barail overpressure ramp (DK-1, KTL-1, BHT-1)
    { rule: { key: "barail-opp-ramp", depthFromM: 3020, depthToM: 3260 }, category: "overpressure" },
    // Barail thin HP sand kick (DK-2 @3085, DK-4 @3245, KTL-3 @3410)
    { rule: { key: "barail-kick", depthFromM: 3040, depthToM: 3450 }, category: "kick" },
    // Barail losses (DK-3 total losses, DK-1 seepage)
    { rule: { key: "barail-losses", depthFromM: 3050, depthToM: 3220 }, category: "mud_loss" },
    // Barail coal pack-off (KTL-1 @3195)
    { rule: { key: "barail-coal", depthFromM: 3150, depthToM: 3260 }, category: "hole_packoff" },
    // 7" cement fallback zone (DK-4)
    { rule: { key: "barail-cement", depthFromM: 3000, depthToM: 3120 }, category: "cementing_issue" },
  ]
}

let alertId = 0

export const useAppStore = create<AppState>((set, get) => ({
  screen: "command",
  setScreen: (s) => set({ screen: s }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((st) => ({ sidebarCollapsed: !st.sidebarCollapsed })),
  theme: "dark",
  setTheme: (t) => set({ theme: t }),

  radiusKm: 10,
  setRadiusKm: (r) => set({ radiusKm: r }),
  selectedWellId: null,
  setSelectedWellId: (id) => set({ selectedWellId: id }),

  comparisonWellIds: ["kathaloni-4", "dikom-4"],
  toggleComparisonWell: (id) =>
    set((st) => ({
      comparisonWellIds: st.comparisonWellIds.includes(id)
        ? st.comparisonWellIds.filter((x) => x !== id)
        : [...st.comparisonWellIds, id].slice(-3),
    })),

  kbQuery: "",
  setKbQuery: (q) => set({ kbQuery: q }),
  kbTypeFilter: null,
  setKbTypeFilter: (t) => set({ kbTypeFilter: t }),

  liveDepthM: 1900,
  playing: true,
  speed: 1,
  rop: 22,
  mwPpg: 9.6,
  setPlaying: (p) => set({ playing: p }),
  setSpeed: (s) => set({ speed: s }),
  scrubDepth: (d) => {
    set({ liveDepthM: Math.max(0, Math.min(ACTIVE_WELL.tdM, d)) })
    get().tick() // re-evaluate alerts on manual scrub
  },

  tick: () => {
    const st = get()
    const depth = st.liveDepthM
    const formation =
      depth >= 2995 ? "barail" : depth >= 2225 ? "surma" : depth >= 1265 ? "tipam" : "girujan"

    // simulate ROP/PPG drift for the live charts
    const formationRop = formation === "barail" ? 9 : formation === "surma" ? 16 : 22
    const rop = Math.max(
      4,
      Math.min(
        30,
        st.rop + (formationRop - st.rop) * 0.25 + (Math.random() - 0.5) * 3,
      ),
    )
    const targetMw = formation === "barail" ? 11.6 : formation === "surma" ? 10.4 : 9.4
    const mwPpg = Math.max(8.8, Math.min(13.8, st.mwPpg + (targetMw - st.mwPpg) * 0.15))

    set({ rop: Math.round(rop * 10) / 10, mwPpg: Math.round(mwPpg * 10) / 10 })

    // ── alert generation ──
    const rules = alertRules()
    const lookahead = 120 // m: fire when within 120 m of a zone
    const newAlerts: Alert[] = []
    const fired = new Set(st._firedKeys)

    for (const { rule, category } of rules) {
      const key = rule.key
      const approaching = depth >= rule.depthFromM - lookahead && depth <= rule.depthToM
      if (approaching && !fired.has(key)) {
        fired.add(key)
        newAlerts.push(makeAlert(rule, category, depth, formation))
      }
    }

    if (newAlerts.length > 0) {
      set({
        _firedKeys: fired,
        alerts: [...newAlerts, ...st.alerts].slice(0, 30),
        toastAlert: newAlerts[0],
      })
      // escalate critical alerts to the full-screen modal
      const critical = newAlerts.find((a) => a.level === "critical")
      if (critical) set({ criticalAlert: critical })
    }
  },

  alerts: [],
  acknowledgeAlert: (id) =>
    set((st) => ({
      alerts: st.alerts.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)),
    })),
  toastAlert: null,
  dismissToast: () => set({ toastAlert: null }),
  firedRuleKeys: new Set<string>(),
  _firedKeys: new Set<string>(),

  criticalAlert: null,
  openCriticalAlert: (a) => set({ criticalAlert: a }),
  closeCriticalAlert: () => set({ criticalAlert: null }),

  copilotOpen: false,
  setCopilotOpen: (open) => set({ copilotOpen: open }),
  messages: [],
  askCopilot: (q, assistantId) => {
    const userMsg: ChatMessage = { id: `m${Date.now()}`, role: "user", text: q }
    const pendingId = assistantId ?? `a${Date.now()}`
    set((st) => ({
      messages: [...st.messages, userMsg, { id: pendingId, role: "assistant", text: "", streaming: true }],
    }))
  },
  finishStreaming: (id) =>
    set((st) => ({
      messages: st.messages.map((m) => (m.id === id ? { ...m, streaming: false } : m)),
    })),
}))

// dev/demo hook: allows console + demo scripting to drive the app state
if (typeof window !== "undefined") {
  ;(window as unknown as Record<string, unknown>).__nwis = useAppStore
}

function makeAlert(
  rule: AlertRule,
  category: string,
  depth: number,
  formation: string,
): Alert {
  // historical sources per zone
  const sources: Record<string, { wells: string[]; refs: string[]; rec: string; title: string; detail: string }> = {
    "surma-seepage": {
      wells: ["kathaloni-4", "moron-1"],
      refs: ["DDR 14/08/2026 · KTL-4", "DDR 28/11/2010 · MRN-1"],
      rec: "Pre-load 10 ppb fine CaCO₃, cap ROP 15 m/hr, monitor pit drills hourly.",
      title: "Seepage-loss zone ahead (upper Surma sands)",
      detail:
        "KTL-4 — the closest modern analogue with the same mud program — saw 8–12 bbl/hr seepage at 2,380 m. MRN-1 also reported losses in this interval.",
    },
    "surma-packoff": {
      wells: ["kathaloni-3", "dikom-5"],
      refs: ["DDR 02/06/2017 · KTL-3", "DDR 03/04/2018 · DK-5"],
      rec: "Maintain KCl ≥4% + 2–3% glycol; ream connections slowly; viscous sweeps before tripping.",
      title: "Swelling-clay pack-off risk (Surma transition)",
      detail:
        "KTL-3 packed off at 2,620 m on swelling clays (pumps 900→2,200 psi). DK-5 saw torque spikes across the same transition.",
    },
    "surma-diff-stick": {
      wells: ["dikom-2", "moron-1"],
      refs: ["DDR 11/05/2012 · DK-2", "DDR 28/11/2010 · MRN-1"],
      rec: "Keep connection time <90 s; maintain 8–10% CaCO₃ bridging; consider MW reduction if pore pressure allows.",
      title: "Differential-sticking risk (clean permeable sands)",
      detail:
        "DK-2 stuck off-bottom within 4 minutes at 2,260 m with 620 psi overbalance; MRN-1 stuck while reaming at 2,210 m.",
    },
    "barail-opp-ramp": {
      wells: ["dikom-1", "kathaloni-1", "borhat-1"],
      refs: ["Mud-Log ML-1012 · DK-1", "Mud-Log ML-2207 · KTL-1", "WCR BHT-1 (2019) §8.3"],
      rec: "Plan stepped MW schedule (0.4 ppg increments); verify with connection-gas trend; pre-stage barite.",
      title: "Overpressure ramp begins ~120 m ahead (Barail)",
      detail:
        "Three offsets show pore-pressure ramp on Barail entry: DK-1 from 2,960 m, KTL-1 required 11.4→13.2 ppg in 60 m, BHT-1 hit 15% connection gas.",
    },
    "barail-kick": {
      wells: ["dikom-2", "dikom-4", "kathaloni-3", "borhat-2"],
      refs: ["DDR 02/06/2012 · DK-2", "WCR DK-4 (2016) §6.2", "DDR 19/07/2017 · KTL-3", "DDR 04/03/2022 · BHT-2"],
      rec: "Flow-check every connection; keep kill sheet current; treat prognosed reservoir pressure as minimum.",
      title: "Kick risk — thin HP sands (4 offsets affected)",
      detail:
        "DK-2 kicked from a 2 m sand at 3,085 m (SICP 480 psi); DK-4 took 22 bbl influx at 3,245 m with simultaneous losses; KTL-3 swabbed in on trip; BHT-2 cored into +0.7 ppg over-prognosis pressure.",
    },
    "barail-losses": {
      wells: ["dikom-3", "dikom-1", "kathaloni-2"],
      refs: ["WCR DK-3 (2006) §4.7", "DDR 14/02/2010 · DK-1", "DDR 27/08/2011 · KTL-2"],
      rec: "Break circulation at half pump-rate; 40 bbl LCM pill on stand-by (med+coarse CaCO₃ + walnut shells); do not squeeze until pill fails twice.",
      title: "Mud-loss risk — fractured Barail (sidetrack precedent)",
      detail:
        "DK-3 had total losses at 3,010 m ending in a 9.4-day sidetrack. DK-1 seepage (25–40 bbl/hr) arrested with LCM; KTL-2 managed coring losses with fiber LCM.",
    },
    "barail-coal": {
      wells: ["kathaloni-1"],
      refs: ["WCR KTL-1 (2014) §7.4"],
      rec: "Cap ROP at 10 m/hr through coal; viscous sweep before and after; never drill ahead with pumps pressured >10 min.",
      title: "Coal-seam pack-off risk — field's costliest NPT zone",
      detail:
        "KTL-1 packed off drilling coal at 28 m/hr; fishing + backoff cost 11.8 days. Coal streaks precede most Barail loss events.",
    },
    "barail-cement": {
      wells: ["dikom-4", "moron-1"],
      refs: ["Cement Report CT-2016-04 · DK-4", "CBL Report CBL-2011-02 · MRN-1"],
      rec: "Use foam lead + rigid LCM spacer for the 7\" job; 3-stage if losses >10 bbl/hr anticipated.",
      title: "Cement-fallback risk at 7\" shoe",
      detail:
        "DK-4 lost ~35% of slurry to the weak shoe zone; TOC fell 180 m short. MRN-1 showed micro-annulus on CBL across the same interval.",
    },
  }

  const s = sources[rule.key] ?? {
    wells: [],
    refs: [],
    rec: "Review offset well reports before proceeding.",
    title: "Historical incident zone ahead",
    detail: "Multiple offset wells reported issues in this depth window.",
  }

  const critical = category === "kick" || (rule.key === "barail-losses" && depth > 2990)
  return {
    id: `al-${++alertId}`,
    level: critical ? "critical" : "warning",
    title: s.title,
    detail: s.detail,
    formationId: formation,
    depthFromM: rule.depthFromM,
    depthToM: rule.depthToM,
    sourceWellIds: s.wells,
    recommendation: s.rec,
    sourceRefs: s.refs,
    createdAt: Date.now(),
    acknowledged: false,
  }
}
