'use client'
/**
 * NotesLog — light-themed (Tailwind). Renders correctly inside OPSShell.
 */

import { useState, useEffect } from 'react'

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

  if (loading) return <p className="text-sm text-slate-400">Loading notes…</p>

  return (
    <div className="flex flex-col gap-2.5">
      <button type="button" onClick={addRow}
        className="flex items-center gap-1.5 text-teal-500 text-sm font-semibold cursor-pointer bg-transparent border-none p-0 hover:text-teal-600">
        <span className="text-lg leading-none">＋</span> Add note
      </button>

      {rows.map((row, idx) => (
        <div key={idx} className="border border-slate-200 rounded-xl p-3 flex flex-col gap-2 bg-white">
          <div className="flex items-center gap-2">
            <input type="date" value={row.note_date} onChange={(e) => updateRow(idx, { note_date: e.target.value })}
              className="form-input" style={{ width: 150 }} />
            <div className="flex-1" />
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
          <textarea placeholder="Note…" value={row.note} onChange={(e) => updateRow(idx, { note: e.target.value })} rows={2}
            className="form-input resize-none" />
        </div>
      ))}

      {rows.length === 0 && (
        <p className="text-sm text-slate-400">No notes yet.</p>
      )}
    </div>
  )
}
