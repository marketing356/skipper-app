'use client'
/**
 * NotesLog — Dark-themed notes log for Skipper mobile app.
 * Ported from OPS NotesLog. Same API routes, dark inline styles.
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

interface NoteRow {
  id?: string
  note_date: string
  note: string
  status: 'saved' | 'saving' | 'new' | 'error'
  errorMsg?: string
}

interface NotesLogProps {
  assetId: string
  marinaId?: string | null
}

export default function NotesLog({ assetId, marinaId }: NotesLogProps) {
  const [rows, setRows] = useState<NoteRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!assetId) return
    fetch(`/api/asset-notes-log?asset_id=${assetId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRows(data.map((d) => ({
            id: d.id,
            note_date: d.note_date ? d.note_date.slice(0, 10) : '',
            note: d.note ?? '',
            status: 'saved',
          })))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [assetId])

  function addRow() {
    const today = new Date().toISOString().slice(0, 10)
    setRows((prev) => [
      { note_date: today, note: '', status: 'new' },
      ...prev,
    ])
  }

  function updateRow(idx: number, patch: Partial<NoteRow>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  async function saveRow(idx: number) {
    const row = rows[idx]
    if (!row.note.trim()) return
    updateRow(idx, { status: 'saving' })
    try {
      const payload = {
        note_date: row.note_date || new Date().toISOString().slice(0, 10),
        note: row.note.trim(),
      }
      if (row.id) {
        const res = await fetch(`/api/asset-notes-log/${row.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Save failed') }
      } else {
        const res = await fetch('/api/asset-notes-log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ asset_id: assetId, marina_id: marinaId, ...payload }) })
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
      await fetch(`/api/asset-notes-log/${row.id}`, { method: 'DELETE' })
      setRows((prev) => prev.filter((_, i) => i !== idx))
    } catch {
      updateRow(idx, { status: 'error', errorMsg: 'Delete failed' })
    }
  }

  if (loading) return <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: FONT }}>Loading notes…</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button type="button" onClick={addRow}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#4dd6c8', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FONT, padding: 0 }}>
        <span style={{ fontSize: 18, lineHeight: 1 }}>＋</span> Add note
      </button>

      {rows.map((row, idx) => (
        <div key={idx} style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 12, background: 'rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="date" value={row.note_date} onChange={(e) => updateRow(idx, { note_date: e.target.value })} style={{ ...inputStyle, width: 150 }} />
            <div style={{ flex: 1 }} />
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
          <textarea placeholder="Note…" value={row.note} onChange={(e) => updateRow(idx, { note: e.target.value })} rows={2}
            style={{ ...inputStyle, resize: 'none' }} />
        </div>
      ))}

      {rows.length === 0 && (
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, fontFamily: FONT }}>No notes yet.</p>
      )}
    </div>
  )
}
