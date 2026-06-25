'use client'
import AssetForm from '@/components/AssetForm'
import React, { useState, useEffect, useRef } from 'react'
import ContactForm from '@/components/ContactForm'
import Image from 'next/image'
import { supabase } from '@/lib/supabase-client'
import { useSkipperRealtime } from '@/lib/useSkipperRealtime'
import type { User } from '@supabase/supabase-js'

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:         '#05111f',
  bgGrad:     'linear-gradient(160deg, #071e38 0%, #051524 50%, #030e19 100%)',
  card:       'rgba(255,255,255,0.07)',
  cardBorder: 'rgba(255,255,255,0.11)',
  teal:       '#4dd6c8',
  tealDim:    'rgba(77,214,200,0.15)',
  tealBorder: 'rgba(77,214,200,0.3)',
  white:      '#ffffff',
  muted:      'rgba(255,255,255,0.55)',
  muted2:     'rgba(255,255,255,0.32)',
  green:      '#4ade80',
  navy:       '#0d2b4b',
  inputBg:    'rgba(255,255,255,0.06)',
  inputBorder:'rgba(255,255,255,0.16)',
  danger:     '#f87171',
}
const FONT = '"SF Pro Display", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
const GLOBAL_CSS = `
  @keyframes fadeUp  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes scaleIn { from{opacity:0;transform:scale(0.88)} to{opacity:1;transform:scale(1)} }
  @keyframes glow    { 0%,100%{box-shadow:0 0 0 0 rgba(77,214,200,0.4)} 50%{box-shadow:0 0 0 14px rgba(77,214,200,0)} }
  @keyframes dot1    { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
  @keyframes dot2    { 0%,100%,20%{transform:scale(0)} 60%{transform:scale(1)} }
  @keyframes dot3    { 0%,40%,100%{transform:scale(0)} 80%{transform:scale(1)} }
  @keyframes spin    { to{transform:rotate(360deg)} }
  @keyframes shake   { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }
  * { box-sizing:border-box }
  body { margin:0; padding:0; background:#05111f; }
  input::placeholder, textarea::placeholder { color:rgba(255,255,255,0.3)!important }
  input,select,textarea { -webkit-appearance:none; appearance:none; }
  textarea { resize:none; }
`

// ─── Types ────────────────────────────────────────────────────────────────────
type Screen = 'splash' | 'auth' | 'otp_verify' | 'contact_setup' | 'pin_setup' | 'pin_login' | 'pin_session_refresh' | 'pin_email_login' | 'home'
type HomeTab = 'vessel' | 'weather' | 'marinas' | 'messages' | 'account'

type WeatherData = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  current:  Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  forecast: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  marine:   Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tides:    Record<string, any>
}
type Marina = { id:string; name:string; city:string; state:string; total_slips:number }

type BerthData = {
  id: string
  marinaName: string
  slipNumber: string | null
  dock: string | null
  monthlyRate: number | null
  leaseType: string | null
  startDate: string | null
  endDate: string | null
}

type Profile = {
  id: string
  contact_id: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  display_name: string | null
  phone: string | null
  mobile: string | null
  avatar_url: string | null
  pin_hash: string | null
  onboarding_complete: boolean
  address: string | null
  address_city: string | null
  address_state: string | null
  address_zip: string | null
  billing_address: string | null
  billing_city: string | null
  billing_state: string | null
  billing_zip: string | null
  emergency_contact: string | null
  emergency_phone: string | null
  title: string | null
  date_of_birth: string | null
  driver_license_number: string | null
  preferred_contact_method: string | null
  language_preference: string | null
  // Extended OPS fields
  preferred_name: string | null
  email_secondary: string | null
  phone_work: string | null
  company_organization: string | null
  job_title: string | null
  address_line2: string | null
  country: string | null
  billing_name: string | null
  billing_email: string | null
  tax_exempt: boolean | null
  emergency_relationship: string | null
  emergency_name_2: string | null
  emergency_phone_2: string | null
  drivers_license_state: string | null
  drivers_license_expiry: string | null
  oupv_license_number: string | null
  oupv_expiry: string | null
  contact_type: string | null
  status: string | null
  sms_opt_in: boolean | null
  email_opt_in: boolean | null
  liveaboard: boolean | null
  pet_on_board: boolean | null
  parking_permit: boolean | null
  notes: string | null
  account_number: string | null
  lead_source: string | null
  customer_since: string | null
  waiver_signed: boolean | null
  waiver_signed_date: string | null
  internal_notes: string | null
  vip_flag: boolean | null
  do_not_contact: boolean | null
  // Master contact form — new fields 2026-06-22
  fax: string | null
  website: string | null
  nationality: string | null
  passport_number: string | null
  passport_country: string | null
  passport_expiry: string | null
  ssn_tax_id: string | null
  mmc_license_number: string | null
  mmc_tonnage_rating: string | null
  mmc_expiry: string | null
  twic_number: string | null
  twic_expiry: string | null
  stcw_certification: string | null
  stcw_level: string | null
  stcw_expiry: string | null
  fcc_license_number: string | null
  fcc_expiry: string | null
  cpr_certification: string | null
  cpr_expiry: string | null
  abyc_certifications: string[] | null
  engine_brand_certifications: string[] | null
  trade_specialties: string[] | null
  dealer_license_number: string | null
  dealer_license_state: string | null
  broker_license_number: string | null
  broker_license_state: string | null
  seatow_membership_number: string | null
  boatus_membership_number: string | null
  employee_id: string | null
  department: string | null
  employment_type: string | null
  tax_classification: string | null
  hire_date: string | null
  hourly_rate: number | null
  salary: number | null
  access_card: string | null
  locker_number: string | null
  parking_spot: string | null
  shift_notes: string | null
  doc_w2_on_file: boolean | null
  doc_i9_on_file: boolean | null
  doc_direct_deposit: boolean | null
  doc_signed_offer: boolean | null
  doc_background_check: boolean | null
  languages_spoken: string[] | null
}

type Vessel = {
  id: string
  name: string
  vessel_type: string
  // Identity
  asset_category: string | null
  asset_subtype: string | null
  status: string | null
  // Basic info
  make: string | null
  model: string | null
  year: number | null
  color: string | null
  // Dimensions
  length_ft: number | null
  beam_ft: number | null
  draft_ft: number | null
  air_draft_ft: number | null
  weight_lbs: number | null
  keel_type: string | null
  bottom_paint_type: string | null
  // Identifiers / Registration
  hin: string | null
  registration_number: string | null
  registration_state: string | null
  registration_expiry: string | null
  documentation_number: string | null
  mmsi_number: string | null
  flag_state: string | null
  hull_material: string | null
  // Engine / Fuel
  shore_power: string | null
  fuel_type: string | null
  engine_count: number | null
  engine_type: string | null
  engine_make: string | null
  engine_model: string | null
  engine_year: number | null
  horsepower_per_engine: number | null
  fuel_tank_gallons: number | null
  engine_hp: number | null
  engine_serial: string | null
  total_horsepower: number | null
  raw_water_cooled: string | null
  // Insurance
  insurance_provider: string | null
  insurance_policy: string | null
  insurance_expiry: string | null
  insurance_agent_name: string | null
  insurance_agent_phone: string | null
  insurance_coverage_amount: number | null
  // Service History
  last_survey_date: string | null
  last_haulout_date: string | null
  // Safety Equipment
  life_raft: string | null
  life_jacket_count: number | null
  epirb_serial: string | null
  epirb_expiry: string | null
  flare_kit_expiry: string | null
  fire_extinguisher_expiry: string | null
  oil_placard: string | null
  discharge_placard: string | null
  // Security
  alarm: string | null
  gps_tracker: string | null
  lock_type: string | null
  lock_location: string | null
  lock_combination: string | null
  authorized_operators: string | null
  // Trailer
  has_trailer: string | null
  trailer_make: string | null
  trailer_type: string | null
  trailer_axle_count: number | null
  trailer_length_ft: number | null
  trailer_width_ft: number | null
  trailer_plate: string | null
  trailer_vin: string | null
  // Media / Notes
  photo_url: string | null
  notes: string | null
  // Contact doc/flag fields
  doc_registration: boolean | null
  doc_insurance_cert: boolean | null
  doc_signed_contract: boolean | null
  doc_photo_id: boolean | null
  liveaboard: boolean | null
  pet_on_board: boolean | null
  parking_permit: string | null
}

type MsgRow = { id:string; body:string; direction:string; inserted_at:string; marina_id:string }

// ─── PIN helpers (SHA-256 in browser) ─────────────────────────────────────────
async function hashPin(pin: string): Promise<string> {
  const enc = new TextEncoder()
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(pin))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// ─── Dynamic vessel icon by type ─────────────────────────────────────────────
function vesselIcon(type: string | null | undefined): string {
  const t = (type || '').toLowerCase()
  if (t.includes('sail')) return '⛵'
  if (t.includes('pwc') || t.includes('jet')) return '🛥️'
  if (t.includes('kayak') || t.includes('canoe')) return '🛶'
  if (t.includes('power') || t.includes('motor')) return '🚤'
  return '⚓'
}

// ─── Contacts → Profile mapper ─────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function contactToProfile(c: Record<string, any>): Profile {
  return {
    id: c.auth_user_id as string,
    contact_id: c.id as string,
    first_name: c.first_name ?? null,
    last_name: c.last_name ?? null,
    email: c.email ?? null,
    display_name: [c.first_name, c.last_name].filter(Boolean).join(' ') || null,
    phone: c.phone ?? null,
    mobile: c.mobile ?? null,
    avatar_url: c.photo_url ?? null,
    pin_hash: c.pin_hash ?? null,
    onboarding_complete: c.setup_complete ?? false,
    address: c.address ?? null,
    address_city: c.address_city ?? null,
    address_state: c.address_state ?? null,
    address_zip: c.address_zip ?? null,
    billing_address: c.billing_address ?? null,
    billing_city: c.billing_city ?? null,
    billing_state: c.billing_state ?? null,
    billing_zip: c.billing_zip ?? null,
    emergency_contact: c.emergency_name ?? null,
    emergency_phone: c.emergency_phone ?? null,
    title: c.title ?? null,
    date_of_birth: c.date_of_birth ?? null,
    driver_license_number: c.driver_license_number ?? null,
    preferred_contact_method: c.preferred_contact_method ?? null,
    language_preference: c.language_preference ?? null,
    // Extended OPS fields
    preferred_name: c.preferred_name ?? null,
    email_secondary: c.email_secondary ?? null,
    phone_work: c.phone_work ?? null,
    company_organization: c.company_organization ?? null,
    job_title: c.job_title ?? null,
    address_line2: c.address_line2 ?? null,
    country: c.country ?? null,
    billing_name: c.billing_name ?? null,
    billing_email: c.billing_email ?? null,
    tax_exempt: c.tax_exempt ?? null,
    emergency_relationship: c.emergency_relationship ?? null,
    emergency_name_2: c.emergency_name_2 ?? null,
    emergency_phone_2: c.emergency_phone_2 ?? null,
    drivers_license_state: c.drivers_license_state ?? null,
    drivers_license_expiry: c.drivers_license_expiry ?? null,
    oupv_license_number: c.oupv_license_number ?? null,
    oupv_expiry: c.oupv_expiry ?? null,
    contact_type: c.contact_type ?? null,
    status: c.status ?? null,
    sms_opt_in: c.sms_opt_in ?? null,
    email_opt_in: c.email_opt_in ?? null,
    liveaboard: c.liveaboard ?? null,
    pet_on_board: c.pet_on_board ?? null,
    parking_permit: c.parking_permit ?? null,
    notes: c.notes ?? null,
    account_number: c.account_number ?? null,
    lead_source: c.lead_source ?? null,
    customer_since: c.customer_since ?? null,
    waiver_signed: c.waiver_signed ?? null,
    waiver_signed_date: c.waiver_signed_date ?? null,
    internal_notes: c.internal_notes ?? null,
    vip_flag: c.vip_flag ?? null,
    do_not_contact: c.do_not_contact ?? null,
    // Master contact form — new fields 2026-06-22
    fax: c.fax ?? null,
    website: c.website ?? null,
    nationality: c.nationality ?? null,
    passport_number: c.passport_number ?? null,
    passport_country: c.passport_country ?? null,
    passport_expiry: c.passport_expiry ?? null,
    ssn_tax_id: c.ssn_tax_id ?? null,
    mmc_license_number: c.mmc_license_number ?? null,
    mmc_tonnage_rating: c.mmc_tonnage_rating ?? null,
    mmc_expiry: c.mmc_expiry ?? null,
    twic_number: c.twic_number ?? null,
    twic_expiry: c.twic_expiry ?? null,
    stcw_certification: c.stcw_certification ?? null,
    stcw_level: c.stcw_level ?? null,
    stcw_expiry: c.stcw_expiry ?? null,
    fcc_license_number: c.fcc_license_number ?? null,
    fcc_expiry: c.fcc_expiry ?? null,
    cpr_certification: c.cpr_certification ?? null,
    cpr_expiry: c.cpr_expiry ?? null,
    abyc_certifications: c.abyc_certifications ?? null,
    engine_brand_certifications: c.engine_brand_certifications ?? null,
    trade_specialties: c.trade_specialties ?? null,
    dealer_license_number: c.dealer_license_number ?? null,
    dealer_license_state: c.dealer_license_state ?? null,
    broker_license_number: c.broker_license_number ?? null,
    broker_license_state: c.broker_license_state ?? null,
    seatow_membership_number: c.seatow_membership_number ?? null,
    boatus_membership_number: c.boatus_membership_number ?? null,
    employee_id: c.employee_id ?? null,
    department: c.department ?? null,
    employment_type: c.employment_type ?? null,
    tax_classification: c.tax_classification ?? null,
    hire_date: c.hire_date ?? null,
    hourly_rate: c.hourly_rate ?? null,
    salary: c.salary ?? null,
    access_card: c.access_card ?? null,
    locker_number: c.locker_number ?? null,
    parking_spot: c.parking_spot ?? null,
    shift_notes: c.shift_notes ?? null,
    doc_w2_on_file: c.doc_w2_on_file ?? null,
    doc_i9_on_file: c.doc_i9_on_file ?? null,
    doc_direct_deposit: c.doc_direct_deposit ?? null,
    doc_signed_offer: c.doc_signed_offer ?? null,
    doc_background_check: c.doc_background_check ?? null,
    languages_spoken: c.languages_spoken ?? null,
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function assetRowToVessel(a: Record<string, any>, contact?: Record<string, any> | null): Vessel {
  return {
    id: a.id as string,
    name: a.name ?? '',
    vessel_type: a.asset_type ?? '',
    length_ft: a.length_ft ?? null,
    beam_ft: a.beam_ft ?? null,
    draft_ft: a.draft_ft ?? null,
    shore_power: a.shore_power ?? null,
    fuel_type: a.fuel_type ?? null,
    make: a.make ?? null,
    model: a.model ?? null,
    year: a.year ?? null,
    color: a.color ?? null,
    weight_lbs: a.weight_lbs ?? null,
    air_draft_ft: a.air_draft_ft ?? null,
    hin: a.hin ?? null,
    registration_number: a.registration_number ?? null,
    registration_state: a.registration_state ?? null,
    registration_expiry: a.registration_expiry ?? null,
    documentation_number: a.documentation_number ?? null,
    mmsi_number: a.mmsi_number ?? null,
    flag_state: a.flag_state ?? null,
    hull_material: a.hull_material ?? null,
    engine_count: a.engine_count ?? null,
    engine_type: a.engine_type ?? null,
    engine_make: a.engine_make ?? null,
    engine_model: a.engine_model ?? null,
    engine_year: a.engine_year ?? null,
    horsepower_per_engine: a.horsepower_per_engine ?? null,
    fuel_tank_gallons: a.fuel_tank_gallons ?? null,
    insurance_provider: a.insurance_provider ?? null,
    insurance_policy: a.insurance_policy ?? null,
    insurance_expiry: a.insurance_expiry ?? null,
    insurance_agent_name: a.insurance_agent_name ?? null,
    insurance_agent_phone: a.insurance_agent_phone ?? null,
    last_survey_date: a.last_survey_date ?? null,
    last_haulout_date: a.last_haulout_date ?? null,
    photo_url: a.photo_url ?? null,
    notes: a.notes ?? null,
    keel_type: a.keel_type ?? null,
    bottom_paint_type: a.bottom_paint_type ?? null,
    engine_serial: a.engine_serial ?? null,
    total_horsepower: a.total_horsepower ?? null,
    raw_water_cooled: a.raw_water_cooled ?? null,
    insurance_coverage_amount: a.insurance_coverage_amount ?? null,
    life_raft: a.life_raft ?? null,
    life_jacket_count: a.life_jacket_count ?? null,
    epirb_serial: a.epirb_serial ?? null,
    epirb_expiry: a.epirb_expiry ?? null,
    flare_kit_expiry: a.flare_kit_expiry ?? null,
    fire_extinguisher_expiry: a.fire_extinguisher_expiry ?? null,
    oil_placard: a.oil_placard ?? null,
    discharge_placard: a.discharge_placard ?? null,
    alarm: a.alarm ?? null,
    gps_tracker: a.gps_tracker ?? null,
    lock_type: a.lock_type ?? null,
    lock_location: a.lock_location ?? null,
    lock_combination: a.lock_combination ?? null,
    authorized_operators: Array.isArray(a.authorized_operators) ? a.authorized_operators.join(', ') : (a.authorized_operators ?? null),
    has_trailer: a.has_trailer ?? null,
    trailer_make: a.trailer_make ?? null,
    trailer_type: a.trailer_type ?? null,
    trailer_axle_count: a.trailer_axle_count ?? null,
    trailer_length_ft: a.trailer_length_ft ?? null,
    trailer_width_ft: a.trailer_width_ft ?? null,
    trailer_plate: a.trailer_plate ?? null,
    trailer_vin: a.trailer_vin ?? null,
    asset_category: a.asset_category ?? null,
    asset_subtype: a.asset_subtype ?? null,
    status: a.status ?? null,
    engine_hp: a.engine_hp ?? null,
    // doc/flag fields remain on contacts
    doc_registration: contact?.doc_registration ?? false,
    doc_insurance_cert: contact?.doc_insurance_cert ?? false,
    doc_signed_contract: contact?.doc_signed_contract ?? false,
    doc_photo_id: contact?.doc_photo_id ?? false,
    liveaboard: contact?.liveaboard ?? false,
    pet_on_board: contact?.pet_on_board ?? false,
    parking_permit: contact?.parking_permit ?? null,
  }
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function SkipperApp() {
  const [screen,         setScreen]         = useState<Screen>('splash')
  const [user,           setUser]           = useState<User | null>(null)
  const [profile,        setProfile]        = useState<Profile | null>(null)
  const [vessel,         setVessel]         = useState<Vessel | null>(null)   // primary (top bar)
  const [vessels,        setVessels]        = useState<Vessel[]>([])
  const [vesselIds,      setVesselIds]      = useState<string[]>([])
  const [homeTab,        setHomeTab]        = useState<HomeTab>('vessel')
  const [savedEmail,     setSavedEmail]     = useState('')
  const [otpEmail,       setOtpEmail]       = useState('')
  const [vesselId,       setVesselId]       = useState<string|null>(null)
  const [storedUserId,   setStoredUserId]   = useState<string|null>(null)
  const [vesselsLoading, setVesselsLoading] = useState(false)
  // Keep a ref to the active user so loadUserData can always access the latest value
  const userRef = useRef<User | null>(null)

  // ── Splash init: check real Supabase Auth session ─────────────────────────
  // Replaces the old custom-UUID localStorage check. With Supabase Auth OTP,
  // sessions persist in localStorage automatically. auth.uid() works client-side.
  useEffect(() => {
    const storedEmail = localStorage.getItem('skipper_email') ?? ''
    setSavedEmail(storedEmail)

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // Check for persistent user identity cookie (survives new browsers after first login)
        const uidMatch = document.cookie.match(/(?:^|;\s*)skipper_uid=([^;]+)/)
        const persistedUid = uidMatch ? decodeURIComponent(uidMatch[1]) : null
        if (persistedUid) {
          // Known user on this device — show PIN screen, no email code needed
          setStoredUserId(persistedUid)
          const storedEmail = localStorage.getItem('skipper_email') ?? ''
          setSavedEmail(storedEmail)
          setScreen('pin_session_refresh')
        } else {
          setScreen('auth')
        }
        return
      }
      const u = session.user
      const email = u.email ?? storedEmail
      localStorage.setItem('skipper_email', email)
      localStorage.setItem('skipper_user_id', u.id)
      setSavedEmail(email)
      setUser(u)
      userRef.current = u

      if (localStorage.getItem(`skipper_pin_${u.id}`)) {
        setScreen('pin_login')
      } else {
        routeAfterAuth(u)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Shared data-load function — called by routeAfterAuth, realtime, and visibilitychange ──
  async function loadUserData(u: User) {
    setVesselsLoading(true)
    try {
      // Look up national-pool contacts row (marina_id IS NULL) — READ ONLY.
      // Use order + limit(1) so multiple rows never throw. Never insert here.
      const { data: contactRows } = await supabase
        .from('contacts')
        .select('*')
        .eq('auth_user_id', u.id)
        .is('marina_id', null)
        .order('created_at', { ascending: true })
        .limit(1)
      const contact = contactRows?.[0] ?? null

      // If no contact exists yet, profile is null — signup flow will create it.
      // Do NOT insert here; this function is strictly read-only.

      // Load ALL assets for this user across ALL their contact IDs (national-pool + marina-scoped)
      // so assets added via Ops (which uses marina-scoped contact IDs) appear here too
      const { data: allContactRows } = await supabase
        .from('contacts')
        .select('id')
        .eq('auth_user_id', u.id)
      const allContactIds = (allContactRows ?? []).map((c: any) => c.id as string)

      const { data: assetRows } = allContactIds.length > 0
        ? await supabase
            .from('marina_assets')
            .select('*')
            .in('tenant_id', allContactIds)
            .order('created_at', { ascending: false })
            .limit(50)
        : { data: [] }

      const loadedVessels = (assetRows ?? []).map((a: any) => assetRowToVessel(a, contact))
      const loadedIds     = (assetRows ?? []).map((a: any) => a.id as string)
      setVessels(loadedVessels)
      setVesselIds(loadedIds)
      setVessel(prev => loadedVessels.find(v => v.id === prev?.id) ?? loadedVessels[0] ?? null)
      setVesselId(prev => loadedIds.includes(prev ?? '') ? prev : (loadedIds[0] ?? null))

      // Build profile from contact
      const prof = contact ? contactToProfile(contact) : null
      setProfile(prof)

      return { contact, allContactIds, prof }
    } finally {
      setVesselsLoading(false)
    }
  }

  async function routeAfterAuth(u: User) {
    userRef.current = u
    localStorage.setItem('skipper_user_id', u.id)
    setVesselsLoading(true)
    try {
      // Load contact + vessels via shared function
      const result = await loadUserData(u)
      const contact = result?.contact
      const prof    = result?.prof

      // Auto-coupling: scan all marina contacts rows with matching email and no auth link
      if (u.email) {
        const { data: pendingLinks } = await supabase
          .from('contacts')
          .select('id')
          .eq('email', u.email)
          .not('marina_id', 'is', null)
          .is('auth_user_id', null)
        if (pendingLinks && pendingLinks.length > 0) {
          await supabase
            .from('contacts')
            .update({ auth_user_id: u.id })
            .in('id', pendingLinks.map((c: { id: string }) => c.id))
          console.log(`[Skipper] Auto-coupled ${pendingLinks.length} marina(s) for ${u.email}`)
        }
      }

      // ── One-time fill: ONLY runs when national-pool row has no name yet.
      // Never overwrites existing data. Login never touches data.
      if (contact && !contact.first_name) {
        const { data: marinaScopedRows } = await supabase
          .from('contacts')
          .select('*')
          .eq('auth_user_id', u.id)
          .not('marina_id', 'is', null)
          .not('first_name', 'is', null)
          .order('updated_at', { ascending: false })
          .limit(1)
        const marinaContact = marinaScopedRows?.[0] ?? null
        if (marinaContact) {
          const syncFields = [
            'first_name','last_name','phone','mobile',
            'address','address_line2','address_city','address_state','address_zip','country',
            'emergency_name','emergency_relationship','emergency_phone',
            'emergency_name_2','emergency_phone_2',
            'title','date_of_birth','driver_license_number','drivers_license_state','drivers_license_expiry',
            'oupv_license_number','oupv_expiry',
            'preferred_contact_method','language_preference',
            'billing_name','billing_email','billing_address','billing_city','billing_state','billing_zip',
            'company_organization','job_title','email_secondary','phone_work',
          ] as const
          const patch: Record<string, unknown> = {}
          for (const f of syncFields) {
            if ((marinaContact as any)[f] != null) patch[f] = (marinaContact as any)[f]
          }
          if (Object.keys(patch).length > 0) {
            const { data: synced } = await supabase
              .from('contacts')
              .update(patch)
              .eq('auth_user_id', u.id)
              .is('marina_id', null)
              .select()
              .single()
            if (synced) {
              // Re-apply synced contact to profile
              setProfile(contactToProfile(synced))
            }
          }
        }
      }

      if (!prof?.first_name)  { setScreen('contact_setup'); return }
      if (!contact?.pin_hash) { setScreen('pin_setup'); return }

      const unlocked = localStorage.getItem(`skipper_unlocked_${u.id}`)
      if (unlocked) { setScreen('home'); return }

      setScreen('pin_login')
    } catch(err) {
      console.error('[Skipper] routeAfterAuth failed:', err)
      setVesselsLoading(false)
      // Fallback — always navigate somewhere, never leave user stuck on auth screen
      setScreen('contact_setup')
    }
  }

  function handleSignOut() {
    const uid = user?.id ?? localStorage.getItem('skipper_user_id') ?? ''
    if (uid) {
      localStorage.removeItem(`skipper_unlocked_${uid}`)
      localStorage.removeItem(`skipper_pin_${uid}`)
    }
    localStorage.removeItem('skipper_user_id')
    localStorage.removeItem('skipper_email')
    supabase.auth.signOut().catch(() => {})  // Clear real Supabase Auth session
    userRef.current = null
    setUser(null); setProfile(null); setVessel(null); setVesselId(null)
    setVessels([]); setVesselIds([])
    setVesselsLoading(false)
    setScreen('auth')
  }

  // ── 🔴 SKIPPER UNIVERSE REALTIME DOCTRINE (LOCKED 2026-06-23) ──
  // Full spec: memory/OPERATION-SKIPPER.md § 19. Canonical hook — do not modify.
  // Boater scope: receives all broadcasts routed to this boater's private channel.
  useSkipperRealtime({
    scope: { kind: 'boater', authUserId: user?.id ?? '' },
    enabled: !!user?.id,
    onChange: () => {
      const u = userRef.current
      if (u) loadUserData(u).catch(e => console.error('[Skipper] realtime loadUserData:', e))
    },
  })

  // ── Visibility-change refetch: refresh when app comes back to foreground ──
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'visible') {
        const u = userRef.current
        if (u) loadUserData(u).catch(e => console.error('[Skipper] visibility loadUserData:', e))
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Splash ──
  if (screen === 'splash') return <SplashScreen />

  // ── Auth ──
  if (screen === 'auth') return (
    <AuthScreen
      savedEmail={savedEmail}
      onOtpSent={(email) => {
        setSavedEmail(email)
        setOtpEmail(email)
        setScreen('otp_verify')
      }}
      onPinLogin={(email, userId) => {
        setSavedEmail(email)
        setStoredUserId(userId)
        setScreen('pin_email_login')
      }}
    />
  )

  // ── OTP Verify ──
  if (screen === 'otp_verify') return (
    <OtpVerifyScreen
      email={otpEmail || savedEmail}
      onVerified={async (u, email) => {
        localStorage.setItem('skipper_email', email)
        localStorage.setItem('skipper_user_id', u.id)
        setSavedEmail(email)
        setUser(u)
        userRef.current = u
        // Persist user identity in a 1-year cookie so new browsers skip OTP and go straight to PIN
        document.cookie = `skipper_uid=${u.id}; max-age=${60 * 60 * 24 * 365}; path=/; SameSite=Lax`
        // Link contacts row on server (creates/updates national-pool row, auto-couples marinas)
        await fetch('/api/auth/link-contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, userId: u.id }),
        })
        await routeAfterAuth(u)
      }}
      onBack={() => setScreen('auth')}
    />
  )

  // ── Contact Setup (new user) ──
  if (screen === 'contact_setup') return (
    <ContactSetupScreen
      user={user!}
      onComplete={(p) => {
        setProfile(p)
        setScreen('pin_setup')
      }}
    />
  )

  // ── PIN Setup ──
  if (screen === 'pin_setup') return (
    <PinSetupScreen
      user={user!}
      onComplete={() => {
        localStorage.setItem(`skipper_unlocked_${user!.id}`, '1')
        setScreen('home')
      }}
    />
  )

  // ── PIN Email Login (returning user, any device — email entered, DB confirmed PIN exists) ──
  if (screen === 'pin_email_login') return (
    <PinSessionRefreshScreen
      userId={storedUserId!}
      email={savedEmail}
      onUnlocked={async (u) => {
        localStorage.setItem('skipper_user_id', u.id)
        localStorage.setItem('skipper_email', u.email ?? savedEmail)
        localStorage.setItem(`skipper_unlocked_${u.id}`, '1')
        // Reinforce persistent cookie so same device skips email next time
        document.cookie = `skipper_uid=${u.id}; max-age=${60 * 60 * 24 * 365}; path=/; SameSite=Lax`
        setUser(u)
        userRef.current = u
        await routeAfterAuth(u)
      }}
      onNotMe={() => {
        setStoredUserId(null)
        setScreen('auth')
      }}
    />
  )

  // ── PIN Session Refresh (new browser — has cookie, no session) ──
  if (screen === 'pin_session_refresh') return (
    <PinSessionRefreshScreen
      userId={storedUserId!}
      email={savedEmail}
      onUnlocked={async (u) => {
        localStorage.setItem('skipper_user_id', u.id)
        localStorage.setItem(`skipper_unlocked_${u.id}`, '1')
        setUser(u)
        userRef.current = u
        await routeAfterAuth(u)
      }}
      onNotMe={() => {
        // Clear persistent identity — fall back to full OTP login
        document.cookie = 'skipper_uid=; max-age=0; path=/'
        localStorage.removeItem('skipper_user_id')
        localStorage.removeItem('skipper_email')
        setStoredUserId(null)
        setScreen('auth')
      }}
    />
  )

  // ── PIN Login (returning user) ──
  if (screen === 'pin_login') return (
    <PinLoginScreen
      user={user!}
      email={savedEmail || user?.email || ''}
      onUnlock={() => {
        localStorage.setItem(`skipper_unlocked_${user!.id}`, '1')
        routeAfterAuth(user!)  // loads vessels + sets userRef, then routes to home
      }}
      onForgotPin={() => setScreen('auth')}
    />
  )

  // ── Home ──
  return (
    <HomeScreen
      user={user!}
      profile={profile}
      vessel={vessel}
      activeTab={homeTab}
      onTabChange={setHomeTab}
      onSignOut={handleSignOut}
      vessels={vessels}
      vesselIds={vesselIds}
      onVesselSaved={(v, id) => {
        setVessels(prev => { const i = vesselIds.indexOf(id); if (i>=0){const n=[...prev];n[i]=v;return n} return [...prev,v] })
        setVesselIds(prev => prev.includes(id) ? prev : [...prev, id])
        setVessel(prev => prev ?? v)
        setVesselId(prev => prev ?? id)
      }}
      onVesselDeleted={(id) => {
        setVessels(prev => prev.filter((_, i) => vesselIds[i] !== id))
        setVesselIds(prev => prev.filter(vid => vid !== id))
        setVessel(prev => prev && vesselIds.find(vid => vid === id) ? null : prev)
        setVesselId(prev => prev === id ? null : prev)
      }}
      onProfileUpdated={(p) => setProfile(p)}
      vesselsLoading={vesselsLoading}
      onRefreshVessels={() => { if (userRef.current) loadUserData(userRef.current).catch(()=>{}) }}
    />
  )
}

// ─── Splash ───────────────────────────────────────────────────────────────────
function SplashScreen() {
  return (
    <div style={{ minHeight:'100vh', background:C.bgGrad, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16, fontFamily:FONT }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ width:80, height:80, borderRadius:'50%', overflow:'hidden', border:`2px solid ${C.teal}`, animation:'glow 4s ease-in-out infinite' }}>
        <Image src="/skipper-avatar.jpg" alt="Skipper" width={80} height={80} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top' }} />
      </div>
      <div style={{ fontSize:22, fontWeight:800, color:C.white, letterSpacing:-0.4 }}>Skipper</div>
      <div style={{ fontSize:13, color:C.muted }}>We run on Skipper.</div>
    </div>
  )
}

// ─── Auth (email entry — checks DB for PIN first; OTP only for new users) ────
function AuthScreen({ savedEmail, onOtpSent, onPinLogin }: {
  savedEmail: string
  onOtpSent: (email: string) => void
  onPinLogin: (email: string, userId: string) => void
}) {
  const [email, setEmail] = useState(savedEmail)
  const [busy,  setBusy]  = useState(false)
  const [err,   setErr]   = useState('')

  async function submit() {
    const clean = email.trim().toLowerCase()
    if (!clean || !clean.includes('@')) { setErr('Enter your email'); return }
    setBusy(true); setErr('')

    // Step 1: Check DB — does this email already have a PIN?
    // If yes, skip OTP entirely and go straight to PIN pad.
    try {
      const checkRes = await fetch('/api/auth/check-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clean }),
      })
      const checkData = await checkRes.json()
      if (checkData.hasPIN && checkData.userId) {
        setBusy(false)
        onPinLogin(clean, checkData.userId)
        return
      }
    } catch {
      // Check-pin failed — fall through to OTP
    }

    // Step 2: New user (no PIN yet) — send OTP once to establish identity
    const { error } = await supabase.auth.signInWithOtp({
      email: clean,
      options: { shouldCreateUser: true },
    })

    setBusy(false)
    if (error) { setErr(error.message); return }

    onOtpSent(clean)
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bgGrad, color:C.white, fontFamily:FONT, WebkitFontSmoothing:'antialiased', display:'flex', flexDirection:'column' }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'0 28px', maxWidth:420, margin:'0 auto', width:'100%' }}>
        <div style={{ marginBottom:40, animation:'scaleIn 0.5s ease both' }}>
          <div style={{ width:64, height:64, borderRadius:'50%', overflow:'hidden', border:`2px solid ${C.teal}`, marginBottom:20, animation:'glow 4s ease-in-out infinite' }}>
            <Image src="/skipper-avatar.jpg" alt="Skipper" width={64} height={64} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top' }} />
          </div>
          <h1 style={{ fontSize:28, fontWeight:800, margin:'0 0 8px', letterSpacing:-0.5, lineHeight:1.15 }}>Welcome aboard.</h1>
          <p style={{ fontSize:14, color:C.muted, margin:0, lineHeight:1.6 }}>
            Your marina, your slip, everything in one place.
          </p>
        </div>
        <div style={{ animation:'fadeUp 0.4s ease 0.1s both' }}>
          <FieldGroup label="Email address">
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" onKeyDown={e => e.key==='Enter' && submit()} autoFocus />
          </FieldGroup>
          {err && <ErrMsg>{err}</ErrMsg>}
          <PrimaryBtn onClick={submit} loading={busy} style={{ marginTop:8 }}>Continue →</PrimaryBtn>
          <p style={{ fontSize:12, color:C.muted2, textAlign:'center', marginTop:16, lineHeight:1.7 }}>
            New here? Just enter your email — we&apos;ll send a verification code.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── OTP Verify ────────────────────────────────────────────────────────────────
function OtpVerifyScreen({ email, onVerified, onBack }: {
  email: string
  onVerified: (u: User, email: string) => void
  onBack: () => void
}) {
  const [code,   setCode]   = useState('')
  const [busy,   setBusy]   = useState(false)
  const [err,    setErr]    = useState('')
  const [resent, setResent] = useState(false)

  async function verify() {
    const trimmed = code.trim()
    if (trimmed.length !== 6) { setErr('Enter the 6-digit code from your email'); return }
    setBusy(true); setErr('')

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: trimmed,
      type: 'email',
    })

    setBusy(false)
    if (error || !data.session) {
      setErr(error?.message ?? 'Invalid code — check your email and try again')
      return
    }
    // Real Supabase Auth session. session.user.id is the real UUID.
    onVerified(data.session.user, email)
  }

  async function resend() {
    setResent(false)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    if (!error) setResent(true)
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bgGrad, color:C.white, fontFamily:FONT, WebkitFontSmoothing:'antialiased', display:'flex', flexDirection:'column' }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'0 28px', maxWidth:420, margin:'0 auto', width:'100%' }}>
        <div style={{ marginBottom:32, animation:'scaleIn 0.5s ease both' }}>
          <div style={{ width:64, height:64, borderRadius:'50%', overflow:'hidden', border:`2px solid ${C.teal}`, marginBottom:20, animation:'glow 4s ease-in-out infinite' }}>
            <Image src="/skipper-avatar.jpg" alt="Skipper" width={64} height={64} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top' }} />
          </div>
          <h1 style={{ fontSize:26, fontWeight:800, margin:'0 0 8px', letterSpacing:-0.5, lineHeight:1.15 }}>Check your email</h1>
          <p style={{ fontSize:14, color:C.muted, margin:0, lineHeight:1.6 }}>
            We sent a 6-digit code to <strong style={{ color:C.white }}>{email}</strong>
          </p>
        </div>
        <div style={{ animation:'fadeUp 0.4s ease 0.1s both' }}>
          <FieldGroup label="Verification code">
            <Input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setErr('') }}
              placeholder="123456"
              onKeyDown={e => e.key === 'Enter' && verify()}
              autoFocus
            />
          </FieldGroup>
          {err && <ErrMsg>{err}</ErrMsg>}
          <PrimaryBtn onClick={verify} loading={busy} style={{ marginTop:8 }}>Verify →</PrimaryBtn>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:20 }}>
            <button onClick={onBack}
              style={{ background:'none', border:'none', color:C.muted2, fontSize:12, cursor:'pointer', fontFamily:FONT }}>
              ← Use a different email
            </button>
            <button onClick={resend}
              style={{ background:'none', border:'none', color:C.teal, fontSize:12, cursor:'pointer', fontFamily:FONT }}>
              {resent ? '✓ Code sent!' : 'Resend code'}
            </button>
          </div>
          <p style={{ fontSize:12, color:C.muted2, textAlign:'center', marginTop:16, lineHeight:1.7 }}>
            Check your spam folder if it doesn&apos;t arrive within a minute.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Contact Setup (Step 1 — new user) ────────────────────────────────────────
function ContactSetupScreen({ user, onComplete }: { user: User; onComplete: (p: Profile) => void }) {
  const [contact, setContact] = React.useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    supabase.from('contacts').select('*')
      .eq('auth_user_id', user.id).is('marina_id', null)
      .order('created_at', { ascending: true }).limit(1)
      .then(({ data }) => { setContact(data?.[0] ?? {}); setLoading(false) })
  }, [user.id])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#05111f' }}>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontFamily: '"SF Pro Display", system-ui, sans-serif', fontSize: 15 }}>Loading…</div>
    </div>
  )

  return (
    <OnboardingShell step={1} total={2} title="About you" subtitle="Your marina needs this on file. You\'ll only do this once.">
      <ContactForm
        userId={user.id}
        contact={contact ?? {}}
        submitLabel="Save & Continue →"
        onSaved={(data) => {
          supabase.from('contacts')
            .update({ setup_complete: false })
            .eq('auth_user_id', user.id).is('marina_id', null)
            .then(() => {})
          onComplete(contactToProfile(data as Record<string, unknown>))
        }}
      />
    </OnboardingShell>
  )
}
// ─── PIN Setup (Step 2) ────────────────────────────────────────────────────────
function PinSetupScreen({ user, onComplete }: { user: User; onComplete: () => void }) {
  const [pin,    setPin]    = useState('')
  const [step,   setStep]   = useState<'set'|'confirm'>('set')
  const [first,  setFirst]  = useState('')
  const [err,    setErr]    = useState('')
  const [busy,   setBusy]   = useState(false)

  function onFirst(p: string) { setFirst(p); setErr(''); setStep('confirm') }

  async function onConfirm(p: string) {
    if (p !== first) {
      setErr("PINs don't match — let's try again")
      setStep('set'); setPin(''); setFirst('')
      return
    }
    setBusy(true)
    const hash = await hashPin(p)
    // Direct Supabase client write — works because boater has a real Supabase Auth
    // session (OTP verified). /api/auth/pin is deprecated; kept as dead code below.
    const { error } = await supabase
      .from('contacts')
      .update({ pin_hash: hash, setup_complete: true })
      .eq('auth_user_id', user.id)
      .is('marina_id', null)
    setBusy(false)
    if (error) { setErr(error.message ?? 'PIN save failed'); return }
    localStorage.setItem(`skipper_pin_${user.id}`, hash)
    onComplete()
  }

  return (
    <OnboardingShell step={2} total={2} title="Set your PIN" subtitle="4 digits. Gets you back in without your email every time.">
      <div style={{ textAlign:'center', marginTop:8 }}>
        <div style={{ fontSize:13, color:C.muted, marginBottom:24 }}>
          {step === 'set' ? 'Choose a 4-digit PIN' : 'Enter it again to confirm'}
        </div>
        <PinDots value={pin} />
        <PinPad value={pin} onChange={v => { setPin(v); setErr('') }} max={4} onFull={step==='set' ? (p) => { setPin(''); onFirst(p) } : (p) => { setPin(''); onConfirm(p) }} />
        {err && <div style={{ fontSize:13, color:C.danger, marginTop:16 }}>{err}</div>}
        {busy && <div style={{ marginTop:12 }}><Spinner /></div>}
      </div>
    </OnboardingShell>
  )
}

// ─── PIN Session Refresh (new browser — cookie exists, no Supabase session) ─────────────
function PinSessionRefreshScreen({ userId, email, onUnlocked, onNotMe }: {
  userId: string
  email: string
  onUnlocked: (u: import('@supabase/supabase-js').User) => void
  onNotMe: () => void
}) {
  const [pin,   setPin]   = useState('')
  const [shake, setShake] = useState(false)
  const [err,   setErr]   = useState('')
  const [busy,  setBusy]  = useState(false)

  async function verify(p: string) {
    setBusy(true)
    const pinHash = await hashPin(p)

    const res = await fetch('/api/auth/pin-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, pinHash }),
    })
    const data = await res.json()

    if (!res.ok) {
      setBusy(false)
      setPin('')
      setErr(data.error === 'Incorrect PIN' ? 'Wrong PIN' : 'Something went wrong')
      setShake(true)
      setTimeout(() => setShake(false), 600)
      return
    }

    // Restore Supabase session client-side — no email needed
    const { data: sessionData, error: sessErr } = await supabase.auth.setSession({
      access_token:  data.access_token,
      refresh_token: data.refresh_token,
    })
    setBusy(false)

    if (sessErr || !sessionData?.user) {
      setErr('Session restore failed — try again')
      setPin('')
      return
    }

    // Cache PIN in localStorage for fast local verify next time
    localStorage.setItem(`skipper_pin_${sessionData.user.id}`, pinHash)
    localStorage.setItem('skipper_email', sessionData.user.email ?? email)
    onUnlocked(sessionData.user)
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bgGrad, color:C.white, fontFamily:FONT, WebkitFontSmoothing:'antialiased', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 24px' }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ width:'100%', maxWidth:360, textAlign:'center' }}>
        <div style={{ width:72, height:72, borderRadius:'50%', overflow:'hidden', margin:'0 auto 20px', border:`2px solid ${C.teal}`, animation:'glow 4s ease-in-out infinite' }}>
          <Image src="/skipper-avatar.jpg" alt="Skipper" width={72} height={72} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top' }} />
        </div>
        <div style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>Welcome back</div>
        <div style={{ fontSize:13, color:C.muted, marginBottom:32 }}>{email || 'Enter your PIN to continue'}</div>
        <div style={{ animation: shake ? 'shake 0.5s ease both' : 'none' }}>
          <PinDots value={pin} />
        </div>
        <PinPad value={pin} onChange={v => { setPin(v); setErr('') }} max={4} onFull={verify} />
        {err && <div style={{ fontSize:13, color:C.danger, marginTop:8 }}>{err}</div>}
        {busy && <div style={{ marginTop:12 }}><Spinner /></div>}
        <button onClick={onNotMe}
          style={{ background:'none', border:'none', color:C.muted2, fontSize:12, cursor:'pointer', fontFamily:FONT, marginTop:24 }}>
          Not you? Use a different account →
        </button>
      </div>
    </div>
  )
}

// ─── PIN Login (returning user) ────────────────────────────────────────────────
function PinLoginScreen({ user, email, onUnlock, onForgotPin }: {
  user: User; email: string
  onUnlock: () => void
  onForgotPin: () => void
}) {
  const [pin,   setPin]   = useState('')
  const [shake, setShake] = useState(false)
  const [err,   setErr]   = useState('')
  const [busy,  setBusy]  = useState(false)

  async function verify(p: string) {
    setBusy(true)
    const hash = await hashPin(p)
    const localHash = localStorage.getItem(`skipper_pin_${user.id}`)
    let match = localHash ? hash === localHash : false
    if (!match) {
      const { data: pinRows } = await supabase.from('contacts').select('pin_hash').eq('auth_user_id', user.id).is('marina_id', null).order('created_at', { ascending: true }).limit(1)
      const data = pinRows?.[0] ?? null
      match = !!data?.pin_hash && data.pin_hash === hash
      if (match && data?.pin_hash) localStorage.setItem(`skipper_pin_${user.id}`, data.pin_hash)
    }
    setBusy(false)
    if (!match) {
      setPin(''); setErr('Wrong PIN'); setShake(true)
      setTimeout(() => setShake(false), 600)
      return
    }
    // Reinforce persistent cookie on every successful PIN unlock
    document.cookie = `skipper_uid=${user.id}; max-age=${60 * 60 * 24 * 365}; path=/; SameSite=Lax`
    onUnlock()
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bgGrad, color:C.white, fontFamily:FONT, WebkitFontSmoothing:'antialiased', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 24px' }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ width:'100%', maxWidth:360, textAlign:'center' }}>
        <div style={{ width:72, height:72, borderRadius:'50%', overflow:'hidden', margin:'0 auto 20px', border:`2px solid ${C.teal}`, animation:'glow 4s ease-in-out infinite' }}>
          <Image src="/skipper-avatar.jpg" alt="Skipper" width={72} height={72} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top' }} />
        </div>
        <div style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>Welcome back</div>
        <div style={{ fontSize:13, color:C.muted, marginBottom:32 }}>{email}</div>
        <div style={{ animation: shake ? 'shake 0.5s ease both' : 'none' }}>
          <PinDots value={pin} />
        </div>
        <PinPad value={pin} onChange={v => { setPin(v); setErr('') }} max={4} onFull={verify} />
        {err && <div style={{ fontSize:13, color:C.danger, marginTop:8 }}>{err}</div>}
        {busy && <div style={{ marginTop:12 }}><Spinner /></div>}
        <button onClick={onForgotPin}
          style={{ background:'none', border:'none', color:C.muted2, fontSize:12, cursor:'pointer', fontFamily:FONT, marginTop:24 }}>
          Not you? Use a different email →
        </button>
      </div>
    </div>
  )
}

// ─── Home ──────────────────────────────────────────────────────────────────────
function HomeScreen({ user, profile, vessel, vessels, vesselIds, activeTab, onTabChange, onSignOut, onVesselSaved, onVesselDeleted, onProfileUpdated, vesselsLoading, onRefreshVessels }: {
  user: User; profile: Profile|null; vessel: Vessel|null; vessels: Vessel[]; vesselIds: string[]; activeTab: HomeTab
  onTabChange: (t: HomeTab) => void; onSignOut: () => void
  onVesselSaved: (v: Vessel, id: string) => void; onVesselDeleted: (id: string) => void; onProfileUpdated: (p: Profile) => void
  vesselsLoading: boolean; onRefreshVessels: () => void
}) {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null)

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lon } = pos.coords
        fetch(`/api/weather?lat=${lat}&lon=${lon}`)
          .then(r => r.json())
          .then(d => setWeatherData(d))
          .catch(() => {})
      },
      () => { /* location denied — silent */ },
      { enableHighAccuracy: false, timeout: 10000 }
    )
  }, [])

  return (
    <div style={{ minHeight:'100vh', maxHeight:'100vh', background:C.bgGrad, color:C.white, fontFamily:FONT, WebkitFontSmoothing:'antialiased', display:'flex', flexDirection:'column' }}>
      <style>{GLOBAL_CSS}</style>

      {/* Top bar */}
      <div style={{ padding:'env(safe-area-inset-top,16px) 20px 0', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0 10px', borderBottom:`1px solid rgba(255,255,255,0.07)` }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:'50%', overflow:'hidden', border:`1.5px solid ${C.teal}` }}>
              <Image src="/skipper-avatar.jpg" alt="Skipper" width={32} height={32} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top' }} />
            </div>
            <span style={{ fontSize:17, fontWeight:800, letterSpacing:-0.3 }}>Skipper</span>
          </div>
          {vessels.length > 0 && (
            <div style={{ fontSize:12, color:C.teal, fontWeight:700, background:C.tealDim, border:`1px solid ${C.tealBorder}`, borderRadius:20, padding:'4px 10px' }}>
              {vesselIcon(vessels[0]?.vessel_type)} {vessels.length === 1 ? vessels[0].name : `${vessels.length} assets`}
            </div>
          )}
        </div>
      </div>

      {/* Weather strip */}
      <WeatherStrip data={weatherData} onTap={() => onTabChange('weather')} />

      {/* Scrollable content */}
      <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch' }}>
        {activeTab === 'vessel'   && <TabVessel   vessels={vessels} vesselIds={vesselIds} user={user} profile={profile} onVesselSaved={onVesselSaved} onVesselDeleted={onVesselDeleted} vesselsLoading={vesselsLoading} />}
        {activeTab === 'weather'  && <TabWeather  weatherData={weatherData} onRefresh={() => {
          if (typeof navigator === 'undefined' || !navigator.geolocation) return
          navigator.geolocation.getCurrentPosition(pos => {
            fetch(`/api/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`)
              .then(r => r.json()).then(d => setWeatherData(d)).catch(() => {})
          }, () => {})
        }} />}
        {activeTab === 'marinas'  && <TabMarinas  user={user} profile={profile} vessel={vessel} />}
        {activeTab === 'messages' && <TabMessages  user={user} profile={profile} />}
        {activeTab === 'account'  && <TabAccount  user={user} profile={profile} vessels={vessels} onSignOut={onSignOut} onProfileUpdated={onProfileUpdated} />}
      </div>

      {/* Bottom nav */}
      <div style={{ flexShrink:0, borderTop:`1px solid rgba(255,255,255,0.08)`, background:'rgba(5,17,31,0.95)', backdropFilter:'blur(12px)', display:'flex', justifyContent:'space-around', alignItems:'center', padding:'10px 0 env(safe-area-inset-bottom,10px)' }}>
        <NavBtn icon={<IcoVessel  active={activeTab==='vessel'}  />} label="Vessel"   active={activeTab==='vessel'}  onClick={() => onTabChange('vessel')}  />
        <NavBtn icon={<IcoWeather active={activeTab==='weather'} />} label="Weather"  active={activeTab==='weather'} onClick={() => onTabChange('weather')} />
        <NavBtn icon={<IcoMarinas active={activeTab==='marinas'} />} label="Marinas"  active={activeTab==='marinas'} onClick={() => onTabChange('marinas')} />
        <NavBtn icon={<IcoMsgs   active={activeTab==='messages'} />} label="Messages" active={activeTab==='messages'} onClick={() => onTabChange('messages')} />
        <NavBtn icon={<IcoAcct   active={activeTab==='account'}  />} label="Account"  active={activeTab==='account'}  onClick={() => onTabChange('account')}  />
      </div>

      {/* Floating Skipper */}
      <SkipperFloat user={user} profile={profile} vessel={vessel} onRefreshVessels={onRefreshVessels} />
    </div>
  )
}

// ─── TAB 1: My Vessel ─────────────────────────────────────────────────────────
function TabVessel({ vessels, vesselIds, user, profile, onVesselSaved, onVesselDeleted, vesselsLoading }: {
  vessels: Vessel[]; vesselIds: string[]; user: User; profile: Profile|null; onVesselSaved: (v: Vessel, id: string) => void; onVesselDeleted: (id: string) => void
  vesselsLoading: boolean
}) {
  // ── Berth state ──────────────────────────────────────────────────────────────
  const [berths,      setBerths]      = useState<BerthData[]>([])
  const [berthLoading,setBerthLoading]= useState(true)

  // ── Form state ───────────────────────────────────────────────────────────────
  const [showForm,    setShowForm]    = useState(false)
  const [editingAsset,setEditingAsset]= useState<Record<string,unknown>|null>(null)

  // ── Expand/collapse vessel card state ────────────────────────────────────────
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})
  const toggleExpand = (id: string) => setExpandedIds(p => ({ ...p, [id]: !p[id] }))

  // ── Load berths ───────────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadBerths() {
      setBerthLoading(true)
      const { data: coupled } = await supabase
        .from('contacts')
        .select('id, marina_id')
        .eq('auth_user_id', user.id)
        .not('marina_id', 'is', null)

      if (!coupled || coupled.length === 0) { setBerthLoading(false); return }

      const contactIds = coupled.map((c: { id: string }) => c.id)
      const marinaIds  = coupled.map((c: { marina_id: string }) => c.marina_id).filter(Boolean)

      const { data: leases } = await supabase
        .from('leases')
        .select('id, tenant_id, slip_id, monthly_rate, lease_type, start_date, end_date')
        .in('tenant_id', contactIds)
        .eq('status', 'active')

      if (!leases || leases.length === 0) { setBerthLoading(false); return }

      const slipIds = leases.map((l: { slip_id: string }) => l.slip_id).filter(Boolean)
      const [{ data: slips }, { data: marinas }] = await Promise.all([
        slipIds.length > 0
          ? supabase.from('slips').select('id, slip_number, dock').in('id', slipIds)
          : Promise.resolve({ data: [] }),
        supabase.from('marinas').select('id, name').in('id', marinaIds),
      ])

      const slipMap: Record<string, { slip_number: string; dock: string }> =
        Object.fromEntries((slips ?? []).map((s: { id: string; slip_number: string; dock: string }) => [s.id, s]))
      const marinaMap: Record<string, string> =
        Object.fromEntries((marinas ?? []).map((m: { id: string; name: string }) => [m.id, m.name]))
      const contactMarinaMap: Record<string, string> =
        Object.fromEntries(coupled.map((c: { id: string; marina_id: string }) => [c.id, c.marina_id]))

      const result: BerthData[] = leases.map((lease: {
        id: string; tenant_id: string; slip_id: string;
        monthly_rate: number | null; lease_type: string | null;
        start_date: string | null; end_date: string | null;
      }) => {
        const marinaId = contactMarinaMap[lease.tenant_id]
        const slip     = slipMap[lease.slip_id]
        return {
          id:          lease.id,
          marinaName:  marinaMap[marinaId] ?? 'Marina',
          slipNumber:  slip?.slip_number ?? null,
          dock:        slip?.dock ?? null,
          monthlyRate: lease.monthly_rate,
          leaseType:   lease.lease_type,
          startDate:   lease.start_date,
          endDate:     lease.end_date,
        }
      })
      setBerths(result)
      setBerthLoading(false)
    }
    loadBerths()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id])

  // ── Open edit: fetch raw row from DB ─────────────────────────────────────────
  async function openEdit(id: string) {
    const { data } = await supabase.from('marina_assets').select('*').eq('id', id).single()
    if (data) { setEditingAsset(data); setShowForm(true) }
  }

  // ── Delete vessel ─────────────────────────────────────────────────────────────
  async function deleteVessel(id: string) {
    if (!confirm('Delete this vessel? This cannot be undone.')) return
    await supabase.from('marina_assets').delete().eq('id', id)
    onVesselDeleted(id)
  }

  // ── AssetForm screen ──────────────────────────────────────────────────────────
  if (showForm) return (
    <div style={{ padding:'20px 20px 100px', animation:'fadeUp 0.3s ease both' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        <button onClick={() => { setShowForm(false); setEditingAsset(null) }}
          style={{ background:'none', border:'none', color:C.muted, cursor:'pointer', fontSize:20, padding:'0 4px 0 0', fontFamily:FONT }}>←</button>
        <h2 style={{ margin:0, fontSize:20, fontWeight:800 }}>
          {editingAsset ? 'Edit Vessel' : 'Add Vessel'}
        </h2>
      </div>
      <AssetForm
        asset={editingAsset ?? undefined}
        contactId={profile?.contact_id ?? null}
        onSaved={(raw) => {
          const v = assetRowToVessel(raw)
          onVesselSaved(v, raw.id as string)
          setShowForm(false)
          setEditingAsset(null)
        }}
        onCancel={() => { setShowForm(false); setEditingAsset(null) }}
      />
    </div>
  )

  // ── Main vessel list ──────────────────────────────────────────────────────────
  return (
    <div style={{ padding:'20px 20px 40px', animation:'fadeUp 0.35s ease both' }}>
      <SectionTitle>My Vessels</SectionTitle>

      {/* Active Berths */}
      {!berthLoading && berths.length > 0 && (
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:1.5, marginBottom:10 }}>
            Current Berth{berths.length > 1 ? 's' : ''}
          </div>
          {berths.map(b => <BerthCard key={b.id} berth={b} />)}
        </div>
      )}

      {/* Vessel list */}
      {vesselsLoading ? (
        <div style={{ textAlign:'center', padding:'48px 20px', color:C.muted }}>
          <Spinner />
          <div style={{ fontSize:14, marginTop:14 }}>Loading your vessels…</div>
        </div>
      ) : vessels.length === 0 ? (
        <div style={{ textAlign:'center', padding:'48px 20px' }}>
          <div style={{ fontSize:52, marginBottom:14 }}>⛵</div>
          <div style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>No vessels on file</div>
          <div style={{ fontSize:13, color:C.muted, marginBottom:24, lineHeight:1.7, maxWidth:260, margin:'0 auto 24px' }}>
            Add your vessel so marinas know who&apos;s coming and what slip fits you.
          </div>
          <PrimaryBtn onClick={() => { setEditingAsset(null); setShowForm(true) }} style={{ maxWidth:220, margin:'0 auto' }}>
            + Add Your First Vessel
          </PrimaryBtn>

        </div>
      ) : (
        <>
          {vessels.map((v, idx) => (
            <div key={vesselIds[idx]} style={{ background:'linear-gradient(135deg,rgba(77,214,200,0.14) 0%,rgba(13,43,75,0.5) 100%)', border:`1px solid ${C.tealBorder}`, borderRadius:22, padding:22, marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:56, height:56, borderRadius:16, background:C.tealDim, border:`1px solid ${C.tealBorder}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>{vesselIcon(v.vessel_type)}</div>
                  <div>
                    <div style={{ fontSize:20, fontWeight:800, letterSpacing:-0.4 }}>{v.name}</div>
                    <div style={{ fontSize:13, color:C.muted }}>{v.vessel_type}{v.year ? ` · ${v.year}` : ''}</div>
                    {v.make && <div style={{ fontSize:13, color:C.muted }}>{v.make}{v.model ? ` ${v.model}` : ''}</div>}
                  </div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => toggleExpand(vesselIds[idx])}
                    style={{ background:C.tealDim, border:`1px solid ${C.tealBorder}`, borderRadius:10, padding:'6px 12px', color:C.teal, fontFamily:FONT, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                    {expandedIds[vesselIds[idx]] ? '▼' : '▶'}
                  </button>
                  <button onClick={() => openEdit(vesselIds[idx])}
                    style={{ background:C.tealDim, border:`1px solid ${C.tealBorder}`, borderRadius:10, padding:'6px 12px', color:C.teal, fontFamily:FONT, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                    Edit
                  </button>
                  <button onClick={() => deleteVessel(vesselIds[idx])}
                    style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)', borderRadius:10, padding:'6px 12px', color:'#f87171', fontFamily:FONT, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                    Delete
                  </button>
                </div>
              </div>
              {expandedIds[vesselIds[idx]] && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {[
                    v.length_ft && ['LOA', `${v.length_ft} ft`],
                    v.beam_ft   && ['Beam', `${v.beam_ft} ft`],
                    v.draft_ft  && ['Draft', `${v.draft_ft} ft`],
                    v.air_draft_ft && ['Air Draft', `${v.air_draft_ft} ft`],
                    v.weight_lbs && ['Weight', `${v.weight_lbs.toLocaleString()} lbs`],
                    v.registration_number && ['Reg #', v.registration_number],
                  ].filter(Boolean).map(([l, val]) => (
                    <div key={String(l)} style={{ background:'rgba(0,0,0,0.25)', borderRadius:10, padding:'10px 12px' }}>
                      <div style={{ fontSize:10, color:C.muted, textTransform:'uppercase', letterSpacing:1, marginBottom:3 }}>{l}</div>
                      <div style={{ fontSize:14, fontWeight:700 }}>{val}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <PrimaryBtn onClick={() => { setEditingAsset(null); setShowForm(true) }} style={{ marginTop:8 }}>
            + Add Another Vessel / Asset
          </PrimaryBtn>
        </>
      )}
    </div>
  )
}

// ─── Berth Card ──────────────────────────────────────────────────────────────────
function BerthCard({ berth }: { berth: BerthData }) {
  const days      = daysUntil(berth.endDate)
  const isExpired = days !== null && days < 0
  const isDueSoon = days !== null && days >= 0 && days <= 30
  const isPaymentDue = (() => {
    // Flag if we're in the last 7 days of the current calendar month
    const today = new Date()
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    return today.getDate() >= lastDay - 6
  })()

  return (
    <div style={{ background:'linear-gradient(135deg,rgba(77,214,200,0.10) 0%,rgba(13,43,75,0.45) 100%)', border:`1px solid ${C.tealBorder}`, borderRadius:18, padding:16, marginBottom:12 }}>

      {/* Payment due banner */}
      {isExpired && (
        <div style={{ background:'rgba(248,113,113,0.13)', border:'1px solid rgba(248,113,113,0.35)', borderRadius:10, padding:'8px 12px', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
          <span>🚨</span>
          <span style={{ fontSize:12, color:'#fca5a5', fontWeight:700 }}>Lease expired {Math.abs(days!)} day{Math.abs(days!) !== 1 ? 's' : ''} ago — contact your marina</span>
        </div>
      )}
      {!isExpired && isDueSoon && (
        <div style={{ background:'rgba(251,191,36,0.10)', border:'1px solid rgba(251,191,36,0.30)', borderRadius:10, padding:'8px 12px', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
          <span>⏳</span>
          <span style={{ fontSize:12, color:'#fde68a', fontWeight:700 }}>Lease ends in {days} day{days !== 1 ? 's' : ''}</span>
        </div>
      )}
      {!isExpired && isPaymentDue && berth.monthlyRate && (
        <div style={{ background:'rgba(77,214,200,0.10)', border:'1px solid rgba(77,214,200,0.25)', borderRadius:10, padding:'8px 12px', marginBottom:12, display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span>🔔</span>
            <span style={{ fontSize:12, color:C.teal, fontWeight:700 }}>Monthly payment due — ${Number(berth.monthlyRate).toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Marina + slip header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
        <div style={{ width:44, height:44, borderRadius:12, background:C.tealDim, border:`1px solid ${C.tealBorder}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>⚓</div>
        <div>
          <div style={{ fontSize:16, fontWeight:800, letterSpacing:-0.3 }}>{berth.marinaName}</div>
          {berth.slipNumber && (
            <div style={{ fontSize:13, color:C.teal, fontWeight:700, marginTop:1 }}>
              Slip {berth.slipNumber}{berth.dock ? ` · Dock ${berth.dock}` : ''}
            </div>
          )}
          {!berth.slipNumber && berth.leaseType && (
            <div style={{ fontSize:13, color:C.muted, marginTop:1 }}>{berth.leaseType}</div>
          )}
        </div>
      </div>

      {/* Lease detail grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        {berth.monthlyRate != null && (
          <StatTile label="Monthly" value={`$${Number(berth.monthlyRate).toLocaleString()}`} />
        )}
        {berth.leaseType && (
          <StatTile label="Lease Type" value={berth.leaseType.charAt(0).toUpperCase() + berth.leaseType.slice(1)} />
        )}
        {berth.startDate && (
          <StatTile label="Start" value={fmtDate(berth.startDate)} />
        )}
        {berth.endDate && (
          <StatTile label="Ends" value={fmtDate(berth.endDate)} danger={isExpired} warn={isDueSoon} />
        )}
      </div>
    </div>
  )
}

function StatTile({ label, value, danger, warn }: { label:string; value:string; danger?:boolean; warn?:boolean }) {
  const color = danger ? '#fca5a5' : warn ? '#fde68a' : C.white
  return (
    <div style={{ background:'rgba(0,0,0,0.25)', borderRadius:10, padding:'9px 12px' }}>
      <div style={{ fontSize:10, color:C.muted, textTransform:'uppercase', letterSpacing:0.9, marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:14, fontWeight:700, color }}>{value}</div>
    </div>
  )
}

// ─── TAB 2: Marinas ────────────────────────────────────────────────────────────
function TabMarinas({ user, profile, vessel }: { user: User; profile: Profile|null; vessel: Vessel|null }) {
  const [marinas,       setMarinas]       = useState<Marina[]>([])
  const [loading,       setLoading]       = useState(true)
  const [search,        setSearch]        = useState('')
  const [selected,      setSelected]      = useState<Marina|null>(null)
  const [coupledIds,    setCoupledIds]    = useState<Set<string>>(new Set())
  const [coupling,      setCoupling]      = useState<string|null>(null)
  const [toast,         setToast]         = useState<string|null>(null)
  const [recentThreads, setRecentThreads] = useState<MsgRow[]>([])
  const [marinaMap,     setMarinaMap]     = useState<Record<string, Marina>>({})

  useEffect(() => {
    async function load() {
      const [{ data: marinaRows }, { data: couplingRows }, { data: msgRows }] = await Promise.all([
        supabase.from('marinas').select('id,name,city,state,total_slips').order('name'),
        supabase.from('contacts').select('marina_id').eq('auth_user_id', user.id).not('marina_id', 'is', null),
        supabase.from('messages').select('id,body,direction,inserted_at,marina_id').eq('tenant_id', user.id).eq('channel', 'skipper').order('inserted_at', { ascending: false }),
      ])
      const rows = marinaRows ?? []
      setMarinas(rows)
      const mMap: Record<string, Marina> = {}
      for (const m of rows) mMap[m.id] = m
      setMarinaMap(mMap)
      setCoupledIds(new Set<string>((couplingRows ?? []).map((c: { marina_id: string }) => c.marina_id as string)))
      if (msgRows && msgRows.length > 0) {
        const seen = new Set<string>()
        const grouped: MsgRow[] = []
        for (const row of msgRows) {
          if (!seen.has(row.marina_id)) { seen.add(row.marina_id); grouped.push(row) }
        }
        setRecentThreads(grouped)
      }
      setLoading(false)
    }
    load()
  }, [user.id])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3200)
  }

  async function handleRecouple(marinaId: string, marinaName: string, e: React.MouseEvent) {
    e.stopPropagation()
    setCoupling(marinaId)
    const email = user.email
    if (!email) { setCoupling(null); return }
    // Find existing contacts row at this marina by email — re-link auth_user_id
    const { data: row } = await supabase
      .from('contacts')
      .select('id')
      .eq('marina_id', marinaId)
      .eq('email', email)
      .maybeSingle()
    if (row) {
      await supabase.from('contacts').update({ auth_user_id: user.id }).eq('id', row.id)
      setCoupledIds(prev => { const s = new Set<string>(prev); s.add(marinaId); return s })
      showToast(`✅ Reconnected to ${marinaName}`)
    } else {
      showToast(`No existing record at ${marinaName} — use "Request to Connect"`)
    }
    setCoupling(null)
  }

  async function handleRequestConnect(marinaId: string, marinaName: string, e: React.MouseEvent) {
    e.stopPropagation()
    setCoupling(marinaId)
    const displayName = profile
      ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || user.email
      : user.email
    const vesselLine = vessel
      ? ` | Vessel: ${vessel.name} (${vessel.length_ft}ft LOA, ${vessel.beam_ft}ft beam)`
      : ''
    // Send connection request as a special message — shows in marina Helm inbox
    await supabase.from('messages').insert({
      marina_id:   marinaId,
      tenant_id:   user.id,
      direction:   'inbound',
      body:        `🔗 CONNECTION REQUEST: ${displayName} wants to connect their Skipper account.${vesselLine} Email: ${user.email}`,
      channel:     'coupling_request',
      sender_name: displayName ?? 'Boater',
    })
    showToast(`Request sent to ${marinaName}`)
    setCoupling(null)
  }

  const filtered = marinas.filter(m =>
    !search.trim() ||
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.city.toLowerCase().includes(search.toLowerCase())
  )

  if (selected) return (
    <MarinaChat
      marina={selected} user={user} profile={profile} vessel={vessel}
      coupled={coupledIds.has(selected.id)}
      onBack={() => setSelected(null)}
      onAddVessel={() => { setSelected(null) }}
    />
  )

  return (
    <div style={{ padding:'20px 20px 0', animation:'fadeUp 0.35s ease both' }}>
      {toast && (
        <div style={{ position:'fixed', top:24, left:'50%', transform:'translateX(-50%)', background:'rgba(10,30,50,0.96)', border:'1px solid rgba(77,214,200,0.3)', borderRadius:12, padding:'10px 18px', fontSize:13, color:'#ffffff', zIndex:999, whiteSpace:'nowrap', boxShadow:'0 4px 24px rgba(0,0,0,0.5)' }}>
          {toast}
        </div>
      )}
      <SectionTitle>Marinas</SectionTitle>
      {/* Recent conversations — folded in from removed Messages tab */}
      {recentThreads.length > 0 && (
        <>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:1.5, marginBottom:10 }}>Recent Conversations</div>
          {recentThreads.map((thread, i) => {
            const m = marinaMap[thread.marina_id]
            if (!m) return null
            return (
              <button key={thread.marina_id} onClick={() => setSelected(m)}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:12, background:C.card, border:`1px solid ${C.cardBorder}`, borderRadius:14, padding:'12px 14px', marginBottom:8, color:C.white, fontFamily:FONT, cursor:'pointer', textAlign:'left', animation:`fadeUp 0.3s ease ${i*0.05}s both` }}>
                <div style={{ width:38, height:38, borderRadius:10, background:C.tealDim, border:`1px solid ${C.tealBorder}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>⚓</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:700 }}>{m.name}</div>
                  <div style={{ fontSize:12, color:C.muted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{thread.body}</div>
                </div>
                <div style={{ fontSize:11, color:C.muted2, flexShrink:0 }}>{new Date(thread.inserted_at).toLocaleDateString()}</div>
              </button>
            )
          })}
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:1.5, marginBottom:10, marginTop:20, paddingTop:12, borderTop:`1px solid rgba(255,255,255,0.06)` }}>All Marinas</div>
        </>
      )}
      {!vessel && (
        <div style={{ marginBottom:14, background:'rgba(77,214,200,0.07)', border:'1px solid rgba(77,214,200,0.2)', borderRadius:12, padding:'10px 14px', display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:16 }}>⛵</span>
          <span style={{ fontSize:12, color:'#4dd6c8', lineHeight:1.5 }}>Add your vessel under <strong>My Vessel</strong> so Skipper can match you to available slips.</span>
        </div>
      )}
      <div style={{ marginBottom:14 }}>
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or city…" />
      </div>
      {loading && <div style={{ textAlign:'center', color:'rgba(255,255,255,0.55)', padding:'32px 0' }}>Loading…</div>}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign:'center', color:'rgba(255,255,255,0.55)', padding:'32px 0', fontSize:14 }}>No marinas found</div>
      )}
      {filtered.map((m, i) => {
        const coupled = coupledIds.has(m.id)
        const acting  = coupling === m.id
        return (
          <div key={m.id}
            style={{ background:'rgba(255,255,255,0.07)', border:`1px solid ${coupled ? 'rgba(77,214,200,0.3)' : 'rgba(255,255,255,0.11)'}`, borderRadius:18, marginBottom:10, overflow:'hidden', animation:`fadeUp 0.3s ease ${i*0.04}s both` }}>
            {/* Main row — tap to open Skipper chat */}
            <button onClick={() => setSelected(m)}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:14, padding:'14px 16px', background:'transparent', border:'none', color:'#ffffff', fontFamily:'inherit', cursor:'pointer', textAlign:'left' }}>
              <div style={{ width:44, height:44, borderRadius:12, background: coupled ? 'rgba(74,222,128,0.12)' : 'rgba(77,214,200,0.15)', border:`1px solid ${coupled ? 'rgba(74,222,128,0.35)' : 'rgba(77,214,200,0.3)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                ⚓
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <span style={{ fontSize:15, fontWeight:700 }}>{m.name}</span>
                  {coupled && (
                    <span style={{ fontSize:10, fontWeight:700, color:'#4ade80', background:'rgba(74,222,128,0.12)', border:'1px solid rgba(74,222,128,0.3)', borderRadius:6, padding:'2px 6px', letterSpacing:0.3 }}>
                      CONNECTED
                    </span>
                  )}
                </div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.55)', marginTop:3 }}>{m.city}, {m.state} · {m.total_slips} slips</div>
              </div>
              <div style={{ fontSize:12, color:'#4dd6c8', fontWeight:700, flexShrink:0 }}>Message →</div>
            </button>
            {/* Coupling action row — only when NOT connected */}
            {!coupled && (
              <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'8px 16px 10px', display:'flex', gap:8 }}>
                <button
                  onClick={e => handleRecouple(m.id, m.name, e)}
                  disabled={acting}
                  style={{ flex:1, padding:'7px 0', fontSize:12, fontWeight:700, color:'#4dd6c8', background:'rgba(77,214,200,0.1)', border:'1px solid rgba(77,214,200,0.25)', borderRadius:9, cursor:'pointer', fontFamily:'inherit', opacity: acting ? 0.5 : 1 }}>
                  {acting ? '…' : '🔄 Recouple'}
                </button>
                <button
                  onClick={e => handleRequestConnect(m.id, m.name, e)}
                  disabled={acting}
                  style={{ flex:1, padding:'7px 0', fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.55)', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:9, cursor:'pointer', fontFamily:'inherit', opacity: acting ? 0.5 : 1 }}>
                  {acting ? '…' : 'Request to Connect'}
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
// ─── Marina Chat ──────────────────────────────────────────────────────────────
function MarinaChat({ marina, user, profile, vessel, coupled, onBack, onAddVessel }: { marina:Marina; user:User; profile:Profile|null; vessel:Vessel|null; coupled?:boolean; onBack:()=>void; onAddVessel:()=>void }) {
  const [msgs,    setMsgs]    = useState<{role:string;text:string}[]>([
    { role:'skipper', text:`Aye aye! I'm Skipper, your direct line to ${marina.name}. What can I help you with?` }
  ])
  const [draft,   setDraft]   = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const displayName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.display_name || user.email
    : user.email

  const isTransient = (marina as Marina & {transient_available?: boolean}).transient_available ?? false
  const vesselComplete = !!(vessel && vessel.length_ft && vessel.beam_ft && vessel.draft_ft && vessel.air_draft_ft && vessel.weight_lbs)

  async function send() {
    if (!draft.trim() || sending) return
    const msg = draft.trim(); setDraft('')
    setMsgs(m => [...m, { role:'user', text:msg }])
    setSending(true)

    // Save outbound to DB
    await supabase.from('messages').insert({
      marina_id:   marina.id,
      tenant_id:   user.id,
      direction:   'inbound',
      body:        msg,
      channel:     'skipper',
      sender_name: displayName ?? 'Boater',
    })

    // Full identity package — all fields
    const identityPackage = {
      auth_user_id:  user.id,
      first_name:    profile?.first_name ?? null,
      last_name:     profile?.last_name ?? null,
      display_name:  displayName,
      phone:         profile?.phone ?? null,
      email:         user.email ?? null,
      vessel: vessel ? {
        id:                   vessel.id,
        name:                 vessel.name,
        type:                 vessel.vessel_type,
        make:                 vessel.make,
        model:                vessel.model,
        year:                 vessel.year,
        color:                vessel.color,
        loa:                  vessel.length_ft,
        beam:                 vessel.beam_ft,
        draft:                vessel.draft_ft,
        weight_lbs:           vessel.weight_lbs,
        air_draft_ft:         vessel.air_draft_ft,
        hin:                  vessel.hin,
        registration_number:  vessel.registration_number,
        registration_state:   vessel.registration_state,
        documentation_number: vessel.documentation_number,
        mmsi:                 vessel.mmsi_number,
        flag_state:           vessel.flag_state,
        hull_material:        vessel.hull_material,
        engine_count:         vessel.engine_count,
        engine_type:          vessel.engine_type,
        engine_make:          vessel.engine_make,
        horsepower_per_engine: vessel.horsepower_per_engine,
        fuel_type:            vessel.fuel_type,
        fuel_tank_gallons:    vessel.fuel_tank_gallons,
        shore_power:          vessel.shore_power,
        insurance_provider:   vessel.insurance_provider,
        insurance_expiry:     vessel.insurance_expiry,
      } : null,
    }

    try {
      const r = await fetch('https://skipper-engine-production.up.railway.app/chat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
            message: msg,
            marina_id: marina.id,
            identity: identityPackage,
            session: { marina_id: marina.id, boater_id: user.id, access_type: 'anonymous' },
          })
      })
      const d = await r.json()
      const reply = d.reply || 'Let me check on that.'
      setMsgs(m => [...m, { role:'skipper', text:reply }])
      await supabase.from('messages').insert({
        marina_id:   marina.id,
        tenant_id:   user.id,
        direction:   'outbound',
        body:        reply,
        channel:     'skipper',
        sender_name: 'Skipper',
      })
    } catch {
      setMsgs(m => [...m, { role:'skipper', text:'Sorry — rough seas on my end. Try again in a moment.' }])
    }
    setSending(false)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 100)
  }

  return (
    <div style={{ padding:'0 20px', animation:'fadeUp 0.3s ease both' }}>
      <div style={{ padding:'14px 0 10px', display:'flex', alignItems:'center', gap:10, borderBottom:`1px solid rgba(255,255,255,0.08)`, marginBottom:14 }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:C.muted, cursor:'pointer', fontSize:20, padding:'0 4px 0 0', fontFamily:FONT }}>←</button>
        <div style={{ width:36, height:36, borderRadius:10, background:C.tealDim, border:`1px solid ${C.tealBorder}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>⚓</div>
        <div>
          <div style={{ fontSize:15, fontWeight:700 }}>{marina.name}</div>
          <div style={{ fontSize:11, color:C.teal, fontWeight:600 }}>Skipper-powered™</div>
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:14, minHeight:200 }}>
        {msgs.map((m,i) => (
          <div key={i} style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start', gap:8, alignItems:'flex-end' }}>
            {m.role==='skipper' && (
              <div style={{ width:30, height:30, borderRadius:'50%', overflow:'hidden', border:`2px solid ${C.teal}`, flexShrink:0 }}>
                <Image src="/skipper-avatar.jpg" alt="Skipper" width={30} height={30} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top' }} />
              </div>
            )}
            <div style={{ maxWidth:'78%', padding:'11px 14px', borderRadius:m.role==='user'?'16px 16px 4px 16px':'16px 16px 16px 4px', background:m.role==='user'?`linear-gradient(135deg,${C.teal},#2fb3a3)`:C.card, color:m.role==='user'?C.navy:C.white, border:m.role==='skipper'?`1px solid ${C.cardBorder}`:'none', fontSize:14, lineHeight:1.55, fontWeight:m.role==='user'?600:400 }}>
              {m.text}
            </div>
          </div>
        ))}
        {sending && (
          <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
            <div style={{ width:30, height:30, borderRadius:'50%', overflow:'hidden', border:`2px solid ${C.teal}`, flexShrink:0 }}>
              <Image src="/skipper-avatar.jpg" alt="Skipper" width={30} height={30} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top' }} />
            </div>
            <div style={{ padding:'12px 16px', background:C.card, border:`1px solid ${C.cardBorder}`, borderRadius:'16px 16px 16px 4px', display:'flex', gap:5, alignItems:'center' }}>
              {[0,0.2,0.4].map((d,i) => <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:C.teal, animation:`dot${i+1} 1.2s ease-in-out ${d}s infinite` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {!(isTransient && !vesselComplete) && (
        <div style={{ display:'flex', gap:8, paddingBottom:8 }}>
          <input type="text" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send() } }}
            placeholder={`Message ${marina.name}…`}
            style={{ flex:1, padding:'13px 14px', background:C.inputBg, border:`1.5px solid ${C.inputBorder}`, borderRadius:13, color:C.white, fontSize:14, fontFamily:FONT, outline:'none' }}
            onFocus={e => e.currentTarget.style.borderColor=C.teal} onBlur={e => e.currentTarget.style.borderColor=C.inputBorder} />
          <button onClick={send} disabled={sending||!draft.trim()}
            style={{ padding:'0 18px', background:(!draft.trim()||sending)?'rgba(77,214,200,0.3)':`linear-gradient(135deg,${C.teal},#2fb3a3)`, border:'none', borderRadius:13, color:C.navy, cursor:(!draft.trim()||sending)?'default':'pointer', flexShrink:0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke={C.navy} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      )}
    </div>
  )
}

// ─── TAB: Skipper AI (Global) ────────────────────────────────────────────────
// ─── TAB: Messages ───────────────────────────────────────────────────────────
type DirectThread = { marina_id: string; marinaName: string; lastBody: string; lastAt: string; unread: number }
type DirectMsg    = { id: string; body: string; direction: string; inserted_at: string }

function TabMessages({ user, profile }: { user: User; profile: Profile|null }) {
  const [threads,    setThreads]    = useState<DirectThread[]>([])
  const [loading,    setLoading]    = useState(true)
  const [activeThread, setActiveThread] = useState<DirectThread|null>(null)
  const [msgs,       setMsgs]       = useState<DirectMsg[]>([])
  const [msgsLoading,setMsgsLoading]= useState(false)
  const [draft,      setDraft]      = useState('')
  const [sending,    setSending]    = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const displayName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || user.email
    : (user.email ?? 'Boater')

  // ── Load thread list ───────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true)
      // Get all direct messages for this user
      const { data: msgRows } = await supabase
        .from('messages')
        .select('id,body,direction,inserted_at,marina_id')
        .eq('tenant_id', user.id)
        .eq('channel', 'direct')
        .order('inserted_at', { ascending: false })

      if (!msgRows || msgRows.length === 0) { setLoading(false); return }

      // Get marina names
      const marinaIds = Array.from(new Set(msgRows.map((m: {marina_id:string}) => m.marina_id)))
      const { data: marinaRows } = await supabase
        .from('marinas')
        .select('id,name')
        .in('id', marinaIds)
      const nameMap: Record<string,string> = {}
      for (const m of (marinaRows ?? [])) nameMap[m.id] = m.name

      // Group into threads (one per marina — last message wins)
      const seen = new Set<string>()
      const grouped: DirectThread[] = []
      for (const row of msgRows) {
        if (!seen.has(row.marina_id)) {
          seen.add(row.marina_id)
          grouped.push({
            marina_id:  row.marina_id,
            marinaName: nameMap[row.marina_id] ?? 'Marina',
            lastBody:   row.body,
            lastAt:     row.inserted_at,
            unread:     0,
          })
        }
      }
      setThreads(grouped)
      setLoading(false)
    }
    load()
  }, [user.id])

  // ── Realtime: new direct messages ─────────────────────────────────────────
  useSkipperRealtime({
    scope: { kind: 'boater', authUserId: user.id },
    onChange: () => {
      async function reload() {
        const { data: msgRows } = await supabase
          .from('messages')
          .select('id,body,direction,inserted_at,marina_id')
          .eq('tenant_id', user.id)
          .eq('channel', 'direct')
          .order('inserted_at', { ascending: false })
        if (!msgRows || msgRows.length === 0) return
        const marinaIds = Array.from(new Set(msgRows.map((m: {marina_id:string}) => m.marina_id)))
        const { data: marinaRows } = await supabase.from('marinas').select('id,name').in('id', marinaIds)
        const nameMap: Record<string,string> = {}
        for (const m of (marinaRows ?? [])) nameMap[m.id] = m.name
        const seen = new Set<string>()
        const grouped: DirectThread[] = []
        for (const row of msgRows) {
          if (!seen.has(row.marina_id)) {
            seen.add(row.marina_id)
            grouped.push({ marina_id: row.marina_id, marinaName: nameMap[row.marina_id] ?? 'Marina', lastBody: row.body, lastAt: row.inserted_at, unread: 0 })
          }
        }
        setThreads(grouped)
        if (activeThread) loadThread(activeThread.marina_id)
      }
      reload()
    },
  })

  // ── Load single thread ────────────────────────────────────────────────────
  async function loadThread(marinaId: string) {
    setMsgsLoading(true)
    const { data } = await supabase
      .from('messages')
      .select('id,body,direction,inserted_at')
      .eq('tenant_id', user.id)
      .eq('marina_id', marinaId)
      .eq('channel', 'direct')
      .order('inserted_at', { ascending: true })
    setMsgs(data ?? [])
    setMsgsLoading(false)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
  }

  function openThread(t: DirectThread) {
    setActiveThread(t)
    loadThread(t.marina_id)
  }

  // ── Send message ──────────────────────────────────────────────────────────
  async function send() {
    if (!draft.trim() || !activeThread || sending) return
    setSending(true)
    const body = draft.trim()
    setDraft('')
    await supabase.from('messages').insert({
      marina_id:   activeThread.marina_id,
      tenant_id:   user.id,
      direction:   'inbound',
      body,
      channel:     'direct',
      sender_name: displayName ?? 'Boater',
    })
    setSending(false)
    loadThread(activeThread.marina_id)
  }

  function fmtTime(iso: string) {
    try {
      const d = new Date(iso)
      const now = new Date()
      const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
      if (diffDays === 0) return d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
      if (diffDays === 1) return 'Yesterday'
      if (diffDays < 7)  return d.toLocaleDateString([], { weekday:'short' })
      return d.toLocaleDateString([], { month:'short', day:'numeric' })
    } catch { return '' }
  }

  // ── Thread detail view ────────────────────────────────────────────────────
  if (activeThread) {
    return (
      <div style={{ display:'flex', flexDirection:'column', height:'100%', minHeight:0 }}>
        {/* Header */}
        <div style={{ padding:'16px 20px 12px', borderBottom:`1px solid rgba(255,255,255,0.08)`, display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
          <button onClick={() => setActiveThread(null)} style={{ background:'none', border:'none', color:C.teal, fontSize:22, cursor:'pointer', padding:'0 4px', lineHeight:1 }}>‹</button>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:C.white }}>{activeThread.marinaName}</div>
            <div style={{ fontSize:11, color:C.muted }}>Direct messages</div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', padding:'16px 20px', display:'flex', flexDirection:'column', gap:10 }}>
          {msgsLoading && <div style={{ textAlign:'center', color:C.muted, fontSize:13, padding:20 }}>Loading…</div>}
          {!msgsLoading && msgs.length === 0 && (
            <div style={{ textAlign:'center', color:C.muted, fontSize:14, padding:40 }}>
              <div style={{ fontSize:32, marginBottom:12 }}>💬</div>
              <div>No messages yet.</div>
              <div style={{ fontSize:12, marginTop:6 }}>Send a message to {activeThread.marinaName}.</div>
            </div>
          )}
          {msgs.map(m => {
            const fromBoater = m.direction === 'inbound'
            return (
              <div key={m.id} style={{ display:'flex', flexDirection:'column', alignItems: fromBoater ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth:'78%', padding:'10px 14px', borderRadius: fromBoater ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: fromBoater ? `linear-gradient(135deg,${C.teal},#2fb3a3)` : 'rgba(255,255,255,0.1)',
                  color: fromBoater ? C.navy : C.white, fontSize:14, lineHeight:1.45, fontWeight: fromBoater ? 600 : 400,
                }}>{m.body}</div>
                <div style={{ fontSize:10, color:C.muted2, marginTop:3, paddingInline:2 }}>{fmtTime(m.inserted_at)}</div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Compose */}
        <div style={{ padding:'12px 16px env(safe-area-inset-bottom,12px)', borderTop:`1px solid rgba(255,255,255,0.08)`, display:'flex', gap:10, alignItems:'flex-end', flexShrink:0 }}>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Message…"
            rows={1}
            style={{ flex:1, background:C.inputBg, border:`1.5px solid ${C.inputBorder}`, borderRadius:22, color:C.white, fontSize:15, fontFamily:FONT, padding:'11px 16px', outline:'none', resize:'none', maxHeight:100, overflowY:'auto' }}
          />
          <button
            onClick={send}
            disabled={!draft.trim() || sending}
            style={{ width:42, height:42, borderRadius:'50%', background: draft.trim() ? `linear-gradient(135deg,${C.teal},#2fb3a3)` : 'rgba(255,255,255,0.1)', border:'none', cursor: draft.trim() ? 'pointer' : 'default', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke={draft.trim()?C.navy:C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={draft.trim()?C.navy:C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>
    )
  }

  // ── Thread list ───────────────────────────────────────────────────────────
  return (
    <div style={{ padding:'24px 20px' }}>
      <h1 style={{ fontSize:22, fontWeight:800, color:C.white, margin:'0 0 6px', letterSpacing:-0.5 }}>Messages</h1>
      <p style={{ fontSize:13, color:C.muted, margin:'0 0 24px' }}>Direct conversations with your marinas.</p>

      {loading && <div style={{ textAlign:'center', color:C.muted, fontSize:13, padding:40 }}>Loading…</div>}

      {!loading && threads.length === 0 && (
        <div style={{ textAlign:'center', color:C.muted, padding:'60px 0' }}>
          <div style={{ fontSize:40, marginBottom:16 }}>💬</div>
          <div style={{ fontSize:16, fontWeight:700, color:C.white, marginBottom:8 }}>No messages yet</div>
          <div style={{ fontSize:13, lineHeight:1.6 }}>When a marina messages you,<br/>it'll show up here.</div>
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
        {threads.map(t => (
          <button
            key={t.marina_id}
            onClick={() => openThread(t)}
            style={{ background:'rgba(255,255,255,0.05)', border:`1px solid rgba(255,255,255,0.09)`, borderRadius:16, padding:'16px', display:'flex', alignItems:'center', gap:14, textAlign:'left', cursor:'pointer', width:'100%' }}
          >
            <div style={{ width:46, height:46, borderRadius:'50%', background:`linear-gradient(135deg,${C.tealDim},rgba(77,214,200,0.25))`, border:`1.5px solid ${C.tealBorder}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>⚓</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:15, fontWeight:700, color:C.white, marginBottom:3 }}>{t.marinaName}</div>
              <div style={{ fontSize:13, color:C.muted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.lastBody}</div>
            </div>
            <div style={{ fontSize:11, color:C.muted2, flexShrink:0 }}>{fmtTime(t.lastAt)}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Floating Skipper ──────────────────────────────────────────────────────
const SKIPPER_ENGINE = 'https://skipper-engine-production.up.railway.app'
const GREETING = `Welcome aboard — I'm Skipper, your personal boating assistant. You don't need to type a thing. Just talk to me and I'll record everything — boat specs, maintenance, anything. You can also upload documents right here (registration, insurance, whatever you have) so marinas always have them on file. Let's start: tell me your boat's name, make, length, and whatever specs you know. I'll build your first profile.`

function SkipperFloat({ user, profile, vessel, onRefreshVessels }: { user: User; profile: Profile|null; vessel: Vessel|null; onRefreshVessels: () => void }) {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<{role:string;text:string}[]>([{ role:'skipper', text: GREETING }])
  const [sessionLoaded, setSessionLoaded] = useState(false)

  // On mount: try to restore last session from engine (< 24hrs old)
  useEffect(() => {
    if (sessionLoaded) return
    setSessionLoaded(true)
    fetch(`${SKIPPER_ENGINE}/session/${user.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.messages && Array.isArray(d.messages) && d.messages.length > 0) {
          setMsgs(d.messages)
        }
      })
      .catch(() => {/* silent — use greeting */})
  }, [user.id, sessionLoaded])

  return (
    <>
      <style>{`
        @keyframes skipperSlideUp { from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes skipperBounce  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes skipperPing    { 0%{transform:scale(1);opacity:0.7} 100%{transform:scale(1.6);opacity:0} }
      `}</style>

      {/* Chat panel — always mounted to preserve scroll/state; hidden when closed */}
      <div style={{ position:'fixed', inset:0, zIndex:400, display: open ? 'flex' : 'none', flexDirection:'column', background:'rgba(3,14,25,0.97)', backdropFilter:'blur(16px)', animation: open ? 'skipperSlideUp 0.3s ease both' : 'none' }}>
        <SkipperChat user={user} profile={profile} vessel={vessel} msgs={msgs} setMsgs={setMsgs} onClose={() => setOpen(false)} onRefreshVessels={onRefreshVessels} />
      </div>

      {/* Floating button */}
      <div style={{ position:'fixed', bottom:'calc(env(safe-area-inset-bottom,0px) + 78px)', right:18, zIndex:300 }}>
        <div style={{ position:'relative' }}>
          {!open && <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:C.teal, animation:'skipperPing 2.2s ease-out infinite', opacity:0.45 }} />}
          <button
            onClick={() => setOpen(v => !v)}
            style={{ position:'relative', width:58, height:58, borderRadius:'50%', background:`linear-gradient(135deg,${C.teal},#2fb3a3)`, border:'none', cursor:'pointer', padding:0, boxShadow:`0 4px 22px rgba(77,214,200,0.45)`, animation: open?'none':'skipperBounce 2.8s ease-in-out infinite' }}
          >
            {open
              ? <span style={{ color:C.navy, fontSize:26, fontWeight:800, lineHeight:1 }}>×</span>
              : <Image src="/skipper-avatar.jpg" alt="Skipper" width={54} height={54} style={{ width:54, height:54, borderRadius:'50%', objectFit:'cover', objectPosition:'center top' }} />
            }
          </button>
        </div>
      </div>
    </>
  )
}

function SkipperChat({ user, profile, vessel, msgs, setMsgs, onClose, onRefreshVessels }: { user: User; profile: Profile|null; vessel: Vessel|null; msgs: {role:string;text:string}[]; setMsgs: React.Dispatch<React.SetStateAction<{role:string;text:string}[]>>; onClose: () => void; onRefreshVessels: () => void }) {
  const [draft,      setDraft]      = useState('')
  const [sending,    setSending]    = useState(false)
  const [uploading,  setUploading]  = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [coupledMarinas, setCoupledMarinas] = useState<Marina[]>([])
  const bottomRef  = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const displayName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || user.email
    : user.email

  // Load coupled marinas for context
  useEffect(() => {
    async function load() {
      const { data: links } = await supabase
        .from('contacts')
        .select('marina_id')
        .eq('auth_user_id', user.id)
        .not('marina_id', 'is', null)
      if (!links || links.length === 0) return
      const ids = links.map((l: {marina_id:string}) => l.marina_id)
      const { data: marinas } = await supabase
        .from('marinas')
        .select('id,name,city,state,total_slips')
        .in('id', ids)
      setCoupledMarinas(marinas ?? [])
    }
    load()
  }, [user.id])

  async function uploadFile(file: File) {
    if (!file) return
    const maxBytes = 10 * 1024 * 1024
    if (file.size > maxBytes) {
      setMsgs(m => [...m, { role:'skipper', text:`That file is over 10 MB — try a smaller version.` }])
      return
    }
    setUploading(true)
    setMsgs(m => [...m, { role:'user', text:`📎 ${file.name}` }])
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 50)

    try {
      const entityType = 'contact'
      const entityId   = profile?.contact_id ?? user.id
      const form = new FormData()
      form.append('file', file)
      form.append('entity_type', entityType)
      form.append('entity_id', entityId)
      form.append('doc_type', 'other')
      form.append('doc_label', file.name)

      const res  = await fetch('/api/documents/upload', { method:'POST', body: form })
      const data = await res.json()

      if (!res.ok) {
        setMsgs(m => [...m, { role:'skipper', text:`Couldn\'t save that file — ${data.error ?? 'upload failed'}. Try again.` }])
      } else {
        setMsgs(m => [...m, { role:'skipper', text:`Document saved ✅ — ${file.name} is on file. Marinas will have access to it when you check in.` }])
      }
    } catch {
      setMsgs(m => [...m, { role:'skipper', text:`Upload hit a snag — check your connection and try again.` }])
    } finally {
      setUploading(false)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 100)
    }
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function onDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  async function send() {
    if (!draft.trim() || sending) return
    const msg = draft.trim(); setDraft('')
    // Capture history BEFORE appending new user message
    const historyForEngine = msgs
      .filter(m => m.role !== 'error')
      .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }))
    setMsgs(m => [...m, { role:'user', text:msg }])
    setSending(true)

    const identityPackage = {
      auth_user_id:  user.id,
      first_name:    profile?.first_name ?? null,
      last_name:     profile?.last_name ?? null,
      display_name:  displayName,
      email:         user.email ?? null,
      coupled_marinas: coupledMarinas.map(m => ({ id: m.id, name: m.name, city: m.city, state: m.state })),
      vessel: vessel ? {
        name:        vessel.name,
        type:        vessel.vessel_type,
        make:        vessel.make,
        model:       vessel.model,
        year:        vessel.year,
        loa:         vessel.length_ft,
        beam:        vessel.beam_ft,
        draft:       vessel.draft_ft,
        air_draft:   vessel.air_draft_ft,
        shore_power: vessel.shore_power,
        fuel_type:   vessel.fuel_type,
      } : null,
    }

    try {
      const r = await fetch('https://skipper-engine-production.up.railway.app/chat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          message: msg,
          marina_id: null,
          identity: identityPackage,
          conversation_history: historyForEngine,
          session: { boater_id: user.id, access_type: 'tenant', context: 'global' },
        })
      })
      const d = await r.json()
      const skipperReply = d.reply || 'Let me look into that.'
      const updatedMsgs = [...msgs, { role:'user', text:msg }, { role:'skipper', text:skipperReply }]
      setMsgs(updatedMsgs)
      onRefreshVessels()
      // Persist session to engine (fire-and-forget)
      fetch(`${SKIPPER_ENGINE}/chat`, { method:'HEAD' }).catch(() => {})
      fetch(`${SKIPPER_ENGINE}/session-save`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ boater_id: user.id, messages: updatedMsgs })
      }).catch(() => {})
    } catch {
      setMsgs(m => [...m, { role:'skipper', text:'Rough seas on my end — try again in a moment.' }])
    }
    setSending(false)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 100)
  }

  return (
    <div
      style={{ display:'flex', flexDirection:'column', height:'100%', padding:'0 20px', position:'relative' }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Drag-and-drop overlay */}
      {isDragging && (
        <div style={{ position:'absolute', inset:0, zIndex:500, background:'rgba(77,214,200,0.12)', border:`2px dashed ${C.teal}`, borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:40, marginBottom:8 }}>📂</div>
            <div style={{ fontSize:16, fontWeight:700, color:C.teal }}>Drop to upload</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>Registration, insurance, any document</div>
          </div>
        </div>
      )}
      {/* Header */}
      <div style={{ padding:'env(safe-area-inset-top,16px) 0 10px', display:'flex', alignItems:'center', gap:12, borderBottom:`1px solid rgba(255,255,255,0.08)`, marginBottom:14, flexShrink:0 }}>
        <button onClick={onClose} style={{ background:'none', border:'none', color:C.teal, fontSize:22, cursor:'pointer', padding:'0 4px', lineHeight:1, flexShrink:0 }}>×</button>
        <div style={{ width:42, height:42, borderRadius:'50%', overflow:'hidden', border:`2px solid ${C.teal}`, animation:'glow 4s ease-in-out infinite', flexShrink:0 }}>
          <Image src="/skipper-avatar.jpg" alt="Skipper" width={42} height={42} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top' }} />
        </div>
        <div>
          <div style={{ fontSize:17, fontWeight:800, letterSpacing:-0.3 }}>Skipper</div>
          <div style={{ fontSize:11, color:C.teal, fontWeight:600 }}>Personal Boating Assistant · Always On</div>
        </div>
        {vessel && (
          <div style={{ marginLeft:'auto', fontSize:11, color:C.teal, fontWeight:700, background:C.tealDim, border:`1px solid ${C.tealBorder}`, borderRadius:20, padding:'4px 10px', flexShrink:0 }}>
            {vesselIcon(vessel?.vessel_type)} {vessel.name}
          </div>
        )}
      </div>

      {/* Context pills */}
      {coupledMarinas.length > 0 && (
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12, flexShrink:0 }}>
          {coupledMarinas.map(m => (
            <div key={m.id} style={{ fontSize:10, fontWeight:700, color:'#4ade80', background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.25)', borderRadius:20, padding:'3px 9px' }}>
              ⚓ {m.name}
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', display:'flex', flexDirection:'column', gap:12, paddingBottom:12 }}>
        {msgs.map((m,i) => (
          <div key={i} style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start', gap:8, alignItems:'flex-end' }}>
            {m.role==='skipper' && (
              <div style={{ width:30, height:30, borderRadius:'50%', overflow:'hidden', border:`2px solid ${C.teal}`, flexShrink:0 }}>
                <Image src="/skipper-avatar.jpg" alt="Skipper" width={30} height={30} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top' }} />
              </div>
            )}
            <div style={{ maxWidth:'78%', padding:'11px 14px', borderRadius:m.role==='user'?'16px 16px 4px 16px':'16px 16px 16px 4px', background:m.role==='user'?`linear-gradient(135deg,${C.teal},#2fb3a3)`:C.card, color:m.role==='user'?C.navy:C.white, border:m.role==='skipper'?`1px solid ${C.cardBorder}`:'none', fontSize:14, lineHeight:1.55, fontWeight:m.role==='user'?600:400 }}>
              {m.text}
            </div>
          </div>
        ))}
        {sending && (
          <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
            <div style={{ width:30, height:30, borderRadius:'50%', overflow:'hidden', border:`2px solid ${C.teal}`, flexShrink:0 }}>
              <Image src="/skipper-avatar.jpg" alt="Skipper" width={30} height={30} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top' }} />
            </div>
            <div style={{ padding:'12px 16px', background:C.card, border:`1px solid ${C.cardBorder}`, borderRadius:'16px 16px 16px 4px', display:'flex', gap:5, alignItems:'center' }}>
              {[0,0.2,0.4].map((d,i) => <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:C.teal, animation:`dot${i+1} 1.2s ease-in-out ${d}s infinite` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ flexShrink:0, paddingBottom:8, paddingTop:4 }}>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.heic"
          style={{ display:'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) { uploadFile(f); e.target.value = '' } }}
        />
        <div style={{ display:'flex', gap:8 }}>
          {/* Attach button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="Upload a document"
            style={{ width:46, height:46, flexShrink:0, background:C.inputBg, border:`1.5px solid ${C.inputBorder}`, borderRadius:13, color:uploading ? C.muted2 : C.teal, cursor:uploading?'default':'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}
          >
            {uploading ? <Spinner size={16} color={C.teal} /> : '📎'}
          </button>
          <input
            type="text" value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send() } }}
            placeholder="Ask or upload anything…"
            style={{ flex:1, padding:'13px 14px', background:C.inputBg, border:`1.5px solid ${C.inputBorder}`, borderRadius:13, color:C.white, fontSize:14, fontFamily:FONT, outline:'none' }}
            onFocus={e => e.currentTarget.style.borderColor=C.teal}
            onBlur={e => e.currentTarget.style.borderColor=C.inputBorder}
          />
          <button onClick={send} disabled={sending||!draft.trim()}
            style={{ padding:'0 18px', background:(!draft.trim()||sending)?'rgba(77,214,200,0.3)':`linear-gradient(135deg,${C.teal},#2fb3a3)`, border:'none', borderRadius:13, color:C.navy, cursor:(!draft.trim()||sending)?'default':'pointer', flexShrink:0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke={C.navy} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
        <div style={{ fontSize:10, color:C.muted2, textAlign:'center', marginTop:5 }}>Tap 📎 to upload · Desktop: drag &amp; drop files here</div>
      </div>
    </div>
  )
}

function TabAccount({ user, profile, vessels, onSignOut, onProfileUpdated }: {
  user:User; profile:Profile|null; vessels:Vessel[]; onSignOut:()=>void;
  onProfileUpdated:(p:Profile)=>void
}) {
  const FONT = '"SF Pro Display", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

  // Re-fetch raw contact + profile on every Account tab open
  const [rawContact, setRawContact] = React.useState<Record<string, unknown> | null>(null)
  React.useEffect(() => {
    supabase.from('contacts').select('*')
      .eq('auth_user_id', user.id).is('marina_id', null)
      .order('created_at', { ascending: true }).limit(1)
      .then(({ data }) => {
        if (data?.[0]) {
          setRawContact(data[0] as Record<string, unknown>)
          onProfileUpdated(contactToProfile(data[0]))
        }
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [editing,       setEditing]       = React.useState(false)
  const [changingEmail, setChangingEmail] = React.useState(false)
  const [newEmail,      setNewEmail]      = React.useState('')
  const [emailMsg,      setEmailMsg]      = React.useState('')
  const [emailBusy,     setEmailBusy]     = React.useState(false)
  const [changingPin,   setChangingPin]   = React.useState(false)
  const [pinStep,       setPinStep]       = React.useState<'verify'|'new'|'confirm'>('verify')
  const [pinVal,        setPinVal]        = React.useState('')
  const [pinFirst,      setPinFirst]      = React.useState('')
  const [pinErr,        setPinErr]        = React.useState('')
  const [pinBusy,       setPinBusy]       = React.useState(false)

  async function requestEmailChange() {
    if (!newEmail.trim()) { setEmailMsg('Enter a new email address'); return }
    setEmailBusy(true)
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
    setEmailBusy(false)
    if (error) { setEmailMsg(error.message); return }
    setEmailMsg('✓ Confirmation sent — check both inboxes to confirm the change')
    setChangingEmail(false); setNewEmail('')
  }

  async function verifyCurrentPin(p: string) {
    const res = await fetch('/api/auth/pin-refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, pin: p }),
    })
    return res.ok
  }

  async function setNewPin(p: string) {
    setPinBusy(true)
    const crypto = await import('crypto')
    const hash = crypto.createHash('sha256').update(p).digest('hex')
    const { error } = await supabase.from('contacts')
      .update({ pin_hash: hash })
      .eq('auth_user_id', user.id).is('marina_id', null)
    setPinBusy(false)
    if (error) { setPinErr(error.message); return }
    setPinErr(''); setChangingPin(false); setPinStep('verify'); setPinVal(''); setPinFirst('')
  }

  const displayName = profile ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Set your name' : 'Set your name'
  const initials = displayName[0]?.toUpperCase() ?? 'U'

  // ─── Editing mode ─────────────────────────────────────────────────────────
  if (editing) {
    return (
      <div style={{ padding: '20px 20px 100px', animation: 'fadeUp 0.3s ease both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => setEditing(false)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 20, padding: '0 4px 0 0', fontFamily: FONT }}>←</button>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Edit Profile</h2>
        </div>
        <ContactForm
          userId={user.id}
          contact={rawContact ?? {}}
          submitLabel="Save Changes"
          onSaved={(data) => {
            const raw = data as Record<string, unknown>
            setRawContact(raw)
            onProfileUpdated(contactToProfile(raw))
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    )
  }

  // ─── View mode ────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '20px 20px 0', animation: 'fadeUp 0.35s ease both' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1.8, margin: 0 }}>Account</h2>
        <button onClick={onSignOut}
          style={{ background: 'none', border: '1px solid rgba(248,113,113,0.4)', borderRadius: 8, padding: '5px 12px', color: '#fca5a5', fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          Sign out
        </button>
      </div>

      {/* Profile card */}
      <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 20, padding: 20, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: C.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: C.navy, flexShrink: 0 }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>{displayName}</div>
              <div style={{ fontSize: 13, color: C.muted }}>{user.email}</div>
              {profile?.phone && <div style={{ fontSize: 12, color: C.muted2, marginTop: 2 }}>{profile.phone}</div>}
            </div>
          </div>
          <button onClick={() => setEditing(true)}
            style={{ background: C.tealDim, border: `1px solid ${C.tealBorder}`, borderRadius: 10, padding: '6px 12px', color: C.teal, fontFamily: FONT, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            Edit
          </button>
        </div>
      </div>

      {/* Email change */}
      <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>Login Email</div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>{user.email}</div>
        {!changingEmail ? (
          <button onClick={() => { setChangingEmail(true); setEmailMsg('') }}
            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 12px', color: C.muted, fontFamily: FONT, fontSize: 12, cursor: 'pointer' }}>
            Change email
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
              placeholder="New email address" autoFocus
              style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 8, color: '#fff', fontSize: 14, fontFamily: FONT, outline: 'none', boxSizing: 'border-box' }} />
            {emailMsg && <div style={{ fontSize: 12, color: emailMsg.startsWith('✓') ? C.green : C.danger, lineHeight: 1.5 }}>{emailMsg}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={requestEmailChange} disabled={emailBusy}
                style={{ flex: 1, padding: 10, background: C.tealDim, border: `1px solid ${C.tealBorder}`, borderRadius: 10, color: C.teal, fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {emailBusy ? 'Sending…' : 'Send confirmation'}
              </button>
              <button onClick={() => { setChangingEmail(false); setEmailMsg(''); setNewEmail('') }}
                style={{ padding: '10px 14px', background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: C.muted, fontFamily: FONT, fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PIN change */}
      <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: 16, marginBottom: 80 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>PIN</div>
        {!changingPin ? (
          <button onClick={() => { setChangingPin(true); setPinStep('verify'); setPinVal(''); setPinErr('') }}
            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 12px', color: C.muted, fontFamily: FONT, fontSize: 12, cursor: 'pointer' }}>
            Change PIN
          </button>
        ) : (
          <div>
            {pinStep === 'verify' && (
              <div>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>Enter your current PIN</div>
                <PinDots value={pinVal} />
                <PinPad value={pinVal} onChange={setPinVal} onFull={async (p) => {
                  const ok = await verifyCurrentPin(p)
                  if (!ok) { setPinErr('Incorrect PIN'); setPinVal(''); return }
                  setPinErr(''); setPinStep('new'); setPinVal('')
                }} />
                {pinErr && <div style={{ color: C.danger, fontSize: 12, textAlign: 'center', marginTop: 6 }}>{pinErr}</div>}
                <button onClick={() => { setChangingPin(false); setPinVal(''); setPinErr('') }}
                  style={{ width: '100%', marginTop: 10, padding: '10px', background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: C.muted, fontFamily: FONT, fontSize: 13, cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            )}
            {pinStep === 'new' && (
              <div>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>Enter new PIN</div>
                <PinDots value={pinVal} />
                <PinPad value={pinVal} onChange={setPinVal} onFull={(p) => { setPinFirst(p); setPinStep('confirm'); setPinVal('') }} />
              </div>
            )}
            {pinStep === 'confirm' && (
              <div>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>Confirm new PIN</div>
                <PinDots value={pinVal} />
                <PinPad value={pinVal} onChange={setPinVal} onFull={async (p) => {
                  if (p !== pinFirst) { setPinErr('PINs don\'t match — try again'); setPinStep('new'); setPinVal(''); setPinFirst(''); return }
                  await setNewPin(p)
                }} />
                {pinErr && <div style={{ color: C.danger, fontSize: 12, textAlign: 'center', marginTop: 6 }}>{pinErr}</div>}
                {pinBusy && <div style={{ color: C.muted, fontSize: 12, textAlign: 'center', marginTop: 6 }}>Saving…</div>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
// ─── PIN UI Primitives ────────────────────────────────────────────────────────
function PinDots({ value }: { value: string }) {
  return (
    <div style={{ display:'flex', gap:16, justifyContent:'center', marginBottom:28 }}>
      {[0,1,2,3].map(i => (
        <div key={i} style={{ width:16, height:16, borderRadius:'50%', background: i < value.length ? C.teal : 'rgba(255,255,255,0.15)', border:`2px solid ${i < value.length ? C.teal : 'rgba(255,255,255,0.3)'}`, transition:'all 0.15s', boxShadow: i < value.length ? `0 0 12px ${C.teal}` : 'none' }} />
      ))}
    </div>
  )
}

function PinPad({ value, onChange, max = 4, onFull }: { value:string; onChange:(v:string)=>void; max?:number; onFull?:(v:string)=>void }) {
  function press(d: string) {
    if (value.length >= max) return
    const next = value + d
    onChange(next)
    if (next.length === max && onFull) onFull(next)
  }
  function del() { onChange(value.slice(0,-1)) }
  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫']
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, maxWidth:280, margin:'0 auto' }}>
      {keys.map((k,i) => k === '' ? <div key={i} /> : (
        <button key={i} onClick={() => k==='⌫' ? del() : press(k)}
          style={{ padding:'18px 0', background:k==='⌫'?'rgba(255,255,255,0.05)':C.card, border:`1px solid ${C.cardBorder}`, borderRadius:14, color:C.white, fontFamily:FONT, fontSize:k==='⌫'?22:20, fontWeight:700, cursor:'pointer' }}
          onMouseEnter={e => { e.currentTarget.style.background = C.tealDim }}
          onMouseLeave={e => { e.currentTarget.style.background = k==='⌫'?'rgba(255,255,255,0.05)':C.card }}>
          {k}
        </button>
      ))}
    </div>
  )
}

// ─── Onboarding Shell ──────────────────────────────────────────────────────────
function OnboardingShell({ step, total, title, subtitle, children }: { step:number; total:number; title:string; subtitle:string; children:React.ReactNode }) {
  return (
    <div style={{ minHeight:'100vh', background:C.bgGrad, color:C.white, fontFamily:FONT, WebkitFontSmoothing:'antialiased' }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ maxWidth:420, margin:'0 auto', padding:'0 20px 100px' }}>
        <div style={{ padding:'48px 0 24px', animation:'fadeUp 0.4s ease both' }}>
          <div style={{ display:'flex', gap:6, marginBottom:20 }}>
            {Array.from({length:total},(_,i) => (
              <div key={i} style={{ height:3, flex:1, borderRadius:99, background: i < step ? C.teal : 'rgba(255,255,255,0.15)', transition:'background 0.3s' }} />
            ))}
          </div>
          <div style={{ fontSize:11, color:C.teal, fontWeight:700, letterSpacing:3, textTransform:'uppercase', marginBottom:8 }}>Step {step} of {total}</div>
          <h1 style={{ fontSize:26, fontWeight:800, margin:'0 0 6px', letterSpacing:-0.4 }}>{title}</h1>
          <p style={{ fontSize:13.5, color:C.muted, margin:0, lineHeight:1.6 }}>{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Form Section Label ────────────────────────────────────────────────────────
function FormSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize:11, fontWeight:700, color:C.teal, textTransform:'uppercase', letterSpacing:1.5, marginTop:24, marginBottom:12, paddingBottom:8, borderBottom:`1px solid rgba(77,214,200,0.2)` }}>
      {children}
    </div>
  )
}

// ─── Nav Icons ─────────────────────────────────────────────────────────────────
// ── WEATHER STRIP ───────────────────────────────────────────────────────────────────────
function WeatherStrip({ data, onTap }: { data: WeatherData | null; onTap: () => void }) {
  if (!data?.current?.temp_f) return null
  const { current, tides } = data
  const nextTide = tides?.next
  const tideDir  = tides?.is_rising ? '↑' : '↓'
  const tideTime = nextTide
    ? new Date(nextTide.time).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit', hour12:true })
    : null
  return (
    <button
      onClick={onTap}
      style={{ width:'100%', background:'rgba(255,255,255,0.04)', border:'none', borderBottom:'1px solid rgba(255,255,255,0.06)', padding:'6px 20px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:14, fontFamily:FONT, flexShrink:0 }}
    >
      <span style={{ fontSize:13, color:C.white, fontWeight:600 }}>
        {current.icon} {current.temp_f}° · {current.wind_dir} {current.wind_kts} kts
      </span>
      {nextTide && tideTime && (
        <span style={{ fontSize:13, color:C.teal, fontWeight:600 }}>
          🌊{tideDir} {nextTide.type} {tideTime}
        </span>
      )}
    </button>
  )
}

// ── TAB: WEATHER ────────────────────────────────────────────────────────────────────
function TabWeather({ weatherData, onRefresh }: { weatherData: WeatherData | null; onRefresh: () => void }) {
  const w = weatherData

  if (!w) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 20px', gap:16 }}>
      <div style={{ fontSize:48 }}>🌤️</div>
      <div style={{ fontSize:16, fontWeight:700, color:C.white }}>Getting your weather…</div>
      <div style={{ fontSize:13, color:C.muted, textAlign:'center', lineHeight:1.6, maxWidth:260 }}>
        Allow location access for live marine weather at your current position.
      </div>
      <button onClick={onRefresh} style={{ marginTop:8, padding:'10px 24px', background:C.tealDim, border:`1px solid ${C.tealBorder}`, borderRadius:12, color:C.teal, fontFamily:FONT, fontWeight:700, cursor:'pointer', fontSize:13 }}>
        Try Again
      </button>
    </div>
  )

  const c     = w.current || {}
  const tides = w.tides   || {}
  const mar   = w.marine  || {}
  const fcast = w.forecast || []

  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

  return (
    <div style={{ padding:'20px 20px 100px', animation:'fadeUp 0.35s ease both' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <SectionTitle>Marine Weather</SectionTitle>
        <button onClick={onRefresh} style={{ background:'none', border:'none', color:C.teal, fontSize:11, fontFamily:FONT, cursor:'pointer', fontWeight:700 }}>Refresh ↻</button>
      </div>

      {/* Current conditions */}
      <div style={{ background:'linear-gradient(135deg,rgba(77,214,200,0.16) 0%,rgba(13,43,75,0.5) 100%)', border:`1px solid ${C.tealBorder}`, borderRadius:22, padding:22, marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
          <div>
            <div style={{ fontSize:52, lineHeight:1 }}>{c.icon || '🌤️'}</div>
            <div style={{ fontSize:44, fontWeight:800, letterSpacing:-2, lineHeight:1.1, marginTop:8 }}>{c.temp_f}°<span style={{ fontSize:20 }}>F</span></div>
            <div style={{ fontSize:15, color:C.muted, marginTop:4 }}>{c.description}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:11, color:C.muted2, textTransform:'uppercase', letterSpacing:1 }}>Feels like</div>
            <div style={{ fontSize:22, fontWeight:700 }}>{c.feels_like_f}°</div>
            {c.pressure_mb && (
              <div style={{ fontSize:12, color:C.muted, marginTop:6 }}>{c.pressure_mb} mb</div>
            )}
            {c.visibility_mi != null && (
              <div style={{ fontSize:12, color:C.muted }}>{c.visibility_mi} mi visibility</div>
            )}
          </div>
        </div>

        {/* Wind compass */}
        <div style={{ background:'rgba(0,0,0,0.25)', borderRadius:14, padding:'14px 16px', display:'flex', alignItems:'center', gap:16 }}>
          <WindCompass deg={c.wind_dir_deg || 0} size={56} />
          <div>
            <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>Wind</div>
            <div style={{ fontSize:22, fontWeight:800 }}>{c.wind_kts} <span style={{ fontSize:13, fontWeight:400 }}>kts</span></div>
            <div style={{ fontSize:13, color:C.muted }}>{c.wind_dir} {c.gusts_kts > 0 ? `· Gusts ${c.gusts_kts} kts` : ''}</div>
          </div>
        </div>
      </div>

      {/* Tides */}
      <div style={{ background:C.card, border:`1px solid ${C.cardBorder}`, borderRadius:22, padding:20, marginBottom:14 }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:1.5, marginBottom:14 }}>Tides</div>
        {tides.status === 'ok' ? (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <div style={{ fontSize:32 }}>{tides.is_rising ? '🌊↑' : '🌊↓'}</div>
              <div>
                <div style={{ fontSize:18, fontWeight:800 }}>{tides.is_rising ? 'Rising' : 'Falling'}</div>
                {tides.next && (
                  <div style={{ fontSize:13, color:C.teal }}>
                    Next {tides.next.type}: {tides.next.height_ft} ft · {new Date(tides.next.time).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit', hour12:true })}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {tides.predictions?.slice(0, 4).map((p: {time:string;type:string;height_ft:string}, i: number) => (
                <div key={i} style={{ background:'rgba(0,0,0,0.2)', borderRadius:10, padding:'10px 12px' }}>
                  <div style={{ fontSize:10, color:C.muted, textTransform:'uppercase', letterSpacing:1, marginBottom:2 }}>{p.type} Tide</div>
                  <div style={{ fontSize:15, fontWeight:700 }}>{p.height_ft} ft</div>
                  <div style={{ fontSize:12, color:C.muted }}>{new Date(p.time).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true})}</div>
                  <div style={{ fontSize:10, color:C.muted2 }}>{new Date(p.time).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</div>
                </div>
              ))}
            </div>
            {tides.nearest_station && (
              <div style={{ fontSize:11, color:C.muted2, marginTop:10 }}>
                Station: {tides.nearest_station} ({tides.distance_mi} mi)
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize:13, color:C.muted, textAlign:'center', padding:'12px 0' }}>
            Tide data unavailable for this location
          </div>
        )}
      </div>

      {/* Marine conditions */}
      {mar.wave_height_ft != null && (
        <div style={{ background:C.card, border:`1px solid ${C.cardBorder}`, borderRadius:22, padding:20, marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:1.5, marginBottom:14 }}>Sea Conditions</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
            <div style={{ background:'rgba(0,0,0,0.2)', borderRadius:10, padding:'10px 12px', textAlign:'center' }}>
              <div style={{ fontSize:10, color:C.muted, textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>Wave Ht</div>
              <div style={{ fontSize:18, fontWeight:700 }}>{mar.wave_height_ft}<span style={{ fontSize:11 }}> ft</span></div>
            </div>
            {mar.wave_period_s != null && (
              <div style={{ background:'rgba(0,0,0,0.2)', borderRadius:10, padding:'10px 12px', textAlign:'center' }}>
                <div style={{ fontSize:10, color:C.muted, textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>Period</div>
                <div style={{ fontSize:18, fontWeight:700 }}>{mar.wave_period_s}<span style={{ fontSize:11 }}> sec</span></div>
              </div>
            )}
            {mar.wave_dir && (
              <div style={{ background:'rgba(0,0,0,0.2)', borderRadius:10, padding:'10px 12px', textAlign:'center' }}>
                <div style={{ fontSize:10, color:C.muted, textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>Swell</div>
                <div style={{ fontSize:18, fontWeight:700 }}>{mar.wave_dir}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3-day forecast */}
      {fcast.length > 0 && (
        <div style={{ background:C.card, border:`1px solid ${C.cardBorder}`, borderRadius:22, padding:20 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:1.5, marginBottom:14 }}>3-Day Forecast</div>
          {fcast.map((day: {date:string;icon:string;high_f:number;low_f:number;wind_kts:number;wind_dir:string;precip_pct:number;description:string}, i: number) => {
            const d    = new Date(day.date + 'T12:00:00')
            const name = dayNames[d.getDay()]
            return (
              <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 0', borderBottom: i < fcast.length-1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
                <div style={{ width:36, fontSize:13, fontWeight:700, color:C.muted }}>{name}</div>
                <div style={{ fontSize:22, width:32, textAlign:'center' }}>{day.icon}</div>
                <div style={{ flex:1, paddingLeft:10 }}>
                  <div style={{ fontSize:12, color:C.muted }}>{day.description}</div>
                  <div style={{ fontSize:11, color:C.muted2 }}>{day.wind_dir} {day.wind_kts} kts{day.precip_pct > 20 ? ` · 🌧️ ${day.precip_pct}%` : ''}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <span style={{ fontSize:15, fontWeight:700 }}>{day.high_f}°</span>
                  <span style={{ fontSize:13, color:C.muted2, marginLeft:4 }}>{day.low_f}°</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Simple wind compass rose
function WindCompass({ deg, size = 56 }: { deg: number; size?: number }) {
  const r = size / 2
  const cx = r, cy = r
  // Arrow tip and tail
  const rad = (deg - 90) * Math.PI / 180
  const tip  = { x: cx + (r - 4) * Math.cos(rad),  y: cy + (r - 4) * Math.sin(rad)  }
  const tail = { x: cx - (r - 10) * Math.cos(rad), y: cy - (r - 10) * Math.sin(rad) }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink:0 }}>
      <circle cx={cx} cy={cy} r={r - 2} fill="rgba(77,214,200,0.1)" stroke="rgba(77,214,200,0.35)" strokeWidth="1.5" />
      {['N','E','S','W'].map((d, i) => {
        const a = (i * 90 - 90) * Math.PI / 180
        const tx = cx + (r - 9) * Math.cos(a)
        const ty = cy + (r - 9) * Math.sin(a) + 4
        return <text key={d} x={tx} y={ty} textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.4)" fontWeight="700">{d}</text>
      })}
      <line x1={tail.x} y1={tail.y} x2={tip.x} y2={tip.y} stroke="#4dd6c8" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={tip.x} cy={tip.y} r="3" fill="#4dd6c8" />
      <circle cx={cx} cy={cy} r="3" fill="rgba(77,214,200,0.5)" />
    </svg>
  )
}

function IcoSkipper({ active }: { active: boolean }) {
  return (
    <div style={{ width:26, height:26, borderRadius:'50%', overflow:'hidden', border:`2px solid ${active ? C.teal : C.muted}`, opacity: active ? 1 : 0.55, transition:'all 0.2s', boxShadow: active ? `0 0 8px ${C.teal}` : 'none' }}>
      <Image src="/skipper-avatar.jpg" alt="Skipper" width={26} height={26} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top' }} />
    </div>
  )
}
function IcoVessel({ active }: { active: boolean }) {
  const c = active ? C.teal : C.muted
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 17l1.5-6h15l1.5 6H3z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" fill={active?'rgba(77,214,200,0.15)':'none'}/><path d="M8 11V7a4 4 0 018 0v4" stroke={c} strokeWidth="1.8" strokeLinecap="round"/><path d="M3 17c2 3 16 3 18 0" stroke={c} strokeWidth="1.8" strokeLinecap="round"/></svg>
}
function IcoMarinas({ active }: { active: boolean }) {
  const c = active ? C.teal : C.muted
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke={c} strokeWidth="1.8" fill={active?'rgba(77,214,200,0.1)':'none'}/><path d="M12 3v18M3 12h18" stroke={c} strokeWidth="1.8"/><path d="M5.6 5.6c1.8 2.8 1.8 10 0 12.8M18.4 5.6c-1.8 2.8-1.8 10 0 12.8" stroke={c} strokeWidth="1.4"/></svg>
}
function IcoMsgs({ active }: { active: boolean }) {
  const c = active ? C.teal : C.muted
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" fill={active?'rgba(77,214,200,0.1)':'none'}/></svg>
}
function IcoAcct({ active }: { active: boolean }) {
  const c = active ? C.teal : C.muted
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke={c} strokeWidth="1.8" fill={active?'rgba(77,214,200,0.1)':'none'}/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={c} strokeWidth="1.8" strokeLinecap="round"/></svg>
}
function IcoWeather({ active }: { active: boolean }) {
  const c = active ? C.teal : C.muted
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="10" r="3.5" stroke={c} strokeWidth="1.8" fill={active?'rgba(77,214,200,0.1)':'none'}/>
      <path d="M12 3v1.5M12 15v1.5M5 10H3.5M20.5 10H19M7.22 5.22l-1.06-1.06M17.84 17.84l-1.06-1.06M7.22 14.78l-1.06 1.06M17.84 2.16l-1.06 1.06" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M6 19.5a3 3 0 0 1 0-6h.5A4.5 4.5 0 0 1 15 14a3.5 3.5 0 0 1 0 7H6" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill={active?'rgba(77,214,200,0.08)':'none'}/>
    </svg>
  )
}

// ─── Shared UI Primitives ──────────────────────────────────────────────────────
const Input = ({ style, ...p }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input style={{ width:'100%', padding:'14px 15px', background:C.inputBg, border:`1.5px solid ${C.inputBorder}`, borderRadius:14, color:C.white, fontSize:15, fontFamily:FONT, outline:'none', ...style }} {...p} />
)
const SelectInput = ({ style, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select style={{ width:'100%', padding:'14px 15px', background:'#0d1f35', border:`1.5px solid ${C.inputBorder}`, borderRadius:14, color:p.value?C.white:C.muted, fontSize:15, fontFamily:FONT, outline:'none', ...style }} {...p} />
)
const Label = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize:12, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>{children}</div>
)
const FieldGroup = ({ label, children }: { label:string; children:React.ReactNode }) => (
  <div style={{ marginBottom:16 }}>
    <Label>{label}</Label>
    {children}
  </div>
)
const ErrMsg = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize:13, color:C.danger, marginTop:8, padding:'10px 14px', background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.25)', borderRadius:10 }}>{children}</div>
)
const PrimaryBtn = ({ children, loading, style, onClick, disabled }: { children:React.ReactNode; loading?:boolean; style?:React.CSSProperties; onClick?:()=>void; disabled?:boolean }) => (
  <button onClick={onClick} disabled={loading||disabled} style={{ width:'100%', padding:'15px', background:(loading||disabled)?'rgba(77,214,200,0.4)':`linear-gradient(135deg,${C.teal},#2fb3a3)`, border:'none', borderRadius:14, color:C.navy, fontFamily:FONT, fontSize:15, fontWeight:800, cursor:(loading||disabled)?'default':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, letterSpacing:-0.2, ...style }}>
    {loading ? <><Spinner/>Please wait…</> : children}
  </button>
)
const Spinner = ({ size = 16, color = C.navy }: { size?: number; color?: string } = {}) => <div style={{ width:size, height:size, border:`2px solid ${color}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
const SectionTitle = ({ children }: { children:React.ReactNode }) => (
  <h2 style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:1.8, margin:'0 0 14px' }}>{children}</h2>
)
const NavBtn = ({ icon, label, active, onClick }: { icon:React.ReactNode; label:string; active:boolean; onClick:()=>void }) => (
  <button onClick={onClick} style={{ background:'transparent', border:'none', padding:'4px 0', display:'flex', flexDirection:'column', alignItems:'center', gap:3, color:active?C.teal:C.muted, fontFamily:FONT, fontSize:10, fontWeight:active?700:500, cursor:'pointer' }}>
    {icon}
    <span style={{ letterSpacing:0.2 }}>{label}</span>
  </button>
)
