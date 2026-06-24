'use client'
/**
 * AssetForm — Schema-Driven Master Vessel/Asset Form.
 * Fields and sections are defined in lib/asset-form-schema.ts.
 * To add a field: add it to the schema, redeploy. Done.
 * ONE asset = ONE row in marina_assets. Every field maps to a real column.
 * No ghost fields. No duplicate columns. Mirrors verbatim to Skipper App / Helm / Crew / Contractors.
 * Last updated: 2026-06-23 — collapsible sections (master form).
 */
import { useState } from 'react'
import { createAsset, updateAsset } from '@/lib/actions'
import DocumentList from '@/components/DocumentList'
import EngineList from '@/components/EngineList'
import ServiceHistoryList from '@/components/ServiceHistoryList'
import ShipLogList from '@/components/ShipLogList'
import NotesLog from '@/components/NotesLog'
import TagInput from '@/components/TagInput'
import {
  ASSET_FORM_SCHEMA,
  sectionVisibleTo,
  fieldVisibleTo,
  type Role,
  type AssetField,
} from '@/lib/asset-form-schema'

interface Props {
  marinas: { id: string; name: string }[]
  contacts: { id: string; first_name: string | null; last_name: string | null; email: string | null }[]
  asset?: Record<string, any>
}

function Section({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(!!defaultOpen)
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <span className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{title}</span>
        <span className={`text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
      </button>
      <div className={`p-4 space-y-4 bg-white ${open ? '' : 'hidden'}`}>{children}</div>
    </div>
  )
}

function Row({ children, cols = 2 }: { children: React.ReactNode; cols?: number }) {
  return (
    <div className={`grid grid-cols-${cols} gap-4`}>{children}</div>
  )
}

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  )
}

function Input({ name, type = 'text', placeholder, defaultValue }: {
  name: string; type?: string; placeholder?: string; defaultValue?: any
}) {
  return (
    <input
      name={name}
      type={type}
      placeholder={placeholder}
      defaultValue={defaultValue ?? ''}
      className="form-input"
    />
  )
}

function Select({ name, defaultValue, children }: {
  name: string; defaultValue?: any; children: React.ReactNode
}) {
  return (
    <select name={name} defaultValue={defaultValue ?? ''} className="form-input">
      {children}
    </select>
  )
}

function BoolSelect({ name, defaultValue }: { name: string; defaultValue?: boolean | null }) {
  const val = defaultValue === true ? 'true' : defaultValue === false ? 'false' : ''
  return (
    <select name={name} defaultValue={val} className="form-input">
      <option value="">— Not set —</option>
      <option value="true">Yes</option>
      <option value="false">No</option>
    </select>
  )
}

const TEXTAREA_ROWS: Record<string, number> = {
  notes: 4,
  retired_reason: 2,
}

export default function AssetForm({ marinas, asset }: Props) {
  const a = asset ?? {}
  const isEdit = !!a.id
  const action = isEdit ? updateAsset : createAsset
  const role: Role = 'ops'

  function renderControl(field: AssetField) {
    // marina_id: options injected from marinas prop, not schema
    if (field.name === 'marina_id') {
      return (
        <Select name="marina_id" defaultValue={a.marina_id}>
          <option value="">— No marina —</option>
          {marinas.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </Select>
      )
    }

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            name={field.name}
            rows={TEXTAREA_ROWS[field.name] ?? 3}
            className="form-input resize-none"
            placeholder={field.placeholder}
            defaultValue={a[field.name] ?? ''}
          />
        )

      case 'select':
        return (
          <Select name={field.name} defaultValue={a[field.name]}>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        )

      case 'bool-select':
        return <BoolSelect name={field.name} defaultValue={a[field.name]} />

      case 'tag-input':
        return (
          <TagInput
            name={field.name}
            defaultValue={a[field.name]}
            placeholder={field.placeholder}
          />
        )

      default:
        return (
          <Input
            name={field.name}
            type={field.type}
            placeholder={field.placeholder}
            defaultValue={a[field.name]}
          />
        )
    }
  }

  return (
    <form action={action} className="space-y-3">
      {isEdit && <input type="hidden" name="id" value={a.id} />}

      {ASSET_FORM_SCHEMA
        .filter((section) => sectionVisibleTo(section, role))
        .map((section, sIdx) => (
          <Section key={section.id} title={section.title} defaultOpen={sIdx === 0}>
            {section.rows.map((row, rowIdx) => {
              const hasVisibleField = row.fields.some(
                (f) => f !== null && fieldVisibleTo(f, role)
              )
              if (!hasVisibleField) return null

              return (
                <div key={rowIdx}>
                  {row.groupLabel && (
                    <p className="text-sm font-medium text-slate-700 mb-2">{row.groupLabel}</p>
                  )}
                  <Row cols={row.cols ?? 2}>
                    {row.fields.map((field, fieldIdx) => {
                      if (field === null) return <div key={fieldIdx} />
                      if (!fieldVisibleTo(field, role)) return <div key={fieldIdx} />
                      return (
                        <Field
                          key={field.name}
                          label={field.label}
                          required={field.required}
                          hint={field.hint}
                        >
                          {renderControl(field)}
                        </Field>
                      )
                    })}
                  </Row>
                </div>
              )
            })}
          </Section>
        ))}

      {/* ── Engines (dynamic) ─────────────────────────────────── */}
      {isEdit && a.id && (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 text-left font-medium text-slate-700 text-sm">
            Engines
          </div>
          <div className="px-4 py-4">
            <EngineList
              assetId={a.id}
              marinaId={a.marina_id ?? null}
            />
          </div>
        </div>
      )}

      {/* ── Notes Log (dynamic) ───────────────────────────────── */}
      {isEdit && a.id && (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 text-left font-medium text-slate-700 text-sm">
            Notes
          </div>
          <div className="px-4 py-4">
            <NotesLog
              assetId={a.id}
              marinaId={a.marina_id ?? null}
            />
          </div>
        </div>
      )}

      {/* ── Service History (dynamic) ─────────────────────────── */}
      {isEdit && a.id && (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 text-left font-medium text-slate-700 text-sm">
            Service History
          </div>
          <div className="px-4 py-4">
            <ServiceHistoryList
              assetId={a.id}
              marinaId={a.marina_id ?? null}
            />
          </div>
        </div>
      )}

      {/* ── Ship's Log (dynamic) ─────────────────────────────── */}
      {isEdit && a.id && (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 text-left font-medium text-slate-700 text-sm">
            Ship&#39;s Log
          </div>
          <div className="px-4 py-4">
            <ShipLogList
              assetId={a.id}
              marinaId={a.marina_id ?? null}
            />
          </div>
        </div>
      )}

      {/* ── Documents on File ───────────────────────────────── */}
      {isEdit && a.id && (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 text-left font-medium text-slate-700 text-sm">
            Documents on File
          </div>
          <div className="px-4 py-4">
            <DocumentList
              entityType="asset"
              entityId={a.id}
              marinaId={a.marina_id ?? null}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
        <button
          type="submit"
          className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          {isEdit ? 'Save Changes' : 'Create Asset'}
        </button>
        <a
          href="/assets"
          className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
        >
          Cancel
        </a>
      </div>
    </form>
  )
}
