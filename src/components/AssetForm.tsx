'use client'
/**
 * AssetForm — verbatim OPS code (doctrine §13/§21).
 * Two mobile-only changes: schema fetched live from OPS API, save via API routes (supabaseAdmin).
 * All field rendering logic is identical to OPS. No custom wrappers. No mobile-specific overrides.
 */
import { useState, useEffect, useRef } from 'react'
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
    fuel_type:              str(fd, 'fuel_type'),
    shore_power:            ((fd.getAll('shore_power') as string[]).filter(Boolean).join(',')) || null,
    // Engine fields
    engine_count:           int(fd, 'engine_count'),
    engine_type:            str(fd, 'engine_type'),
    engine_make:            str(fd, 'engine_make'),
    engine_model:           str(fd, 'engine_model'),
    engine_year:            int(fd, 'engine_year'),
    engine_serial:          str(fd, 'engine_serial'),
    horsepower_per_engine:  num(fd, 'horsepower_per_engine'),
    fuel_tank_gallons:      num(fd, 'fuel_tank_gallons'),
    // Trailer fields
    has_trailer:            str(fd, 'has_trailer'),
    trailer_make:           str(fd, 'trailer_make'),
    trailer_type:           str(fd, 'trailer_type'),
    trailer_axle_count:     int(fd, 'trailer_axle_count'),
    trailer_length_ft:      num(fd, 'trailer_length_ft'),
    trailer_width_ft:       num(fd, 'trailer_width_ft'),
    trailer_plate:          str(fd, 'trailer_plate'),
    trailer_vin:            str(fd, 'trailer_vin'),
    owner_type:             str(fd, 'owner_type') || 'customer',
    notes:                  str(fd, 'notes'),
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
  const [photoUrl, setPhotoUrl] = useState<string>(a.photo_url ?? '')
  const [photoUploading, setPhotoUploading] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchAssetFormSchema().then(setSchema).catch(() => {})
  }, [])

  async function handlePhotoUpload(file: File) {
    if (!file) return
    setPhotoUploading(true)
    const form = new FormData()
    form.append('file', file)
    if (a.id) form.append('asset_id', a.id as string)
    try {
      const res = await fetch('/api/vessel-photo', { method: 'POST', body: form })
      const result = await res.json()
      if (res.ok && result.url) setPhotoUrl(result.url)
      else setError(result.error || 'Photo upload failed')
    } catch {
      setError('Photo upload failed')
    } finally {
      setPhotoUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    const payload = { ...buildPayload(fd), photo_url: photoUrl || null }

    if (!payload.name) { setError('Vessel name is required.'); setSaving(false); return }

    if (isEdit) {
      const res = await fetch(`/api/assets/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      if (!res.ok) { setError(result.error || 'Save failed'); setSaving(false); return }
      onSaved(result.asset)
    } else {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, tenant_id: contactId, owner_type: payload.owner_type || 'customer' }),
      })
      const result = await res.json()
      if (!res.ok) { setError(result.error || 'Save failed'); setSaving(false); return }
      onSaved(result.asset)
    }
    setSaving(false)
  }

  function renderControl(field: AssetField) {
    // Shore power — multi-select checkboxes using schema options (vessel may have multiple connections)
    if (field.name === 'shore_power') {
      const opts = field.options?.filter(o => o.value) ?? []
      const currentVals = ((a['shore_power'] as string) || '').split(',').map((v: string) => v.trim()).filter(Boolean)
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, paddingTop: 4 }}>
          {opts.map(opt => (
            <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#374151', cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="shore_power"
                value={opt.value}
                defaultChecked={currentVals.includes(opt.value)}
                style={{ width: 16, height: 16, accentColor: '#2dd4bf' }}
              />
              {opt.label}
            </label>
          ))}
        </div>
      )
    }
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

      {/* Vessel Photo Upload */}
      <div className="border border-slate-200 rounded-lg p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Vessel Photo</p>
        <div className="flex items-start gap-3">
          {photoUrl && (
            <img src={photoUrl} alt="Vessel" className="w-20 h-20 rounded-lg object-cover border border-slate-200 flex-shrink-0" />
          )}
          <div className="flex-1 space-y-2">
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={photoUploading}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
            >
              {photoUploading ? 'Uploading…' : photoUrl ? 'Change Photo' : 'Upload Photo'}
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f) }}
            />
            <p className="text-xs text-slate-400">JPEG · PNG · WEBP · HEIC · Max 10 MB</p>
            {photoUrl && (
              <input type="hidden" name="photo_url" value={photoUrl} />
            )}
          </div>
        </div>
      </div>

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
