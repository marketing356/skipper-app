'use client'
/**
 * ContactForm — Schema-Driven Contact Form for Skipper mobile app.
 * COPIED FROM OPS (ops.ayeayeskipper.com) — this is verbatim with mobile adaptations.
 * Role = 'boater': ops/helm-only sections hidden automatically by schema.
 * Uses Supabase client directly (no server actions — mobile is pure client-side).
 * One person = ONE row in contacts. No ghost fields.
 * To add a field: edit OPS lib/contact-form-schema.ts, redeploy. This form reflects automatically.
 */
import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import DocumentList from '@/components/DocumentList'
import {
  CONTACT_FORM_SCHEMA,
  sectionVisibleTo,
  fieldVisibleTo,
  type Role,
  type ContactField,
} from '@/lib/contact-form-schema'

const FONT = '"SF Pro Display", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
const ROLE: Role = 'boater'

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
  userId: string
  contact?: Record<string, unknown>
  onSaved: (contact: Record<string, unknown>) => void
  onCancel?: () => void
  submitLabel?: string
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
      style={{ ...inputStyle, WebkitAppearance: 'auto', appearance: 'auto', colorScheme: 'dark' } as unknown as React.CSSProperties}>
      {children}
    </select>
  )
}

function FBoolSelect({ name, defaultValue }: { name: string; defaultValue?: boolean | null }) {
  const val = defaultValue === true ? 'true' : defaultValue === false ? 'false' : ''
  return (
    <select name={name} defaultValue={val}
      style={{ ...inputStyle, WebkitAppearance: 'auto', appearance: 'auto', colorScheme: 'dark' } as unknown as React.CSSProperties}>
      <option value="">— Not set —</option>
      <option value="true">Yes</option>
      <option value="false">No</option>
    </select>
  )
}

const TEXTAREA_ROWS: Record<string, number> = {
  internal_notes: 3,
  shift_notes: 2,
  notes: 4,
}

// ─── Control renderer (mirrors OPS ContactForm) ───────────────────────────────
function renderControl(field: ContactField, c: Record<string, unknown>) {
  switch (field.type) {
    case 'textarea':
      return (
        <textarea name={field.name} rows={TEXTAREA_ROWS[field.name] ?? 3}
          placeholder={field.placeholder}
          defaultValue={(c[field.name] ?? '') as string}
          style={{ ...inputStyle, resize: 'none' }} />
      )
    case 'select':
      return (
        <FSelect name={field.name} defaultValue={c[field.name]}>
          {field.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </FSelect>
      )
    case 'bool-select':
      return <FBoolSelect name={field.name} defaultValue={c[field.name] as boolean | null} />
    default:
      return <FInput name={field.name} type={field.type} placeholder={field.placeholder} defaultValue={c[field.name]} />
  }
}

// ─── FormData → payload ───────────────────────────────────────────────────────
function s(fd: FormData, key: string): string | null {
  const v = (fd.get(key) as string)?.trim(); return v || null
}
function b(fd: FormData, key: string): boolean | null {
  const v = fd.get(key) as string
  if (v === 'true') return true; if (v === 'false') return false; return null
}

function buildContactPayload(fd: FormData) {
  // Collect every field the boater role can see from the schema
  // String fields
  const stringFields = [
    'photo_url','title','first_name','last_name','preferred_name',
    'email','email_secondary','phone','mobile','phone_work','fax','website',
    'company_organization','job_title',
    'address','address_line2','address_city','address_state','address_zip','country',
    'date_of_birth',
    'driver_license_number','drivers_license_state','drivers_license_expiry',
    'passport_number','passport_country','passport_expiry','nationality',
    'mmc_license_number','mmc_tonnage_rating','mmc_expiry',
    'oupv_license_number','oupv_expiry',
    'twic_number','twic_expiry',
    'stcw_certification','stcw_level','stcw_expiry',
    'fcc_license_number','fcc_expiry',
    'cpr_certification','cpr_expiry',
    'dealer_license_number','dealer_license_state',
    'broker_license_number','broker_license_state',
    'billing_name','billing_email','billing_address','billing_city','billing_state','billing_zip',
    'emergency_name','emergency_phone','emergency_relationship',
    'emergency_name_2','emergency_phone_2',
    'seatow_membership_number','boatus_membership_number',
    'preferred_contact_method','language_preference',
    'notes',
  ]
  const boolFields = [
    'sms_opt_in','email_opt_in','tax_exempt','autopay',
  ]

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of stringFields) {
    payload[key] = s(fd, key)
  }
  for (const key of boolFields) {
    payload[key] = b(fd, key)
  }

  return payload
}

const FORM_CSS = `
  .skipper-contact-form select option { background: #05111f; color: #ffffff; }
  .skipper-contact-form select { color-scheme: dark; }
`

// ─── Main component ───────────────────────────────────────────────────────────
export default function ContactForm({ userId, contact, onSaved, onCancel, submitLabel }: Props) {
  const c = contact ?? {}
  const formRef = useRef<HTMLFormElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formRef.current) return
    const fd = new FormData(formRef.current)
    if (!s(fd, 'first_name')) { setErr('First name is required'); return }
    setBusy(true); setErr('')

    const payload = buildContactPayload(fd)

    const { data, error } = await supabase
      .from('contacts')
      .update(payload)
      .eq('auth_user_id', userId)
      .is('marina_id', null)
      .select()
      .maybeSingle()

    setBusy(false)
    if (error || !data) { setErr(error?.message ?? 'Save failed — please try again'); return }
    onSaved(data as Record<string, unknown>)
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="skipper-contact-form"
      style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <style>{FORM_CSS}</style>

      {CONTACT_FORM_SCHEMA
        .filter(section => sectionVisibleTo(section, ROLE))
        .map((section, sIdx) => (
          <Section key={section.id} title={section.title} defaultOpen={sIdx === 0}>
            {section.rows.map((row, rowIdx) => {
              const hasVisible = row.fields.some(f => f !== null && fieldVisibleTo(f, ROLE))
              if (!hasVisible) return null
              return (
                <div key={rowIdx}>
                  {row.groupLabel && (
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', margin: '0 0 6px', fontFamily: FONT }}>{row.groupLabel}</p>
                  )}
                  <Row cols={row.cols ?? 2}>
                    {row.fields.map((field, fieldIdx) => {
                      if (field === null) return <div key={fieldIdx} />
                      if (!fieldVisibleTo(field, ROLE)) return <div key={fieldIdx} />
                      return (
                        <Field key={field.name} label={field.label} required={field.required} hint={field.hint}>
                          {renderControl(field, c)}
                        </Field>
                      )
                    })}
                  </Row>
                </div>
              )
            })}
          </Section>
        ))}

      {/* ── Documents on File (edit only) ──────────────────── */}
      {c.id && (
        <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.05)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.7)', fontFamily: FONT }}>Documents on File</div>
          <div style={{ padding: 14, background: 'rgba(255,255,255,0.02)' }}>
            <DocumentList entityType="contact" entityId={c.id as string} marinaId={null} />
          </div>
        </div>
      )}

      {err && <p style={{ color: '#f87171', fontSize: 13, margin: 0, fontFamily: FONT }}>{err}</p>}

      <div style={{ display: 'flex', gap: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button type="submit" disabled={busy}
          style={{ flex: 1, padding: '13px 0', background: '#4dd6c8', color: '#05111f', border: 'none', borderRadius: 10, fontFamily: FONT, fontSize: 15, fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.7 : 1 }}>
          {busy ? 'Saving…' : (submitLabel ?? 'Save & Continue →')}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}
            style={{ padding: '13px 18px', background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: 'rgba(255,255,255,0.6)', fontFamily: FONT, fontSize: 14, cursor: 'pointer' }}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
