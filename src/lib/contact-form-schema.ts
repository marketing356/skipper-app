/**
 * Contact Form Schema — Single Source of Truth
 * All 4 apps (OPS, Helm, Skipper App, Crew App) render from this schema.
 * To add a field: add it here, redeploy. Done.
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
  groupLabel?: string        // optional "Documents on File"-style header above this row
  fields: (ContactField | null)[]  // null = empty grid cell placeholder
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
  if (!field) return true  // null spacers are always included (render as empty div)
  if (field.roles === 'all') return true
  return (field.roles as Role[]).includes(role)
}

export const CONTACT_FORM_SCHEMA: ContactSection[] = [
  // ══ 1. IDENTITY ══════════════════════════════════════════
  {
    id: 'identity',
    title: 'Identity',
    roles: 'all',
    rows: [
      { cols: 1, fields: [
        { name: 'photo_url', label: 'Profile Photo URL', type: 'text', placeholder: 'https://…', roles: 'all' },
      ]},
      { cols: 2, fields: [
        { name: 'title', label: 'Title', type: 'select', roles: 'all', options: [
          { value: '', label: '—' },
          { value: 'Mr.', label: 'Mr.' },
          { value: 'Mrs.', label: 'Mrs.' },
          { value: 'Ms.', label: 'Ms.' },
          { value: 'Dr.', label: 'Dr.' },
          { value: 'Capt.', label: 'Capt.' },
        ]},
        { name: 'preferred_name', label: 'Preferred Name', type: 'text', placeholder: 'Nickname', roles: 'all' },
      ]},
      { cols: 2, fields: [
        { name: 'first_name', label: 'First Name', type: 'text', placeholder: 'John', required: true, roles: 'all' },
        { name: 'last_name', label: 'Last Name', type: 'text', placeholder: 'Smith', roles: 'all' },
      ]},
    ],
  },

  // ══ 2. CONTACT INFO ══════════════════════════════════════
  {
    id: 'contact_info',
    title: 'Contact Info',
    roles: 'all',
    rows: [
      { cols: 2, fields: [
        { name: 'email', label: 'Email', type: 'email', placeholder: 'john@example.com', roles: 'all' },
        { name: 'email_secondary', label: 'Secondary Email', type: 'email', placeholder: 'other@example.com', roles: 'all' },
      ]},
      { cols: 2, fields: [
        { name: 'mobile', label: 'Mobile', type: 'tel', placeholder: '+1 (555) 000-0000', roles: 'all' },
        { name: 'phone', label: 'Phone', type: 'tel', placeholder: '+1 (555) 000-0000', roles: 'all' },
      ]},
      { cols: 2, fields: [
        { name: 'phone_work', label: 'Work Phone', type: 'tel', placeholder: '+1 (555) 000-0000', roles: 'all' },
        { name: 'fax', label: 'Fax', type: 'tel', placeholder: '+1 (555) 000-0000', roles: 'all' },
      ]},
      { cols: 2, fields: [
        { name: 'website', label: 'Website', type: 'text', placeholder: 'https://example.com', roles: 'all' },
        { name: 'preferred_contact_method', label: 'Preferred Contact Method', type: 'select', roles: 'all', options: [
          { value: '', label: '— Not set —' },
          { value: 'email', label: 'Email' },
          { value: 'mobile', label: 'Mobile' },
          { value: 'phone', label: 'Phone' },
          { value: 'sms', label: 'SMS' },
        ]},
      ]},
      { cols: 1, fields: [
        { name: 'language_preference', label: 'Language Preference', type: 'text', placeholder: 'English', roles: 'all' },
      ]},
      { cols: 1, fields: [
        { name: 'languages_spoken', label: 'Languages Spoken', type: 'tag-input', placeholder: 'e.g. English, Spanish, French…', hint: 'Type a language and press Enter to add. Add as many as needed.', roles: 'all' },
      ]},
    ],
  },

  // ══ 3. COMPANY / ORGANIZATION ════════════════════════════
  {
    id: 'company',
    title: 'Company / Organization',
    roles: 'all',
    rows: [
      { cols: 2, fields: [
        { name: 'company_organization', label: 'Company / Organization', type: 'text', placeholder: 'ABC Corp', roles: 'all' },
        { name: 'job_title', label: 'Job Title', type: 'text', placeholder: 'Captain', roles: 'all' },
      ]},
    ],
  },

  // ══ 4. ADDRESS ═══════════════════════════════════════════
  {
    id: 'address',
    title: 'Address',
    roles: 'all',
    rows: [
      { cols: 1, fields: [
        { name: 'address', label: 'Street Address', type: 'text', placeholder: '123 Harbor Blvd', roles: 'all' },
      ]},
      { cols: 1, fields: [
        { name: 'address_line2', label: 'Address Line 2', type: 'text', placeholder: 'Unit 4, Dock B', roles: 'all' },
      ]},
      { cols: 3, fields: [
        { name: 'address_city', label: 'City', type: 'text', placeholder: 'Newport', roles: 'all' },
        { name: 'address_state', label: 'State', type: 'text', placeholder: 'RI', roles: 'all' },
        { name: 'address_zip', label: 'ZIP', type: 'text', placeholder: '02840', roles: 'all' },
      ]},
      { cols: 2, fields: [
        { name: 'country', label: 'Country', type: 'text', placeholder: 'USA', roles: 'all' },
        { name: 'nationality', label: 'Nationality / Citizenship', type: 'text', placeholder: 'American', roles: 'all' },
      ]},
    ],
  },

  // ══ 5. IDENTITY DOCUMENTS ════════════════════════════════
  {
    id: 'identity_docs',
    title: 'Government IDs',
    roles: 'all',
    rows: [
      { cols: 2, fields: [
        { name: 'date_of_birth', label: 'Date of Birth', type: 'date', roles: 'all' },
        { name: 'ssn_tax_id', label: 'SSN / Tax ID', type: 'text', placeholder: 'XXX-XX-XXXX', hint: 'Employees and 1099 contractors', roles: ['ops', 'helm'] },
      ]},
      { cols: 3, fields: [
        { name: 'driver_license_number', label: 'Driver License #', type: 'text', placeholder: 'D1234567', roles: 'all' },
        { name: 'drivers_license_state', label: 'License State', type: 'text', placeholder: 'FL', roles: 'all' },
        { name: 'drivers_license_expiry', label: 'License Expiry', type: 'date', roles: 'all' },
      ]},
      { cols: 3, fields: [
        { name: 'passport_number', label: 'Passport Number', type: 'text', placeholder: 'US1234567', roles: 'all' },
        { name: 'passport_country', label: 'Issuing Country', type: 'text', placeholder: 'USA', roles: 'all' },
        { name: 'passport_expiry', label: 'Passport Expiry', type: 'date', roles: 'all' },
      ]},
    ],
  },

  // ══ 6. USCG / MARITIME LICENSES ══════════════════════════
  {
    id: 'maritime',
    title: 'USCG / Maritime Licenses',
    roles: 'all',
    rows: [
      { cols: 3, fields: [
        { name: 'oupv_license_number', label: 'OUPV License #', type: 'text', placeholder: 'Master OUPV #', hint: '6-pack', roles: 'all' },
        null,
        { name: 'oupv_expiry', label: 'OUPV Expiry', type: 'date', roles: 'all' },
      ]},
      { cols: 3, fields: [
        { name: 'mmc_license_number', label: "Master's License # (MMC)", type: 'text', placeholder: 'MMC #', hint: 'Merchant Mariner Credential', roles: 'all' },
        { name: 'mmc_tonnage_rating', label: 'MMC Tonnage Rating', type: 'select', roles: 'all', options: [
          { value: '', label: '— Not set —' },
          { value: '25T', label: '25 Tons' },
          { value: '50T', label: '50 Tons' },
          { value: '100T', label: '100 Tons' },
          { value: '200T', label: '200 Tons' },
          { value: '500T', label: '500 Tons' },
          { value: '1600T', label: '1,600 Tons' },
        ]},
        { name: 'mmc_expiry', label: 'MMC Expiry', type: 'date', roles: 'all' },
      ]},
      { cols: 3, fields: [
        { name: 'twic_number', label: 'TWIC Card #', type: 'text', placeholder: 'TWIC #', hint: 'Transportation Worker ID — port access', roles: 'all' },
        null,
        { name: 'twic_expiry', label: 'TWIC Expiry', type: 'date', roles: 'all' },
      ]},
      { cols: 3, fields: [
        { name: 'stcw_certification', label: 'STCW Certification #', type: 'text', placeholder: 'STCW cert #', hint: 'International maritime standard', roles: 'all' },
        { name: 'stcw_level', label: 'STCW Level', type: 'select', roles: 'all', options: [
          { value: '', label: '— Not set —' },
          { value: 'basic', label: 'Basic Safety' },
          { value: 'operational', label: 'Operational Level' },
          { value: 'management', label: 'Management Level' },
        ]},
        { name: 'stcw_expiry', label: 'STCW Expiry', type: 'date', roles: 'all' },
      ]},
      { cols: 3, fields: [
        { name: 'fcc_license_number', label: 'FCC Marine Radio License #', type: 'text', placeholder: 'FCC #', hint: 'Required offshore/commercial', roles: 'all' },
        null,
        { name: 'fcc_expiry', label: 'FCC Expiry', type: 'date', roles: 'all' },
      ]},
      { cols: 3, fields: [
        { name: 'cpr_certification', label: 'CPR / First Aid Certification', type: 'text', placeholder: 'Red Cross AED-CPR #12345', hint: 'Issuing org + cert #', roles: 'all' },
        null,
        { name: 'cpr_expiry', label: 'CPR Expiry', type: 'date', roles: 'all' },
      ]},
    ],
  },

  // ══ 7. TRADE / SERVICE CREDENTIALS ══════════════════════
  {
    id: 'trade',
    title: 'Trade / Service Credentials',
    roles: 'all',
    rows: [
      { cols: 1, fields: [{ name: 'abyc_certifications', label: 'ABYC Certifications', type: 'tag-input', placeholder: 'e.g. Electrical, Diesel, Systems…', hint: 'American Boat and Yacht Council — press Enter after each module', roles: 'all' }]},
      { cols: 1, fields: [{ name: 'engine_brand_certifications', label: 'Engine Brand Certifications', type: 'tag-input', placeholder: 'e.g. Yamaha, Mercury, Suzuki, Tohatsu…', hint: 'Brands this person is certified to service — press Enter after each', roles: 'all' }]},
      { cols: 1, fields: [{ name: 'trade_specialties', label: 'Trade Specialties', type: 'tag-input', placeholder: 'e.g. Engine, Electrical, Fiberglass, Canvas, Hydraulics…', hint: 'Areas of expertise — press Enter after each', roles: 'all' }]},
    ],
  },

  // ══ 8. DEALER / BROKER ═══════════════════════════════════
  {
    id: 'dealer_broker',
    title: 'Dealer / Broker',
    roles: 'all',
    rows: [
      { cols: 3, fields: [
        { name: 'dealer_license_number', label: 'Dealer License #', type: 'text', placeholder: 'Dealer license #', roles: 'all' },
        { name: 'dealer_license_state', label: 'Dealer License State', type: 'text', placeholder: 'FL', roles: 'all' },
        null,
      ]},
      { cols: 3, fields: [
        { name: 'broker_license_number', label: 'Broker License #', type: 'text', placeholder: 'Broker license #', roles: 'all' },
        { name: 'broker_license_state', label: 'Broker License State', type: 'text', placeholder: 'FL', roles: 'all' },
        null,
      ]},
    ],
  },

  // ══ 9. MEMBERSHIPS — dynamic (MembershipList component) ══

  // ══ 10. BILLING ══════════════════════════════════════════
  {
    id: 'billing',
    title: 'Billing',
    roles: 'all',
    rows: [
      { cols: 2, fields: [
        { name: 'billing_name', label: 'Billing Name', type: 'text', placeholder: 'Same as contact name', roles: 'all' },
        { name: 'billing_email', label: 'Billing Email', type: 'email', placeholder: 'billing@example.com', roles: 'all' },
      ]},
      { cols: 1, fields: [
        { name: 'billing_address', label: 'Billing Street Address', type: 'text', placeholder: '123 Harbor Blvd', roles: 'all' },
      ]},
      { cols: 3, fields: [
        { name: 'billing_city', label: 'Billing City', type: 'text', placeholder: 'Newport', roles: 'all' },
        { name: 'billing_state', label: 'Billing State', type: 'text', placeholder: 'RI', roles: 'all' },
        { name: 'billing_zip', label: 'Billing ZIP', type: 'text', placeholder: '02840', roles: 'all' },
      ]},
      { cols: 2, fields: [
        { name: 'tax_exempt', label: 'Tax Exempt', type: 'bool-select', roles: 'all' },
        { name: 'autopay', label: 'Autopay Enrolled', type: 'bool-select', roles: 'all' },
      ]},
    ],
  },

  // ══ 11. EMERGENCY CONTACT — dynamic (EmergencyContactList component) ══

  // ══ 12. CLASSIFICATION / STATUS — marina staff only ══════
  {
    id: 'classification',
    title: 'Classification / Status',
    roles: ['ops', 'helm'],
    rows: [
      { cols: 2, fields: [
        { name: 'marina_id', label: 'Marina', type: 'select', roles: ['ops', 'helm'], options: [] },  // populated dynamically
        { name: 'contact_type', label: 'Contact Type', type: 'select', required: true, roles: ['ops', 'helm'], options: [
          { value: 'boater', label: 'Boater' },
          { value: 'tenant', label: 'Tenant' },
          { value: 'transient', label: 'Transient' },
          { value: 'staff', label: 'Staff' },
          { value: 'vendor', label: 'Vendor' },
          { value: 'contractor', label: 'Contractor' },
          { value: 'dealer', label: 'Dealer' },
          { value: 'broker', label: 'Broker' },
          { value: 'mechanic', label: 'Mechanic' },
          { value: 'other', label: 'Other' },
        ]},
      ]},
      { cols: 2, fields: [
        { name: 'status', label: 'Status', type: 'select', roles: ['ops', 'helm'], options: [
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
          { value: 'prospect', label: 'Prospect' },
          { value: 'pending', label: 'Pending' },
        ]},
        null,
      ]},
    ],
  },

  // ══ 13. MARINA / ADMIN — internal only ═══════════════════
  {
    id: 'marina_admin',
    title: 'Marina / Admin',
    roles: ['ops', 'helm'],
    rows: [
      { cols: 2, fields: [
        { name: 'account_number', label: 'Account Number', type: 'text', placeholder: 'ACC-001', roles: ['ops', 'helm'] },
        { name: 'lead_source', label: 'Lead Source', type: 'select', roles: ['ops', 'helm'], options: [
          { value: '', label: '— Not set —' },
          { value: 'direct', label: 'Direct' },
          { value: 'referral', label: 'Referral' },
          { value: 'website', label: 'Website' },
          { value: 'social', label: 'Social Media' },
          { value: 'walk_in', label: 'Walk-in' },
          { value: 'other', label: 'Other' },
        ]},
      ]},
      { cols: 2, fields: [
        { name: 'customer_since', label: 'Customer Since', type: 'date', roles: ['ops', 'helm'] },
        { name: 'vip_flag', label: 'VIP', type: 'bool-select', roles: ['ops', 'helm'] },
      ]},
      { cols: 2, fields: [
        { name: 'waiver_signed', label: 'Waiver Signed', type: 'bool-select', roles: ['ops', 'helm'] },
        { name: 'waiver_signed_date', label: 'Waiver Date', type: 'date', roles: ['ops', 'helm'] },
      ]},
      { cols: 2, fields: [
        { name: 'do_not_contact', label: 'Do Not Contact', type: 'bool-select', roles: ['ops', 'helm'] },
        { name: 'helm_role', label: 'Helm Role', type: 'select', roles: ['ops', 'helm'], options: [
          { value: '', label: '— Not set —' },
          { value: 'mate', label: 'Mate' },
          { value: 'captain', label: 'Captain' },
          { value: 'admiral', label: 'Admiral' },
        ]},
      ]},
      { cols: 1, fields: [
        { name: 'labels', label: 'Labels / Tags', type: 'tag-input', placeholder: 'Type a label and press Enter…', hint: 'Internal tags for filtering/grouping', roles: ['ops', 'helm'] },
      ]},
      { cols: 1, fields: [
        { name: 'internal_notes', label: 'Internal Notes', type: 'textarea', placeholder: 'Internal notes visible to marina staff only…', roles: ['ops', 'helm'] },
      ]},
    ],
  },

  // ══ 14. EMPLOYMENT / STAFF — internal only ═══════════════
  {
    id: 'employment',
    title: 'Employment / Staff',
    roles: ['ops', 'helm'],
    rows: [
      { cols: 2, fields: [
        { name: 'employee_id', label: 'Employee ID', type: 'text', placeholder: 'EMP-001', roles: ['ops', 'helm'] },
        { name: 'department', label: 'Department', type: 'text', placeholder: 'Dock / Office / Service…', roles: ['ops', 'helm'] },
      ]},
      { cols: 2, fields: [
        { name: 'employment_type', label: 'Employment Type', type: 'select', roles: ['ops', 'helm'], options: [
          { value: '', label: '— Not set —' },
          { value: 'full_time', label: 'Full Time' },
          { value: 'part_time', label: 'Part Time' },
          { value: 'seasonal', label: 'Seasonal' },
          { value: 'contractor', label: 'Contractor' },
        ]},
        { name: 'tax_classification', label: 'Tax Classification', type: 'select', roles: ['ops', 'helm'], options: [
          { value: '', label: '— Not set —' },
          { value: 'w2', label: 'W-2 Employee' },
          { value: '1099', label: '1099 Contractor' },
        ]},
      ]},
      { cols: 2, fields: [
        { name: 'hire_date', label: 'Hire Date', type: 'date', roles: ['ops', 'helm'] },
        null,
      ]},
      { cols: 2, fields: [
        { name: 'hourly_rate', label: 'Hourly Rate ($)', type: 'number', placeholder: '0.00', roles: ['ops', 'helm'] },
        { name: 'salary', label: 'Salary ($)', type: 'number', placeholder: '0.00', roles: ['ops', 'helm'] },
      ]},
      { cols: 3, fields: [
        { name: 'access_card', label: 'Access Card #', type: 'text', placeholder: 'Fob / card #', roles: ['ops', 'helm'] },
        { name: 'locker_number', label: 'Locker Number', type: 'text', placeholder: 'L-12', roles: ['ops', 'helm'] },
        { name: 'parking_spot', label: 'Parking Spot', type: 'text', placeholder: 'P-4', roles: ['ops', 'helm'] },
      ]},
      { cols: 1, fields: [
        { name: 'shift_notes', label: 'Shift Notes', type: 'textarea', placeholder: 'Schedule, notes for dock staff…', roles: ['ops', 'helm'] },
      ]},
      { cols: 3, groupLabel: 'Documents on File', fields: [
        { name: 'doc_w2_on_file', label: 'W-2', type: 'bool-select', roles: ['ops', 'helm'] },
        { name: 'doc_i9_on_file', label: 'I-9', type: 'bool-select', roles: ['ops', 'helm'] },
        { name: 'doc_direct_deposit', label: 'Direct Deposit', type: 'bool-select', roles: ['ops', 'helm'] },
      ]},
      { cols: 3, fields: [
        { name: 'doc_signed_offer', label: 'Offer Letter Signed', type: 'bool-select', roles: ['ops', 'helm'] },
        { name: 'doc_background_check', label: 'Background Check', type: 'bool-select', roles: ['ops', 'helm'] },
        null,
      ]},
    ],
  },

  // ══ 15. PREFERENCES ══════════════════════════════════════
  {
    id: 'preferences',
    title: 'Preferences',
    roles: 'all',
    rows: [
      { cols: 3, fields: [
        { name: 'sms_opt_in', label: 'SMS Opt-in', type: 'bool-select', roles: 'all' },
        { name: 'email_opt_in', label: 'Email Opt-in', type: 'bool-select', roles: 'all' },
        { name: 'liveaboard', label: 'Liveaboard', type: 'bool-select', roles: 'all' },
      ]},
      { cols: 3, fields: [
        { name: 'pet_on_board', label: 'Pet on Board', type: 'bool-select', roles: 'all' },
        { name: 'parking_permit', label: 'Parking Permit', type: 'bool-select', roles: 'all' },
        null,
      ]},
    ],
  },

  // ══ 16. NOTES ════════════════════════════════════════════
  {
    id: 'notes',
    title: 'Notes',
    roles: 'all',
    rows: [
      { cols: 1, fields: [
        { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Any notes about this contact…', roles: 'all' },
      ]},
    ],
  },
]
