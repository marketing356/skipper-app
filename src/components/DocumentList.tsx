'use client'
/**
 * DocumentList — Dark-themed document upload list for Skipper mobile app.
 * Ported from OPS DocumentList. Same API routes, dark inline styles.
 * entity_type='contact' | 'asset'
 */

import { useState, useRef, useEffect } from 'react'

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

const CONTACT_DOC_TYPES = [
  { value: '',                    label: '— Select type —' },
  { value: 'maritime_license',    label: 'Maritime License' },
  { value: 'captains_license',    label: "Captain's License" },
  { value: 'twic_card',           label: 'TWIC Card' },
  { value: 'coast_guard_license', label: 'Coast Guard License' },
  { value: 'incorporation_cert',  label: 'Incorporation Certificate' },
  { value: 'insurance_cert',      label: 'Insurance Certificate' },
  { value: 'background_check',    label: 'Background Check' },
  { value: 'id_passport',         label: 'ID / Passport' },
  { value: 'other',               label: 'Other (label below)' },
]

const ASSET_DOC_TYPES = [
  { value: '',              label: '— Select type —' },
  { value: 'registration',  label: 'Registration' },
  { value: 'title',         label: 'Title' },
  { value: 'insurance',     label: 'Insurance' },
  { value: 'survey',        label: 'Survey' },
  { value: 'uscg_doc',      label: 'USCG Documentation' },
  { value: 'lien_release',  label: 'Lien Release' },
  { value: 'other',         label: 'Other (label below)' },
]

interface DocRow {
  id?: string
  doc_type: string
  doc_label: string
  file_name: string
  file_url: string
  file_size?: number
  status: 'saved' | 'uploading' | 'error' | 'new'
  errorMsg?: string
}

interface DocumentListProps {
  entityType: 'contact' | 'asset'
  entityId: string
  marinaId?: string | null
  initialDocs?: Array<{
    id: string
    doc_type: string
    doc_label?: string | null
    file_name?: string | null
    filename?: string | null
    file_url: string
  }>
}

export default function DocumentList({
  entityType,
  entityId,
  marinaId,
  initialDocs = [],
}: DocumentListProps) {
  const docTypes = entityType === 'contact' ? CONTACT_DOC_TYPES : ASSET_DOC_TYPES

  const [rows, setRows] = useState<DocRow[]>(() =>
    initialDocs.map((d) => ({
      id: d.id,
      doc_type: d.doc_type,
      doc_label: d.doc_label ?? '',
      file_name: d.file_name ?? d.filename ?? '',
      file_url: d.file_url,
      status: 'saved',
    }))
  )
  const [loading, setLoading] = useState(initialDocs.length === 0)
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({})

  useEffect(() => {
    if (!entityId) return
    fetch(`/api/documents?entity_type=${entityType}&entity_id=${entityId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setRows(data.map((d) => ({
            id: d.id,
            doc_type: d.doc_type,
            doc_label: d.doc_label ?? '',
            file_name: d.file_name ?? d.filename ?? '',
            file_url: d.file_url,
            status: 'saved',
          })))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [entityId, entityType])

  function addRow() {
    setRows((prev) => [
      ...prev,
      { doc_type: '', doc_label: '', file_name: '', file_url: '', status: 'new' },
    ])
  }

  function updateRow(idx: number, patch: Partial<DocRow>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  async function handleFileChange(idx: number, file: File) {
    updateRow(idx, { status: 'uploading', file_name: file.name, file_size: file.size })
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('entity_type', entityType)
      formData.append('entity_id', entityId)
      if (marinaId) formData.append('marina_id', marinaId)
      formData.append('doc_type', rows[idx].doc_type || 'other')
      formData.append('doc_label', rows[idx].doc_label || '')

      const res = await fetch('/api/documents/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Upload failed (${res.status})`)
      }
      const { id, file_url } = await res.json()
      updateRow(idx, { id, file_url, status: 'saved' })
    } catch (e: unknown) {
      updateRow(idx, { status: 'error', errorMsg: (e as Error).message })
    }
  }

  async function deleteRow(idx: number) {
    const row = rows[idx]
    if (!row.id) { setRows((prev) => prev.filter((_, i) => i !== idx)); return }
    try {
      const res = await fetch(`/api/documents/${row.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setRows((prev) => prev.filter((_, i) => i !== idx))
    } catch {
      updateRow(idx, { status: 'error', errorMsg: 'Delete failed — try again' })
    }
  }

  if (loading) {
    return <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: FONT }}>Loading documents…</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <style>{`.skipper-doclist select option { background: #05111f; color: #fff; }`}</style>
      <div className="skipper-doclist" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((row, idx) => (
          <div key={idx} style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 12, background: 'rgba(255,255,255,0.03)', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' }}>
            {/* Type dropdown */}
            <select
              value={row.doc_type}
              onChange={(e) => updateRow(idx, { doc_type: e.target.value })}
              style={{ ...selectStyle, width: 'auto', flexShrink: 0 }}
              disabled={row.status === 'uploading'}
            >
              {docTypes.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>

            {/* Custom label for "other" */}
            {row.doc_type === 'other' && (
              <input
                type="text"
                placeholder="Describe document…"
                value={row.doc_label}
                onChange={(e) => updateRow(idx, { doc_label: e.target.value })}
                style={{ ...inputStyle, flex: 1, minWidth: 130 }}
                disabled={row.status === 'uploading'}
              />
            )}

            {/* File area */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 160 }}>
              {row.file_url && row.status === 'saved' ? (
                <>
                  <a href={row.file_url} target="_blank" rel="noopener noreferrer"
                    style={{ color: '#4dd6c8', fontSize: 13, textDecoration: 'underline', fontFamily: FONT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                    📄 {row.file_name || 'View document'}
                  </a>
                  <button type="button" onClick={() => fileInputRefs.current[idx]?.click()}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', fontFamily: FONT, textDecoration: 'underline' }}>
                    Replace
                  </button>
                </>
              ) : row.status === 'uploading' ? (
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: FONT }}>Uploading…</span>
              ) : row.status === 'error' ? (
                <span style={{ color: '#f87171', fontSize: 13, fontFamily: FONT }}>{row.errorMsg}</span>
              ) : (
                <button type="button" onClick={() => fileInputRefs.current[idx]?.click()}
                  disabled={!row.doc_type}
                  style={{ background: 'none', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 7, padding: '5px 12px', color: row.doc_type ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)', fontSize: 13, cursor: row.doc_type ? 'pointer' : 'not-allowed', fontFamily: FONT }}>
                  📎 Choose file
                </button>
              )}
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                ref={(el) => { fileInputRefs.current[idx] = el }}
                style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChange(idx, f); e.target.value = '' }}
              />
            </div>

            {/* Delete */}
            <button type="button" onClick={() => deleteRow(idx)} disabled={row.status === 'uploading'}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 0, alignSelf: 'center' }}>
              ×
            </button>
          </div>
        ))}
      </div>

      <button type="button" onClick={addRow}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#4dd6c8', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FONT, padding: 0 }}>
        <span style={{ fontSize: 18, lineHeight: 1 }}>＋</span> Add document
      </button>
    </div>
  )
}
