'use client'
/**
 * AssetForm — Schema-Driven Master Vessel/Asset Form.
 * SOURCE: ops.ayeayeskipper.com components/AssetForm.tsx — verbatim.
 * Mobile adaptations only:
 *   1. Server actions → Supabase client (mobile is pure client-side)
 *   2. Props: contactId/onSaved/onCancel instead of marinas/contacts
 *   3. Dark inline styles instead of Tailwind
 *   4. Role = 'boater'
 * Fields, sections, layout, sub-components: identical to OPS.
 */
import { useState, useRef } from 'react'
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

interface Props {
  contactId: string
  asset?: Record<string, unknown>
  onSaved: (asset: Record<string, unknown>) => void
  onCancel: () => void
}

// ─── Section (collapsible) ────────────────────────────────────────────────────
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
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.65)', marginBottom: 4, fontFamily: FONT }}>
        {label}{required && <span style={{ color: '#f87171', marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {hint && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '3px 0 0', fontFamily: FONT }}>{hint}</p>}
    </div>
  )
}

// ─── Input primitives ─────────────────────────────────────────────────────────
function FInput({ name, type = 'text', placeholder, defaultValue }: { name: string; type?: string; placeholder?: string; defaultValue?: unknown }) {
  return <input name={name} type={type} placeholder={placeholder} defaultValue={(defaultValue ?? '') as string} style={inputStyle} />
}

function FSelect({ name, defaultValue, children }: { name: string; defaultValue?: unknown; children: React.ReactNode }) {
  return (
    <select name={name} defaultValue={(defaultValue ?? '') as string}
      style={{ ...inputStyle, WebkitAppearance: 'auto', appearance: 'auto' } as unknown as React.CSSProperties}>
      {children}
    </select>
  )
}

function FBoolSelect({ name, defaultValue }: { name: string; defaultValue?: boolean | null }) {
  const val = defaultValue === true ? 'true' : defaultValue === false ? 'false' : ''
  return (
    <select name={name} defaultValue={val}
      style={{ ...inputStyle, WebkitAppearance: 'auto', appearance: 'auto' } as unknown as React.CSSProperties}>
      <option value="">— Not set —</option>
      <option value="true">Yes</option>
      <option value="false">No</option>
    </select>
  )
}

const TEXTAREA_ROWS: Record<string, number> = { notes: 4, retired_reason: 2 }

// ─── Control renderer — mirrors OPS AssetForm ────────────────────────────────
function renderControl(field: AssetField, a: Record<string, unknown>) {
  switch (field.type) {
    case 'textarea':
      return (
        <textarea name={field.name} rows={TEXTAREA_ROWS[field.name] ?? 3}
          className="form-input" style={{ ...inputStyle, resize: 'none' }}
          placeholder={field.placeholder} defaultValue={(a[field.name] ?? '') as string} />
      )
    case 'select':
      return (
        <FSelect name={field.name} defaultValue={a[field.name]}>
          {field.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </FSelect>
      )
    case 'bool-select':
      return <FBoolSelect name={field.name} defaultValue={a[field.name] as boolean | null} />
    case 'tag-input':
      return <TagInput name={field.name} defaultValue={a[field.name] as string[] | null} placeholder={field.placeholder} />
    default:
      return <FInput name={field.name} type={field.type} placeholder={field.placeholder} defaultValue={a[field.name]} />
  }
}

// ─── FormData → payload (mirrors OPS lib/actions.ts assetPayload) ─────────────
function s(fd: FormData, k: string): string | null { const v = (fd.get(k) as string)?.trim(); return v || null }
function n(fd: FormData, k: string): number | null { const v = fd.get(k) as string; return v ? parseFloat(v) : null }
function i(fd: FormData, k: string): number | null { const v = fd.get(k) as string; return v ? parseInt(v, 10) : null }
function b(fd: FormData, k: string): boolean | null { const v = fd.get(k) as string; if (v === 'true') return true; if (v === 'false') return false; return null }
function t(fd: FormData, k: string): string[] { const v = fd.get(k) as string; if (!v) return []; try { const p = JSON.parse(v); return Array.isArray(p) ? p.filter(Boolean) : [] } catch { return [] } }

function buildPayload(fd: FormData) {
  return {
    name: s(fd, 'name'),
    photo_url: s(fd, 'photo_url'),
    status: s(fd, 'status') || 'active',
    asset_category: s(fd, 'asset_category'),
    asset_type: s(fd, 'asset_type') || 'powerboat',
    asset_subtype: s(fd, 'asset_subtype'),
    make: s(fd, 'make'),
    model: s(fd, 'model'),
    year: i(fd, 'year'),
    color: s(fd, 'color'),
    hull_material: s(fd, 'hull_material'),
    length_ft: n(fd, 'length_ft'),
    beam_ft: n(fd, 'beam_ft'),
    draft_ft: n(fd, 'draft_ft'),
    air_draft_ft: n(fd, 'air_draft_ft'),
    weight_lbs: n(fd, 'weight_lbs'),
    keel_type: s(fd, 'keel_type'),
    bottom_paint_type: s(fd, 'bottom_paint_type'),
    fuel_type: s(fd, 'fuel_type'),
    fuel_tank_gallons: n(fd, 'fuel_tank_gallons'),
    engine_count: i(fd, 'engine_count'),
    engine_type: s(fd, 'engine_type'),
    engine_make: s(fd, 'engine_make'),
    engine_model: s(fd, 'engine_model'),
    engine_year: i(fd, 'engine_year'),
    engine_serial: s(fd, 'engine_serial'),
    horsepower_per_engine: n(fd, 'horsepower_per_engine'),
    engine_hp: n(fd, 'engine_hp'),
    total_horsepower: n(fd, 'total_horsepower'),
    raw_water_cooled: b(fd, 'raw_water_cooled'),
    shore_power: b(fd, 'shore_power'),
    hin: s(fd, 'hin'),
    documentation_number: s(fd, 'documentation_number'),
    registration_number: s(fd, 'registration_number'),
    registration_state: s(fd, 'registration_state'),
    registration_expiry: s(fd, 'registration_expiry'),
    state_reg_expiry: s(fd, 'state_reg_expiry'),
    flag_state: s(fd, 'flag_state'),
    mmsi_number: s(fd, 'mmsi_number'),
    insurance_provider: s(fd, 'insurance_provider'),
    insurance_policy: s(fd, 'insurance_policy'),
    insurance_coverage_amount: n(fd, 'insurance_coverage_amount'),
    insurance_expiry: s(fd, 'insurance_expiry'),
    insurance_agent_name: s(fd, 'insurance_agent_name'),
    insurance_agent_phone: s(fd, 'insurance_agent_phone'),
    life_raft: b(fd, 'life_raft'),
    life_jacket_count: i(fd, 'life_jacket_count'),
    epirb_serial: s(fd, 'epirb_serial'),
    epirb_expiry: s(fd, 'epirb_expiry'),
    flare_kit_expiry: s(fd, 'flare_kit_expiry'),
    fire_extinguisher_expiry: s(fd, 'fire_extinguisher_expiry'),
    oil_placard: b(fd, 'oil_placard'),
    discharge_placard: b(fd, 'discharge_placard'),
    alarm: b(fd, 'alarm'),
    gps_tracker: b(fd, 'gps_tracker'),
    lock_type: s(fd, 'lock_type'),
    lock_location: s(fd, 'lock_location'),
    lock_combination: s(fd, 'lock_combination'),
    authorized_operators: t(fd, 'authorized_operators'),
    last_haulout_date: s(fd, 'last_haulout_date'),
    last_survey_date: s(fd, 'last_survey_date'),
    has_trailer: b(fd, 'has_trailer'),
    trailer_make: s(fd, 'trailer_make'),
    trailer_type: s(fd, 'trailer_type'),
    trailer_axle_count: i(fd, 'trailer_axle_count'),
    trailer_length_ft: n(fd, 'trailer_length_ft'),
    trailer_width_ft: n(fd, 'trailer_width_ft'),
    trailer_plate: s(fd, 'trailer_plate'),
    trailer_vin: s(fd, 'trailer_vin'),
    notes: s(fd, 'notes'),
    updated_at: new Date().toISOString(),
  }
}

const FORM_CSS = `.skipper-asset-form select option { background: #05111f; color: #fff; } .skipper-asset-form select { color-scheme: dark; }`

// ─── Main component ───────────────────────────────────────────────────────────
export default function AssetForm({ contactId, asset, onSaved, onCancel }: Props) {
  const a = asset ?? {}
  const isEdit = !!a.id
  const role: Role = 'boater'
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formRef.current) return
    const fd = new FormData(formRef.current)
    if (!s(fd, 'name')) { setErr('Vessel name is required'); return }
    setBusy(true); setErr('')

    const payload = buildPayload(fd)
    let result: Record<string, unknown> | null = null
    let errMsg = ''

    if (isEdit) {
      const { data, error } = await supabase.from('marina_assets').update(payload).eq('id', a.id as string).select().single()
      if (error) errMsg = error.message
      else result = data as Record<string, unknown>
    } else {
      const { data, error } = await supabase.from('marina_assets').insert({ ...payload, tenant_id: contactId, marina_id: null, owner_type: 'customer' }).select().single()
      if (error) errMsg = error.message
      else result = data as Record<string, unknown>
    }

    setBusy(false)
    if (errMsg) { setErr(errMsg); return }
    if (result) onSaved(result)
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="skipper-asset-form"
      style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <style>{FORM_CSS}</style>
      {isEdit && <input type="hidden" name="id" value={a.id as string} />}

      {/* ── Schema-driven sections (mirrors OPS exactly) ── */}
      {ASSET_FORM_SCHEMA
        .filter(section => sectionVisibleTo(section, role))
        .map((section, sIdx) => (
          <Section key={section.id} title={section.title} defaultOpen={sIdx === 0}>
            {section.rows.map((row, rowIdx) => {
              const hasVisible = row.fields.some(f => f !== null && fieldVisibleTo(f, role))
              if (!hasVisible) return null
              return (
                <div key={rowIdx}>
                  {row.groupLabel && (
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', margin: '0 0 6px', fontFamily: FONT }}>{row.groupLabel}</p>
                  )}
                  <Row cols={row.cols ?? 2}>
                    {row.fields.map((field, fieldIdx) => {
                      if (field === null) return <div key={fieldIdx} />
                      if (!fieldVisibleTo(field, role)) return <div key={fieldIdx} />
                      return (
                        <Field key={field.name} label={field.label} required={field.required} hint={field.hint}>
                          {renderControl(field, a)}
                        </Field>
                      )
                    })}
                  </Row>
                </div>
              )
            })}
          </Section>
        ))}

      {/* ── Engines (dynamic, edit only) ── */}
      {isEdit && a.id && (
        <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.05)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.7)', fontFamily: FONT }}>Engines</div>
          <div style={{ padding: 14, background: 'rgba(255,255,255,0.02)' }}>
            <EngineList assetId={a.id as string} marinaId={a.marina_id as string | null ?? null} />
          </div>
        </div>
      )}

      {/* ── Notes (dynamic, edit only) ── */}
      {isEdit && a.id && (
        <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.05)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.7)', fontFamily: FONT }}>Notes</div>
          <div style={{ padding: 14, background: 'rgba(255,255,255,0.02)' }}>
            <NotesLog assetId={a.id as string} marinaId={a.marina_id as string | null ?? null} />
          </div>
        </div>
      )}

      {/* ── Service History (dynamic, edit only) ── */}
      {isEdit && a.id && (
        <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.05)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.7)', fontFamily: FONT }}>Service History</div>
          <div style={{ padding: 14, background: 'rgba(255,255,255,0.02)' }}>
            <ServiceHistoryList assetId={a.id as string} marinaId={a.marina_id as string | null ?? null} />
          </div>
        </div>
      )}

      {/* ── Ship's Log (dynamic, edit only) ── */}
      {isEdit && a.id && (
        <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.05)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.7)', fontFamily: FONT }}>Ship&#39;s Log</div>
          <div style={{ padding: 14, background: 'rgba(255,255,255,0.02)' }}>
            <ShipLogList assetId={a.id as string} marinaId={a.marina_id as string | null ?? null} />
          </div>
        </div>
      )}

      {/* ── Documents on File (dynamic, edit only) ── */}
      {isEdit && a.id && (
        <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.05)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.7)', fontFamily: FONT }}>Documents on File</div>
          <div style={{ padding: 14, background: 'rgba(255,255,255,0.02)' }}>
            <DocumentList entityType="asset" entityId={a.id as string} marinaId={a.marina_id as string | null ?? null} />
          </div>
        </div>
      )}

      {err && <p style={{ color: '#f87171', fontSize: 13, margin: 0, fontFamily: FONT }}>{err}</p>}

      <div style={{ display: 'flex', gap: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button type="submit" disabled={busy}
          style={{ flex: 1, padding: '13px 0', background: '#4dd6c8', color: '#05111f', border: 'none', borderRadius: 10, fontFamily: FONT, fontSize: 15, fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.7 : 1 }}>
          {busy ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Vessel'}
        </button>
        <button type="button" onClick={onCancel}
          style={{ padding: '13px 18px', background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: 'rgba(255,255,255,0.6)', fontFamily: FONT, fontSize: 14, cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </form>
  )
}
