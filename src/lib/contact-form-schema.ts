/**
 * Contact Form Schema — Single Source of Truth
 * Mirrors ops.ayeayeskipper.com/api/contact-form-schema
 * Role 'boater' = what the Skipper App shows.
 * Last updated: 2026-06-22
 */

export type Role = 'ops' | 'helm' | 'boater' | 'crew'
export type FieldType =
  | 'text' | 'email' | 'tel' | 'date' | 'number'
  | 'textarea' | 'select' | 'bool-select' | 'tag-input'

export interface FieldOption { value: string; label: string }

export interface ContactField {
  name: string
  label: string
  type: FieldType
  placeholder?: string
  required?: boolean
  options?: FieldOption[]
  hint?: string
  roles: Role[] | 'all'
}

export interface ContactRow {
  cols?: 1 | 2 | 3
  groupLabel?: string
  fields: (ContactField | null)[]
}

export interface ContactSection {
  id: string
  title: string
  roles: Role[] | 'all'
  rows: ContactRow[]
}

export function sectionVisibleTo(section: ContactSection, role: Role): boolean {
  if (section.roles === 'all') return true
  return (section.roles as Role[]).includes(role)
}

export function fieldVisibleTo(field: ContactField | null, role: Role): boolean {
  if (!field) return false  // null spacers: skip in mobile (no grid)
  if (field.roles === 'all') return true
  return (field.roles as Role[]).includes(role)
}

export const CONTACT_FORM_SCHEMA: ContactSection[] = [
  { id: 'identity', title: 'Identity', roles: 'all', rows: [
    { fields: [
      { name: 'title', label: 'Title', type: 'select', roles: 'all', options: [
        { value: '', label: '—' }, { value: 'Mr.', label: 'Mr.' }, { value: 'Mrs.', label: 'Mrs.' },
        { value: 'Ms.', label: 'Ms.' }, { value: 'Dr.', label: 'Dr.' }, { value: 'Capt.', label: 'Capt.' },
      ]},
      { name: 'preferred_name', label: 'Preferred Name', type: 'text', placeholder: 'Nickname', roles: 'all' },
    ]},
    { fields: [
      { name: 'first_name', label: 'First Name', type: 'text', placeholder: 'John', required: true, roles: 'all' },
      { name: 'last_name', label: 'Last Name', type: 'text', placeholder: 'Smith', roles: 'all' },
    ]},
  ]},
  { id: 'contact_info', title: 'Contact Info', roles: 'all', rows: [
    { fields: [
      { name: 'email', label: 'Email', type: 'email', placeholder: 'john@example.com', roles: 'all' },
      { name: 'email_secondary', label: 'Secondary Email', type: 'email', placeholder: 'other@example.com', roles: 'all' },
    ]},
    { fields: [
      { name: 'mobile', label: 'Mobile', type: 'tel', placeholder: '+1 (555) 000-0000', roles: 'all' },
      { name: 'phone', label: 'Phone', type: 'tel', placeholder: '+1 (555) 000-0000', roles: 'all' },
    ]},
    { fields: [
      { name: 'phone_work', label: 'Work Phone', type: 'tel', placeholder: '+1 (555) 000-0000', roles: 'all' },
      { name: 'fax', label: 'Fax', type: 'tel', placeholder: '+1 (555) 000-0000', roles: 'all' },
    ]},
    { fields: [
      { name: 'website', label: 'Website', type: 'text', placeholder: 'https://example.com', roles: 'all' },
      { name: 'preferred_contact_method', label: 'Preferred Contact Method', type: 'select', roles: 'all', options: [
        { value: '', label: '— Not set —' }, { value: 'email', label: 'Email' },
        { value: 'mobile', label: 'Mobile' }, { value: 'phone', label: 'Phone' }, { value: 'sms', label: 'SMS' },
      ]},
    ]},
    { fields: [{ name: 'language_preference', label: 'Language Preference', type: 'text', placeholder: 'English', roles: 'all' }]},
    { fields: [{ name: 'languages_spoken', label: 'Languages Spoken', type: 'tag-input', placeholder: 'e.g. English, Spanish, French…', hint: 'Type a language and press Enter to add', roles: 'all' }]},
  ]},
  { id: 'company', title: 'Company / Organization', roles: 'all', rows: [
    { fields: [
      { name: 'company_organization', label: 'Company / Organization', type: 'text', placeholder: 'ABC Corp', roles: 'all' },
      { name: 'job_title', label: 'Job Title', type: 'text', placeholder: 'Captain', roles: 'all' },
    ]},
  ]},
  { id: 'address', title: 'Address', roles: 'all', rows: [
    { fields: [{ name: 'address', label: 'Street Address', type: 'text', placeholder: '123 Harbor Blvd', roles: 'all' }]},
    { fields: [{ name: 'address_line2', label: 'Address Line 2', type: 'text', placeholder: 'Unit 4, Dock B', roles: 'all' }]},
    { fields: [
      { name: 'address_city', label: 'City', type: 'text', placeholder: 'Newport', roles: 'all' },
      { name: 'address_state', label: 'State', type: 'text', placeholder: 'RI', roles: 'all' },
      { name: 'address_zip', label: 'ZIP', type: 'text', placeholder: '02840', roles: 'all' },
    ]},
    { fields: [
      { name: 'country', label: 'Country', type: 'text', placeholder: 'USA', roles: 'all' },
      { name: 'nationality', label: 'Nationality / Citizenship', type: 'text', placeholder: 'American', roles: 'all' },
    ]},
  ]},
  { id: 'identity_docs', title: 'ID & Preferences', roles: 'all', rows: [
    { fields: [
      { name: 'date_of_birth', label: 'Date of Birth', type: 'date', roles: 'all' },
    ]},
    { fields: [
      { name: 'driver_license_number', label: 'Driver License #', type: 'text', placeholder: 'D1234567', roles: 'all' },
      { name: 'drivers_license_state', label: 'License State', type: 'text', placeholder: 'FL', roles: 'all' },
      { name: 'drivers_license_expiry', label: 'License Expiry', type: 'date', roles: 'all' },
    ]},
    { fields: [
      { name: 'passport_number', label: 'Passport Number', type: 'text', placeholder: 'US1234567', roles: 'all' },
      { name: 'passport_country', label: 'Issuing Country', type: 'text', placeholder: 'USA', roles: 'all' },
      { name: 'passport_expiry', label: 'Passport Expiry', type: 'date', roles: 'all' },
    ]},
  ]},
  { id: 'maritime', title: 'Maritime Licenses', roles: 'all', rows: [
    { fields: [
      { name: 'oupv_license_number', label: 'OUPV License #', type: 'text', placeholder: 'OUPV #', hint: '6-pack', roles: 'all' },
      { name: 'oupv_expiry', label: 'OUPV Expiry', type: 'date', roles: 'all' },
    ]},
    { fields: [
      { name: 'mmc_license_number', label: "Master's License # (MMC)", type: 'text', placeholder: 'MMC #', hint: 'Merchant Mariner Credential', roles: 'all' },
      { name: 'mmc_tonnage_rating', label: 'MMC Tonnage', type: 'select', roles: 'all', options: [
        { value: '', label: '— Not set —' }, { value: '25T', label: '25 Tons' }, { value: '50T', label: '50 Tons' },
        { value: '100T', label: '100 Tons' }, { value: '200T', label: '200 Tons' }, { value: '500T', label: '500 Tons' }, { value: '1600T', label: '1,600 Tons' },
      ]},
      { name: 'mmc_expiry', label: 'MMC Expiry', type: 'date', roles: 'all' },
    ]},
    { fields: [
      { name: 'twic_number', label: 'TWIC Card #', type: 'text', placeholder: 'TWIC #', hint: 'Transportation Worker ID', roles: 'all' },
      { name: 'twic_expiry', label: 'TWIC Expiry', type: 'date', roles: 'all' },
    ]},
    { fields: [
      { name: 'stcw_certification', label: 'STCW Certification #', type: 'text', placeholder: 'STCW cert #', roles: 'all' },
      { name: 'stcw_level', label: 'STCW Level', type: 'select', roles: 'all', options: [
        { value: '', label: '— Not set —' }, { value: 'basic', label: 'Basic Safety' },
        { value: 'operational', label: 'Operational Level' }, { value: 'management', label: 'Management Level' },
      ]},
      { name: 'stcw_expiry', label: 'STCW Expiry', type: 'date', roles: 'all' },
    ]},
    { fields: [
      { name: 'fcc_license_number', label: 'FCC Marine Radio License #', type: 'text', placeholder: 'FCC #', roles: 'all' },
      { name: 'fcc_expiry', label: 'FCC Expiry', type: 'date', roles: 'all' },
    ]},
    { fields: [
      { name: 'cpr_certification', label: 'CPR / First Aid Cert', type: 'text', placeholder: 'Red Cross #', roles: 'all' },
      { name: 'cpr_expiry', label: 'CPR Expiry', type: 'date', roles: 'all' },
    ]},
  ]},
  { id: 'trade', title: 'Trade & Service', roles: 'all', rows: [
    { fields: [{ name: 'abyc_certifications', label: 'ABYC Certifications', type: 'tag-input', placeholder: 'e.g. Electrical, Diesel…', hint: 'Press Enter after each', roles: 'all' }]},
    { fields: [{ name: 'engine_brand_certifications', label: 'Engine Brand Certifications', type: 'tag-input', placeholder: 'e.g. Yamaha, Mercury…', roles: 'all' }]},
    { fields: [{ name: 'trade_specialties', label: 'Trade Specialties', type: 'tag-input', placeholder: 'e.g. Engine, Electrical…', roles: 'all' }]},
  ]},
  { id: 'dealer_broker', title: 'Dealer & Broker Licenses', roles: 'all', rows: [
    { fields: [
      { name: 'dealer_license_number', label: 'Dealer License #', type: 'text', roles: 'all' },
      { name: 'dealer_license_state', label: 'Dealer License State', type: 'text', placeholder: 'FL', roles: 'all' },
    ]},
    { fields: [
      { name: 'broker_license_number', label: 'Broker License #', type: 'text', roles: 'all' },
      { name: 'broker_license_state', label: 'Broker License State', type: 'text', placeholder: 'FL', roles: 'all' },
    ]},
  ]},
  { id: 'memberships', title: 'Memberships', roles: 'all', rows: [
    { fields: [
      { name: 'seatow_membership_number', label: 'Sea Tow Membership #', type: 'text', placeholder: 'Sea Tow #', roles: 'all' },
      { name: 'boatus_membership_number', label: 'BoatUS Membership #', type: 'text', placeholder: 'BoatUS #', roles: 'all' },
    ]},
  ]},
  { id: 'billing', title: 'Billing', roles: 'all', rows: [
    { fields: [
      { name: 'billing_name', label: 'Billing Name', type: 'text', placeholder: 'Same as contact name', roles: 'all' },
      { name: 'billing_email', label: 'Billing Email', type: 'email', placeholder: 'billing@example.com', roles: 'all' },
    ]},
    { fields: [
      { name: 'billing_address', label: 'Billing Address', type: 'text', roles: 'all' },
      { name: 'billing_city', label: 'Billing City', type: 'text', roles: 'all' },
    ]},
    { fields: [
      { name: 'billing_state', label: 'Billing State', type: 'text', roles: 'all' },
      { name: 'billing_zip', label: 'Billing ZIP', type: 'text', roles: 'all' },
    ]},
  ]},
  { id: 'emergency_contact', title: 'Emergency Contact (extended)', roles: 'all', rows: [
    { fields: [
      { name: 'emergency_name', label: 'Name', type: 'text', placeholder: 'Jane Smith', roles: 'all' },
      { name: 'emergency_relationship', label: 'Relationship', type: 'text', placeholder: 'Spouse', roles: 'all' },
      { name: 'emergency_phone', label: 'Phone', type: 'tel', roles: 'all' },
    ]},
    { fields: [
      { name: 'emergency_name_2', label: 'Secondary Contact Name', type: 'text', placeholder: 'Bob Jones', roles: 'all' },
      { name: 'emergency_phone_2', label: 'Secondary Contact Phone', type: 'tel', roles: 'all' },
    ]},
  ]},
  { id: 'preferences', title: 'Preferences & Notes', roles: 'all', rows: [
    { fields: [
      { name: 'sms_opt_in', label: 'SMS Opt-in', type: 'bool-select', roles: 'all' },
      { name: 'email_opt_in', label: 'Email Opt-in', type: 'bool-select', roles: 'all' },
    ]},
    { fields: [{ name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Any notes…', roles: 'all' }]},
  ]},
]
