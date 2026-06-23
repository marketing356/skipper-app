/**
 * MASTER ASSET FORM SCHEMA — Skipper Universe
 *
 * Single source of truth for the vessel/asset form across:
 *   - OPS (ops.ayeayeskipper.com)        — render via CONTACT_FORM_SCHEMA pattern
 *   - Helm (helm.ayeayeskipper.com)      — pulls from /api/asset-form-schema
 *   - Mobile APP (app.ayeayeskipper.com) — pulls from /api/asset-form-schema
 *   - Crew APP (crew.ayeayeskipper.com)  — pulls from /api/asset-form-schema
 *   - Contractors (contractors.aya...)   — pulls from /api/asset-form-schema
 *
 * To add a field: add it here, redeploy OPS. All apps reflect on next build/render.
 * Every `name` MUST be a real column in public.marina_assets. No ghost fields. Ever.
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

export const ASSET_FORM_SCHEMA: AssetSection[] = [
  // ══ 1. IDENTITY ══════════════════════════════════════════
  {
    id: 'identity',
    title: 'Vessel Identity',
    roles: 'all',
    rows: [
      { cols: 1, fields: [
        { name: 'photo_url', label: 'Vessel Photo URL', type: 'text', placeholder: 'https://…', roles: 'all' },
      ]},
      { cols: 2, fields: [
        { name: 'name', label: 'Vessel Name', type: 'text', placeholder: 'Sea Breeze', required: true, roles: 'all' },
        { name: 'status', label: 'Status', type: 'select', roles: 'all', options: [
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
          { value: 'pending', label: 'Pending' },
        ]},
      ]},
      { cols: 2, fields: [
        { name: 'asset_category', label: 'Asset Category', type: 'select', roles: 'all', options: [
          { value: '', label: '— Not set —' },
          { value: 'vessel', label: 'Vessel' },
          { value: 'trailer', label: 'Trailer' },
          { value: 'jet_ski', label: 'Jet Ski / PWC' },
          { value: 'tender', label: 'Tender / Dinghy' },
          { value: 'kayak', label: 'Kayak / Paddle' },
          { value: 'other', label: 'Other' },
        ]},
        { name: 'asset_type', label: 'Asset Type', type: 'select', roles: 'all', options: [
          { value: 'powerboat', label: 'Powerboat' },
          { value: 'sailboat', label: 'Sailboat' },
          { value: 'yacht', label: 'Yacht' },
          { value: 'pontoon', label: 'Pontoon' },
          { value: 'jet_ski', label: 'Jet Ski / PWC' },
          { value: 'kayak', label: 'Kayak / Canoe' },
          { value: 'dinghy', label: 'Dinghy' },
          { value: 'commercial', label: 'Commercial' },
          { value: 'trailer', label: 'Trailer' },
          { value: 'other', label: 'Other' },
        ]},
      ]},
      { cols: 1, fields: [
        { name: 'asset_subtype', label: 'Subtype', type: 'text', placeholder: 'e.g. center console, sloop…', roles: 'all' },
      ]},
      { cols: 3, fields: [
        { name: 'make', label: 'Make', type: 'text', placeholder: 'Grady-White', roles: 'all' },
        { name: 'model', label: 'Model', type: 'text', placeholder: 'Freedom 307', roles: 'all' },
        { name: 'year', label: 'Year', type: 'number', placeholder: '2022', roles: 'all' },
      ]},
      { cols: 2, fields: [
        { name: 'color', label: 'Color', type: 'text', placeholder: 'White hull, blue stripe', roles: 'all' },
        { name: 'hull_material', label: 'Hull Material', type: 'select', roles: 'all', options: [
          { value: '', label: '— Select —' },
          { value: 'fiberglass', label: 'Fiberglass' },
          { value: 'aluminum', label: 'Aluminum' },
          { value: 'steel', label: 'Steel' },
          { value: 'wood', label: 'Wood' },
          { value: 'inflatable', label: 'Inflatable (RIB)' },
          { value: 'other', label: 'Other' },
        ]},
      ]},
    ],
  },

  // ══ 2. DIMENSIONS ════════════════════════════════════════
  {
    id: 'dimensions',
    title: 'Dimensions',
    roles: 'all',
    rows: [
      { cols: 4, fields: [
        { name: 'length_ft', label: 'LOA (ft)', type: 'number', placeholder: '32', roles: 'all' },
        { name: 'beam_ft', label: 'Beam (ft)', type: 'number', placeholder: '10.5', roles: 'all' },
        { name: 'draft_ft', label: 'Draft (ft)', type: 'number', placeholder: '2.5', roles: 'all' },
        { name: 'air_draft_ft', label: 'Air Draft (ft)', type: 'number', placeholder: '14', roles: 'all' },
      ]},
      { cols: 3, fields: [
        { name: 'weight_lbs', label: 'Weight (lbs)', type: 'number', placeholder: '8400', roles: 'all' },
        { name: 'keel_type', label: 'Keel Type', type: 'select', roles: 'all', options: [
          { value: '', label: '— Not set —' },
          { value: 'full', label: 'Full Keel' },
          { value: 'fin', label: 'Fin Keel' },
          { value: 'bulb', label: 'Bulb Keel' },
          { value: 'wing', label: 'Wing Keel' },
          { value: 'centerboard', label: 'Centerboard' },
          { value: 'twin', label: 'Twin Keels' },
          { value: 'none', label: 'None / Powerboat' },
        ]},
      ]},
      { cols: 1, fields: [
        { name: 'bottom_paint_type', label: 'Bottom Paint Type', type: 'text', placeholder: 'Hard/Ablative brand…', roles: 'all' },
      ]},
    ],
  },

  // ══ 3. ENGINE / FUEL ═════════════════════════════════════
  {
    id: 'engine_fuel',
    title: 'Engine / Fuel',
    roles: 'all',
    rows: [
      { cols: 2, fields: [
        { name: 'fuel_type', label: 'Fuel Type', type: 'select', roles: 'all', options: [
          { value: '', label: '— Select —' },
          { value: 'gasoline', label: 'Gasoline' },
          { value: 'diesel', label: 'Diesel' },
          { value: 'electric', label: 'Electric' },
          { value: 'hybrid', label: 'Hybrid' },
          { value: 'none', label: 'None / Sail' },
        ]},
        { name: 'fuel_tank_gallons', label: 'Fuel Tank (gal)', type: 'number', placeholder: '100', roles: 'all' },
      ]},
      { cols: 3, fields: [
        { name: 'engine_count', label: 'Engine Count', type: 'number', placeholder: '2', roles: 'all' },
        { name: 'engine_type', label: 'Engine Type', type: 'select', roles: 'all', options: [
          { value: '', label: '— Select —' },
          { value: 'inboard', label: 'Inboard' },
          { value: 'outboard', label: 'Outboard' },
          { value: 'stern_drive', label: 'Stern Drive' },
          { value: 'jet', label: 'Jet' },
          { value: 'sail', label: 'Sail' },
          { value: 'electric', label: 'Electric' },
        ]},
        { name: 'horsepower_per_engine', label: 'HP / Engine', type: 'number', placeholder: '300', roles: 'all' },
      ]},
      { cols: 3, fields: [
        { name: 'engine_make', label: 'Engine Make', type: 'text', placeholder: 'Yamaha', roles: 'all' },
        { name: 'engine_model', label: 'Engine Model', type: 'text', placeholder: 'F300', roles: 'all' },
        { name: 'engine_year', label: 'Engine Year', type: 'number', placeholder: '2021', roles: 'all' },
      ]},
      { cols: 3, fields: [
        { name: 'engine_hp', label: 'Total Engine HP (legacy)', type: 'number', placeholder: '600', roles: 'all' },
        { name: 'total_horsepower', label: 'Total Horsepower', type: 'number', placeholder: '600', roles: 'all' },
        { name: 'engine_serial', label: 'Engine Serial', type: 'text', placeholder: 'SN-…', roles: 'all' },
      ]},
      { cols: 2, fields: [
        { name: 'raw_water_cooled', label: 'Raw Water Cooled', type: 'bool-select', roles: 'all' },
        { name: 'shore_power', label: 'Shore Power', type: 'bool-select', roles: 'all' },
      ]},
    ],
  },

  // ══ 4. IDENTIFIERS / REGISTRATION ════════════════════════
  {
    id: 'identifiers',
    title: 'Identifiers & Registration',
    roles: 'all',
    rows: [
      { cols: 2, fields: [
        { name: 'hin', label: 'HIN', type: 'text', placeholder: 'Hull Identification #', roles: 'all' },
        { name: 'documentation_number', label: 'USCG Documentation #', type: 'text', placeholder: 'USCG Doc #', roles: 'all' },
      ]},
      { cols: 3, fields: [
        { name: 'registration_number', label: 'Registration #', type: 'text', placeholder: 'State reg #', roles: 'all' },
        { name: 'registration_state', label: 'Registration State', type: 'text', placeholder: 'FL', roles: 'all' },
        { name: 'registration_expiry', label: 'Registration Expiry', type: 'date', roles: 'all' },
      ]},
      { cols: 2, fields: [
        { name: 'state_reg_expiry', label: 'State Reg Expiry (legacy)', type: 'date', roles: 'all' },
        { name: 'flag_state', label: 'Flag State', type: 'text', placeholder: 'USA', roles: 'all' },
      ]},
      { cols: 1, fields: [
        { name: 'mmsi_number', label: 'MMSI Number', type: 'text', placeholder: 'MMSI #', roles: 'all' },
      ]},
    ],
  },

  // ══ 5. INSURANCE ═════════════════════════════════════════
  {
    id: 'insurance',
    title: 'Insurance',
    roles: 'all',
    rows: [
      { cols: 2, fields: [
        { name: 'insurance_provider', label: 'Insurance Provider', type: 'text', placeholder: 'Geico Marine', roles: 'all' },
        { name: 'insurance_policy', label: 'Policy #', type: 'text', placeholder: 'POL-…', roles: 'all' },
      ]},
      { cols: 2, fields: [
        { name: 'insurance_coverage_amount', label: 'Coverage Amount ($)', type: 'number', placeholder: '250000', roles: 'all' },
        { name: 'insurance_expiry', label: 'Insurance Expiry', type: 'date', roles: 'all' },
      ]},
      { cols: 2, fields: [
        { name: 'insurance_agent_name', label: 'Insurance Agent Name', type: 'text', placeholder: 'Agent name', roles: 'all' },
        { name: 'insurance_agent_phone', label: 'Insurance Agent Phone', type: 'tel', placeholder: '+1 (555) 000-0000', roles: 'all' },
      ]},
    ],
  },

  // ══ 6. SAFETY EQUIPMENT ══════════════════════════════════
  {
    id: 'safety',
    title: 'Safety Equipment',
    roles: 'all',
    rows: [
      { cols: 2, fields: [
        { name: 'life_raft', label: 'Life Raft On Board', type: 'bool-select', roles: 'all' },
        { name: 'life_jacket_count', label: 'Life Jacket Count', type: 'number', placeholder: '6', roles: 'all' },
      ]},
      { cols: 2, fields: [
        { name: 'epirb_serial', label: 'EPIRB Serial', type: 'text', placeholder: 'EPIRB SN', roles: 'all' },
        { name: 'epirb_expiry', label: 'EPIRB Battery Expiry', type: 'date', roles: 'all' },
      ]},
      { cols: 2, fields: [
        { name: 'flare_kit_expiry', label: 'Flare Kit Expiry', type: 'date', roles: 'all' },
        { name: 'fire_extinguisher_expiry', label: 'Fire Extinguisher Expiry', type: 'date', roles: 'all' },
      ]},
      { cols: 2, fields: [
        { name: 'oil_placard', label: 'Oil Placard Posted', type: 'bool-select', roles: 'all' },
        { name: 'discharge_placard', label: 'Discharge Placard Posted', type: 'bool-select', roles: 'all' },
      ]},
    ],
  },

  // ══ 7. SECURITY ══════════════════════════════════════════
  {
    id: 'security',
    title: 'Security',
    roles: 'all',
    rows: [
      { cols: 2, fields: [
        { name: 'alarm', label: 'Alarm Installed', type: 'bool-select', roles: 'all' },
        { name: 'gps_tracker', label: 'GPS Tracker Installed', type: 'bool-select', roles: 'all' },
      ]},
      { cols: 3, fields: [
        { name: 'lock_type', label: 'Lock Type', type: 'text', placeholder: 'Combination, key, biometric…', roles: 'all' },
        { name: 'lock_location', label: 'Lock Location', type: 'text', placeholder: 'Companionway, console…', roles: 'all' },
        { name: 'lock_combination', label: 'Lock Combination', type: 'text', placeholder: '(staff-shared if needed)', roles: ['ops', 'helm', 'boater'] },
      ]},
      { cols: 1, fields: [
        { name: 'authorized_operators', label: 'Authorized Operators', type: 'tag-input', placeholder: 'Type a name and press Enter…', hint: 'Captains/crew authorized to operate', roles: 'all' },
      ]},
    ],
  },

  // ══ 8. SERVICE HISTORY ═══════════════════════════════════
  {
    id: 'service',
    title: 'Service History',
    roles: 'all',
    rows: [
      { cols: 2, fields: [
        { name: 'last_haulout_date', label: 'Last Haulout Date', type: 'date', roles: 'all' },
        { name: 'last_survey_date', label: 'Last Survey Date', type: 'date', roles: 'all' },
      ]},
    ],
  },

  // ══ 9. TRAILER (if applicable) ═══════════════════════════
  {
    id: 'trailer',
    title: 'Trailer',
    roles: 'all',
    rows: [
      { cols: 1, fields: [
        { name: 'has_trailer', label: 'Has Trailer', type: 'bool-select', roles: 'all' },
      ]},
      { cols: 3, fields: [
        { name: 'trailer_make', label: 'Trailer Make', type: 'text', placeholder: 'Load Rite', roles: 'all' },
        { name: 'trailer_type', label: 'Trailer Type', type: 'text', placeholder: 'Bunk/Roller/Float-on', roles: 'all' },
        { name: 'trailer_axle_count', label: 'Axle Count', type: 'number', placeholder: '2', roles: 'all' },
      ]},
      { cols: 3, fields: [
        { name: 'trailer_length_ft', label: 'Trailer Length (ft)', type: 'number', placeholder: '28', roles: 'all' },
        { name: 'trailer_width_ft', label: 'Trailer Width (ft)', type: 'number', placeholder: '8.5', roles: 'all' },
        { name: 'trailer_plate', label: 'Trailer Plate #', type: 'text', placeholder: 'ABC-1234', roles: 'all' },
      ]},
      { cols: 1, fields: [
        { name: 'trailer_vin', label: 'Trailer VIN', type: 'text', placeholder: 'VIN #', roles: 'all' },
      ]},
    ],
  },

  // ══ 10. LOCATION (marina-side) — ops/helm only ═══════════
  {
    id: 'location',
    title: 'Location',
    roles: ['ops', 'helm'],
    rows: [
      { cols: 2, fields: [
        { name: 'marina_id', label: 'Marina', type: 'select', roles: ['ops', 'helm'], options: [] },
        { name: 'space_id', label: 'Slip / Space', type: 'text', placeholder: 'Slip ID', roles: ['ops', 'helm'] },
      ]},
      { cols: 2, fields: [
        { name: 'location_type', label: 'Location Type', type: 'select', roles: ['ops', 'helm'], options: [
          { value: '', label: '— Not set —' },
          { value: 'slip', label: 'Slip' },
          { value: 'mooring', label: 'Mooring' },
          { value: 'yard', label: 'Yard' },
          { value: 'rack', label: 'Dry Rack' },
          { value: 'transient', label: 'Transient' },
          { value: 'off_site', label: 'Off-site' },
        ]},
        { name: 'location_ref', label: 'Location Reference', type: 'text', placeholder: 'Free-text reference', roles: ['ops', 'helm'] },
      ]},
    ],
  },

  // ══ 12. OWNERSHIP / LINKS — ops/helm only ════════════════
  {
    id: 'ownership',
    title: 'Ownership / Links',
    roles: ['ops', 'helm'],
    rows: [
      { cols: 2, fields: [
        { name: 'owner_type', label: 'Owner Type', type: 'select', roles: ['ops', 'helm'], options: [
          { value: '', label: '— Not set —' },
          { value: 'individual', label: 'Individual' },
          { value: 'business', label: 'Business' },
          { value: 'trust', label: 'Trust' },
          { value: 'club', label: 'Club' },
          { value: 'other', label: 'Other' },
        ]},
        { name: 'boater_vessel_id', label: 'Linked Boater Vessel ID', type: 'text', placeholder: 'UUID of boater-owned record', roles: ['ops', 'helm'] },
      ]},
      { cols: 1, fields: [
        { name: 'tenant_id', label: 'Tenant ID', type: 'text', placeholder: 'Tenant UUID', roles: ['ops', 'helm'] },
      ]},
    ],
  },

  // ══ 13. STATUS / RETIREMENT — ops/helm only ══════════════
  {
    id: 'status_retirement',
    title: 'Status / Retirement',
    roles: ['ops', 'helm'],
    rows: [
      { cols: 2, fields: [
        { name: 'pending_review', label: 'Pending Review', type: 'bool-select', roles: ['ops', 'helm'] },
        { name: 'retired_date', label: 'Retired Date', type: 'date', roles: ['ops', 'helm'] },
      ]},
      { cols: 1, fields: [
        { name: 'retired_reason', label: 'Retired Reason', type: 'textarea', placeholder: 'Why was this asset retired…', roles: ['ops', 'helm'] },
      ]},
    ],
  },

  // ══ 14. NOTES ════════════════════════════════════════════
  {
    id: 'notes',
    title: 'Notes',
    roles: 'all',
    rows: [
      { cols: 1, fields: [
        { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Any notes about this asset…', roles: 'all' },
      ]},
    ],
  },
]
