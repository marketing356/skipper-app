'use client'
/**
 * ServiceHistoryList — light-themed (Tailwind). Renders correctly inside OPSShell.
 */

import { useState, useEffect } from 'react'

const SERVICE_TYPES = [
  { value: '',               label: '— Service Type —' },
  { value: 'haulout',        label: 'Haulout' },
  { value: 'survey',         label: 'Survey' },
  { value: 'oil_change',     label: 'Oil Change' },
  { value: 'bottom_paint',   label: 'Bottom Paint' },
  { value: 'winterize',      label: 'Winterize' },
  { value: 'zincs',          label: 'Zinc Replacement' },
  { value: 'impeller',       label: 'Impeller' },
  { value: 'fuel_filter',    label: 'Fuel Filter' },
  { value: 'spark_plugs',    label: 'Spark Plugs' },
  { value: 'transmission',   label: 'Transmission Service' },
  { value: 'cooling',        label: 'Cooling System' },
  { value: 'electrical',     label: 'Electrical' },
  { value: 'rigging',        label: 'Rigging' },
  { value: 'sails',          label: 'Sails' },
  { value: 'canvas',         label: 'Canvas / Upholstery' },
  { value: 'detail',         label: 'Detail / Wash' },
  { value: 'inspection',     label: 'Inspection' },
  { value: 'registration',   label: 'Registration' },
  { value: 'insurance',      label: 'Insurance' },
  { value: 'other',          label: 'Other' },
]

interface ServiceRow {
  id?: string
  service_date: string
  service_type: string
  component: string
  description: string
  performed_by: string
  cost: string
  next_service_due: string
  status: 'saved' | 'saving' | 'new' | 'error'
  errorMsg?: string
}

interface ServiceHistoryListProps {
  assetId: string
  marinaId?: string | null
  refreshTrigger?: number
}

export default function ServiceHistoryList({ assetId, marinaId, refreshTrigger }: ServiceHistoryListProps) {
  const [rows, setRows] = useState<ServiceRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!assetId) return
    setLoading(true)
    fetch(`/api/asset-service-history?asset_id=${assetId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRows(data.map((d) => ({
            id: d.id,
            service_date: d.service_date ? d.service_date.slice(0, 10) : '',
            service_type: d.service_type ?? '',
            component: d.component ?? '',
            description: d.description ?? '',
            performed_by: d.performed_by ?? '',
            cost: d.cost != null ? String(d.cost) : '',
            next_service_due: d.next_service_due ? d.next_service_due.slice(0, 10) : '',
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
      { service_date: today, service_type: '', component: '', description: '', performed_by: '', cost: '', next_service_due: '', status: 'new' },
      ...prev,
    ])
  }

  function updateRow(idx: number, patch: Partial<ServiceRow>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  async function saveRow(idx: number) {
    const row = rows[idx]
    if (!row.service_type && !row.description) return
    updateRow(idx, { status: 'saving' })
    try {
      const payload = {
        service_date: row.service_date || new Date().toISOString().slice(0, 10),
        service_type: row.service_type || null,
        component: row.component || null,
        description: row.description || null,
        performed_by: row.performed_by || null,
        cost: row.cost ? parseFloat(row.cost) : null,
        next_service_due: row.next_service_due || null,
      }
      if (row.id) {
        const res = await fetch(`/api/asset-service-history/${row.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Save failed') }
      } else {
        const res = await fetch('/api/asset-service-history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ asset_id: assetId, marina_id: marinaId, ...payload }) })
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
      await fetch(`/api/asset-service-history/${row.id}`, { method: 'DELETE' })
      setRows((prev) => prev.filter((_, i) => i !== idx))
    } catch {
      updateRow(idx, { status: 'error', errorMsg: 'Delete failed' })
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading service history…</p>

  return (
    <div className="flex flex-col gap-2.5">
      <button type="button" onClick={addRow}
        className="flex items-center gap-1.5 text-teal-500 text-sm font-semibold cursor-pointer bg-transparent border-none p-0 hover:text-teal-600">
        <span className="text-lg leading-none">＋</span> Add service record
      </button>

      {rows.map((row, idx) => (
        <div key={idx} className="border border-slate-200 rounded-xl p-3 flex flex-col gap-2 bg-white">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">
              {row.service_type
                ? (SERVICE_TYPES.find((t) => t.value === row.service_type)?.label ?? row.service_type)
                : 'New Record'}
              {row.service_date ? ` — ${row.service_date}` : ''}
            </span>
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

          {/* Service type + date */}
          <div className="flex flex-wrap gap-2">
            <select value={row.service_type} onChange={(e) => updateRow(idx, { service_type: e.target.value })}
              className="form-input" style={{ flex: 1, minWidth: 170 }}>
              {SERVICE_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input type="date" value={row.service_date} onChange={(e) => updateRow(idx, { service_date: e.target.value })}
              className="form-input" style={{ width: 150 }} />
          </div>

          <input type="text"
            placeholder={row.service_type === 'other' ? 'Describe the service…' : 'Component / Reference (e.g. Engine #1)'}
            value={row.component}
            onChange={(e) => updateRow(idx, { component: e.target.value })}
            className="form-input" />

          <div className="flex flex-wrap gap-2">
            <input type="text" placeholder="Performed by (name / shop)" value={row.performed_by}
              onChange={(e) => updateRow(idx, { performed_by: e.target.value })}
              className="form-input" style={{ flex: 1, minWidth: 160 }} />
            <input type="number" placeholder="Cost $" value={row.cost}
              onChange={(e) => updateRow(idx, { cost: e.target.value })}
              className="form-input" style={{ width: 100 }} />
            <input type="date" value={row.next_service_due}
              onChange={(e) => updateRow(idx, { next_service_due: e.target.value })}
              title="Next service due" className="form-input" style={{ width: 150 }} />
          </div>

          <textarea placeholder="Notes…" value={row.description}
            onChange={(e) => updateRow(idx, { description: e.target.value })} rows={2}
            className="form-input resize-none" />
        </div>
      ))}

      {rows.length === 0 && (
        <p className="text-sm text-slate-400">No service records yet.</p>
      )}
    </div>
  )
}
