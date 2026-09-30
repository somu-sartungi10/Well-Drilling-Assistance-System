import { ACTIVE_WELL, WELLS } from "@/data/wells"
import type { Well } from "@/data/types"

/** Great-circle distance in km between two lat/lon points. */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/** Distance from the active well, in km. */
export function distanceFromActive(well: Well): number {
  return haversineKm(ACTIVE_WELL.lat, ACTIVE_WELL.lon, well.lat, well.lon)
}

/** Offset wells (excluding the active well) within the given radius. */
export function nearbyWells(radiusKm: number): (Well & { distanceKm: number })[] {
  return WELLS.filter((well) => well.id !== ACTIVE_WELL.id)
    .map((well) => ({ ...well, distanceKm: distanceFromActive(well) }))
    .filter((well) => well.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
}

/** Find the formation the given depth sits in for a well. */
export function formationAtDepth(well: Well, depthM: number): string | null {
  let current: string | null = null
  for (const top of [...well.formationTops].sort((a, b) => a.depthM - b.depthM)) {
    if (depthM >= top.depthM) current = top.formationId
  }
  return current
}
