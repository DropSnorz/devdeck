import type { LonLat } from './solarTerminator'

/** Equirectangular projection: one SVG unit per degree, so the map's
 * viewBox is simply 360x180 and every path below can be authored directly
 * in longitude/latitude. */
export const MAP_WIDTH = 360
export const MAP_HEIGHT = 180

export function project({ lon, lat }: LonLat): { x: number; y: number } {
  return { x: lon + 180, y: 90 - lat }
}

/** Builds a closed `<path>` "d" string from a lon/lat outline. */
export function toClosedPath(points: LonLat[]): string {
  if (points.length === 0) return ''
  const [first, ...rest] = points.map(project)
  const segments = rest.map((p) => `L${p.x},${p.y}`).join(' ')
  return `M${first.x},${first.y} ${segments} Z`
}

/** Open curve (no closing `Z`) — used for the terminator line traced on
 * top of the night-shading fill. */
export function toOpenPath(points: LonLat[]): string {
  if (points.length === 0) return ''
  const [first, ...rest] = points.map(project)
  const segments = rest.map((p) => `L${p.x},${p.y}`).join(' ')
  return `M${first.x},${first.y} ${segments}`
}

const lonlat = (lon: number, lat: number): LonLat => ({ lon, lat })

/** Low-poly continent silhouettes, hand-plotted in (lon, lat) degrees.
 * Decorative background for the widget's map, not a navigational chart —
 * shapes are simplified and coastlines approximate. */
export const CONTINENTS: LonLat[][] = [
  // North America (incl. Central America)
  [
    lonlat(-165, 68),
    lonlat(-155, 71),
    lonlat(-125, 73),
    lonlat(-95, 75),
    lonlat(-80, 73),
    lonlat(-70, 63),
    lonlat(-60, 60),
    lonlat(-55, 51),
    lonlat(-64, 45),
    lonlat(-74, 40),
    lonlat(-75, 35),
    lonlat(-80, 26),
    lonlat(-81, 25),
    lonlat(-97, 26),
    lonlat(-97, 21),
    lonlat(-91, 16),
    lonlat(-84, 10),
    lonlat(-92, 15),
    lonlat(-105, 21),
    lonlat(-110, 24),
    lonlat(-115, 28),
    lonlat(-114, 32),
    lonlat(-124, 40),
    lonlat(-124, 46),
    lonlat(-125, 49),
    lonlat(-130, 55),
    lonlat(-135, 58),
    lonlat(-141, 60),
    lonlat(-166, 59),
    lonlat(-165, 65),
  ],
  // South America
  [
    lonlat(-77, 8),
    lonlat(-71, 11),
    lonlat(-61, 10),
    lonlat(-51, 1),
    lonlat(-44, -3),
    lonlat(-35, -8),
    lonlat(-38, -16),
    lonlat(-40, -20),
    lonlat(-48, -25),
    lonlat(-57, -34),
    lonlat(-58, -38),
    lonlat(-62, -42),
    lonlat(-68, -53),
    lonlat(-70, -54),
    lonlat(-73, -46),
    lonlat(-72, -40),
    lonlat(-71, -33),
    lonlat(-71, -25),
    lonlat(-70, -18),
    lonlat(-71, -10),
    lonlat(-81, -4),
    lonlat(-80, 2),
  ],
  // Africa
  [
    lonlat(-17, 15),
    lonlat(-16, 21),
    lonlat(-10, 30),
    lonlat(0, 37),
    lonlat(10, 37),
    lonlat(20, 33),
    lonlat(25, 32),
    lonlat(32, 31),
    lonlat(35, 28),
    lonlat(43, 12),
    lonlat(51, 12),
    lonlat(43, 3),
    lonlat(40, -5),
    lonlat(40, -15),
    lonlat(35, -22),
    lonlat(33, -28),
    lonlat(27, -33),
    lonlat(18, -34),
    lonlat(13, -27),
    lonlat(12, -18),
    lonlat(12, -6),
    lonlat(9, 5),
    lonlat(3, 6),
    lonlat(-8, 5),
    lonlat(-13, 8),
    lonlat(-17, 12),
  ],
  // Europe
  [
    lonlat(-9, 37),
    lonlat(-9, 43),
    lonlat(-5, 48),
    lonlat(-5, 50),
    lonlat(2, 51),
    lonlat(5, 53),
    lonlat(8, 54),
    lonlat(11, 55),
    lonlat(11, 58),
    lonlat(18, 60),
    lonlat(24, 65),
    lonlat(30, 70),
    lonlat(40, 68),
    lonlat(45, 60),
    lonlat(40, 47),
    lonlat(35, 46),
    lonlat(29, 45),
    lonlat(28, 41),
    lonlat(23, 40),
    lonlat(19, 40),
    lonlat(15, 38),
    lonlat(12, 44),
    lonlat(3, 43),
    lonlat(-2, 37),
  ],
  // Asia
  [
    lonlat(29, 45),
    lonlat(40, 47),
    lonlat(45, 60),
    lonlat(60, 68),
    lonlat(75, 72),
    lonlat(95, 75),
    lonlat(115, 73),
    lonlat(135, 71),
    lonlat(143, 60),
    lonlat(145, 50),
    lonlat(140, 46),
    lonlat(132, 43),
    lonlat(122, 40),
    lonlat(122, 30),
    lonlat(120, 24),
    lonlat(109, 18),
    lonlat(107, 10),
    lonlat(100, 6),
    lonlat(95, 5),
    lonlat(98, 15),
    lonlat(92, 22),
    lonlat(88, 22),
    lonlat(80, 16),
    lonlat(75, 9),
    lonlat(72, 21),
    lonlat(67, 24),
    lonlat(61, 25),
    lonlat(56, 27),
    lonlat(51, 30),
    lonlat(48, 30),
    lonlat(44, 33),
    lonlat(36, 37),
    lonlat(35, 37),
    lonlat(35, 41),
  ],
  // Australia
  [
    lonlat(113, -22),
    lonlat(122, -18),
    lonlat(130, -12),
    lonlat(137, -12),
    lonlat(142, -11),
    lonlat(145, -17),
    lonlat(153, -27),
    lonlat(150, -33),
    lonlat(150, -37),
    lonlat(146, -39),
    lonlat(140, -38),
    lonlat(137, -33),
    lonlat(132, -32),
    lonlat(125, -33),
    lonlat(115, -34),
    lonlat(114, -29),
    lonlat(113, -26),
  ],
  // Greenland
  [
    lonlat(-45, 60),
    lonlat(-35, 66),
    lonlat(-25, 71),
    lonlat(-25, 78),
    lonlat(-40, 82),
    lonlat(-55, 78),
    lonlat(-58, 70),
    lonlat(-53, 62),
  ],
  // New Zealand (kept tiny/simplified — mostly a landmark for the marker
  // it hosts, not a faithful outline)
  [lonlat(172, -41), lonlat(175, -40), lonlat(177, -38), lonlat(174, -42), lonlat(167, -45), lonlat(170, -43)],
]
