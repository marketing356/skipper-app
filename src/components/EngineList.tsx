'use client'
/**
 * EngineList — Dark-themed engine list for Skipper mobile app.
 * Ported from OPS EngineList. Same API routes, dark inline styles.
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

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  WebkitAppearance: 'auto',
  appearance: 'auto',
  colorScheme: 'dark',
} as unknown as React.CSSProperties

const ENGINE_TYPES = [
  { value: '',            label: '— Type —' },
  { value: 'inboard',    label: 'Inboard' },
  { value: 'outboard',   label: 'Outboard' },
  { value: 'stern_drive', label: 'Stern Drive' },
  { value: 'jet',        label: 'Jet' },
  { value: 'electric',   label: 'Electric' },
  { value: 'sail',       label: 'Sail / None' },
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

  if (loading) return <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: FONT }}>Loading engines…</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <style>{`.skipper-engines select option { background: #05111f; color: #fff; }`}</style>
      <div className="skipper-engines" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map((row, idx) => (
          <div key={idx} style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 12, background: 'rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', fontFamily: FONT }}>Engine {row.sort_order}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {row.status === 'saving' && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: FONT }}>saving…</span>}
                {row.status === 'saved' && row.id && <span style={{ fontSize: 11, color: '#4ade80', fontFamily: FONT }}>✓ Saved</span>}
                {row.status === 'error' && <span style={{ fontSize: 11, color: '#f87171', fontFamily: FONT }} title={row.errorMsg}>Save failed</span>}
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

            {/* Row 1: type, position, fuel */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <select value={row.engine_type} onChange={(e) => updateRow(idx, { engine_type: e.target.value })} style={{ ...selectStyle, width: 'auto' }}>
                {ENGINE_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input type="text" placeholder="Position (Port / Stbd / Center)" value={row.position} onChange={(e) => updateRow(idx, { position: e.target.value })} style={{ ...inputStyle, flex: 1, minWidth: 150 }} />
              <select value={row.fuel_type} onChange={(e) => updateRow(idx, { fuel_type: e.target.value })} style={{ ...selectStyle, width: 'auto' }}>
                {FUEL_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Row 2: make, model, year, HP */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <input type="text" placeholder="Make (e.g. Yamaha)" value={row.make} onChange={(e) => updateRow(idx, { make: e.target.value })} style={{ ...inputStyle, flex: 1, minWidth: 110 }} />
              <input type="text" placeholder="Model (e.g. F300)" value={row.model} onChange={(e) => updateRow(idx, { model: e.target.value })} style={{ ...inputStyle, flex: 1, minWidth: 90 }} />
              <input type="number" placeholder="Year" value={row.year} onChange={(e) => updateRow(idx, { year: e.target.value })} style={{ ...inputStyle, width: 72 }} />
              <input type="number" placeholder="HP" value={row.horsepower} onChange={(e) => updateRow(idx, { horsepower: e.target.value })} style={{ ...inputStyle, width: 64 }} />
            </div>

            {/* Row 3: serial, hours */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <input type="text" placeholder="Serial #" value={row.serial_number} onChange={(e) => updateRow(idx, { serial_number: e.target.value })} style={{ ...inputStyle, flex: 1, minWidth: 130 }} />
              <input type="number" placeholder="Current Hours" value={row.current_hours} onChange={(e) => updateRow(idx, { current_hours: e.target.value })} style={{ ...inputStyle, width: 130 }} />
            </div>
          </div>
        ))}
      </div>

      <button type="button" onClick={addRow}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#4dd6c8', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FONT, padding: 0 }}>
        <span style={{ fontSize: 18, lineHeight: 1 }}>＋</span> Add engine
      </button>
    </div>
  )
}
