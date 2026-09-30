# NWIS — Nearby Wells Intelligence System (Prototype)

An AI-enabled decision-support prototype for Oil India Limited's drilling teams, built as a
standalone companion to eRTMAC. **100% client-side** — no backend, no API keys, no network
dependencies beyond map tiles. Every module works offline, making it demo-safe.

## What it does

| Module | Description |
|---|---|
| **Command Center** | Live drilling dashboard: depth/ROP/mud-weight KPIs, predictive risk outlook, live wellbore column, ROP/MW trend charts, proactive alert feed, and demo simulation controls (scrub, speed, hotspots) |
| **Nearby Wells Map** | Leaflet map with a radius slider (2–30 km) around the active well; markers color-coded by status, ringed when a well has critical history; side list sorted by distance with incident badges |
| **Well Intelligence** | Casing/cementing and mud programs, depth-ordered event timeline, formation-aligned cross-well correlation chart, and a document viewer with AI-extracted fields |
| **Knowledge Repository** | Search-as-you-type across all events and lessons (shared retrieval engine), filters by event type and formation, full detail dialogs with source citations |
| **Documents** | Mock WCR / DDR / mud-log / cement-report corpus showing the OCR+NLP story: "scanned" page beside structured fields with confidence scores |
| **NWIS Copilot** | RAG-style assistant: retrieval over the full corpus, cited natural-language answers, depth-aware ("what's ahead of us?"), follow-up chips, typewriter streaming — all offline |

## The "AI" story

- **Retrieval engine** (`src/lib/retrieval.ts`) — weighted token scoring with synonyms
  (losses→mud_loss, kick→influx…), depth-proximity boosting, and directional boosting
  ("ahead" → incidents below current bit depth).
- **Answer composer** (`src/lib/answerComposer.ts`) — intent detection (risk overview,
  formation, event type, well, depth, lessons) maps to answer templates with inline citations
  `[1] Well — DDR 14/02/2010`. Deterministic: it never fails during a demo.
- **Risk engine** (`src/lib/risk.ts`) — offsets history → per-category scores (losses, kicks,
  stuck pipe, overpressure, cementing, torque) blended from formation frequency, depth-window
  proximity, severity weights, and hazard priors.
- **Live alert simulation** (`src/store/useAppStore.ts`) — as the simulated bit advances, it
  fires warning/critical alerts when approaching historical incident zones, each with source
  documents and the matching mitigation from the knowledge base.

## Data

Synthetic but realistic: 13 offset wells + the active DK-6 in the Dikom / Kathaloni / Moran
area (Upper Assam), real field-area coordinates, Upper Assam stratigraphy (Girujan, Tipam,
Surma, Barail), 22 historical incidents with NPT/mitigation/citations, 12 lessons, and 8
documents. Swap `src/data/*` for real exports to go live.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build
npm run lint
```

Demo tip: use the Command Center's scrub buttons / hotspot chips (Surma 2,380 · Barail
3,020 · Kick 3,085 · Coal 3,195) to jump between alert zones, then ask the Copilot
"what's ahead of us?" to show depth-aware retrieval.

## Stack

React 19 · Vite · TypeScript · Tailwind v3 · shadcn/ui (Radix) · Zustand · Recharts ·
Leaflet (OSM tiles) · lucide-react
