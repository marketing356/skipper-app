'use client'
/**
 * MembershipList — Mobile version. Inline styles matching ContactForm dark theme.
 * Accordion: new rows start expanded; saved rows start collapsed (1-liner summary).
 * API: /api/memberships
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

interface MembershipRow {
  id?: string
  org_name: string
  membership_number: string
  expiry_date: string
  notes: string
  expanded: boolean
  status: 'saved' | 'saving' | 'new' | 'error'
  errorMsg?: string
}

interface MembershipListProps {
  contactId: string
  marinaId?: string | null
}

export default function MembershipList({ contactId, marinaId }: MembershipListProps) {
  const [rows, setRows] = useState<MembershipRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!contactId) return
    fetch(`/api/memberships?contact_id=${contactId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRows(data.map((d) => ({
            id: d.id,
            org_name: d.org_name ?? '',
            membership_number: d.membership_number ?? '',
            expiry_date: d.expiry_date ?? '',
            notes: d.notes ?? '',
            expanded: false,
            status: 'saved',
          })))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [contactId])

  function addRow() {
    setRows((prev) => [
      ...prev,
      { org_name: '', membership_number: '', expiry_date: '', notes: '', expanded: true, status: 'new' },
    ])
  }

  function updateRow(idx: number, patch: Partial<MembershipRow>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  function toggleExpand(idx: number) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, expanded: !r.expanded } : r)))
  }

  async function saveRow(idx: number) {
    const row = rows[idx]
    if (!row.org_name && !row.membership_number) return
    updateRow(idx, { status: 'saving' })
    try {
      if (row.id) {
        const res = await fetch(`/api/memberships/${row.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ org_name: row.org_name, membership_number: row.membership_number, expiry_date: row.expiry_date || null, notes: row.notes }),
        })
        if (!res.ok) throw new Error('Save failed')
      } else {
        const res = await fetch('/api/memberships', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contact_id: contactId, marina_id: marinaId, org_name: row.org_name, membership_number: row.membership_number, expiry_date: row.expiry_date || null, notes: row.notes }),
        })
        if (!res.ok) throw new Error('Save failed')
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
      await fetch(`/api/memberships/${row.id}`, { method: 'DELETE' })
      setRows((prev) => prev.filter((_, i) => i !== idx))
    } catch {
      updateRow(idx, { status: 'error', errorMsg: 'Delete failed' })
    }
  }

  if (loading) return <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: FONT, margin: 0 }}>Loading…</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {rows.map((row, idx) => {
        const summary = row.org_name
          ? `${row.org_name}${row.membership_number ? ` — ${row.membership_number}` : ''}`
          : 'New membership'
        return (
          <div key={idx} style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, overflow: 'hidden' }}>
            {/* Collapsed 1-liner */}
            <button type="button" onClick={() => toggleExpand(idx)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: 'none', cursor: 'pointer', fontFamily: FONT, textAlign: 'left', color: '#ffffff', fontSize: 14 }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{summary}</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', display: 'inline-block', transform: row.expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', fontSize: 18, marginLeft: 8, flexShrink: 0 }}>›</span>
            </button>

            {row.expanded && (
              <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input type="text" placeholder="Organization (e.g. Sea Tow, BoatUS)" value={row.org_name}
                  onChange={(e) => updateRow(idx, { org_name: e.target.value })} style={inputStyle} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input type="text" placeholder="Membership #" value={row.membership_number}
                    onChange={(e) => updateRow(idx, { membership_number: e.target.value })} style={inputStyle} />
                  <input type="date" value={row.expiry_date}
                    onChange={(e) => updateRow(idx, { expiry_date: e.target.value })}
                    style={{ ...inputStyle, colorScheme: 'dark' } as React.CSSProperties} />
                </div>
                <input type="text" placeholder="Notes" value={row.notes}
                  onChange={(e) => updateRow(idx, { notes: e.target.value })} style={inputStyle} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
                  {row.status === 'saving' && <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: FONT }}>saving…</span>}
                  {row.status === 'saved' && row.id && <span style={{ color: '#4ade80', fontSize: 12, fontFamily: FONT }}>✓ Saved</span>}
                  {row.status === 'error' && <span style={{ color: '#f87171', fontSize: 12, fontFamily: FONT }}>{row.errorMsg}</span>}
                  <div style={{ flex: 1 }} />
                  <button type="button" onClick={() => saveRow(idx)} disabled={row.status === 'saving'}
                    style={{ padding: '6px 14px', background: '#4dd6c8', color: '#05111f', border: 'none', borderRadius: 6, fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: row.status === 'saving' ? 0.6 : 1 }}>
                    Save
                  </button>
                  <button type="button" onClick={() => deleteRow(idx)}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 20, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>
                    ×
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      <button type="button" onClick={addRow}
        style={{ background: 'none', border: 'none', color: '#4dd6c8', fontSize: 14, fontFamily: FONT, fontWeight: 600, cursor: 'pointer', textAlign: 'left', padding: '6px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 18, lineHeight: 1 }}>＋</span> Add membership
      </button>
    </div>
  )
}
