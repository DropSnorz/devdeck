/** Approximate day/night geometry for the map's night shading and each
 * marker's day/night dot color. Deliberately simplified (a single-cosine
 * declination formula, equation of time ignored entirely) — accurate to
 * within roughly a degree, which is plenty for a decorative map and not
 * meant for anything precision-sensitive. */

const DEG = Math.PI / 180

export interface LonLat {
  lon: number
  lat: number
}

function dayOfYearUtc(date: Date): number {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 1)
  const startOfDay = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  return Math.floor((startOfDay - startOfYear) / 86400000) + 1
}

function normalizeLongitude(lon: number): number {
  return ((((lon + 180) % 360) + 360) % 360) - 180
}

/** Latitude the sun sits directly overhead at, in degrees. Ranges +-23.44
 * (the Earth's axial tilt) across the year, positive at the June solstice. */
export function solarDeclinationDeg(date: Date): number {
  const fractionalDay = dayOfYearUtc(date) + date.getUTCHours() / 24
  return -23.44 * Math.cos(((2 * Math.PI) / 365.25) * (fractionalDay + 10))
}

/** Longitude the sun sits directly overhead at, in degrees. Ignores the
 * equation of time, so it can be off by up to ~4 degrees at certain times
 * of year. */
export function subsolarLongitudeDeg(date: Date): number {
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600
  return normalizeLongitude((12 - utcHours) * 15)
}

/** True when the given point is currently on the night side of the earth,
 * via the sign of the solar zenith angle's cosine. */
export function isNight(lat: number, lon: number, date: Date): boolean {
  const declRad = solarDeclinationDeg(date) * DEG
  const latRad = lat * DEG
  const hourAngleRad = (lon - subsolarLongitudeDeg(date)) * DEG
  const cosZenith = Math.sin(latRad) * Math.sin(declRad) + Math.cos(latRad) * Math.cos(declRad) * Math.cos(hourAngleRad)
  return cosZenith < 0
}

function terminatorLatitudeDeg(lon: number, subsolarLon: number, declDeg: number): number {
  const hourAngleRad = (lon - subsolarLon) * DEG
  const declRad = declDeg * DEG
  // Guards the division for the (rare) case a caller hits declination
  // exactly 0 (an equinox instant) head-on, which would otherwise divide
  // by an exact zero tangent.
  const tanDecl = Math.tan(declRad) || 1e-12
  const lat = Math.atan(-Math.cos(hourAngleRad) / tanDecl) / DEG
  return Math.max(-90, Math.min(90, lat))
}

/** Lon/lat polygon covering the earth's current night side, for shading on
 * an equirectangular map: traces the terminator curve across every
 * longitude, then closes the shape across whichever pole is presently
 * dark. */
export function computeNightPolygon(date: Date, steps = 72): LonLat[] {
  const decl = solarDeclinationDeg(date)
  const subsolarLon = subsolarLongitudeDeg(date)
  const curve: LonLat[] = []
  for (let i = 0; i <= steps; i++) {
    const lon = -180 + (360 * i) / steps
    curve.push({ lon, lat: terminatorLatitudeDeg(lon, subsolarLon, decl) })
  }
  // At lat=90 (north pole), cosZenith reduces to sin(decl) — negative
  // (night) exactly when decl < 0 — so that's the pole the closing edge
  // needs to run along.
  const nightPoleLat = decl < 0 ? 90 : -90
  return [...curve, { lon: 180, lat: nightPoleLat }, { lon: -180, lat: nightPoleLat }]
}
