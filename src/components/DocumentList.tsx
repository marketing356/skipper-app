'use client'
/**
 * DocumentList — light-themed (Tailwind). Renders correctly inside OPSShell.
 */

import { useState, useRef, useEffect } from 'react'

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

  if (loading) return <p className="text-sm text-slate-400">Loading documents…</p>

  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row, idx) => (
        <div key={idx} className="border border-slate-200 rounded-xl p-3 flex flex-wrap gap-2 items-start bg-white">
          {/* Type dropdown */}
          <select
            value={row.doc_type}
            onChange={(e) => updateRow(idx, { doc_type: e.target.value })}
            className="form-input"
            style={{ width: 'auto', flexShrink: 0 }}
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
              className="form-input"
              style={{ flex: 1, minWidth: 130 }}
              disabled={row.status === 'uploading'}
            />
          )}

          {/* File area */}
          <div className="flex items-center gap-2" style={{ flex: 1, minWidth: 160 }}>
            {row.file_url && row.status === 'saved' ? (
              <>
                <a href={row.file_url} target="_blank" rel="noopener noreferrer"
                  className="text-teal-500 text-sm underline overflow-hidden text-ellipsis whitespace-nowrap"
                  style={{ maxWidth: 160 }}>
                  📄 {row.file_name || 'View document'}
                </a>
                <button type="button" onClick={() => fileInputRefs.current[idx]?.click()}
                  className="bg-transparent border-none text-slate-400 text-xs cursor-pointer underline hover:text-slate-600">
                  Replace
                </button>
              </>
            ) : row.status === 'uploading' ? (
              <span className="text-sm text-slate-400">Uploading…</span>
            ) : row.status === 'error' ? (
              <span className="text-sm text-red-400">{row.errorMsg}</span>
            ) : (
              <button type="button" onClick={() => fileInputRefs.current[idx]?.click()}
                disabled={!row.doc_type}
                className="bg-transparent border border-dashed border-slate-300 rounded px-3 py-1 text-slate-500 text-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:border-slate-400">
                📎 Choose file
              </button>
            )}
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              ref={(el) => { fileInputRefs.current[idx] = el }}
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChange(idx, f); e.target.value = '' }}
            />
          </div>

          {/* Delete */}
          <button type="button" onClick={() => deleteRow(idx)} disabled={row.status === 'uploading'}
            className="bg-transparent border-none text-slate-400 text-xl cursor-pointer leading-none p-0 self-center hover:text-slate-600 disabled:opacity-40">
            ×
          </button>
        </div>
      ))}

      <button type="button" onClick={addRow}
        className="flex items-center gap-1.5 text-teal-500 text-sm font-semibold cursor-pointer bg-transparent border-none p-0 hover:text-teal-600">
        <span className="text-lg leading-none">＋</span> Add document
      </button>
    </div>
  )
}
