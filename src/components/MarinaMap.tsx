'use client'
import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default icon paths broken by webpack
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom teal marina pin
const marinaIcon = L.divIcon({
  html: `<div style="width:32px;height:32px;background:linear-gradient(135deg,#4dd6c8,#38b2a8);border:2.5px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>`,
  className: '',
  iconSize:   [32, 32],
  iconAnchor: [16, 32],
  popupAnchor:[0, -36],
})

type Marina = {
  id: string; name: string; city: string; state: string
  total_slips: number; transient_available?: boolean
  lat: number | null; lng: number | null
}

function FitBounds({ marinas }: { marinas: Marina[] }) {
  const map = useMap()
  useEffect(() => {
    const pts = marinas.filter(m => m.lat && m.lng).map(m => [m.lat!, m.lng!] as [number, number])
    if (pts.length === 1) { map.setView(pts[0], 12); return }
    if (pts.length > 1)   { map.fitBounds(pts, { padding: [40, 40] }) }
  }, [map, marinas])
  return null
}

export default function MarinaMap({
  marinas, onSelect,
}: {
  marinas: Marina[]
  onSelect: (m: Marina) => void
}) {
  const mapped = marinas.filter(m => m.lat && m.lng)

  return (
    <MapContainer
      center={[39.5, -98.35]}
      zoom={4}
      style={{ width: '100%', height: '100%', background: '#0d1f2d' }}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
      />
      <FitBounds marinas={mapped} />
      {mapped.map(m => (
        <Marker key={m.id} position={[m.lat!, m.lng!]} icon={marinaIcon}>
          <Popup>
            <div style={{ fontFamily: 'system-ui,sans-serif', minWidth: 180 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{m.name}</div>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
                {m.city}, {m.state} · {m.total_slips} slips
              </div>
              {m.transient_available && (
                <div style={{ fontSize: 11, color: '#4dd6c8', fontWeight: 700, marginBottom: 8 }}>TRANSIENT AVAILABLE</div>
              )}
              <button
                onClick={() => onSelect(m)}
                style={{ width: '100%', padding: '7px 0', background: '#4dd6c8', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer', color: '#071e38' }}>
                Request a Slip
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
