/**
 * Asset Form — Types + Live Fetch
 *
 * OPS is the MASTER schema. This file contains ONLY types and the fetch function.
 * No schema data lives here. To change fields: edit OPS lib/asset-form-schema.ts, redeploy OPS.
 * All apps reflect automatically via the API fetch below.
 */

export type Role = 'ops' | 'helm' | 'boater' | 'crew' | 'contractor'
export type FieldType =
  | 'text' | 'textarea' | 'number' | 'date' | 'tel' | 'email'
  | 'select' | 'bool-select' | 'tag-input'

export interface FieldOption { value: string; label: string }

export interface AssetField {
  name: string
  label: string
  type: FieldType
  placeholder?: string
  hint?: string
  required?: boolean
  options?: FieldOption[]
  roles: 'all' | Role[]
}

export interface AssetRow {
  cols?: number
  groupLabel?: string
  fields: (AssetField | null)[]
}

export interface AssetSection {
  id: string
  title: string
  roles: 'all' | Role[]
  rows: AssetRow[]
}

export function sectionVisibleTo(section: AssetSection, role: Role): boolean {
  if (section.roles === 'all') return true
  return section.roles.includes(role)
}
export function fieldVisibleTo(field: AssetField | null, role: Role): boolean {
  if (!field) return true
  if (field.roles === 'all') return true
  return field.roles.includes(role)
}

export async function fetchAssetFormSchema(): Promise<AssetSection[]> {
  const res = await fetch('https://ops.ayeayeskipper.com/api/asset-form-schema', { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to load schema from OPS')
  return (await res.json()) as AssetSection[]
}
