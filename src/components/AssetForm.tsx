'use client'
/**
 * AssetForm — Schema-Driven Vessel Form (Skipper Mobile)
 * Dark-themed, client-side Supabase write. Same schema/columns as OPS + Helm.
 * ONE asset = ONE row in marina_assets. No ghost fields.
 * To add a field: edit lib/asset-form-schema.ts in OPS, redeploy all surfaces.
 */
import { useState } from 'react'
import { supabase } from '@/lib/supabase-client'
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
} as React.CSSProperties

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'none',
  lineHeight: 1.5,
}

interface Props {
  asset?: Record<string, any>
  contactId: string | null
  onSaved: (asset: Record<string, any>) => void
  onCancel?: () => void
}

// ─── FormData helpers (identical field mapping to actions.ts) ─────────────────
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
    // ── Identity ──────────────────────────────────────────────────────────────
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
    // ── Dimensions ────────────────────────────────────────────────────────────
    length_ft:         num(fd, 'length_ft'),
    beam_ft:           num(fd, 'beam_ft'),
    draft_ft:          num(fd, 'draft_ft'),
    air_draft_ft:      num(fd, 'air_draft_ft'),
    height_ft:         num(fd, 'height_ft'),
    weight_lbs:        num(fd, 'weight_lbs'),
    keel_type:         str(fd, 'keel_type'),
    keel_depth_ft:     num(fd, 'keel_depth_ft'),
    bottom_paint_type: str(fd, 'bottom_paint_type'),
    // ── Engine / Fuel ─────────────────────────────────────────────────────────
    fuel_type:              str(fd, 'fuel_type'),
    fuel_tank_gallons:      num(fd, 'fuel_tank_gallons'),
    engine_count:           int(fd, 'engine_count'),
    engine_type:            str(fd, 'engine_type'),
    engine_make:            str(fd, 'engine_make'),
    engine_model:           str(fd, 'engine_model'),
    engine_year:            int(fd, 'engine_year'),
    engine_serial:          str(fd, 'engine_serial'),
    horsepower_per_engine:  num(fd, 'horsepower_per_engine'),
    engine_hp:              num(fd, 'engine_hp'),
    total_horsepower:       num(fd, 'total_horsepower'),
    raw_water_cooled:       bool(fd, 'raw_water_cooled'),
    shore_power:            bool(fd, 'shore_power'),
    // ── Identifiers / Registration ────────────────────────────────────────────
    hin:                   str(fd, 'hin'),
    documentation_number:  str(fd, 'documentation_number'),
    registration_number:   str(fd, 'registration_number'),
    registration_state:    str(fd, 'registration_state'),
    registration_expiry:   str(fd, 'registration_expiry'),
    state_reg_expiry:      str(fd, 'state_reg_expiry'),
    flag_state:            str(fd, 'flag_state'),
    mmsi_number:           str(fd, 'mmsi_number'),
    // ── Insurance ─────────────────────────────────────────────────────────────
    insurance_provider:        str(fd, 'insurance_provider'),
    insurance_policy:          str(fd, 'insurance_policy'),
    insurance_coverage_amount: num(fd, 'insurance_coverage_amount'),
    insurance_expiry:          str(fd, 'insurance_expiry'),
    insurance_agent_name:      str(fd, 'insurance_agent_name'),
    insurance_agent_phone:     str(fd, 'insurance_agent_phone'),
    // ── Safety ────────────────────────────────────────────────────────────────
    life_raft:                bool(fd, 'life_raft'),
    life_jacket_count:        int(fd, 'life_jacket_count'),
    epirb_serial:             str(fd, 'epirb_serial'),
    epirb_expiry:             str(fd, 'epirb_expiry'),
    flare_kit_expiry:         str(fd, 'flare_kit_expiry'),
    fire_extinguisher_expiry: str(fd, 'fire_extinguisher_expiry'),
    oil_placard:              bool(fd, 'oil_placard'),
    discharge_placard:        bool(fd, 'discharge_placard'),
    // ── Security ──────────────────────────────────────────────────────────────
    alarm:                bool(fd, 'alarm'),
    gps_tracker:          bool(fd, 'gps_tracker'),
    lock_type:            str(fd, 'lock_type'),
    lock_location:        str(fd, 'lock_location'),
    lock_combination:     str(fd, 'lock_combination'),
    authorized_operators: tags(fd, 'authorized_operators'),
    // ── Service History ───────────────────────────────────────────────────────
    last_haulout_date: str(fd, 'last_haulout_date'),
    last_survey_date:  str(fd, 'last_survey_date'),
    // ── Trailer ───────────────────────────────────────────────────────────────
    has_trailer:        bool(fd, 'has_trailer'),
    trailer_make:       str(fd, 'trailer_make'),
    trailer_type:       str(fd, 'trailer_type'),
    trailer_axle_count: int(fd, 'trailer_axle_count'),
    trailer_length_ft:  num(fd, 'trailer_length_ft'),
    trailer_width_ft:   num(fd, 'trailer_width_ft'),
    trailer_plate:      str(fd, 'trailer_plate'),
    trailer_vin:        str(fd, 'trailer_vin'),
    // ── Sale / Value ──────────────────────────────────────────────────────────
    for_sale:        bool(fd, 'for_sale'),
    asking_price:    num(fd, 'asking_price'),
    estimated_value: num(fd, 'estimated_value'),
    // ── Location ──────────────────────────────────────────────────────────────
    marina_id:     str(fd, 'marina_id'),
    space_id:      str(fd, 'space_id'),
    location_type: str(fd, 'location_type'),
    location_ref:  str(fd, 'location_ref'),
    // ── Ownership ─────────────────────────────────────────────────────────────
    owner_type:       str(fd, 'owner_type') || 'customer',
    boater_vessel_id: str(fd, 'boater_vessel_id'),
    // ── Status ────────────────────────────────────────────────────────────────
    pending_review: bool(fd, 'pending_review'),
    retired_date:   str(fd, 'retired_date'),
    retired_reason: str(fd, 'retired_reason'),
    // ── Notes ─────────────────────────────────────────────────────────────────
    notes: str(fd, 'notes'),
  }
}

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(!!defaultOpen)
  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden' }}>
      <button type="button" onClick={() => setOpen(v => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', fontFamily: FONT, textAlign: 'left' }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.7)' }}>{title}</span>
        <span style={{ color: 'rgba(255,255,255,0.4)', display: 'inline-block', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', fontSize: 16 }}>›</span>
      </button>
      {open && (
        <div style={{ padding: 14, background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Row ──────────────────────────────────────────────────────────────────────
function Row({ cols = 2, children }: { cols?: number; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10 }}>
      {children}
    </div>
  )
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginBottom: 4, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}{required && <span style={{ color: '#ff6b6b', marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {hint && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: '4px 0 0', fontFamily: FONT }}>{hint}</p>}
    </div>
  )
}

// ─── Input ────────────────────────────────────────────────────────────────────
function Input({ name, type = 'text', placeholder, defaultValue }: {
  name: string; type?: string; placeholder?: string; defaultValue?: any
}) {
  return (
    <input name={name} type={type} placeholder={placeholder} defaultValue={defaultValue ?? ''}
      style={inputStyle} />
  )
}

// ─── Select ───────────────────────────────────────────────────────────────────
function Sel({ name, defaultValue, children }: { name: string; defaultValue?: any; children: React.ReactNode }) {
  return (
    <select name={name} defaultValue={defaultValue ?? ''} style={selectStyle}>
      {children}
    </select>
  )
}

// ─── Bool Select ──────────────────────────────────────────────────────────────
function BoolSel({ name, defaultValue }: { name: string; defaultValue?: boolean | null }) {
  const val = defaultValue === true ? 'true' : defaultValue === false ? 'false' : ''
  return (
    <select name={name} defaultValue={val} style={selectStyle}>
      <option value="">— Not set —</option>
      <option value="true">Yes</option>
      <option value="false">No</option>
    </select>
  )
}

const TEXTAREA_ROWS: Record<string, number> = { notes: 4, retired_reason: 2 }

// ─── Main component ───────────────────────────────────────────────────────────
export default function AssetForm({ asset, contactId, onSaved, onCancel }: Props) {
  const a = asset ?? {}
  const isEdit = !!a.id
  const role: Role = 'boater'
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    const payload = buildPayload(fd)

    if (isEdit) {
      const { data, error: err } = await supabase
        .from('marina_assets')
        .update(payload)
        .eq('id', a.id as string)
        .select()
        .single()
      if (err) { setError(err.message); setSaving(false); return }
      onSaved(data)
    } else {
      const { data, error: err } = await supabase
        .from('marina_assets')
        .insert({ ...payload, tenant_id: contactId, owner_type: payload.owner_type || 'customer' })
        .select()
        .single()
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
            placeholder={field.placeholder} defaultValue={a[field.name] ?? ''}
            style={textareaStyle} />
        )
      case 'select':
        return (
          <Sel name={field.name} defaultValue={a[field.name]}>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Sel>
        )
      case 'bool-select':
        return <BoolSel name={field.name} defaultValue={a[field.name]} />
      case 'tag-input':
        return (
          <TagInput name={field.name} defaultValue={a[field.name]} placeholder={field.placeholder} />
        )
      default:
        return (
          <Input name={field.name} type={field.type} placeholder={field.placeholder} defaultValue={a[field.name]} />
        )
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10, fontFamily: FONT }}>
      {isEdit && <input type="hidden" name="id" value={a.id as string} />}

      {/* ── Schema-driven sections ─────────────────────────────────────── */}
      {ASSET_FORM_SCHEMA
        .filter((section) => sectionVisibleTo(section, role))
        .map((section, sIdx) => (
          <Section key={section.id} title={section.title} defaultOpen={sIdx === 0}>
            {section.rows.map((row, rowIdx) => {
              const hasVisible = row.fields.some(f => f !== null && fieldVisibleTo(f, role))
              if (!hasVisible) return null
              return (
                <div key={rowIdx}>
                  {row.groupLabel && (
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 0.5, margin: '4px 0 6px', fontFamily: FONT }}>
                      {row.groupLabel}
                    </p>
                  )}
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

      {/* ── Engines (edit only) ────────────────────────────────────────── */}
      {isEdit && a.id && (
        <Section title="Engines">
          <EngineList assetId={a.id as string} marinaId={(a.marina_id as string) ?? null} />
        </Section>
      )}

      {/* ── Notes Log (edit only) ─────────────────────────────────────── */}
      {isEdit && a.id && (
        <Section title="Notes">
          <NotesLog assetId={a.id as string} marinaId={(a.marina_id as string) ?? null} />
        </Section>
      )}

      {/* ── Service History (edit only) ───────────────────────────────── */}
      {isEdit && a.id && (
        <Section title="Service History">
          <ServiceHistoryList assetId={a.id as string} marinaId={(a.marina_id as string) ?? null} />
        </Section>
      )}

      {/* ── Ship's Log (edit only) ────────────────────────────────────── */}
      {isEdit && a.id && (
        <Section title="Ship's Log">
          <ShipLogList assetId={a.id as string} marinaId={(a.marina_id as string) ?? null} />
        </Section>
      )}

      {/* ── Documents on File (edit only) ────────────────────────────── */}
      {isEdit && a.id && (
        <Section title="Documents on File">
          <DocumentList entityType="asset" entityId={a.id as string} marinaId={(a.marina_id as string) ?? null} />
        </Section>
      )}

      {/* ── Error ─────────────────────────────────────────────────────── */}
      {error && (
        <p style={{ color: '#ff6b6b', fontSize: 13, fontFamily: FONT, margin: 0 }}>{error}</p>
      )}

      {/* ── Actions ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
        <button type="submit" disabled={saving}
          style={{ flex: 1, padding: '12px 0', background: saving ? 'rgba(77,214,200,0.4)' : '#4dd6c8', color: '#0a1628', fontWeight: 700, fontSize: 15, border: 'none', borderRadius: 10, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: FONT }}>
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Vessel'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}
            style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: 15, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, cursor: 'pointer', fontFamily: FONT }}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
