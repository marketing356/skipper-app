'use client'
/**
 * AssetForm — verbatim OPS code (doctrine §13/§21).
 * Two mobile-only changes: schema fetched live from OPS API, save via client-side Supabase.
 * All field rendering logic is identical to OPS. No custom wrappers. No mobile-specific overrides.
 */
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-client'
import DocumentList from '@/components/DocumentList'
import EngineList from '@/components/EngineList'
import ServiceHistoryList from '@/components/ServiceHistoryList'
import ShipLogList from '@/components/ShipLogList'
import NotesLog from '@/components/NotesLog'
import TagInput from '@/components/TagInput'
import {
  fetchAssetFormSchema,
  sectionVisibleTo,
  fieldVisibleTo,
  type Role,
  type AssetField,
  type AssetSection,
} from '@/lib/asset-form-schema'

interface Props {
  asset?: Record<string, any>
  contactId: string | null
  onSaved: (asset: Record<string, any>) => void
  onCancel?: () => void
  refreshTrigger?: number
}

// ─── OPS verbatim sub-components ─────────────────────────────────────────────

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

const TEXTAREA_ROWS: Record<string, number> = { notes: 4, retired_reason: 2 }

// ─── Payload builder (mirrors OPS actions.ts assetPayload) ───────────────────
function str(fd: FormData, key: string): string | null {
  const v = (fd.get(key) as string)?.trim(); return v || null
}
function num(fd: FormData, key: string): number | null {
  const v = fd.get(key) as string; return v ? parseFloat(v) : null
}
function int(fd: FormData, key: string): number | null {
  const v = fd.get(key) as string; return v ? parseInt(v, 10) : null
}
function bool(fd: FormData, key: string): boolean | null {
  const v = fd.get(key) as string
  if (v === 'true') return true; if (v === 'false') return false; return null
}
function tags(fd: FormData, key: string): string[] {
  const v = fd.get(key) as string
  if (!v) return []
  try { const p = JSON.parse(v); return Array.isArray(p) ? p.filter(Boolean) : [] }
  catch { return [] }
}

function buildPayload(fd: FormData) {
  return {
    name:           str(fd, 'name'),
    photo_url:      str(fd, 'photo_url'),
    status:         str(fd, 'status') || 'active',
    asset_category: str(fd, 'asset_category'),
    asset_type:     str(fd, 'asset_type') || 'powerboat',
    asset_subtype:  str(fd, 'asset_subtype'),
    make:           str(fd, 'make'),
    model:          str(fd, 'model'),
    year:           int(fd, 'year'),
    color:          str(fd, 'color'),
    hull_material:  str(fd, 'hull_material'),
    length_ft:         num(fd, 'length_ft'),
    beam_ft:           num(fd, 'beam_ft'),
    draft_ft:          num(fd, 'draft_ft'),
    air_draft_ft:      num(fd, 'air_draft_ft'),
    weight_lbs:        num(fd, 'weight_lbs'),
    keel_type:         str(fd, 'keel_type'),
    bottom_paint_type: str(fd, 'bottom_paint_type'),
    hin:                   str(fd, 'hin'),
    documentation_number:  str(fd, 'documentation_number'),
    registration_number:   str(fd, 'registration_number'),
    registration_state:    str(fd, 'registration_state'),
    registration_expiry:   str(fd, 'registration_expiry'),
    state_reg_expiry:      str(fd, 'state_reg_expiry'),
    flag_state:            str(fd, 'flag_state'),
    mmsi_number:           str(fd, 'mmsi_number'),
    insurance_provider:        str(fd, 'insurance_provider'),
    insurance_policy:          str(fd, 'insurance_policy'),
    insurance_coverage_amount: num(fd, 'insurance_coverage_amount'),
    insurance_expiry:          str(fd, 'insurance_expiry'),
    insurance_agent_name:      str(fd, 'insurance_agent_name'),
    insurance_agent_phone:     str(fd, 'insurance_agent_phone'),
    life_raft:                bool(fd, 'life_raft'),
    life_jacket_count:        int(fd, 'life_jacket_count'),
    epirb_serial:             str(fd, 'epirb_serial'),
    epirb_expiry:             str(fd, 'epirb_expiry'),
    flare_kit_expiry:         str(fd, 'flare_kit_expiry'),
    fire_extinguisher_expiry: str(fd, 'fire_extinguisher_expiry'),
    oil_placard:              bool(fd, 'oil_placard'),
    discharge_placard:        bool(fd, 'discharge_placard'),
    alarm:                bool(fd, 'alarm'),
    gps_tracker:          bool(fd, 'gps_tracker'),
    lock_type:            str(fd, 'lock_type'),
    lock_location:        str(fd, 'lock_location'),
    lock_combination:     str(fd, 'lock_combination'),
    authorized_operators: tags(fd, 'authorized_operators'),
    owner_type: str(fd, 'owner_type') || 'customer',
    notes: str(fd, 'notes'),
  }
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AssetForm({ asset, contactId, onSaved, onCancel, refreshTrigger }: Props) {
  const a = asset ?? {}
  const isEdit = !!a.id
  const role: Role = 'boater'
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [schema, setSchema] = useState<AssetSection[]>([])

  useEffect(() => {
    fetchAssetFormSchema().then(setSchema).catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    const payload = buildPayload(fd)

    if (!payload.name) { setError('Vessel name is required.'); setSaving(false); return }

    if (isEdit) {
      const { data, error: err } = await supabase
        .from('marina_assets').update(payload).eq('id', a.id as string).select().single()
      if (err) { setError(err.message); setSaving(false); return }
      onSaved(data)
    } else {
      const { data, error: err } = await supabase
        .from('marina_assets')
        .insert({ ...payload, tenant_id: contactId, owner_type: payload.owner_type || 'customer' })
        .select().single()
      if (err) { setError(err.message); setSaving(false); return }
      onSaved(data)
    }
    setSaving(false)
  }

  function renderControl(field: AssetField) {
    switch (field.type) {
      case 'textarea':
        return (
          <textarea name={field.name} rows={TEXTAREA_ROWS[field.name] ?? 3}
            className="form-input resize-none" placeholder={field.placeholder}
            defaultValue={a[field.name] ?? ''} />
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
        return <TagInput name={field.name} defaultValue={a[field.name]} placeholder={field.placeholder} />
      default:
        return <Input name={field.name} type={field.type} placeholder={field.placeholder} defaultValue={a[field.name]} />
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {isEdit && <input type="hidden" name="id" value={a.id as string} />}

      {schema.filter((s) => sectionVisibleTo(s, role)).map((section, sIdx) => (
        <Section key={section.id} title={section.title} defaultOpen={sIdx === 0}>
          {section.rows.map((row, rowIdx) => {
            const hasVisible = row.fields.some((f) => f !== null && fieldVisibleTo(f, role))
            if (!hasVisible) return null
            return (
              <div key={rowIdx}>
                {row.groupLabel && <p className="text-sm font-medium text-slate-700 mb-2">{row.groupLabel}</p>}
                <Row cols={row.cols ?? 2}>
                  {row.fields.map((field, fIdx) => {
                    if (field === null) return <div key={fIdx} />
                    if (!fieldVisibleTo(field, role)) return <div key={fIdx} />
                    return (
                      <Field key={field.name} label={field.label} required={field.required} hint={field.hint}>
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

      {isEdit && a.id && (
        <>
          <Section title="Engines"><EngineList assetId={a.id as string} marinaId={a.marina_id ?? null} /></Section>
          <Section title="Notes"><NotesLog assetId={a.id as string} marinaId={a.marina_id ?? null} /></Section>
          <Section title="Service History"><ServiceHistoryList assetId={a.id as string} marinaId={a.marina_id ?? null} refreshTrigger={refreshTrigger} /></Section>
          <Section title="Ship's Log"><ShipLogList assetId={a.id as string} marinaId={a.marina_id ?? null} refreshTrigger={refreshTrigger} /></Section>
          <Section title="Documents on File"><DocumentList entityType="asset" entityId={a.id as string} marinaId={a.marina_id ?? null} /></Section>
        </>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
        <button type="submit" disabled={saving}
          className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Vessel'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
