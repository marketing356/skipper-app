'use client'
/**
 * ShipLogList — Dark-themed ship's log for Skipper mobile app.
 * Ported from OPS ShipLogList. Same API routes, dark inline styles.
 */

import { useState, useEffect } from 'react'

const FONT = '"SF Pro Display", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.16)',
  borderRadius: 8,
  color: '#ffffff',
  fontSize: 14,
  fontFamily: FONT,
  outline: 'none',
  boxSizing: 'border-box',
}

interface LogRow {
  id?: string
  log_date: string
  notes: string
  departed_from: string
  arrived_at: string
  distance_nm: string
  engine_hours_start: string
  engine_hours_end: string
  fuel_used_gallons: string
  crew_count: string
  weather: string
  source: string
  expanded: boolean
  status: 'saved' | 'saving' | 'new' | 'error'
  errorMsg?: string
}

interface ShipLogListProps {
  assetId: string
  marinaId?: string | null
  refreshTrigger?: number
}

export default function ShipLogList({ assetId, marinaId, refreshTrigger }: ShipLogListProps) {
  const [rows, setRows] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!assetId) return
    setLoading(true)
    fetch(`/api/asset-ship-log?asset_id=${assetId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRows(data.map((d) => ({
            id: d.id,
            log_date: d.log_date ? d.log_date.slice(0, 10) : '',
            notes: d.notes ?? '',
            departed_from: d.departed_from ?? '',
            arrived_at: d.arrived_at ?? '',
            distance_nm: d.distance_nm != null ? String(d.distance_nm) : '',
            engine_hours_start: d.engine_hours_start != null ? String(d.engine_hours_start) : '',
            engine_hours_end: d.engine_hours_end != null ? String(d.engine_hours_end) : '',
            fuel_used_gallons: d.fuel_used_gallons != null ? String(d.fuel_used_gallons) : '',
            crew_count: d.crew_count != null ? String(d.crew_count) : '',
            weather: d.weather ?? '',
            source: d.source ?? 'manual',
            expanded: false,
            status: 'saved',
          })))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [assetId, refreshTrigger])

  function addRow() {
    const today = new Date().toISOString().slice(0, 10)
    setRows((prev) => [
      { log_date: today, notes: '', departed_from: '', arrived_at: '', distance_nm: '', engine_hours_start: '', engine_hours_end: '', fuel_used_gallons: '', crew_count: '', weather: '', source: 'manual', expanded: true, status: 'new' },
      ...prev,
    ])
  }

  function updateRow(idx: number, patch: Partial<LogRow>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  async function saveRow(idx: number) {
    const row = rows[idx]
    if (!row.notes && !row.departed_from && !row.arrived_at) return
    updateRow(idx, { status: 'saving' })
    try {
      const payload = {
        log_date: row.log_date || new Date().toISOString().slice(0, 10),
        notes: row.notes || null,
        departed_from: row.departed_from || null,
        arrived_at: row.arrived_at || null,
        distance_nm: row.distance_nm ? parseFloat(row.distance_nm) : null,
        engine_hours_start: row.engine_hours_start ? parseFloat(row.engine_hours_start) : null,
        engine_hours_end: row.engine_hours_end ? parseFloat(row.engine_hours_end) : null,
        fuel_used_gallons: row.fuel_used_gallons ? parseFloat(row.fuel_used_gallons) : null,
        crew_count: row.crew_count ? parseInt(row.crew_count) : null,
        weather: row.weather || null,
        source: row.source || 'manual',
      }
      if (row.id) {
        const res = await fetch(`/api/asset-ship-log/${row.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Save failed') }
      } else {
        const res = await fetch('/api/asset-ship-log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ asset_id: assetId, marina_id: marinaId, ...payload }) })
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Save failed') }
        const data = await res.json()
        updateRow(idx, { id: data.id, status: 'saved' })
        return
      }
      updateRow(idx, { status: 'saved' })
    } catch (e: unknown) {
      updateRow(idx, { status: 'error', errorMsg: (e as Error).message })
    }
  }

  async function deleteRow(idx: number) {
    const row = rows[idx]
    if (!row.id) { setRows((prev) => prev.filter((_, i) => i !== idx)); return }
    try {
      await fetch(`/api/asset-ship-log/${row.id}`, { method: 'DELETE' })
      setRows((prev) => prev.filter((_, i) => i !== idx))
    } catch {
      updateRow(idx, { status: 'error', errorMsg: 'Delete failed' })
    }
  }

  if (loading) return <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: FONT }}>Loading ship&apos;s log…</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button type="button" onClick={addRow}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#4dd6c8', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FONT, padding: 0 }}>
        <span style={{ fontSize: 18, lineHeight: 1 }}>＋</span> Add log entry
      </button>

      {rows.map((row, idx) => (
        <div key={idx} style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 12, background: 'rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button type="button" onClick={() => updateRow(idx, { expanded: !row.expanded })}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT, padding: 0 }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', display: 'inline-block', transform: row.expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', fontSize: 16 }}>›</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', fontFamily: FONT }}>
                {row.log_date || 'New Entry'}
                {(row.departed_from || row.arrived_at) ? ` — ${[row.departed_from, row.arrived_at].filter(Boolean).join(' → ')}` : ''}
              </span>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {row.status === 'saving' && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: FONT }}>saving…</span>}
              {row.status === 'saved' && row.id && <span style={{ fontSize: 11, color: '#4ade80', fontFamily: FONT }}>✓ Saved</span>}
              {row.status === 'error' && <span style={{ fontSize: 11, color: '#f87171', fontFamily: FONT }}>{row.errorMsg}</span>}
              <button type="button" onClick={() => saveRow(idx)} disabled={row.status === 'saving'}
                style={{ padding: '4px 12px', background: '#4dd6c8', color: '#05111f', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: row.status === 'saving' ? 'not-allowed' : 'pointer', fontFamily: FONT, opacity: row.status === 'saving' ? 0.6 : 1 }}>
                Save
              </button>
              <button type="button" onClick={() => deleteRow(idx)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 0 }}>
                ×
              </button>
            </div>
          </div>

          {/* Date + main log */}
          <input type="date" value={row.log_date} onChange={(e) => updateRow(idx, { log_date: e.target.value })} style={{ ...inputStyle, width: 150 }} />

          <textarea placeholder="Log entry — type or paste voice-to-text here…" value={row.notes} onChange={(e) => updateRow(idx, { notes: e.target.value })} rows={3}
            style={{ ...inputStyle, resize: 'none' }} />

          {/* Expandable structured fields */}
          {row.expanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, fontFamily: FONT, margin: 0 }}>Optional details</p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <input type="text" placeholder="Departed from" value={row.departed_from} onChange={(e) => updateRow(idx, { departed_from: e.target.value })} style={{ ...inputStyle, flex: 1, minWidth: 120 }} />
                <input type="text" placeholder="Arrived at" value={row.arrived_at} onChange={(e) => updateRow(idx, { arrived_at: e.target.value })} style={{ ...inputStyle, flex: 1, minWidth: 120 }} />
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <input type="number" placeholder="Distance (nm)" value={row.distance_nm} onChange={(e) => updateRow(idx, { distance_nm: e.target.value })} style={{ ...inputStyle, width: 120 }} />
                <input type="number" placeholder="Eng hrs start" value={row.engine_hours_start} onChange={(e) => updateRow(idx, { engine_hours_start: e.target.value })} style={{ ...inputStyle, width: 120 }} />
                <input type="number" placeholder="Eng hrs end" value={row.engine_hours_end} onChange={(e) => updateRow(idx, { engine_hours_end: e.target.value })} style={{ ...inputStyle, width: 120 }} />
                <input type="number" placeholder="Fuel used (gal)" value={row.fuel_used_gallons} onChange={(e) => updateRow(idx, { fuel_used_gallons: e.target.value })} style={{ ...inputStyle, width: 120 }} />
                <input type="number" placeholder="Crew aboard" value={row.crew_count} onChange={(e) => updateRow(idx, { crew_count: e.target.value })} style={{ ...inputStyle, width: 110 }} />
              </div>

              <input type="text" placeholder="Weather conditions" value={row.weather} onChange={(e) => updateRow(idx, { weather: e.target.value })} style={inputStyle} />
            </div>
          )}

          {!row.expanded && row.id && (
            <button type="button" onClick={() => updateRow(idx, { expanded: true })}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 12, cursor: 'pointer', fontFamily: FONT, padding: 0, textAlign: 'left' }}>
              + show details
            </button>
          )}
        </div>
      ))}

      {rows.length === 0 && (
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, fontFamily: FONT }}>No log entries yet.</p>
      )}
    </div>
  )
}
