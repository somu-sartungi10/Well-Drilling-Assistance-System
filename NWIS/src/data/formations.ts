import type { Formation } from "./types"

// Upper Assam stratigraphic column (shallow → deep), as encountered in the
// Dikom / Kathaloni / Moran area wells. Per-well top depths live in wells.ts.
export const FORMATIONS: Formation[] = [
  {
    id: "girujan",
    name: "Girujan Claystone",
    lithology: "Claystone / siltstone",
    color: "#8a7350",
    typicalHazards: ["hole_packoff", "torque_spike", "mud_loss"],
    mudRecommendation: "KCl-PHPA polymer, 9.2–9.8 ppg",
    notes:
      "Tective claystones swell and pack off; torque spikes and tight hole on trips are common. Keep ROP moderate and circulate bottoms-up.",
  },
  {
    id: "tipam",
    name: "Tipam Sandstone",
    lithology: "Unconsolidated sand / sandstone",
    color: "#c2a878",
    typicalHazards: ["mud_loss", "cementing_issue"],
    mudRecommendation: "KCl-PHPA with LCM pretreatment, 9.5–10.0 ppg",
    notes:
      "Highly permeable sands — differential sticking and seepage losses. Monitor flowline and maintain LCM concentration.",
  },
  {
    id: "surma",
    name: "Surma Group",
    lithology: "Interbedded sand / shale",
    color: "#6b7f8a",
    typicalHazards: ["stuck_pipe", "overpressure"],
    mudRecommendation: "Sized-salt / KCl, 10.0–11.5 ppg",
    notes:
      "Transition zone at base; pore pressure ramps quickly. Watch D-exponent and shale cuttings cavings.",
  },
  {
    id: "barail",
    name: "Barail Group",
    lithology: "Hard shale / coal / tight sand",
    color: "#4a5568",
    typicalHazards: ["overpressure", "kick", "mud_loss", "stuck_pipe"],
    mudRecommendation: "Oil-based / HPHT mud, 11.5–13.5 ppg",
    notes:
      "Main reservoir + overpressure province. Kicks from thin high-pressured sands and severe losses in fractured sections have both occurred.",
  },
]

export const FORMATION_BY_ID = Object.fromEntries(FORMATIONS.map((f) => [f.id, f]))

export const EVENT_META: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  mud_loss: { label: "Mud Losses", color: "#f59e0b", icon: "droplets" },
  kick: { label: "Kick", color: "#ef4444", icon: "alert-triangle" },
  stuck_pipe: { label: "Stuck Pipe", color: "#a855f7", icon: "anchor" },
  fishing: { label: "Fishing", color: "#06b6d4", icon: "fish" },
  torque_spike: { label: "Torque Spike", color: "#eab308", icon: "activity" },
  cementing_issue: { label: "Cementing Issue", color: "#94a3b8", icon: "layers" },
  overpressure: { label: "Overpressure", color: "#f97316", icon: "gauge" },
  hole_packoff: { label: "Hole Pack-off", color: "#22c55e", icon: "package-x" },
  sidetrack: { label: "Sidetrack", color: "#3b82f6", icon: "git-branch" },
}
