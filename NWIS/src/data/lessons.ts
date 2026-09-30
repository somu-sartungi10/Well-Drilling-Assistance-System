import type { Lesson } from "./types"

// ─── Lessons learned / knowledge repository ──────────────────────────────────

export const LESSONS: Lesson[] = [
  {
    id: "ls-001",
    eventId: "ev-005",
    wellId: "dikom-3",
    title: "Never break circulation fast below Barail top",
    formationId: "barail",
    lesson:
      "In DK-3, breaking circulation at 3,010 m initiated total losses that ended in a sidetrack (9.4 days). Coal streaks immediately above the loss zone were the precursor.",
    recommendation:
      "Break circulation at half pump-rate; have 60 bbl LCM pill on stand-by below 2,900 m; stop and flow-check on any coal cuttings increase.",
    sourceRef: "WCR DK-3 (2006) §4.7",
    tags: ["barail", "losses", "circulation", "LCM"],
  },
  {
    id: "ls-002",
    eventId: "ev-003",
    wellId: "dikom-2",
    title: "Thin Barail sands can be locally overpressured",
    formationId: "barail",
    lesson:
      "A 2 m sand at 3,083 m in DK-2 flowed at 11.2 ppg EMW — not predicted by field-wide trend. Offset DK-1 did not show this sand.",
    recommendation:
      "Flow-check every connection below Barail top; keep kill sheet current; do not rely solely on seismic-based pore pressure in thin sands.",
    sourceRef: "DDR 02/06/2012 · DK-2",
    tags: ["kick", "barail", "flow check", "connection"],
  },
  {
    id: "ls-003",
    eventId: "ev-004",
    wellId: "dikom-2",
    title: "Differential sticking risk in clean Surma sands",
    formationId: "surma",
    lesson:
      "620 psi overbalance against clean permeable sand stuck DK-2 within 4 minutes of a connection delay.",
    recommendation:
      "Keep connection time <90 s in Surma sands; maintain 8–10% CaCO₃ bridging; consider reducing MW when pore pressure allows.",
    sourceRef: "DDR 11/05/2012 · DK-2",
    tags: ["stuck pipe", "differential", "surma", "connection time"],
  },
  {
    id: "ls-004",
    eventId: "ev-010",
    wellId: "kathaloni-1",
    title: "Coal sections: cut ROP, manage cuttings load",
    formationId: "barail",
    lesson:
      "Drilling Barail coal at 28 m/hr packed off KTL-1 annulus; fishing + backoff cost 11.8 days — the field's costliest NPT event.",
    recommendation:
      "Cap ROP at 10 m/hr through coal; pump high-viscous sweep before and after; never drill ahead with pumps pressured for >10 min.",
    sourceRef: "WCR KTL-1 (2014) §7.4",
    tags: ["coal", "pack-off", "stuck", "ROP", "barail"],
  },
  {
    id: "ls-005",
    eventId: "ev-011",
    wellId: "kathaloni-1",
    title: "Barail pressure ramp needs stepped MW plan",
    formationId: "barail",
    lesson:
      "KTL-1 required three MW increments (11.4→13.2 ppg) across just 60 m; single-step increases triggered seepage losses each time.",
    recommendation:
      "Plan stepped MW schedule with 0.4 ppg increments; verify with connection gas trend; pre-stage barite on rig floor.",
    sourceRef: "Mud-Log ML-2207 · KTL-1",
    tags: ["overpressure", "barail", "MW schedule", "connection gas"],
  },
  {
    id: "ls-006",
    eventId: "ev-007",
    wellId: "dikom-4",
    title: "Simultaneous kick/losses — plan MPD capability",
    formationId: "barail",
    lesson:
      "DK-4 took influx while losing — kill mud went in, formation took it. Managed back-pressure was essential to hold balance.",
    recommendation:
      "Where Barail fractures + high pressure coexist, mobilize MPD choke or plan cement squeeze of loss zone before drilling reservoir.",
    sourceRef: "WCR DK-4 (2016) §6.2",
    tags: ["kick", "losses", "mpd", "barail", "back-pressure"],
  },
  {
    id: "ls-007",
    eventId: "ev-008",
    wellId: "dikom-4",
    title: "Foam lead + rigid LCM spacer fixes 7\" fallback",
    formationId: "barail",
    lesson:
      "DK-4 lost ~35% of cement slurry to a weak zone; fallback left 180 m uncemented.",
    recommendation:
      "Use foam lead + rigid LCM spacer for 7\" jobs in Barail; run 3-stage jobs where losses >10 bbl/hr are anticipated.",
    sourceRef: "Cement Report CT-2016-04 · DK-4",
    tags: ["cement", "fallback", "foam lead", "barail"],
  },
  {
    id: "ls-008",
    eventId: "ev-014",
    wellId: "kathaloni-3",
    title: "Girujan/Surma clays: KCl + glycol is the answer",
    formationId: "surma",
    lesson:
      "Swelling clays packed off KTL-3 at 2,620 m; mud treatment cured it, mechanical cleaning alone did not.",
    recommendation:
      "Maintain KCl ≥4% and glycol 2–3% through the transition; add encapsulator; ream connections rather than ream fast.",
    sourceRef: "DDR 02/06/2017 · KTL-3",
    tags: ["clay", "pack-off", "KCl", "glycol", "surma"],
  },
  {
    id: "ls-009",
    eventId: "ev-015",
    wellId: "kathaloni-4",
    title: "Modern analogue: KTL-4 upper-Surma seepage",
    formationId: "surma",
    lesson:
      "KTL-4 (2026, closest analogue to DK-6) saw 8–12 bbl/hr seepage at 2,380 m with a mud program identical to DK-6's plan.",
    recommendation:
      "Pre-load 10 ppb fine CaCO₃ before entering upper Surma sands; cap ROP 15 m/hr; monitor pit drills hourly.",
    sourceRef: "DDR 14/08/2026 · KTL-4 (eRTMAC synced)",
    tags: ["seepage", "surma", "recent", "analog", "CaCO3"],
  },
  {
    id: "ls-010",
    eventId: "ev-019",
    wellId: "borhat-1",
    title: "Deep Barail extension needs HPHT readiness",
    formationId: "barail",
    lesson:
      "BHT-1 hit 13.8 ppg requirement with 15% connection gas; normal practices were insufficient until HPHT protocols invoked.",
    recommendation:
      "For wells deeper than 3,200 m in Barail: HPHT well-control refresh before spud, double BOP drills, pre-stage heavy LCM.",
    sourceRef: "WCR BHT-1 (2019) §8.3",
    tags: ["hpht", "overpressure", "barail", "bop"],
  },
  {
    id: "ls-011",
    eventId: "ev-021",
    wellId: "borhat-2",
    title: "Reservoir pressure can exceed prognosis by 0.7 ppg",
    formationId: "barail",
    lesson:
      "BHT-2 cored into reservoir 0.7 ppg over-prognosis; influx taken while coring.",
    recommendation:
      "Treat prognosed reservoir pressure as minimum; flow-check every core barrel; update real-time pore pressure with mud-logging gas trends.",
    sourceRef: "DDR 04/03/2022 · BHT-2",
    tags: ["kick", "coring", "prognosis", "reservoir pressure"],
  },
  {
    id: "ls-012",
    eventId: "ev-001",
    wellId: "dikom-1",
    title: "LCM pill formulation that worked in Barail seepage",
    formationId: "barail",
    lesson:
      "Medium + coarse CaCO₃ with walnut shells arrested 25–40 bbl/hr seepage in 6 hrs in DK-1.",
    recommendation:
      "Standard field pill: 40 bbl — 20 ppb medium CaCO₃, 15 ppb coarse CaCO₃, 10 ppb nut shell; squeeze only if pill fails twice.",
    sourceRef: "DDR 14/02/2010 · DK-1",
    tags: ["LCM", "pill", "barail", "seepage"],
  },
]
