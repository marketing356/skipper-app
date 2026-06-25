'use client'
/**
 * ServiceHistoryList — Dark-themed service history for Skipper mobile app.
 * Ported from OPS ServiceHistoryList. Same API routes, dark inline styles.
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

  if (loading) return <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: FONT }}>Loading service history…</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <style>{`.skipper-service select option { background: #05111f; color: #fff; }`}</style>

      <button type="button" onClick={addRow}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#4dd6c8', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FONT, padding: 0 }}>
        <span style={{ fontSize: 18, lineHeight: 1 }}>＋</span> Add service record
      </button>

      <div className="skipper-service" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map((row, idx) => (
          <div key={idx} style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 12, background: 'rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', fontFamily: FONT }}>
                {row.service_type
                  ? (SERVICE_TYPES.find((t) => t.value === row.service_type)?.label ?? row.service_type)
                  : 'New Record'}
                {row.service_date ? ` — ${row.service_date}` : ''}
              </span>
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

            {/* Service type + date */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <select value={row.service_type} onChange={(e) => updateRow(idx, { service_type: e.target.value })} style={{ ...selectStyle, flex: 1, minWidth: 170 }}>
                {SERVICE_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input type="date" value={row.service_date} onChange={(e) => updateRow(idx, { service_date: e.target.value })} style={{ ...inputStyle, width: 150 }} />
            </div>

            {/* Component / description */}
            <input type="text"
              placeholder={row.service_type === 'other' ? 'Describe the service…' : 'Component / Reference (e.g. Engine #1)'}
              value={row.component}
              onChange={(e) => updateRow(idx, { component: e.target.value })}
              style={inputStyle} />

            {/* Performed by + cost + next due */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <input type="text" placeholder="Performed by (name / shop)" value={row.performed_by} onChange={(e) => updateRow(idx, { performed_by: e.target.value })} style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
              <input type="number" placeholder="Cost $" value={row.cost} onChange={(e) => updateRow(idx, { cost: e.target.value })} style={{ ...inputStyle, width: 100 }} />
              <input type="date" value={row.next_service_due} onChange={(e) => updateRow(idx, { next_service_due: e.target.value })} title="Next service due" style={{ ...inputStyle, width: 150 }} />
            </div>

            {/* Notes */}
            <textarea placeholder="Notes…" value={row.description} onChange={(e) => updateRow(idx, { description: e.target.value })} rows={2}
              style={{ ...inputStyle, resize: 'none' }} />
          </div>
        ))}
      </div>

      {rows.length === 0 && (
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, fontFamily: FONT }}>No service records yet.</p>
      )}
    </div>
  )
}
