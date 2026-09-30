import { useEffect, useMemo, useRef, useState } from "react"
import { Circle, MapContainer, Marker, Popup, TileLayer, Tooltip as LTooltip, useMap } from "react-leaflet"
import L from "leaflet"
import { ArrowDownUp, Layers, MapPin, Navigation, Ruler, Satellite } from "lucide-react"
import { cn } from "cn"
import { useAppStore } from "@/store/useAppStore"
import { ACTIVE_WELL } from "@/data/wells"
import { STATUS_META } from "@/data/wells"
import { nearbyWells } from "@/lib/geo"
import { eventsForWell } from "@/lib/risk"
import { ScreenHeader, fmt } from "@/components/shared/Ui"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import type { Well } from "@/data/types"

// ─── Relevance score: how much does this offset well matter for DK-6? ────────
// Deterministic 0–100 blend: incident severity & NPT, proximity, analog value.
export function relevanceScore(well: Well): { score: number; why: string } {
  const evs = eventsForWell(well.id)
  let sev = 0
  for (const e of evs) {
    sev += e.severity === "critical" ? 22 : e.severity === "severe" ? 14 : e.severity === "moderate" ? 8 : 3
  }
  sev = Math.min(40, sev)
  const npt = Math.min(20, evs.reduce((s, e) => s + e.nptDays, 0) * 1.6)
  const dist = distanceOf(well)
  const proximity = Math.max(0, 20 - dist * 1.6)
  const analog = (well.field === ACTIVE_WELL.field ? 10 : 0) + (well.formationTops.some((t) => t.formationId === "barail") ? 10 : 0)
  const score = Math.min(100, Math.round(15 + sev + npt + proximity + analog))
  const why = `${evs.length} incidents (+${sev}), ${npt.toFixed(1)} d NPT (+${npt.toFixed(0)}), ${dist.toFixed(1)} km (+${proximity.toFixed(0)}), analog value (+${analog})`
  return { score, why }
}
function distanceOf(well: Well): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(well.lat - ACTIVE_WELL.lat)
  const dLon = toRad(well.lon - ACTIVE_WELL.lon)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(ACTIVE_WELL.lat)) * Math.cos(toRad(well.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// ─── Basemaps: Esri ArcGIS Online tiles — real maps, no API key ─────────────
// CARTO's CDN started serving "API key required" placeholder PNGs to anonymous
// traffic (verified: identical tiles for London & New York), so the basemap is
// Esri World_Imagery / Dark Gray Canvas — keyless and genuinely location-aware.
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services"
const BASEMAPS = {
  satellite: {
    label: "Satellite",
    url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
    labels: `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`,
    attribution: "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics",
  },
  dark: {
    label: "Dark",
    url: `${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
    labels: `${ESRI}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`,
    attribution: "Tiles &copy; Esri — Esri, DeLorme, NAVTEQ",
  },
} as const
type BasemapKey = keyof typeof BASEMAPS

// custom divIcon markers colored by status with risk ring
function wellIcon(color: string, severe: boolean, selected: boolean) {
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:${selected ? 28 : 22}px;height:${selected ? 28 : 22}px">
      ${severe ? `<span style="position:absolute;inset:-6px;border-radius:9999px;border:2px solid ${color};opacity:.4"></span>` : ""}
      ${selected ? `<span style="position:absolute;inset:-5px;border-radius:9999px;border:2px solid #22d3ee;box-shadow:0 0 12px #22d3ee88"></span>` : ""}
      <span style="position:absolute;inset:0;border-radius:9999px;border:2px solid ${color};background:${color}33;box-shadow:0 0 8px ${color}66"></span>
      <span style="position:absolute;inset:6px;border-radius:9999px;background:${color}"></span>
    </div>`,
    iconSize: selected ? [28, 28] : [22, 22],
    iconAnchor: selected ? [14, 14] : [11, 11],
  })
}

const activeIcon = L.divIcon({
  className: "",
  html: `<div style="position:relative;width:26px;height:26px">
    <span style="position:absolute;inset:-8px;border-radius:9999px;border:2px dashed #22d3ee;opacity:.6;animation:spin 6s linear infinite"></span>
    <span style="position:absolute;inset:2px;border-radius:9999px;background:#22d3ee;box-shadow:0 0 14px #22d3ee"></span>
  </div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
})

/** Flies the map to the selected well and opens its popup (card → map sync). */
function MapController({ markersRef }: { markersRef: React.RefObject<Map<string, L.Marker>> }) {
  const map = useMap()
  const selectedWellId = useAppStore((s) => s.selectedWellId)
  useEffect(() => {
    if (!selectedWellId) return
    const marker = markersRef.current?.get(selectedWellId)
    if (!marker) return
    map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 12), { duration: 0.8 })
    window.setTimeout(() => marker.openPopup(), 850)
  }, [selectedWellId, map])
  return null
}

/** Recenter + invalidate size once after mount (fixes layout-shift blank tiles). */
function MapReady() {
  const map = useMap()
  useEffect(() => {
    const t = window.setTimeout(() => {
      map.invalidateSize()
      map.setView([ACTIVE_WELL.lat, ACTIVE_WELL.lon], 11)
    }, 150)
    return () => window.clearTimeout(t)
  }, [map])
  return null
}

export default function MapScreen() {
  const radiusKm = useAppStore((s) => s.radiusKm)
  const setRadiusKm = useAppStore((s) => s.setRadiusKm)
  const selectedWellId = useAppStore((s) => s.selectedWellId)
  const setSelectedWellId = useAppStore((s) => s.setSelectedWellId)
  const setScreen = useAppStore((s) => s.setScreen)
  const toggleComparison = useAppStore((s) => s.toggleComparisonWell)

  const [sortBy, setSortBy] = useState<"relevance" | "distance">("relevance")
  const [basemap, setBasemap] = useState<BasemapKey>("satellite")
  const markersRef = useRef<Map<string, L.Marker>>(new Map())

  const base = useMemo(() => nearbyWells(radiusKm), [radiusKm])
  const wells = useMemo(() => {
    const arr = [...base]
    if (sortBy === "relevance") {
      return arr.sort((a, b) => relevanceScore(b).score - relevanceScore(a).score)
    }
    return arr.sort((a, b) => a.distanceKm - b.distanceKm)
  }, [base, sortBy])

  const worstByWell = useMemo(() => {
    const m = new Map<string, number>()
    for (const w of base) {
      const evs = eventsForWell(w.id)
      const worst = evs.some((e) => e.severity === "critical") ? 2 : evs.length > 0 ? 1 : 0
      m.set(w.id, worst)
    }
    return m
  }, [base])

  const scrollCard = (id: string) =>
    document.getElementById(`well-card-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" })

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Nearby Wells Map"
        subtitle="Offset-well intelligence filtered by radius around the active well"
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {/* sort toggle */}
            <div className="flex overflow-hidden rounded-lg border border-border">
              {(["relevance", "distance"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-xs font-semibold capitalize transition-colors",
                    sortBy === s ? "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300" : "bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {s === "relevance" ? <ArrowDownUp className="size-3.5" /> : <Ruler className="size-3.5" />}
                  <span className="hidden sm:inline">{s}</span>
                </button>
              ))}
            </div>
            {/* radius */}
            <div className="flex w-44 items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 sm:w-56">
              <Ruler className="size-4 shrink-0 text-muted-foreground" />
              <Slider value={[radiusKm]} min={2} max={30} step={1} onValueChange={(v) => setRadiusKm(v[0])} className="flex-1" />
              <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-cyan-600 dark:text-cyan-300">{radiusKm} km</span>
            </div>
          </div>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Map */}
        <div className="relative h-[46vh] min-h-[320px] shrink-0 lg:h-auto lg:min-h-0 lg:flex-1">
          <MapContainer
            center={[ACTIVE_WELL.lat, ACTIVE_WELL.lon]}
            zoom={11}
            className="z-0 h-full w-full"
            scrollWheelZoom
          >
            <TileLayer key={basemap} attribution={BASEMAPS[basemap].attribution} url={BASEMAPS[basemap].url} />
            <TileLayer key={`${basemap}-labels`} url={BASEMAPS[basemap].labels} />
            <MapReady />
            <MapController markersRef={markersRef} />
            {/* radius circle */}
            <Circle
              center={[ACTIVE_WELL.lat, ACTIVE_WELL.lon]}
              radius={radiusKm * 1000}
              pathOptions={{ color: "#22d3ee", weight: 1.5, dashArray: "6 6", fillColor: "#22d3ee", fillOpacity: 0.04 }}
            />
            {/* active well */}
            <Marker position={[ACTIVE_WELL.lat, ACTIVE_WELL.lon]} icon={activeIcon}>
              <Popup>
                <b>{ACTIVE_WELL.name}</b> — drilling now
                <br />
                Rig {ACTIVE_WELL.rigName} · planned TD {fmt(ACTIVE_WELL.tdM)}
              </Popup>
              <LTooltip direction="top" offset={[0, -12]}>
                <b>{ACTIVE_WELL.name}</b> · LIVE
              </LTooltip>
            </Marker>
            {/* offset wells */}
            {wells.map((w) => {
              const meta = STATUS_META[w.status]
              const worst = worstByWell.get(w.id) ?? 0
              const rel = relevanceScore(w)
              return (
                <Marker
                  key={w.id}
                  position={[w.lat, w.lon]}
                  icon={wellIcon(meta.color, worst === 2, selectedWellId === w.id)}
                  eventHandlers={{
                    click: () => {
                      setSelectedWellId(w.id)
                      scrollCard(w.id)
                    },
                  }}
                  ref={(m) => {
                    if (m) markersRef.current.set(w.id, m)
                    else markersRef.current.delete(w.id)
                  }}
                >
                  <Popup>
                    <div style={{ minWidth: 190 }}>
                      <b>{w.name}</b> · {meta.label}
                      <br />
                      {w.field} field · {w.distanceKm.toFixed(1)} km away
                      <br />
                      TD {fmt(w.tdM)} · spud {w.spudDate}
                      <br />
                      <span style={{ color: "#0891b2", fontWeight: 700 }}>Relevance {rel.score}/100</span>
                      <span style={{ color: "#64748b" }}> — {rel.why}</span>
                      <br />
                      <button
                        onClick={() => {
                          setSelectedWellId(w.id)
                          toggleComparison(w.id)
                          setScreen("well")
                        }}
                        style={{
                          marginTop: 6,
                          padding: "4px 10px",
                          borderRadius: 6,
                          background: "#06b6d4",
                          color: "#04202c",
                          fontWeight: 600,
                          fontSize: 11,
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        View intelligence →
                      </button>
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>

          {/* map header strip: rig context + basemap switch */}
          <div className="pointer-events-none absolute left-3 top-3 z-[500] flex max-w-[calc(100%-90px)] items-start gap-2">
            <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-border bg-card/95 px-3 py-2 shadow-xl backdrop-blur">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
              </span>
              <div className="leading-tight">
                <div className="text-xs font-bold">{ACTIVE_WELL.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {ACTIVE_WELL.field} · Rig {ACTIVE_WELL.rigName}
                </div>
              </div>
            </div>
          </div>

          {/* basemap toggle */}
          <div className="absolute right-3 top-3 z-[500] flex overflow-hidden rounded-lg border border-border shadow-xl">
            {(
              [
                { k: "satellite", icon: Satellite },
                { k: "dark", icon: Layers },
              ] as const
            ).map(({ k, icon: Icon }) => (
              <button
                key={k}
                onClick={() => setBasemap(k)}
                title={`${BASEMAPS[k].label} basemap`}
                className={cn(
                  "flex items-center gap-1.5 bg-card/95 px-2.5 py-2 text-[10px] font-semibold backdrop-blur transition-colors",
                  basemap === k ? "text-cyan-600 dark:text-cyan-300" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                <span className="hidden md:inline">{BASEMAPS[k].label}</span>
              </button>
            ))}
          </div>

          {/* legend overlay — compact horizontal strip */}
          <div className="absolute bottom-3 left-3 right-3 z-[500] sm:right-auto">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-card/95 px-3 py-2 text-[10px] shadow-xl backdrop-blur">
              <span className="font-bold uppercase tracking-wider text-muted-foreground">Status</span>
              {Object.entries(STATUS_META).map(([k, v]) => (
                <span key={k} className="flex items-center gap-1 whitespace-nowrap">
                  <span className="size-2 rounded-full" style={{ background: v.color }} />
                  {v.label}
                </span>
              ))}
              <span className="hidden items-center gap-1 border-l border-border pl-3 text-muted-foreground md:flex">
                <Navigation className="size-3" /> ringed = critical history
              </span>
            </div>
          </div>
        </div>

        {/* Side list */}
        <aside className="min-h-0 w-full shrink-0 space-y-2 overflow-y-auto border-t border-border bg-card p-3 lg:w-96 lg:border-l lg:border-t-0">
          <div className="px-1 pb-1 text-xs font-semibold text-muted-foreground">
            {wells.length} wells within {radiusKm} km · sorted by {sortBy}
          </div>
          {wells.map((w) => {
            const meta = STATUS_META[w.status]
            const worst = worstByWell.get(w.id) ?? 0
            const evs = eventsForWell(w.id)
            const rel = relevanceScore(w)
            const selected = selectedWellId === w.id
            return (
              <button
                key={w.id}
                id={`well-card-${w.id}`}
                onClick={() => setSelectedWellId(w.id)}
                onDoubleClick={() => {
                  toggleComparison(w.id)
                  setScreen("well")
                }}
                className={cn(
                  "w-full rounded-lg border p-3 text-left transition-all",
                  selected
                    ? "border-cyan-500/60 bg-cyan-500/10 ring-1 ring-cyan-500/40"
                    : "border-border hover:border-cyan-500/30 hover:bg-secondary",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ background: meta.color }} />
                    <span className="text-sm font-semibold">{w.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="rounded bg-cyan-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums text-cyan-600 dark:text-cyan-300"
                      title={`Relevance: ${rel.why}`}
                    >
                      {rel.score}
                    </span>
                    <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                      {w.distanceKm.toFixed(1)} km
                    </span>
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <MapPin className="size-3" /> {w.field} · {meta.label} · TD {fmt(w.tdM)}
                </div>
                {evs.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {evs.slice(0, 3).map((ev) => (
                      <Badge
                        key={ev.id}
                        variant="secondary"
                        className="px-1.5 py-0 text-[9px]"
                        style={{ backgroundColor: `${severityBg(ev.severity)}`, color: severityFg(ev.severity) }}
                      >
                        {ev.type.replace("_", " ")}
                      </Badge>
                    ))}
                    {evs.length > 3 && <span className="text-[9px] text-muted-foreground">+{evs.length - 3}</span>}
                  </div>
                )}
                {worst === 2 && (
                  <div className="mt-1.5 text-[10px] font-semibold text-destructive">⚠ Critical history — review before drilling offset interval</div>
                )}
              </button>
            )
          })}
        </aside>
      </div>
    </div>
  )
}

function severityBg(s: string) {
  return s === "critical" ? "#ef44441f" : s === "severe" ? "#f973161f" : s === "moderate" ? "#eab3081f" : "#22c55e1f"
}
function severityFg(s: string) {
  return s === "critical" ? "#ef4444" : s === "severe" ? "#f97316" : s === "moderate" ? "#eab308" : "#22c55e"
}
