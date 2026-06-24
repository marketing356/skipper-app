'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ─── Helpers ────────────────────────────────────────────────────────────────

function str(fd: FormData, key: string): string | null {
  const v = (fd.get(key) as string)?.trim()
  return v || null
}
function num(fd: FormData, key: string): number | null {
  const v = fd.get(key) as string
  return v ? parseFloat(v) : null
}
function int(fd: FormData, key: string): number | null {
  const v = fd.get(key) as string
  return v ? parseInt(v) : null
}
function bool(fd: FormData, key: string): boolean | null {
  const v = fd.get(key) as string
  if (v === 'true') return true
  if (v === 'false') return false
  return null
}
function tags(fd: FormData, key: string): string[] {
  const v = fd.get(key) as string
  if (!v) return []
  try {
    const parsed = JSON.parse(v)
    return Array.isArray(parsed) ? parsed.filter(Boolean) : []
  } catch { return [] }
}

// ─── CONTACTS ────────────────────────────────────────────────────────────────

function contactPayload(fd: FormData) {
  return {
    // ── Identity ─────────────────────────────────────────────
    title:                       str(fd, 'title'),
    first_name:                  str(fd, 'first_name'),
    last_name:                   str(fd, 'last_name'),
    preferred_name:              str(fd, 'preferred_name'),
    // ── Contact Info ─────────────────────────────────────────
    email:                       str(fd, 'email'),
    email_secondary:             str(fd, 'email_secondary'),
    phone:                       str(fd, 'phone'),
    mobile:                      str(fd, 'mobile'),
    phone_work:                  str(fd, 'phone_work'),
    fax:                         str(fd, 'fax'),
    website:                     str(fd, 'website'),
    preferred_contact_method:    str(fd, 'preferred_contact_method'),
    language_preference:         str(fd, 'language_preference'),
    languages_spoken:            tags(fd, 'languages_spoken'),
    // ── Company ──────────────────────────────────────────────
    company_organization:        str(fd, 'company_organization'),
    job_title:                   str(fd, 'job_title'),
    // ── Address ──────────────────────────────────────────────
    address:                     str(fd, 'address'),
    address_line2:               str(fd, 'address_line2'),
    address_city:                str(fd, 'address_city'),
    address_state:               str(fd, 'address_state'),
    address_zip:                 str(fd, 'address_zip'),
    country:                     str(fd, 'country'),
    nationality:                 str(fd, 'nationality'),
    // ── Identity Documents ───────────────────────────────────
    date_of_birth:               str(fd, 'date_of_birth'),
    ssn_tax_id:                  str(fd, 'ssn_tax_id'),
    driver_license_number:       str(fd, 'driver_license_number'),
    drivers_license_state:       str(fd, 'drivers_license_state'),
    drivers_license_expiry:      str(fd, 'drivers_license_expiry'),
    passport_number:             str(fd, 'passport_number'),
    passport_country:            str(fd, 'passport_country'),
    passport_expiry:             str(fd, 'passport_expiry'),
    // ── USCG / Maritime Licenses ─────────────────────────────
    oupv_license_number:         str(fd, 'oupv_license_number'),
    oupv_expiry:                 str(fd, 'oupv_expiry'),
    mmc_license_number:          str(fd, 'mmc_license_number'),
    mmc_tonnage_rating:          str(fd, 'mmc_tonnage_rating'),
    mmc_expiry:                  str(fd, 'mmc_expiry'),
    twic_number:                 str(fd, 'twic_number'),
    twic_expiry:                 str(fd, 'twic_expiry'),
    stcw_certification:          str(fd, 'stcw_certification'),
    stcw_level:                  str(fd, 'stcw_level'),
    stcw_expiry:                 str(fd, 'stcw_expiry'),
    fcc_license_number:          str(fd, 'fcc_license_number'),
    fcc_expiry:                  str(fd, 'fcc_expiry'),
    cpr_certification:           str(fd, 'cpr_certification'),
    cpr_expiry:                  str(fd, 'cpr_expiry'),
    // ── Trade / Service Credentials ──────────────────────────
    abyc_certifications:         tags(fd, 'abyc_certifications'),
    engine_brand_certifications: tags(fd, 'engine_brand_certifications'),
    trade_specialties:           tags(fd, 'trade_specialties'),
    // ── Dealer / Broker ──────────────────────────────────────
    dealer_license_number:       str(fd, 'dealer_license_number'),
    dealer_license_state:        str(fd, 'dealer_license_state'),
    broker_license_number:       str(fd, 'broker_license_number'),
    broker_license_state:        str(fd, 'broker_license_state'),
    // ── Memberships ──────────────────────────────────────────
    seatow_membership_number:    str(fd, 'seatow_membership_number'),
    boatus_membership_number:    str(fd, 'boatus_membership_number'),
    // ── Billing ──────────────────────────────────────────────
    billing_name:                str(fd, 'billing_name'),
    billing_email:               str(fd, 'billing_email'),
    tax_exempt:                  bool(fd, 'tax_exempt'),
    // ── Emergency Contact ────────────────────────────────────
    emergency_name:              str(fd, 'emergency_name'),
    emergency_relationship:      str(fd, 'emergency_relationship'),
    emergency_phone:             str(fd, 'emergency_phone'),
    emergency_name_2:            str(fd, 'emergency_name_2'),
    emergency_phone_2:           str(fd, 'emergency_phone_2'),
    // ── Classification ───────────────────────────────────────
    marina_id:                   str(fd, 'marina_id'),
    contact_type:                str(fd, 'contact_type') || 'boater',
    status:                      str(fd, 'status') || 'active',
    // ── Marina Admin ─────────────────────────────────────────
    account_number:              str(fd, 'account_number'),
    lead_source:                 str(fd, 'lead_source'),
    customer_since:              str(fd, 'customer_since'),
    waiver_signed:               bool(fd, 'waiver_signed'),
    waiver_signed_date:          str(fd, 'waiver_signed_date'),
    internal_notes:              str(fd, 'internal_notes'),
    vip_flag:                    bool(fd, 'vip_flag'),
    do_not_contact:              bool(fd, 'do_not_contact'),
    // ── Employment / Staff ───────────────────────────────────
    employee_id:                 str(fd, 'employee_id'),
    department:                  str(fd, 'department'),
    employment_type:             str(fd, 'employment_type'),
    tax_classification:          str(fd, 'tax_classification'),
    hire_date:                   str(fd, 'hire_date'),
    hourly_rate:                 num(fd, 'hourly_rate'),
    salary:                      num(fd, 'salary'),
    access_card:                 str(fd, 'access_card'),
    locker_number:               str(fd, 'locker_number'),
    parking_spot:                str(fd, 'parking_spot'),
    shift_notes:                 str(fd, 'shift_notes'),
    doc_w2_on_file:              bool(fd, 'doc_w2_on_file'),
    doc_i9_on_file:              bool(fd, 'doc_i9_on_file'),
    doc_direct_deposit:          bool(fd, 'doc_direct_deposit'),
    doc_signed_offer:            bool(fd, 'doc_signed_offer'),
    doc_background_check:        bool(fd, 'doc_background_check'),
    // ── Preferences ──────────────────────────────────────────
    sms_opt_in:                  bool(fd, 'sms_opt_in'),
    email_opt_in:                bool(fd, 'email_opt_in'),
    liveaboard:                  bool(fd, 'liveaboard'),
    pet_on_board:                bool(fd, 'pet_on_board'),
    parking_permit:              bool(fd, 'parking_permit'),
    // Identity media
    photo_url:                   str(fd, 'photo_url'),
    // Emergency contact (free text fallback)
    emergency_contact:           str(fd, 'emergency_contact'),
    // Billing extras
    autopay:                     bool(fd, 'autopay'),
    billing_address:             str(fd, 'billing_address'),
    billing_city:                str(fd, 'billing_city'),
    billing_state:               str(fd, 'billing_state'),
    billing_zip:                 str(fd, 'billing_zip'),
    // Marina/Admin extras
    helm_role:                   str(fd, 'helm_role'),
    labels:                      tags(fd, 'labels'),
    // Boater documents on file
    doc_registration:            bool(fd, 'doc_registration'),
    doc_insurance_cert:          bool(fd, 'doc_insurance_cert'),
    doc_signed_contract:         bool(fd, 'doc_signed_contract'),
    doc_photo_id:                bool(fd, 'doc_photo_id'),
    // ── Notes ────────────────────────────────────────────────
    notes:                       str(fd, 'notes'),
    data_source:                 'skipper_ops',
  }
}

export async function createContact(formData: FormData) {
  const data = contactPayload(formData)
  if (!data.first_name) throw new Error('First name is required')

  const { error } = await supabaseAdmin.from('contacts').insert(data)
  if (error) throw new Error(error.message)

  revalidatePath('/contacts')
  redirect('/contacts')
}

export async function updateContact(formData: FormData) {
  const id = formData.get('id') as string
  if (!id) throw new Error('Missing contact ID')

  const { data_source: _, ...payload } = contactPayload(formData)

  const { error } = await supabaseAdmin.from('contacts').update(payload).eq('id', id)
  if (error) throw new Error(error.message)

  // Propagate to all other rows for this contact (national-pool row in app.ayeayeskipper.com)
  // so saves in abc-marina.ayeayeskipper.com are immediately visible in app.ayeayeskipper.com
  // regardless of whether the boater is currently logged in
  const { data: saved } = await supabaseAdmin
    .from('contacts')
    .select('auth_user_id')
    .eq('id', id)
    .single()
  if (saved?.auth_user_id) {
    await supabaseAdmin
      .from('contacts')
      .update(payload)
      .eq('auth_user_id', saved.auth_user_id)
      .neq('id', id)
  }

  revalidatePath('/contacts')
  redirect('/contacts')
}

function assetPayload(fd: FormData) {
  return {
    // ── Identity ───────────────────────────────────────────
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
    // ── Dimensions ──────────────────────────────────────────
    length_ft:         num(fd, 'length_ft'),
    beam_ft:           num(fd, 'beam_ft'),
    draft_ft:          num(fd, 'draft_ft'),
    air_draft_ft:      num(fd, 'air_draft_ft'),
    height_ft:         num(fd, 'height_ft'),
    weight_lbs:        num(fd, 'weight_lbs'),
    keel_type:         str(fd, 'keel_type'),
    keel_depth_ft:     num(fd, 'keel_depth_ft'),
    bottom_paint_type: str(fd, 'bottom_paint_type'),
    // ── Engine / fuel ───────────────────────────────────────
    fuel_type:              str(fd, 'fuel_type'),
    fuel_tank_gallons:      num(fd, 'fuel_tank_gallons'),
    engine_count:           int(fd, 'engine_count'),
    engine_type:            str(fd, 'engine_type'),
    engine_make:            str(fd, 'engine_make'),
    engine_model:           str(fd, 'engine_model'),
    engine_year:             int(fd, 'engine_year'),
    engine_serial:          str(fd, 'engine_serial'),
    horsepower_per_engine:  num(fd, 'horsepower_per_engine'),
    engine_hp:              num(fd, 'engine_hp'),
    total_horsepower:       num(fd, 'total_horsepower'),
    raw_water_cooled:       bool(fd, 'raw_water_cooled'),
    shore_power:            bool(fd, 'shore_power'),
    // ── Identifiers / Registration ───────────────────────────────
    hin:                   str(fd, 'hin'),
    documentation_number:  str(fd, 'documentation_number'),
    registration_number:   str(fd, 'registration_number'),
    registration_state:    str(fd, 'registration_state'),
    registration_expiry:   str(fd, 'registration_expiry'),
    state_reg_expiry:      str(fd, 'state_reg_expiry'),
    flag_state:            str(fd, 'flag_state'),
    mmsi_number:           str(fd, 'mmsi_number'),
    // ── Insurance ────────────────────────────────────────────
    insurance_provider:        str(fd, 'insurance_provider'),
    insurance_policy:          str(fd, 'insurance_policy'),
    insurance_coverage_amount: num(fd, 'insurance_coverage_amount'),
    insurance_expiry:          str(fd, 'insurance_expiry'),
    insurance_agent_name:      str(fd, 'insurance_agent_name'),
    insurance_agent_phone:     str(fd, 'insurance_agent_phone'),
    // ── Safety ──────────────────────────────────────────────
    life_raft:                bool(fd, 'life_raft'),
    life_jacket_count:        int(fd, 'life_jacket_count'),
    epirb_serial:             str(fd, 'epirb_serial'),
    epirb_expiry:             str(fd, 'epirb_expiry'),
    flare_kit_expiry:         str(fd, 'flare_kit_expiry'),
    fire_extinguisher_expiry: str(fd, 'fire_extinguisher_expiry'),
    oil_placard:              bool(fd, 'oil_placard'),
    discharge_placard:        bool(fd, 'discharge_placard'),
    // ── Security ────────────────────────────────────────────
    alarm:                bool(fd, 'alarm'),
    gps_tracker:          bool(fd, 'gps_tracker'),
    lock_type:            str(fd, 'lock_type'),
    lock_location:        str(fd, 'lock_location'),
    lock_combination:     str(fd, 'lock_combination'),
    authorized_operators: tags(fd, 'authorized_operators'),
    // ── Service history ──────────────────────────────────────
    last_haulout_date: str(fd, 'last_haulout_date'),
    last_survey_date:  str(fd, 'last_survey_date'),
    // ── Trailer ──────────────────────────────────────────────
    has_trailer:        bool(fd, 'has_trailer'),
    trailer_make:       str(fd, 'trailer_make'),
    trailer_type:       str(fd, 'trailer_type'),
    trailer_axle_count: int(fd, 'trailer_axle_count'),
    trailer_length_ft:  num(fd, 'trailer_length_ft'),
    trailer_width_ft:   num(fd, 'trailer_width_ft'),
    trailer_plate:      str(fd, 'trailer_plate'),
    trailer_vin:        str(fd, 'trailer_vin'),
    // ── Sale / value ─────────────────────────────────────────
    for_sale:        bool(fd, 'for_sale'),
    asking_price:    num(fd, 'asking_price'),
    estimated_value: num(fd, 'estimated_value'),
    // ── Location ────────────────────────────────────────────
    marina_id:     str(fd, 'marina_id'),
    space_id:      str(fd, 'space_id'),
    location_type: str(fd, 'location_type'),
    location_ref:  str(fd, 'location_ref'),
    // ── Ownership / links ────────────────────────────────────
    owner_type:       str(fd, 'owner_type') || 'customer',
    boater_vessel_id: str(fd, 'boater_vessel_id'),
    tenant_id:        str(fd, 'tenant_id'),
    // ── Status / retirement ──────────────────────────────────
    pending_review: bool(fd, 'pending_review'),
    retired_date:   str(fd, 'retired_date'),
    retired_reason: str(fd, 'retired_reason'),
    // ── Notes ────────────────────────────────────────────────
    notes:       str(fd, 'notes'),
  }
}

export async function deleteContact(id: string) {
  if (!id) throw new Error('Missing contact ID')
  const { error } = await supabaseAdmin.from('contacts').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/contacts')
  redirect('/contacts')
}

// ─── ASSETS / VESSELS ────────────────────────────────────────────────────────

export async function createAsset(formData: FormData) {
  const data = assetPayload(formData)
  if (!data.name) throw new Error('Vessel name is required')

  const { error } = await supabaseAdmin.from('marina_assets').insert(data)
  if (error) throw new Error(error.message)

  revalidatePath('/assets')
  redirect('/assets')
}

export async function updateAsset(formData: FormData) {
  const id = formData.get('id') as string
  if (!id) throw new Error('Missing asset ID')

  const payload = assetPayload(formData)

  const { error } = await supabaseAdmin.from('marina_assets').update(payload).eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/assets')
  redirect('/assets')
}

export async function deleteAsset(id: string) {
  if (!id) throw new Error('Missing asset ID')
  const { error } = await supabaseAdmin.from('marina_assets').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/assets')
  redirect('/assets')
}
