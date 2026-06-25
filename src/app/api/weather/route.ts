/**
 * GET /api/weather?lat=XX.XX&lon=XX.XX
 * Marine weather for boaters — GPS coordinates only, no zip codes.
 *
 * Sources (all free, no API keys):
 *   Open-Meteo        — current conditions + 3-day forecast
 *   Open-Meteo Marine — wave height, direction, period
 *   NOAA CO-OPS       — tide predictions (nearest station, US waters)
 */

import { NextRequest, NextResponse } from 'next/server'

// ── Helpers ──────────────────────────────────────────────────────────────────

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function degToCompass(deg: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW']
  return dirs[Math.round(deg / 22.5) % 16]
}

function wmoToCondition(code: number): { desc: string; icon: string } {
  if (code === 0)                   return { desc: 'Clear',          icon: '☀️' }
  if (code === 1)                   return { desc: 'Mostly Clear',   icon: '🌤️' }
  if (code === 2)                   return { desc: 'Partly Cloudy',  icon: '⛅' }
  if (code === 3)                   return { desc: 'Overcast',       icon: '☁️' }
  if (code >= 45 && code <= 48)     return { desc: 'Foggy',          icon: '🌫️' }
  if (code >= 51 && code <= 55)     return { desc: 'Drizzle',        icon: '🌦️' }
  if (code >= 61 && code <= 65)     return { desc: 'Rain',           icon: '🌧️' }
  if (code >= 71 && code <= 75)     return { desc: 'Snow',           icon: '❄️' }
  if (code >= 80 && code <= 82)     return { desc: 'Showers',        icon: '🌦️' }
  if (code >= 95 && code <= 99)     return { desc: 'Thunderstorm',   icon: '⛈️' }
  return { desc: 'Mixed',           icon: '🌡️' }
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = parseFloat(searchParams.get('lat') || '0')
  const lon = parseFloat(searchParams.get('lon') || '0')

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon required' }, { status: 400 })
  }

  // Fetch all sources in parallel
  const [weatherResult, marineResult, stationsResult] = await Promise.allSettled([
    fetch(
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,weathercode,windspeed_10m,winddirection_10m,windgusts_10m,surface_pressure,visibility` +
      `&daily=temperature_2m_max,temperature_2m_min,weathercode,windspeed_10m_max,winddirection_10m_dominant,precipitation_probability_max` +
      `&forecast_days=4&temperature_unit=fahrenheit&windspeed_unit=kn&timezone=auto`,
      { next: { revalidate: 600 } }
    ),
    fetch(
      `https://marine-api.open-meteo.com/v1/marine` +
      `?latitude=${lat}&longitude=${lon}` +
      `&current=wave_height,wave_direction,wave_period`,
      { next: { revalidate: 600 } }
    ),
    fetch(
      `https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=tidepredictions`,
      { next: { revalidate: 86400 } }  // station list changes rarely
    ),
  ])

  // ── Weather ────────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: Record<string, any> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let forecast: any[] = []

  if (weatherResult.status === 'fulfilled' && weatherResult.value.ok) {
    const wd = await weatherResult.value.json()
    const c  = wd.current || {}
    const { desc, icon } = wmoToCondition(c.weathercode ?? 0)

    current = {
      temp_f:        Math.round(c.temperature_2m ?? 0),
      feels_like_f:  Math.round(c.apparent_temperature ?? 0),
      description:   desc,
      icon,
      wind_kts:      Math.round(c.windspeed_10m ?? 0),
      wind_dir_deg:  Math.round(c.winddirection_10m ?? 0),
      wind_dir:      degToCompass(c.winddirection_10m ?? 0),
      gusts_kts:     Math.round(c.windgusts_10m ?? 0),
      pressure_mb:   Math.round(c.surface_pressure ?? 0),
      visibility_mi: c.visibility ? Math.round(c.visibility / 1609) : null,
    }

    const daily = wd.daily || {}
    for (let i = 1; i <= 3; i++) {
      const { desc: fd, icon: fi } = wmoToCondition(daily.weathercode?.[i] ?? 0)
      forecast.push({
        date:      daily.time?.[i] ?? '',
        high_f:    Math.round(daily.temperature_2m_max?.[i] ?? 0),
        low_f:     Math.round(daily.temperature_2m_min?.[i] ?? 0),
        description: fd,
        icon:      fi,
        wind_kts:  Math.round(daily.windspeed_10m_max?.[i] ?? 0),
        wind_dir:  degToCompass(daily.winddirection_10m_dominant?.[i] ?? 0),
        precip_pct: daily.precipitation_probability_max?.[i] ?? 0,
      })
    }
  }

  // ── Marine / Waves ──────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let marine: Record<string, any> = {}

  if (marineResult.status === 'fulfilled' && marineResult.value.ok) {
    const md = await marineResult.value.json()
    const mc = md.current || {}
    if (mc.wave_height != null) {
      marine = {
        wave_height_ft: Math.round(mc.wave_height * 3.281 * 10) / 10,
        wave_dir:       mc.wave_direction != null ? degToCompass(mc.wave_direction) : null,
        wave_period_s:  mc.wave_period   != null ? Math.round(mc.wave_period)      : null,
      }
    }
  }

  // ── Tides ───────────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tides: Record<string, any> = { status: 'unavailable', predictions: [] }

  if (stationsResult.status === 'fulfilled' && stationsResult.value.ok) {
    const sd = await stationsResult.value.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stations: any[] = sd.stations || []

    let nearest = null
    let minDist  = Infinity
    for (const s of stations) {
      const d = haversine(lat, lon, parseFloat(s.lat), parseFloat(s.lng))
      if (d < minDist) { minDist = d; nearest = s }
    }

    if (nearest && minDist < 300) {
      tides.nearest_station = nearest.name
      tides.distance_mi     = Math.round(minDist)

      const today    = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '')

      try {
        const predRes = await fetch(
          `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter` +
          `?begin_date=${fmt(today)}&end_date=${fmt(tomorrow)}` +
          `&product=predictions&datum=MLLW&time_zone=lst_ldt` +
          `&interval=hilo&units=english&application=skipper_app&format=json` +
          `&station=${nearest.id}`
        )
        if (predRes.ok) {
          const pd = await predRes.json()
          if (pd.predictions?.length) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tides.predictions = pd.predictions.map((p: any) => ({
              time:      p.t,
              height_ft: parseFloat(p.v).toFixed(1),
              type:      p.type === 'H' ? 'High' : 'Low',
            }))

            const now  = new Date()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const next = tides.predictions.find((p: any) => new Date(p.time) > now)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const prev = tides.predictions.filter((p: any) => new Date(p.time) <= now).pop()

            tides.next      = next  || null
            tides.prev      = prev  || null
            tides.is_rising = next?.type === 'High'
            tides.status    = 'ok'
          }
        }
      } catch {
        // tides remain unavailable
      }
    }
  }

  return NextResponse.json({ current, forecast, marine, tides })
}
