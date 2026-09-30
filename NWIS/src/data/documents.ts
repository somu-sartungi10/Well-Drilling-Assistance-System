import type { WellDocument } from "./types"

// ─── Mock document corpus (WCR / DDR / mud logs / cement reports) ─────────────
// Simulates the output of the AI ingestion pipeline: "scanned" excerpt on the
// left, AI-extracted structured fields with confidence scores on the right.

export const DOCUMENTS: WellDocument[] = [
  {
    id: "doc-001",
    wellId: "dikom-3",
    kind: "WCR",
    ref: "WCR DK-3 (2006)",
    date: "2006-12-14",
    pages: 148,
    excerpt:
      "OIL INDIA LIMITED — WELL COMPLETION REPORT\nWell: DK-3 · Field: Dikom · Spudded 30-06-2006\n...\n§4.7 Drilling Problems: On breaking circulation at 3,010 m in Barail,\ntotal losses were encountered. Approximately 850 bbl mud lost before\nreturns re-established... hole bridged at 3,040 m... sidetrack initiated\nfrom 2,980 m via whipstock...\n§4.8 Casing: 20\" @ 50 m · 13-3/8\" @ 600 m · 9-5/8\" @ 2,095 m\n§5.1 Sidetrack: window milled, sidetrack drilled with reduced ECD...",
    extracted: [
      { label: "Well Name", value: "DK-3", confidence: 0.99 },
      { label: "Field", value: "Dikom", confidence: 0.98 },
      { label: "Spud Date", value: "2006-06-30", confidence: 0.97 },
      { label: "TD", value: "3,120 m", confidence: 0.99 },
      { label: "Barail Top", value: "2,860 m", confidence: 0.94 },
      { label: "Loss Zone", value: "3,010–3,040 m (severe)", confidence: 0.91 },
      { label: "Sidetrack Depth", value: "2,980 m", confidence: 0.96 },
      { label: "NPT (days)", value: "10.1", confidence: 0.88 },
    ],
    pipelineStatus: "extracted",
  },
  {
    id: "doc-002",
    wellId: "kathaloni-1",
    kind: "WCR",
    ref: "WCR KTL-1 (2014)",
    date: "2014-05-19",
    pages: 203,
    excerpt:
      "OIL INDIA LIMITED — WELL COMPLETION REPORT\nWell: KTL-1 · Field: Kathaloni · Spudded 03-10-2013\n...\n§7.4 Stuck Pipe: While drilling through coal at 3,195 m (ROP 28 m/hr),\nstring packed off... jarring unsuccessful... backoff at 2,940 m...\nwashover assembly recovered BHA in 3 days... NPT 11.8 days\n§6.1 Mud: Oil-based (invert) 11.4–13.4 ppg through Barail...",
    extracted: [
      { label: "Well Name", value: "KTL-1", confidence: 0.99 },
      { label: "TD", value: "3,714 m", confidence: 0.99 },
      { label: "Barail Top", value: "3,140 m", confidence: 0.95 },
      { label: "Stuck Point", value: "3,195 m (pack-off, coal)", confidence: 0.92 },
      { label: "Max MW", value: "13.4 ppg", confidence: 0.93 },
      { label: "NPT (days)", value: "13.9", confidence: 0.9 },
      { label: "Fishing Ops", value: "Washover + backoff @ 2,940 m", confidence: 0.87 },
    ],
    pipelineStatus: "extracted",
  },
  {
    id: "doc-003",
    wellId: "kathaloni-4",
    kind: "DDR",
    ref: "DDR 14/08/2026 · KTL-4",
    date: "2026-08-14",
    pages: 12,
    excerpt:
      "DAILY DRILLING REPORT — 14/08/2026\nWell: KTL-4 · Rig #21 · Depth 06:00: 2,375 m\n06:30 ROP break-through into clean sand; flowline losses noted.\n09:00 Loss rate 8–12 bbl/hr. Added 10 ppb fine CaCO₃ continuously...\n17:00 Losses stabilized. ROP capped 15 m/hr per Drilling Supervisor.\nMud: KCl-PHPA 10.6 ppg · PV 18 · YP 14 · pH 9.5",
    extracted: [
      { label: "Report Date", value: "2026-08-14", confidence: 0.99 },
      { label: "Depth 06:00", value: "2,375 m", confidence: 0.98 },
      { label: "Event", value: "Mud losses 8–12 bbl/hr @ 2,380 m", confidence: 0.93 },
      { label: "Formation", value: "Surma (upper sand)", confidence: 0.9 },
      { label: "Treatment", value: "10 ppb fine CaCO₃", confidence: 0.94 },
      { label: "NPT (days)", value: "0.1", confidence: 0.96 },
    ],
    pipelineStatus: "extracted",
  },
  {
    id: "doc-004",
    wellId: "dikom-2",
    kind: "DDR",
    ref: "DDR 02/06/2012 · DK-2",
    date: "2012-06-02",
    pages: 11,
    excerpt:
      "DAILY DRILLING REPORT — 02/06/2012\nWell: DK-2 · Rig #9 · Depth 06:00: 3,080 m\n02:40 While making connection flow observed, pumps off. SICP 480 psi.\n03:10 Well shut-in. Kill sheet prepared. Pit gain 11 bbl.\n08:00 Driller's method — gas out over 3 circulations. MW to 12.1 ppg.\nFormation: Barail, thin sand ~2 m at 3,083 m (not on prognosis).",
    extracted: [
      { label: "Report Date", value: "2012-06-02", confidence: 0.99 },
      { label: "Kick Depth", value: "3,085 m", confidence: 0.97 },
      { label: "SICP", value: "480 psi", confidence: 0.98 },
      { label: "Pit Gain", value: "11 bbl", confidence: 0.95 },
      { label: "Kill Method", value: "Driller's method, 3 circulations", confidence: 0.89 },
      { label: "New MW", value: "12.1 ppg", confidence: 0.97 },
    ],
    pipelineStatus: "extracted",
  },
  {
    id: "doc-005",
    wellId: "dikom-4",
    kind: "CEMENT-REPORT",
    ref: "Cement Report CT-2016-04 · DK-4",
    date: "2016-01-18",
    pages: 9,
    excerpt:
      "CEMENTING REPORT — 7\" CASING\nWell: DK-4 · Set depth 3,065 m\nSlurry: 15.8 ppg lead / 16.4 ppg tail. Volume planned 214 bbl.\nTOC after job: 2,885 m (fallback ~180 m). Losses to weak zone @ shoe\n~35% of slurry. Remedial squeeze via drillable retainer scheduled.",
    extracted: [
      { label: "Casing", value: "7\" @ 3,065 m", confidence: 0.98 },
      { label: "TOC Achieved", value: "2,885 m", confidence: 0.91 },
      { label: "Fallback", value: "~180 m", confidence: 0.9 },
      { label: "Loss to Weak Zone", value: "~35% of slurry", confidence: 0.86 },
      { label: "Remedial Action", value: "Squeeze via drillable retainer", confidence: 0.92 },
    ],
    pipelineStatus: "extracted",
  },
  {
    id: "doc-006",
    wellId: "dikom-5",
    kind: "MUD-LOG",
    ref: "Mud-Log ML-1832 · DK-5",
    date: "2018-05-12",
    pages: 56,
    excerpt:
      "MUD LOG — INTERVAL 2,600–2,750 m\nWell: DK-5 · Torque 14→31 kft·lb fluctuations recorded 2,650–2,710 m.\nCuttings: swelling shale balls, claystone enriched. Recommendation:\nadd glycol 3% + drilling lubricant; increase RPM.\nGas: background 1–3%, no peaks of significance.",
    extracted: [
      { label: "Interval", value: "2,600–2,750 m", confidence: 0.98 },
      { label: "Torque Anomaly", value: "14→31 kft·lb @ 2,650–2,710 m", confidence: 0.93 },
      { label: "Cuttings Note", value: "Swelling shale balls (claystone)", confidence: 0.88 },
      { label: "Recommendation", value: "Glycol 3% + lubricant; RPM 120→160", confidence: 0.9 },
    ],
    pipelineStatus: "review",
  },
  {
    id: "doc-007",
    wellId: "borhat-1",
    kind: "WCR",
    ref: "WCR BHT-1 (2019)",
    date: "2019-12-11",
    pages: 187,
    excerpt:
      "OIL INDIA LIMITED — WELL COMPLETION REPORT\nWell: BHT-1 · Field: Borhat · Spudded 06-05-2019\n...\n§8.3 Well Control: From 3,230 m connection gas reached 15% at\n13.6 ppg. HPHT well-control procedures invoked from 3,300 m...\n§8.5 Losses: 35 bbl/hr @ 3,560 m in fractured siltstone; graphite +\nresilient granule LCM reduced losses to 6 bbl/hr under MPD.",
    extracted: [
      { label: "Well Name", value: "BHT-1", confidence: 0.99 },
      { label: "TD", value: "3,890 m", confidence: 0.99 },
      { label: "Barail Top", value: "3,215 m", confidence: 0.93 },
      { label: "Overpressure Start", value: "3,230 m", confidence: 0.92 },
      { label: "Max MW", value: "13.8 ppg", confidence: 0.97 },
      { label: "Loss Zone", value: "3,560 m (35 bbl/hr)", confidence: 0.89 },
      { label: "MPD Used", value: "Yes — choke-managed ECD", confidence: 0.85 },
    ],
    pipelineStatus: "extracted",
  },
  {
    id: "doc-008",
    wellId: "dikom-1",
    kind: "DDR",
    ref: "DDR 14/02/2010 · DK-1",
    date: "2010-02-14",
    pages: 10,
    excerpt:
      "DAILY DRILLING REPORT — 14/02/2010\nWell: DK-1 · Rig #14 · Depth 06:00: 3,118 m\n10:20 Returns 70% — est. losses 25–40 bbl/hr. Coal streaks in cuttings.\n14:00 40 bbl LCM pill (med+coarse CaCO₃, walnut shells). Circulated.\n22:00 Losses arrested. Continued with 12% LCM in system.",
    extracted: [
      { label: "Report Date", value: "2010-02-14", confidence: 0.99 },
      { label: "Loss Onset", value: "3,120 m", confidence: 0.96 },
      { label: "Loss Rate", value: "25–40 bbl/hr", confidence: 0.94 },
      { label: "Treatment", value: "40 bbl LCM pill + 12% maintenance", confidence: 0.92 },
      { label: "Formation", value: "Barail (coal streaks)", confidence: 0.9 },
    ],
    pipelineStatus: "indexed",
  },
]

export const DOCUMENTS_BY_WELL: Record<string, WellDocument[]> = DOCUMENTS.reduce(
  (acc, doc) => {
    ;(acc[doc.wellId] ||= []).push(doc)
    return acc
  },
  {} as Record<string, WellDocument[]>,
)
