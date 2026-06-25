'use client'
/**
 * EngineList — light-themed (Tailwind). Renders correctly inside OPSShell.
 */

import { useState, useEffect } from 'react'

const ENGINE_TYPES = [
  { value: '',             label: '— Type —' },
  { value: 'inboard',     label: 'Inboard' },
  { value: 'outboard',    label: 'Outboard' },
  { value: 'stern_drive',  label: 'Stern Drive' },
  { value: 'jet',         label: 'Jet' },
  { value: 'electric',    label: 'Electric' },
  { value: 'sail',        label: 'Sail / None' },
]

const FUEL_TYPES = [
  { value: '',          label: '— Fuel —' },
  { value: 'gasoline',  label: 'Gasoline' },
  { value: 'diesel',    label: 'Diesel' },
  { value: 'electric',  label: 'Electric' },
  { value: 'hybrid',    label: 'Hybrid' },
]

interface EngineRow {
  id?: string
  sort_order: number
  engine_type: string
  position: string
  make: string
  model: string
  year: string
  horsepower: string
  serial_number: string
  fuel_type: string
  current_hours: string
  notes: string
  status: 'saved' | 'saving' | 'new' | 'error'
  errorMsg?: string
}

interface EngineListProps {
  assetId: string
  marinaId?: string | null
}

export default function EngineList({ assetId, marinaId }: EngineListProps) {
  const [rows, setRows] = useState<EngineRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!assetId) return
    fetch(`/api/asset-engines?asset_id=${assetId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRows(data.map((d) => ({
            id: d.id,
            sort_order: d.sort_order ?? 1,
            engine_type: d.engine_type ?? '',
            position: d.position ?? '',
            make: d.make ?? '',
            model: d.model ?? '',
            year: d.year ? String(d.year) : '',
            horsepower: d.horsepower ? String(d.horsepower) : '',
            serial_number: d.serial_number ?? '',
            fuel_type: d.fuel_type ?? '',
            current_hours: d.current_hours ? String(d.current_hours) : '',
            notes: d.notes ?? '',
            status: 'saved',
          })))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [assetId])

  function addRow() {
    const nextNum = rows.length + 1
    setRows((prev) => [
      ...prev,
      { sort_order: nextNum, engine_type: '', position: '', make: '', model: '', year: '', horsepower: '', serial_number: '', fuel_type: '', current_hours: '', notes: '', status: 'new' },
    ])
  }

  function updateRow(idx: number, patch: Partial<EngineRow>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  async function saveRow(idx: number) {
    const row = rows[idx]
    if (!row.make && !row.model && !row.engine_type) return
    updateRow(idx, { status: 'saving' })
    try {
      const payload = {
        engine_type: row.engine_type || null,
        position: row.position || null,
        make: row.make || null,
        model: row.model || null,
        year: row.year ? parseInt(row.year) : null,
        horsepower: row.horsepower ? parseInt(row.horsepower) : null,
        serial_number: row.serial_number || null,
        fuel_type: row.fuel_type || null,
        current_hours: row.current_hours ? parseFloat(row.current_hours) : null,
        notes: row.notes || null,
      }
      if (row.id) {
        const res = await fetch(`/api/asset-engines/${row.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        if (!res.ok) throw new Error('Save failed')
      } else {
        const res = await fetch('/api/asset-engines', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ asset_id: assetId, marina_id: marinaId, engine_number: row.sort_order, ...payload }) })
        if (!res.ok) throw new Error('Save failed')
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
      await fetch(`/api/asset-engines/${row.id}`, { method: 'DELETE' })
      setRows((prev) => prev.filter((_, i) => i !== idx))
    } catch {
      updateRow(idx, { status: 'error', errorMsg: 'Delete failed' })
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading engines…</p>

  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row, idx) => (
        <div key={idx} className="border border-slate-200 rounded-xl p-3 flex flex-col gap-2 bg-white">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">Engine {row.sort_order}</span>
            <div className="flex items-center gap-2">
              {row.status === 'saving' && <span className="text-xs text-slate-400">saving…</span>}
              {row.status === 'saved' && row.id && <span className="text-xs text-green-500">✓ Saved</span>}
              {row.status === 'error' && <span className="text-xs text-red-400" title={row.errorMsg}>Save failed</span>}
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

          {/* Row 1: type, position, fuel */}
          <div className="flex flex-wrap gap-2">
            <select value={row.engine_type} onChange={(e) => updateRow(idx, { engine_type: e.target.value })}
              className="form-input" style={{ width: 'auto' }}>
              {ENGINE_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input type="text" placeholder="Position (Port / Stbd / Center)" value={row.position}
              onChange={(e) => updateRow(idx, { position: e.target.value })}
              className="form-input" style={{ flex: 1, minWidth: 150 }} />
            <select value={row.fuel_type} onChange={(e) => updateRow(idx, { fuel_type: e.target.value })}
              className="form-input" style={{ width: 'auto' }}>
              {FUEL_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Row 2: make, model, year, HP */}
          <div className="flex flex-wrap gap-2">
            <input type="text" placeholder="Make (e.g. Yamaha)" value={row.make}
              onChange={(e) => updateRow(idx, { make: e.target.value })}
              className="form-input" style={{ flex: 1, minWidth: 110 }} />
            <input type="text" placeholder="Model (e.g. F300)" value={row.model}
              onChange={(e) => updateRow(idx, { model: e.target.value })}
              className="form-input" style={{ flex: 1, minWidth: 90 }} />
            <input type="number" placeholder="Year" value={row.year}
              onChange={(e) => updateRow(idx, { year: e.target.value })}
              className="form-input" style={{ width: 72 }} />
            <input type="number" placeholder="HP" value={row.horsepower}
              onChange={(e) => updateRow(idx, { horsepower: e.target.value })}
              className="form-input" style={{ width: 64 }} />
          </div>

          {/* Row 3: serial, hours */}
          <div className="flex flex-wrap gap-2">
            <input type="text" placeholder="Serial #" value={row.serial_number}
              onChange={(e) => updateRow(idx, { serial_number: e.target.value })}
              className="form-input" style={{ flex: 1, minWidth: 130 }} />
            <input type="number" placeholder="Current Hours" value={row.current_hours}
              onChange={(e) => updateRow(idx, { current_hours: e.target.value })}
              className="form-input" style={{ width: 130 }} />
          </div>
        </div>
      ))}

      <button type="button" onClick={addRow}
        className="flex items-center gap-1.5 text-teal-500 text-sm font-semibold cursor-pointer bg-transparent border-none p-0 hover:text-teal-600">
        <span className="text-lg leading-none">＋</span> Add engine
      </button>
    </div>
  )
}
