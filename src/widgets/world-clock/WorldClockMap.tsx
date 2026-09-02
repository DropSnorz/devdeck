import type { City } from './cities'
import { computeNightPolygon, isNight } from './solarTerminator'
import { MAP_HEIGHT, MAP_WIDTH, WORLD_LAND_PATH, project, toClosedPath, toOpenPath } from './worldMapPaths'

interface WorldClockMapProps {
  date: Date
  cities: City[]
  /** City id to draw with the "home" marker style, if any of `cities`
   * matches one. */
  homeCityId?: string | null
}

/** Minimal equirectangular world map: real (simplified) coastlines, a
 * night-side shading that tracks the real solar terminator for `date`, and
 * one marker per selected city colored by whether it's currently day or
 * night there. */
export function WorldClockMap({ date, cities, homeCityId }: WorldClockMapProps) {
  const nightPath = toClosedPath(computeNightPolygon(date))
  const terminatorPath = toOpenPath(computeNightPolygon(date).slice(0, -2))

  return (
    <svg
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      className="h-full w-full"
      role="img"
      aria-label="World map showing the current day/night split and the selected cities"
    >
      <rect x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} className="fill-background" />

      <path
        d={WORLD_LAND_PATH}
        fillRule="evenodd"
        className="fill-muted stroke-border"
        strokeWidth={0.3}
        strokeLinejoin="round"
      />

      <path d={nightPath} className="fill-foreground/15" />
      <path d={terminatorPath} className="fill-none stroke-foreground/25" strokeWidth={0.5} />

      {cities.map((city) => {
        const { x, y } = project({ lon: city.lon, lat: city.lat })
        const night = isNight(city.lat, city.lon, date)
        const isHome = city.id === homeCityId
        return (
          <g key={city.id}>
            {isHome && (
              <circle cx={x} cy={y} r={4} className="fill-none stroke-primary" strokeWidth={0.8} opacity={0.6} />
            )}
            <circle
              cx={x}
              cy={y}
              r={isHome ? 2.2 : 1.8}
              className={night ? 'fill-muted-foreground stroke-background' : 'fill-primary stroke-background'}
              strokeWidth={0.6}
            />
          </g>
        )
      })}
    </svg>
  )
}
