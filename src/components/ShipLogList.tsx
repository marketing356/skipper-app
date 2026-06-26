'use client'
/**
 * ShipLogList — light-themed (Tailwind). Renders correctly inside OPSShell.
 * Same API routes as OPS version. Save logic uses fetch (client-side).
 */

import { useState, useEffect } from 'react'

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

  if (loading) return <p className="text-sm text-slate-400">Loading ship&apos;s log…</p>

  return (
    <div className="flex flex-col gap-2.5">
      <button type="button" onClick={addRow}
        className="flex items-center gap-1.5 text-teal-500 text-sm font-semibold cursor-pointer bg-transparent border-none p-0 hover:text-teal-600">
        <span className="text-lg leading-none">＋</span> Add log entry
      </button>

      {rows.map((row, idx) => (
        <div key={idx} className="border border-slate-200 rounded-xl p-3 flex flex-col gap-2 bg-white">
          {/* Header */}
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => updateRow(idx, { expanded: !row.expanded })}
              className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer p-0">
              <span className={`text-slate-400 inline-block transition-transform text-base ${row.expanded ? 'rotate-90' : ''}`}>›</span>
              <span className="text-sm font-semibold text-slate-700">
                {row.log_date || 'New Entry'}
                {(row.departed_from || row.arrived_at) ? ` — ${[row.departed_from, row.arrived_at].filter(Boolean).join(' → ')}` : ''}
              </span>
            </button>
            <div className="flex items-center gap-2">
              {row.status === 'saving' && <span className="text-xs text-slate-400">saving…</span>}
              {row.status === 'saved' && row.id && <span className="text-xs text-green-500">✓ Saved</span>}
              {row.status === 'error' && <span className="text-xs text-red-400">{row.errorMsg}</span>}
              <button type="button" onClick={() => saveRow(idx)} disabled={row.status === 'saving'}
                className="px-3 py-1 bg-teal-400 text-slate-900 border-none rounded text-xs font-bold cursor-pointer disabled:opacity-50">
                Save
              </button>
              <button type="button" onClick={() => deleteRow(idx)}
                className="bg-transparent border-none text-slate-400 text-xl cursor-pointer leading-none p-0 hover:text-slate-600">
                ×
              </button>
            </div>
          </div>

          {/* Date + main log */}
          <input type="date" value={row.log_date} onChange={(e) => updateRow(idx, { log_date: e.target.value })}
            className="form-input" style={{ width: 150 }} />

          <textarea placeholder="Log entry — type or paste voice-to-text here…" value={row.notes}
            onChange={(e) => updateRow(idx, { notes: e.target.value })} rows={3}
            className="form-input resize-none" />

          {/* Expandable structured fields */}
          {row.expanded && (
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-400 uppercase tracking-wide m-0">Optional details</p>

              <div className="flex flex-wrap gap-2">
                <input type="text" placeholder="Departed from" value={row.departed_from}
                  onChange={(e) => updateRow(idx, { departed_from: e.target.value })}
                  className="form-input" style={{ flex: 1, minWidth: 120 }} />
                <input type="text" placeholder="Arrived at" value={row.arrived_at}
                  onChange={(e) => updateRow(idx, { arrived_at: e.target.value })}
                  className="form-input" style={{ flex: 1, minWidth: 120 }} />
              </div>

              <div className="flex flex-wrap gap-2">
                <input type="number" placeholder="Distance (nm)" value={row.distance_nm}
                  onChange={(e) => updateRow(idx, { distance_nm: e.target.value })}
                  className="form-input" style={{ width: 120 }} />
                <input type="number" placeholder="Eng hrs start" value={row.engine_hours_start}
                  onChange={(e) => updateRow(idx, { engine_hours_start: e.target.value })}
                  className="form-input" style={{ width: 120 }} />
                <input type="number" placeholder="Eng hrs end" value={row.engine_hours_end}
                  onChange={(e) => updateRow(idx, { engine_hours_end: e.target.value })}
                  className="form-input" style={{ width: 120 }} />
                <input type="number" placeholder="Fuel used (gal)" value={row.fuel_used_gallons}
                  onChange={(e) => updateRow(idx, { fuel_used_gallons: e.target.value })}
                  className="form-input" style={{ width: 120 }} />
                <input type="number" placeholder="Crew aboard" value={row.crew_count}
                  onChange={(e) => updateRow(idx, { crew_count: e.target.value })}
                  className="form-input" style={{ width: 110 }} />
              </div>

              <input type="text" placeholder="Weather conditions" value={row.weather}
                onChange={(e) => updateRow(idx, { weather: e.target.value })}
                className="form-input" />
            </div>
          )}

          {!row.expanded && row.id && (
            <button type="button" onClick={() => updateRow(idx, { expanded: true })}
              className="bg-transparent border-none text-slate-400 text-xs cursor-pointer p-0 text-left hover:text-slate-600">
              + show details
            </button>
          )}
        </div>
      ))}

      {rows.length === 0 && (
        <p className="text-sm text-slate-400">No log entries yet.</p>
      )}
    </div>
  )
}
