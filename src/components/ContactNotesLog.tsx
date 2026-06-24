'use client'
/**
 * ContactNotesLog — Dated notes log for contacts (mobile).
 * Each note = date + text. Accordion: new rows start expanded, saved rows collapsed (1-liner).
 * API: /api/contact-notes
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
  expanded: boolean
  status: 'saved' | 'saving' | 'new' | 'error'
  errorMsg?: string
}

interface ContactNotesLogProps {
  contactId: string
}

export default function ContactNotesLog({ contactId }: ContactNotesLogProps) {
  const [rows, setRows] = useState<NoteRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!contactId) return
    fetch(`/api/contact-notes?contact_id=${contactId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRows(data.map((d) => ({
            id: d.id,
            note_date: d.note_date ? d.note_date.slice(0, 10) : '',
            note: d.note ?? '',
            expanded: false,
            status: 'saved',
          })))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [contactId])

  function addRow() {
    const today = new Date().toISOString().slice(0, 10)
    setRows((prev) => [
      { note_date: today, note: '', expanded: true, status: 'new' },
      ...prev,
    ])
  }

  function updateRow(idx: number, patch: Partial<NoteRow>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  function toggleExpand(idx: number) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, expanded: !r.expanded } : r)))
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
        const res = await fetch(`/api/contact-notes/${row.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Save failed') }
      } else {
        const res = await fetch('/api/contact-notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contact_id: contactId, ...payload }),
        })
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Save failed') }
        const data = await res.json()
        updateRow(idx, { id: data.id, status: 'saved', expanded: false })
        return
      }
      updateRow(idx, { status: 'saved', expanded: false })
    } catch (e: unknown) {
      updateRow(idx, { status: 'error', errorMsg: (e as Error).message })
    }
  }

  async function deleteRow(idx: number) {
    const row = rows[idx]
    if (!row.id) { setRows((prev) => prev.filter((_, i) => i !== idx)); return }
    try {
      await fetch(`/api/contact-notes/${row.id}`, { method: 'DELETE' })
      setRows((prev) => prev.filter((_, i) => i !== idx))
    } catch {
      updateRow(idx, { status: 'error', errorMsg: 'Delete failed' })
    }
  }

  if (loading) return <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: FONT, margin: 0 }}>Loading…</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <button type="button" onClick={addRow}
        style={{ background: 'none', border: 'none', color: '#4dd6c8', fontSize: 14, fontFamily: FONT, fontWeight: 600, cursor: 'pointer', textAlign: 'left', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 18, lineHeight: 1 }}>＋</span> Add note
      </button>

      {rows.map((row, idx) => {
        const preview = row.note.length > 60 ? row.note.slice(0, 60) + '…' : row.note
        const summary = row.note_date
          ? `${row.note_date}${preview ? ` — ${preview}` : ''}`
          : 'New note'
        return (
          <div key={idx} style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, overflow: 'hidden' }}>
            {/* Collapsed 1-liner */}
            <button type="button" onClick={() => toggleExpand(idx)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: 'none', cursor: 'pointer', fontFamily: FONT, textAlign: 'left', color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{summary}</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', display: 'inline-block', transform: row.expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', fontSize: 18, marginLeft: 8, flexShrink: 0 }}>›</span>
            </button>

            {row.expanded && (
              <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="date" value={row.note_date}
                    onChange={(e) => updateRow(idx, { note_date: e.target.value })}
                    style={{ ...inputStyle, width: 'auto', flex: '0 0 auto', colorScheme: 'dark' } as React.CSSProperties} />
                  <div style={{ flex: 1 }} />
                  {row.status === 'saving' && <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: FONT }}>saving…</span>}
                  {row.status === 'saved' && row.id && <span style={{ color: '#4ade80', fontSize: 12, fontFamily: FONT }}>✓ Saved</span>}
                  {row.status === 'error' && <span style={{ color: '#f87171', fontSize: 12, fontFamily: FONT }}>{row.errorMsg}</span>}
                  <button type="button" onClick={() => saveRow(idx)} disabled={row.status === 'saving'}
                    style={{ padding: '5px 12px', background: '#4dd6c8', color: '#05111f', border: 'none', borderRadius: 6, fontFamily: FONT, fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: row.status === 'saving' ? 0.6 : 1 }}>
                    Save
                  </button>
                  <button type="button" onClick={() => deleteRow(idx)}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 20, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>
                    ×
                  </button>
                </div>
                <textarea placeholder="Note…" value={row.note}
                  onChange={(e) => updateRow(idx, { note: e.target.value })}
                  rows={3}
                  style={{ ...inputStyle, resize: 'none' }} />
              </div>
            )}
          </div>
        )
      })}

      {rows.length === 0 && (
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, fontFamily: FONT, margin: 0, fontStyle: 'italic' }}>No notes yet.</p>
      )}
    </div>
  )
}
