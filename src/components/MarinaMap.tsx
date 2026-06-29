'use client'
import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

type Marina = {
  id: string; name: string; city: string; state: string
  total_slips: number; transient_available?: boolean
  lat: number | null; lng: number | null
}

export default function MarinaMap({
  marinas,
  onSelect,
}: {
  marinas: Marina[]
  onSelect: (m: Marina) => void
}) {
  const mapRef    = useRef<maplibregl.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const mapped = marinas.filter(m => m.lat && m.lng)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center:  [-98.35, 39.5],
      zoom:    3.5,
      attributionControl: false,
    })

    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    mapRef.current = map

    map.on('load', () => {
      // Fit to markers
      if (mapped.length === 1) {
        map.setCenter([mapped[0].lng!, mapped[0].lat!])
        map.setZoom(11)
      } else if (mapped.length > 1) {
        const bounds = new maplibregl.LngLatBounds()
        mapped.forEach(m => bounds.extend([m.lng!, m.lat!]))
        map.fitBounds(bounds, { padding: 60, maxZoom: 12 })
      }

      // Add markers
      mapped.forEach(marina => {
        // Custom pin element
        const el = document.createElement('div')
        el.style.cssText = `
          width:36px; height:36px;
          background:linear-gradient(135deg,#4dd6c8,#38b2a8);
          border:2.5px solid #fff;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          box-shadow:0 2px 10px rgba(0,0,0,0.5);
          cursor:pointer;
        `

        const popup = new maplibregl.Popup({ offset: 20, closeButton: false, maxWidth: '220px' })
          .setHTML(`
            <div style="font-family:system-ui,sans-serif;padding:4px 0">
              <div style="font-weight:700;font-size:14px;margin-bottom:3px;color:#0d2b4b">${marina.name}</div>
              <div style="font-size:12px;color:#666;margin-bottom:8px">${marina.city}, ${marina.state} · ${marina.total_slips} slips</div>
              ${marina.transient_available ? '<div style="font-size:11px;color:#4dd6c8;font-weight:700;margin-bottom:8px">TRANSIENT AVAILABLE</div>' : ''}
              <button id="req-${marina.id}" style="width:100%;padding:8px 0;background:#4dd6c8;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;color:#071e38">
                Request a Slip
              </button>
            </div>
          `)

        new maplibregl.Marker({ element: el })
          .setLngLat([marina.lng!, marina.lat!])
          .setPopup(popup)
          .addTo(map)

        // Wire the popup button
        popup.on('open', () => {
          setTimeout(() => {
            const btn = document.getElementById(`req-${marina.id}`)
            if (btn) btn.onclick = () => onSelect(marina)
          }, 50)
        })
      })
    })

    return () => { map.remove(); mapRef.current = null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
