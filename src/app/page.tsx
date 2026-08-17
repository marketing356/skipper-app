'use client'
import AssetForm from '@/components/AssetForm'
import OPSShell from '@/components/OPSShell'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import ContactForm from '@/components/ContactForm'
import Image from 'next/image'
import { supabase } from '@/lib/supabase-client'
import { useSkipperRealtime } from '@/lib/useSkipperRealtime'
import type { User } from '@supabase/supabase-js'

const MarinaMap = dynamic(() => import('@/components/MarinaMap'), { ssr: false, loading: () => <div style={{ width:'100%', height:'100%', background:'#0d1f2d', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.4)', fontSize:13 }}>Loading map…</div> })

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
type HomeTab = 'home' | 'vessel' | 'weather' | 'marinas' | 'messages' | 'log' | 'account'
type MarinaProfile = { id: string; name: string; address: string | null; phone: string | null; email: string | null }
type SpaceProfile  = { id: string; label: string | null; dock: string | null; spaceType: string | null }
type LeaseProfile  = { id: string; startDate: string | null; endDate: string | null; status: string; monthlyRate: number | null }

type WeatherData = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  current:  Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  forecast: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  marine:   Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tides:    Record<string, any>
  location_name?: string
}
type Marina = { id:string; name:string; city:string; state:string; total_slips:number; transient_available?:boolean; lat:number|null; lng:number|null; amenities?: Record<string, boolean|string|null> }
type MarinaPhoto = { id:string; url:string; caption:string|null; is_hero:boolean }
type MarinaStorefront = {
  marina: {
    id:string; name:string; slug:string|null; address:string|null; city:string|null; state:string|null; zip:string|null
    phone:string|null; email:string|null; website:string|null; description:string|null; lat:number|null; lng:number|null
    total_slips:number|null; transient_available:boolean|null; transient_daily_rate:number|null
    max_vessel_loa_ft:number|null; max_slip_length_ft:number|null; max_slip_width_ft:number|null; max_draft_ft:number|null
    vhf_channel:string|null; winter_storage_count:number|null; season_start:string|null; season_end:string|null
    fuel_types:string[]|null; shore_power_30a:boolean|null; shore_power_50a:boolean|null; shore_power_100a:boolean|null
  }
  amenities: Record<string, boolean|string|null>
  photos: MarinaPhoto[]
}

type BerthData = {
  id: string
  marinaId: string
  marinaName: string
  slipNumber: string | null
  dock: string | null
  monthlyRate: number | null
  leaseType: string | null
  startDate: string | null
  endDate: string | null
  assetId: string | null
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
  vessel_category: string | null
  vessel_subtype: string | null
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
    vessel_type: a.vessel_type ?? '',
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
    vessel_category: a.vessel_category ?? null,
    vessel_subtype: a.vessel_subtype ?? null,
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
  const [realtimeVersion, setRealtimeVersion] = useState(0)  // increments on any realtime event → triggers child refreshes
  const [vessels,        setVessels]        = useState<Vessel[]>([])
  const [vesselIds,      setVesselIds]      = useState<string[]>([])
  const [homeTab,        setHomeTab]        = useState<HomeTab>('home')
  const [marinaProfile,  setMarinaProfile]  = useState<MarinaProfile | null>(null)
  const [spaceProfile,   setSpaceProfile]   = useState<SpaceProfile | null>(null)
  const [leaseProfile,   setLeaseProfile]   = useState<LeaseProfile | null>(null)
  const [coupledMarinas, setCoupledMarinas] = useState<Marina[]>([])
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

  // ── Shared data-load function — Rule 2 compliant: all data via Railway ──
  async function loadUserData(u: User) {
    setVesselsLoading(true)
    try {
      // Step 1: Profile from Railway (contact + marina + vessel + space + lease)
      const profileRes = await fetch(`/api/profile?auth_user_id=${u.id}`)
      const profileData = profileRes.ok ? await profileRes.json() : null

      // Step 2: All boats owned by this boater (by login, not marina — a boater owns
      // boats with or without a marina; transients arrive from outside marinas).
      let loadedVessels: Vessel[] = []
      let loadedIds: string[] = []
      const camelToRaw = (a: any) => ({
        id: a.id, name: a.name, vessel_type: a.assetType, make: a.make, model: a.model,
        year: a.year, length_ft: a.lengthFt, beam_ft: a.beamFt, draft_ft: a.draftFt,
        shore_power: a.shorePower, fuel_type: a.fuelType, color: a.color,
        registration_number: a.registrationNumber, registration_state: a.registrationState,
        registration_expiry: a.registrationExpiry, hin: a.hin, hull_material: a.hullMaterial,
        engine_count: a.engineCount, engine_type: a.engineType, engine_make: a.engineMake,
        engine_model: a.engineModel, horsepower_per_engine: a.horsepowerPerEngine,
        photo_url: a.photoUrl, notes: a.notes,
      })
      const assetsRes = await fetch(`/api/assets?auth_user_id=${u.id}`)
      if (assetsRes.ok) {
        const assetsData = await assetsRes.json()
        const assetRows: any[] = assetsData.vessels ?? []
        loadedVessels = assetRows.map((a: any) => assetRowToVessel(camelToRaw(a), null))
        loadedIds = assetRows.map((a: any) => a.id as string)
      }

      // Fallback: use vessel embedded in profile if assets list is empty
      if (loadedVessels.length === 0 && profileData?.vessel) {
        const v = profileData.vessel
        loadedVessels = [assetRowToVessel({
          id: v.id, name: v.name, vessel_type: v.assetType,
          make: v.make, model: v.model, year: v.year,
          length_ft: v.lengthFt, beam_ft: v.beamFt, draft_ft: v.draftFt,
          shore_power: v.shorePower, fuel_type: v.fuelType, color: v.color,
          registration_number: v.registrationNumber,
        } as any, null)]
        loadedIds = [v.id]
      }

      setVessels(loadedVessels)
      setVesselIds(loadedIds)
      setVessel(prev => loadedVessels.find(v => v.id === prev?.id) ?? loadedVessels[0] ?? null)
      setVesselId(prev => loadedIds.includes(prev ?? '') ? prev : (loadedIds[0] ?? null))

      // Step 3: Build profile from Railway contact fields
      const rc = profileData?.contact
      let prof: Profile | null = rc ? {
        id: u.id, contact_id: rc.id ?? null,
        first_name: rc.firstName ?? null, last_name: rc.lastName ?? null,
        email: rc.email ?? null, display_name: [rc.firstName, rc.lastName].filter(Boolean).join(' ') || null,
        phone: rc.phone ?? null, mobile: null, avatar_url: null, pin_hash: null, onboarding_complete: true,
        address: null, address_city: null, address_state: null, address_zip: null,
        billing_address: null, billing_city: null, billing_state: null, billing_zip: null,
        emergency_contact: null, emergency_phone: null, title: null, date_of_birth: null,
        driver_license_number: null, preferred_contact_method: null, language_preference: null,
        preferred_name: null, email_secondary: null, phone_work: null, company_organization: null,
        job_title: null, address_line2: null, country: null, billing_name: null, billing_email: null,
        tax_exempt: null, emergency_relationship: null, emergency_name_2: null, emergency_phone_2: null,
        drivers_license_state: null, drivers_license_expiry: null, oupv_license_number: null, oupv_expiry: null,
        contact_type: null, status: null, sms_opt_in: null, email_opt_in: null, liveaboard: null,
        pet_on_board: null, parking_permit: null, notes: null, account_number: null, lead_source: null,
        customer_since: null, waiver_signed: null, waiver_signed_date: null, internal_notes: null,
        vip_flag: null, do_not_contact: null, fax: null, website: null, nationality: null,
        passport_number: null, passport_country: null, passport_expiry: null, ssn_tax_id: null,
        mmc_license_number: null, mmc_tonnage_rating: null, mmc_expiry: null, twic_number: null,
        twic_expiry: null, stcw_certification: null, stcw_level: null, stcw_expiry: null,
        fcc_license_number: null, fcc_expiry: null, cpr_certification: null, cpr_expiry: null,
        abyc_certifications: null, engine_brand_certifications: null, trade_specialties: null,
        dealer_license_number: null, dealer_license_state: null, broker_license_number: null,
        broker_license_state: null, seatow_membership_number: null, boatus_membership_number: null,
        employee_id: null, department: null, employment_type: null, tax_classification: null,
        hire_date: null, hourly_rate: null, salary: null, access_card: null, locker_number: null,
        parking_spot: null, shift_notes: null, doc_w2_on_file: null, doc_i9_on_file: null,
        doc_direct_deposit: null, doc_signed_offer: null, doc_background_check: null, languages_spoken: null,
      } : null
      // No marina contact? Fall back to the boater's national-pool account so a no-marina
      // boater still has their identity (name) and isn't wrongly pushed into marina setup.
      if (!prof) {
        try {
          const accRes = await fetch(`/api/account?auth_user_id=${u.id}`)
          if (accRes.ok) {
            const accData = await accRes.json()
            if (accData.contact) prof = contactToProfile(accData.contact)
          }
        } catch { /* ignore */ }
      }
      setProfile(prof)

      // Step 4: Store marina + space + lease for home dashboard
      setMarinaProfile(profileData?.marina ?? null)
      setSpaceProfile(profileData?.space ?? null)
      setLeaseProfile(profileData?.lease ?? null)

      // Step 5: Load connected marinas for Skipper AI context
      const marinasRes = await fetch(`/api/marinas?auth_user_id=${u.id}`, { cache: 'no-store' })
      if (marinasRes.ok) {
        const marinasData = await marinasRes.json()
        setCoupledMarinas(marinasData.marinas ?? [])
      }

      return { contact: rc ? { id: rc.id, auth_user_id: u.id, first_name: rc.firstName, last_name: rc.lastName } : null, nationalContact: null, allContactIds: rc ? [rc.id] : [], prof }
    } finally {
      setVesselsLoading(false)
    }
  }

  async function routeAfterAuth(u: User) {
    userRef.current = u
    localStorage.setItem('skipper_user_id', u.id)
    setVesselsLoading(true)
    try {
      const result = await loadUserData(u)
      const prof   = result?.prof

      // Gate 1: Onboarding — user is set up if Railway returned a name, or localStorage says so
      const setupInStorage = localStorage.getItem(`skipper_setup_${u.id}`) === 'complete'
      const hasProfile = !!(prof?.first_name)
      if (!setupInStorage && !hasProfile) { setScreen('contact_setup'); return }

      // Gate 2: PIN setup (first-time only) — check localStorage
      const localPin = localStorage.getItem(`skipper_pin_${u.id}`)
      if (!localPin) { setScreen('pin_setup'); return }

      const unlocked = localStorage.getItem(`skipper_unlocked_${u.id}`)
      if (unlocked) { setScreen('home'); return }

      setScreen('pin_login')
    } catch(err) {
      console.error('[Skipper] routeAfterAuth failed:', err)
      setVesselsLoading(false)
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
      setRealtimeVersion(v => v + 1)  // triggers ShipLogList/ServiceHistoryList/etc. to re-fetch
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
        const lcRes = await fetch('/api/auth/link-contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, userId: u.id }),
        })
        const lcData = await lcRes.json().catch(() => ({}))
        // Store setup status so routeAfterAuth doesn't show contact_setup for preloaded users
        if (lcData.setup_complete || lcData.preLoaded) {
          localStorage.setItem(`skipper_setup_${u.id}`, 'complete')
        }
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
      marinaProfile={marinaProfile}
      spaceProfile={spaceProfile}
      leaseProfile={leaseProfile}
      coupledMarinas={coupledMarinas}
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
  const [firstName, setFirstName] = React.useState('')
  const [lastName,  setLastName]  = React.useState('')
  const [phone,     setPhone]     = React.useState('')
  const [saving,    setSaving]    = React.useState(false)
  const [err,       setErr]       = React.useState('')

  const iStyle = {
    width: '100%', padding: '13px 15px',
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10, color: '#fff', fontSize: 15,
    fontFamily: FONT, outline: 'none', boxSizing: 'border-box' as const,
  }

  async function handleSave() {
    if (!firstName.trim()) { setErr('First name is required'); return }
    setSaving(true); setErr('')
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_user_id: user.id,
          email: user.email || null,
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          phone: phone.trim() || null,
        }),
      })
      if (!res.ok) { setErr('Could not save — try again'); return }
      const saved = await res.json()
      localStorage.setItem(`skipper_setup_${user.id}`, 'complete')
      const contactRaw = saved.contact ?? {}
      onComplete(contactToProfile(contactRaw as Record<string, unknown>))
    } catch { setErr('Something went wrong') } finally { setSaving(false) }
  }

  return (
    <OnboardingShell step={1} total={2} title="Welcome aboard" subtitle="Just a few details so your marina knows it's you.">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '0 4px' }}>
        <div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>First name *</div>
          <input
            style={iStyle} value={firstName} placeholder="e.g. Michael"
            onChange={e => { setFirstName(e.target.value); setErr('') }}
            autoFocus
          />
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Last name</div>
          <input style={iStyle} value={lastName} placeholder="e.g. Karas" onChange={e => setLastName(e.target.value)} />
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Phone</div>
          <input style={iStyle} value={phone} placeholder="e.g. 555-123-4567" type="tel" onChange={e => setPhone(e.target.value)} />
        </div>
        {err && <div style={{ fontSize: 13, color: '#f87171' }}>{err}</div>}
        <button
          onClick={handleSave} disabled={saving}
          style={{ background: '#2dd4bf', color: '#0d2b4b', border: 'none', borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 900, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: FONT, opacity: saving ? 0.7 : 1, marginTop: 6 }}>
          {saving ? 'Saving…' : 'Continue →'}
        </button>
      </div>
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

// ─── Responsive hook ────────────────────────────────────────────────────────────
function useIsDesktop(breakpoint = 768) {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= breakpoint : false
  )
  useEffect(() => {
    const fn = () => setIsDesktop(window.innerWidth >= breakpoint)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [breakpoint])
  return isDesktop
}

// ─── Home ──────────────────────────────────────────────────────────────────────
function HomeScreen({ user, profile, vessel, vessels, vesselIds, activeTab, onTabChange, onSignOut, onVesselSaved, onVesselDeleted, onProfileUpdated, vesselsLoading, onRefreshVessels, marinaProfile, spaceProfile, leaseProfile, coupledMarinas }: {
  user: User; profile: Profile|null; vessel: Vessel|null; vessels: Vessel[]; vesselIds: string[]; activeTab: HomeTab
  onTabChange: (t: HomeTab) => void; onSignOut: () => void
  onVesselSaved: (v: Vessel, id: string) => void; onVesselDeleted: (id: string) => void; onProfileUpdated: (p: Profile) => void
  vesselsLoading: boolean; onRefreshVessels: () => void
  marinaProfile: MarinaProfile | null; spaceProfile: SpaceProfile | null; leaseProfile: LeaseProfile | null; coupledMarinas: Marina[]
}) {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null)
  const isDesktop = useIsDesktop()

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

  const NAV_ITEMS: [HomeTab, React.ReactNode, string][] = [
    ['home',     <IcoHome   key='h'  active={activeTab==='home'}    />, 'Home'],
    ['vessel',   <IcoVessel  key='v'  active={activeTab==='vessel'}   />, 'My Vessel'],
    ['weather',  <IcoWeather key='w'  active={activeTab==='weather'}  />, 'Weather'],
    ['marinas',  <IcoMarinas key='m'  active={activeTab==='marinas'}  />, 'Discovery'],
    ['messages', <IcoMsgs   key='ms' active={activeTab==='messages'} />, 'Messages'],
    ['log',      <IcoLog    key='l'  active={activeTab==='log'}      />, 'Log'],
    ['account',  <IcoAcct   key='a'  active={activeTab==='account'}  />, 'Account'],
  ]

  const TAB_LABELS: Record<HomeTab, string> = {
    home: 'Home', vessel: 'My Vessel', weather: 'Weather', marinas: 'Discovery', messages: 'Messages', log: "Ship's Log", account: 'Account',
  }

  return (
    <div style={{ height:'100dvh', background:C.bgGrad, color:C.white, fontFamily:FONT, WebkitFontSmoothing:'antialiased', display:'flex', flexDirection: isDesktop ? 'row' : 'column', overflow:'hidden' }}>
      <style>{GLOBAL_CSS}</style>

      {/* ── Desktop sidebar ── */}
      {isDesktop && (
        <div style={{ width:224, flexShrink:0, height:'100%', background:'rgba(4,14,26,0.98)', borderRight:`1px solid rgba(255,255,255,0.07)`, display:'flex', flexDirection:'column' }}>
          {/* Logo */}
          <div style={{ padding:'24px 20px 20px', borderBottom:`1px solid rgba(255,255,255,0.07)` }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:'50%', overflow:'hidden', border:`2px solid ${C.teal}`, flexShrink:0 }}>
                <Image src="/skipper-avatar.jpg" alt="Skipper" width={36} height={36} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top' }} />
              </div>
              <div>
                <div style={{ fontSize:16, fontWeight:800, letterSpacing:-0.3 }}>Skipper</div>
                <div style={{ fontSize:11, color:C.teal, fontWeight:600 }}>We run on Skipper.</div>
              </div>
            </div>
            {vessels.length > 0 && (
              <div style={{ fontSize:11, color:C.teal, fontWeight:700, background:C.tealDim, border:`1px solid ${C.tealBorder}`, borderRadius:20, padding:'3px 10px', marginTop:12, display:'inline-block' }}>
                {vesselIcon(vessels[0]?.vessel_type)} {vessels.length === 1 ? vessels[0].name : `${vessels.length} vessels`}
              </div>
            )}
          </div>
          {/* Nav items */}
          <div style={{ flex:1, padding:'12px 10px', display:'flex', flexDirection:'column', gap:2 }}>
            {NAV_ITEMS.map(([tab, icon, label]) => (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                style={{
                  display:'flex', alignItems:'center', gap:12,
                  padding:'11px 12px', borderRadius:10, border:'none', cursor:'pointer',
                  background: activeTab === tab ? C.tealDim : 'transparent',
                  color: activeTab === tab ? C.teal : C.muted,
                  fontFamily:FONT, fontSize:14, fontWeight: activeTab === tab ? 700 : 400,
                  transition:'all 0.15s', textAlign:'left', width:'100%',
                }}
              >
                {icon}
                <span>{label}</span>
              </button>
            ))}
          </div>
          {/* Sign out */}
          <div style={{ padding:'12px 10px', borderTop:`1px solid rgba(255,255,255,0.07)` }}>
            <button
              onClick={onSignOut}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', background:'none', border:'none', color:C.muted2, cursor:'pointer', fontFamily:FONT, fontSize:13, width:'100%', borderRadius:8, transition:'color 0.15s' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* ── Main content column ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>

        {/* Mobile top bar */}
        {!isDesktop && (
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
        )}

        {/* Desktop content header */}
        {isDesktop && (
          <div style={{ padding:'20px 32px', flexShrink:0, borderBottom:`1px solid rgba(255,255,255,0.07)`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ fontSize:20, fontWeight:800, letterSpacing:-0.5 }}>{TAB_LABELS[activeTab]}</div>
          </div>
        )}

        {/* Weather strip */}
        <WeatherStrip data={weatherData} onTap={() => onTabChange('weather')} />

        {/* Scrollable content */}
        <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch' }}>
          {activeTab === 'home'     && <TabHome user={user} profile={profile} vessel={vessel} marinaProfile={marinaProfile} spaceProfile={spaceProfile} leaseProfile={leaseProfile} weatherData={weatherData} onTabChange={onTabChange} />}
          {activeTab === 'vessel'   && <TabVessel   vessels={vessels} vesselIds={vesselIds} user={user} profile={profile} onVesselSaved={onVesselSaved} onVesselDeleted={onVesselDeleted} vesselsLoading={vesselsLoading} />}
          {activeTab === 'weather'  && <TabWeather  weatherData={weatherData} onRefresh={() => {
            if (typeof navigator === 'undefined' || !navigator.geolocation) return
            navigator.geolocation.getCurrentPosition(pos => {
              fetch(`/api/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`)
                .then(r => r.json()).then(d => setWeatherData(d)).catch(() => {})
            }, () => {})
          }} />}
          {activeTab === 'marinas'  && <TabMarinas  user={user} profile={profile} vessel={vessel} vessels={vessels} spaceProfile={spaceProfile} leaseProfile={leaseProfile} marinaProfile={marinaProfile} />}
          {activeTab === 'messages' && <TabMessages  user={user} profile={profile} />}
          {activeTab === 'log'      && <TabShipLog vessels={vessels} vessel={vessel} vesselIds={vesselIds} />}
          {activeTab === 'account'  && <TabAccount  user={user} profile={profile} vessels={vessels} onSignOut={onSignOut} onProfileUpdated={onProfileUpdated} />}
        </div>

        {/* Mobile bottom nav */}
        {!isDesktop && (
          <div style={{ flexShrink:0, borderTop:`1px solid rgba(255,255,255,0.08)`, background:'rgba(5,17,31,0.95)', backdropFilter:'blur(12px)', display:'flex', justifyContent:'space-around', alignItems:'center', padding:'10px 0 env(safe-area-inset-bottom,10px)' }}>
            <NavBtn icon={<IcoHome   active={activeTab==='home'}    />} label="Home"     active={activeTab==='home'}     onClick={() => onTabChange('home')}     />
            <NavBtn icon={<IcoVessel  active={activeTab==='vessel'}   />} label="Vessel"   active={activeTab==='vessel'}   onClick={() => onTabChange('vessel')}   />
            <NavBtn icon={<IcoMarinas active={activeTab==='marinas'}  />} label="Marinas"  active={activeTab==='marinas'}  onClick={() => onTabChange('marinas')}  />
            <NavBtn icon={<IcoMsgs   active={activeTab==='messages'} />} label="Messages" active={activeTab==='messages'} onClick={() => onTabChange('messages')} />
            <NavBtn icon={<IcoLog    active={activeTab==='log'}      />} label="Log"      active={activeTab==='log'}      onClick={() => onTabChange('log')}      />
            <NavBtn icon={<IcoAcct   active={activeTab==='account'}  />} label="Account"  active={activeTab==='account'}  onClick={() => onTabChange('account')}  />
          </div>
        )}
      </div>

      {/* Floating Skipper — offset on desktop to clear sidebar */}
      <SkipperFloat user={user} profile={profile} vessel={vessel} onRefreshVessels={onRefreshVessels} coupledMarinas={coupledMarinas} />
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

  // ── Realtime version — triggers child list refreshes (ServiceHistory, ShipLog, etc.) ──
  const [realtimeVersion, setRealtimeVersion] = useState(0)
  useSkipperRealtime({
    scope: { kind: 'boater', authUserId: user.id },
    enabled: !!user.id,
    onChange: () => setRealtimeVersion(v => v + 1),
  })

  // ── Detail view state ────────────────────────────────────────────────────────
  const [detailIdx, setDetailIdx] = useState<number | null>(null)

  // ── Load berths ───────────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadBerths() {
      setBerthLoading(true)
      try {
        const res = await fetch(`/api/berths?auth_user_id=${user.id}`)
        const data = res.ok ? await res.json() : { berths: [] }
        setBerths((data.berths ?? []) as BerthData[])
      } catch {
        setBerths([])
      }
      setBerthLoading(false)
    }
    loadBerths()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id])

  // ── Open edit: fetch raw row from DB ─────────────────────────────────────────
  async function openEdit(id: string) {
    const res = await fetch(`/api/vessels/${id}?auth_user_id=${user.id}`)
    if (!res.ok) return
    const data = await res.json()
    if (data?.vessel) { setEditingAsset(data.vessel); setShowForm(true) }
  }

  // ── Delete vessel (soft-delete via Railway — Rule 2) ───────────────────────────
  async function deleteVessel(id: string) {
    if (!confirm('Delete this vessel? This cannot be undone.')) return
    const res = await fetch(`/api/vessels/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auth_user_id: user.id }),
    })
    if (res.ok) onVesselDeleted(id)
  }

  // ── Vessel Detail screen ─────────────────────────────────────────────────────
  if (detailIdx !== null && vessels[detailIdx]) return (
    <VesselDetailScreen
      vessel={vessels[detailIdx]}
      vesselId={vesselIds[detailIdx]}
      onBack={() => setDetailIdx(null)}
      onEdit={async () => {
        const id = vesselIds[detailIdx]
        const res = await fetch(`/api/vessels/${id}?auth_user_id=${user.id}`)
        if (!res.ok) return
        const data = await res.json()
        if (data?.vessel) { setEditingAsset(data.vessel); setDetailIdx(null); setShowForm(true) }
      }}
    />
  )

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
      <OPSShell>
        <AssetForm
          asset={editingAsset ?? undefined}
          contactId={profile?.contact_id ?? null}
          authUserId={user.id}
          refreshTrigger={realtimeVersion}
          onSaved={(raw) => {
            const v = assetRowToVessel(raw)
            onVesselSaved(v, raw.id as string)
            setShowForm(false)
            setEditingAsset(null)
          }}
          onCancel={() => { setShowForm(false); setEditingAsset(null) }}
        />
      </OPSShell>
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
                    {(() => {
                      const b = berths.find(b => b.assetId === vesselIds[idx] || b.assetId === v.id)
                      if (!b) return null
                      return (
                        <div style={{ marginTop:6 }}>
                          <div style={{ fontSize:15, fontWeight:800, color:'#4dd6c8', letterSpacing:-0.2 }}>{b.marinaName}</div>
                          <div style={{ fontSize:13, fontWeight:700, color:'#4ade80', marginTop:2 }}>
                            {b.slipNumber ? `Slip ${b.slipNumber}` : b.leaseType ?? 'Active Berth'}
                          </div>
                          {(v.shore_power || v.fuel_type) && (
                            <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>
                              {[v.shore_power && `⚡ ${v.shore_power}`, v.fuel_type && `⛽ ${v.fuel_type}`].filter(Boolean).join('  ')}
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => setDetailIdx(idx)}
                    style={{ background:C.tealDim, border:`1px solid ${C.tealBorder}`, borderRadius:10, padding:'6px 12px', color:C.teal, fontFamily:FONT, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                    View
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

// ─── Vessel Detail Screen ───────────────────────────────────────────────────────
function VesselDetailScreen({ vessel, vesselId, onBack, onEdit }: {
  vessel: Vessel; vesselId: string; onBack: () => void; onEdit: () => void
}) {
  // ── Ship's Log ──────────────────────────────────────────────────────────────
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const [logLoading, setLogLoading] = useState(true)
  const [showLogForm, setShowLogForm] = useState(false)
  const [logForm, setLogForm] = useState({ ...BLANK_FORM })
  const [logSaving, setLogSaving] = useState(false)
  const [logErr, setLogErr] = useState('')

  // ── Engines module ───────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [engines, setEngines] = useState<any[]>([])
  const [enginesLoading, setEnginesLoading] = useState(true)

  // ── Service History module ───────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [serviceRecords, setServiceRecords] = useState<any[]>([])
  const [serviceLoading, setServiceLoading] = useState(true)

  // ── Notes module ────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [noteItems, setNoteItems] = useState<any[]>([])
  const [notesLoading, setNotesLoading] = useState(true)

  // Load all modules via Railway proxies — Rule 2 compliant
  useEffect(() => {
    fetch(`/api/asset-ship-log?vessel_id=${vesselId}`)
      .then(r => r.json()).then(d => setLogEntries(Array.isArray(d) ? d : (d.logs ?? [])))
      .catch(() => setLogEntries([])).finally(() => setLogLoading(false))

    fetch(`/api/asset-engines?vessel_id=${vesselId}`)
      .then(r => r.json()).then(d => setEngines(d.engines ?? []))
      .catch(() => setEngines([])).finally(() => setEnginesLoading(false))

    fetch(`/api/asset-service-history?vessel_id=${vesselId}`)
      .then(r => r.json()).then(d => setServiceRecords(d.records ?? []))
      .catch(() => setServiceRecords([])).finally(() => setServiceLoading(false))

    fetch(`/api/asset-notes-log?vessel_id=${vesselId}`)
      .then(r => r.json()).then(d => setNoteItems(d.notes ?? []))
      .catch(() => setNoteItems([])).finally(() => setNotesLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vesselId])

  async function saveLogEntry() {
    setLogSaving(true); setLogErr('')
    try {
      const payload = {
        vessel_id: vesselId,
        log_date: logForm.log_date || new Date().toISOString().slice(0, 10),
        notes: logForm.notes || null,
        departed_from: logForm.departed_from || null,
        arrived_at: logForm.arrived_at || null,
        distance_nm: logForm.distance_nm ? parseFloat(logForm.distance_nm) : null,
        engine_hours_start: logForm.engine_hours_start ? parseFloat(logForm.engine_hours_start) : null,
        engine_hours_end: logForm.engine_hours_end ? parseFloat(logForm.engine_hours_end) : null,
        fuel_used_gallons: logForm.fuel_used_gallons ? parseFloat(logForm.fuel_used_gallons) : null,
        crew_count: logForm.crew_count ? parseInt(logForm.crew_count) : null,
        weather: logForm.weather || null,
        source: 'manual',
      }
      const res = await fetch('/api/asset-ship-log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) { setLogErr('Save failed'); return }
      const newEntry = await res.json()
      setLogEntries(prev => [newEntry.log ?? newEntry, ...prev])
      setLogForm({ ...BLANK_FORM })
      setShowLogForm(false)
    } catch { setLogErr('Save failed') } finally { setLogSaving(false) }
  }

  // ── Collapsible bordered section card ────────────────────────────────────────
  function DetailCard({ title, count, children, defaultOpen = true, action }: {
    title: string; count?: number; children: React.ReactNode; defaultOpen?: boolean; action?: React.ReactNode
  }) {
    const [open, setOpen] = useState(defaultOpen)
    return (
      <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, marginBottom: 10, overflow: 'hidden' }}>
        <button onClick={() => setOpen(o => !o)}
          style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: 'none', cursor: 'pointer', fontFamily: FONT }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.teal, textTransform: 'uppercase' as const, letterSpacing: 1.5 }}>{title}</span>
            {count != null && <span style={{ fontSize: 10, fontWeight: 700, color: C.teal, background: C.tealDim, border: `1px solid ${C.tealBorder}`, borderRadius: 20, padding: '1px 8px' }}>{count}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {action}
            <span style={{ color: C.muted2, fontSize: 18, fontWeight: 300, display: 'inline-block', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
          </div>
        </button>
        {open && <div style={{ padding: '4px 16px 16px' }}>{children}</div>}
      </div>
    )
  }

  // ── Field grid — filters nulls, converts booleans ─────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function VesselFields({ fields }: { fields: [string, any][] }) {
    const processed = fields.map(([label, val]): [string, string | null] => {
      if (val === true || val === 'true') return [label, 'Yes']
      if (val === false || val === 'false' || val == null || val === '') return [label, null]
      return [label, String(val)]
    }).filter(([, v]) => v !== null) as [string, string][]
    if (processed.length === 0) return null
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
        {processed.map(([label, val]) => (
          <div key={label} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: 0.9, marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.white, wordBreak: 'break-word' as const }}>{val}</div>
          </div>
        ))}
      </div>
    )
  }

  const iStyle = { width: '100%', padding: '10px 12px', background: C.inputBg, border: `1px solid ${C.inputBorder}`, borderRadius: 8, color: C.white, fontSize: 13, fontFamily: FONT, outline: 'none' } as React.CSSProperties

  return (
    <div style={{ padding: '0 0 100px', animation: 'fadeUp 0.3s ease both' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid rgba(255,255,255,0.07)`, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '7px 14px', color: C.white, fontFamily: FONT, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>← Back</button>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.white }}>{vessel.name}</div>
            <div style={{ fontSize: 12, color: C.muted }}>{[vessel.make, vessel.model, vessel.year ? String(vessel.year) : null].filter(Boolean).join(' ')}</div>
          </div>
        </div>
        <button onClick={onEdit} style={{ background: C.tealDim, border: `1px solid ${C.tealBorder}`, borderRadius: 10, padding: '8px 16px', color: C.teal, fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Edit</button>
      </div>

      <div style={{ padding: '0 12px' }}>

        {/* Vessel hero */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, background: 'linear-gradient(135deg,rgba(77,214,200,0.14) 0%,rgba(13,43,75,0.5) 100%)', border: `1px solid ${C.tealBorder}`, borderRadius: 16, padding: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: C.tealDim, border: `1px solid ${C.tealBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{vesselIcon(vessel.vessel_type)}</div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 800, color: C.white }}>{vessel.name}</div>
            <div style={{ fontSize: 13, color: C.muted }}>{vessel.vessel_type}{vessel.year ? ` · ${vessel.year}` : ''}</div>
            {vessel.status && <div style={{ fontSize: 11, color: '#4ade80', fontWeight: 700, marginTop: 3 }}>{vessel.status.toUpperCase()}</div>}
          </div>
        </div>

        {/* Dimensions */}
        <DetailCard title="Dimensions">
          <VesselFields fields={[
            ['Length (LOA)', vessel.length_ft ? `${vessel.length_ft} ft` : null],
            ['Beam', vessel.beam_ft ? `${vessel.beam_ft} ft` : null],
            ['Draft', vessel.draft_ft ? `${vessel.draft_ft} ft` : null],
            ['Air Draft', vessel.air_draft_ft ? `${vessel.air_draft_ft} ft` : null],
            ['Weight', vessel.weight_lbs ? `${vessel.weight_lbs.toLocaleString()} lbs` : null],
            ['Hull Material', vessel.hull_material],
            ['Keel Type', vessel.keel_type],
            ['Bottom Paint', vessel.bottom_paint_type],
            ['Color', vessel.color],
          ]} />
        </DetailCard>

        {/* Shore Power — only if set */}
        {vessel.shore_power && (
          <DetailCard title="Shore Power">
            <VesselFields fields={[['Shore Power', vessel.shore_power]]} />
          </DetailCard>
        )}

        {/* Registration */}
        <DetailCard title="Registration & ID">
          <VesselFields fields={[
            ['HIN', vessel.hin],
            ['Registration #', vessel.registration_number],
            ['Reg. State', vessel.registration_state],
            ['Reg. Expiry', vessel.registration_expiry ? fmtDate(vessel.registration_expiry) : null],
            ['Documentation #', vessel.documentation_number],
            ['MMSI', vessel.mmsi_number],
            ['Flag State', vessel.flag_state],
          ]} />
        </DetailCard>

        {/* Insurance */}
        <DetailCard title="Insurance">
          <VesselFields fields={[
            ['Provider', vessel.insurance_provider],
            ['Policy #', vessel.insurance_policy],
            ['Expiry', vessel.insurance_expiry ? fmtDate(vessel.insurance_expiry) : null],
            ['Coverage', vessel.insurance_coverage_amount ? `$${vessel.insurance_coverage_amount.toLocaleString()}` : null],
            ['Agent', vessel.insurance_agent_name],
            ['Agent Phone', vessel.insurance_agent_phone],
          ]} />
        </DetailCard>

        {/* Safety Equipment */}
        <DetailCard title="Safety Equipment">
          <VesselFields fields={[
            ['Life Raft', vessel.life_raft ? 'Yes' : null],
            ['Life Jackets', vessel.life_jacket_count ? String(vessel.life_jacket_count) : null],
            ['EPIRB Serial', vessel.epirb_serial],
            ['EPIRB Expiry', vessel.epirb_expiry ? fmtDate(vessel.epirb_expiry) : null],
            ['Flare Kit Expiry', vessel.flare_kit_expiry ? fmtDate(vessel.flare_kit_expiry) : null],
            ['Fire Ext. Expiry', vessel.fire_extinguisher_expiry ? fmtDate(vessel.fire_extinguisher_expiry) : null],
            ['Oil Placard', vessel.oil_placard ? 'Yes' : null],
            ['Discharge Placard', vessel.discharge_placard ? 'Yes' : null],
          ]} />
        </DetailCard>

        {/* Security */}
        <DetailCard title="Security">
          <VesselFields fields={[
            ['Alarm', vessel.alarm ? 'Yes' : null],
            ['GPS Tracker', vessel.gps_tracker ? 'Yes' : null],
            ['Lock Type', vessel.lock_type],
            ['Lock Location', vessel.lock_location],
            ['Authorized Operators', vessel.authorized_operators],
          ]} />
        </DetailCard>

        {/* Vessel notes flat field */}
        {vessel.notes && (
          <DetailCard title="Vessel Notes">
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginTop: 8 }}>{vessel.notes}</div>
          </DetailCard>
        )}

        {/* ── ENGINES MODULE ─────────────────────────────────────────────────────── */}
        <DetailCard title="Engines" count={engines.length} defaultOpen={engines.length > 0}>
          {enginesLoading
            ? <div style={{ fontSize: 13, color: C.muted, padding: '8px 0' }}>Loading…</div>
            : engines.length === 0
              ? <div style={{ fontSize: 13, color: C.muted, padding: '8px 0' }}>No engines on record — add them in Edit mode.</div>
              : engines.map((e, i) => (
                <div key={e.id || i} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 14, marginTop: i === 0 ? 8 : 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.white, marginBottom: 8 }}>
                    Engine {i + 1}{e.position ? ` · ${e.position}` : ''}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {[
                      ['Type', e.engine_type],
                      ['Make', e.make],
                      ['Model', e.model],
                      ['Year', e.year ? String(e.year) : null],
                      ['Horsepower', e.horsepower ? `${e.horsepower} hp` : null],
                      ['Fuel', e.fuel_type],
                      ['Serial #', e.serial_number],
                      ['Hours', e.current_hours != null ? `${e.current_hours} hrs` : null],
                    ].filter(([, v]) => v).map(([label, val]) => (
                      <div key={String(label)} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '8px 10px' }}>
                        <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: 0.9, marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.white }}>{val}</div>
                      </div>
                    ))}
                  </div>
                  {e.notes && <div style={{ fontSize: 12, color: C.muted, marginTop: 8, lineHeight: 1.6 }}>{e.notes}</div>}
                </div>
              ))
          }
        </DetailCard>

        {/* ── SERVICE HISTORY MODULE ──────────────────────────────────────────────── */}
        <DetailCard title="Service History" count={serviceRecords.length} defaultOpen={false}>
          {serviceLoading
            ? <div style={{ fontSize: 13, color: C.muted, padding: '8px 0' }}>Loading…</div>
            : serviceRecords.length === 0
              ? <div style={{ fontSize: 13, color: C.muted, padding: '8px 0' }}>No service records — add them in Edit mode.</div>
              : serviceRecords.map((r, i) => (
                <div key={r.id || i} style={{ borderBottom: i < serviceRecords.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', padding: '12px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.white }}>{r.service_type || 'Service'}</div>
                    <div style={{ fontSize: 11, color: C.muted2 }}>{r.service_date ? fmtDate(r.service_date) : ''}</div>
                  </div>
                  {r.component && <div style={{ fontSize: 12, color: C.teal, fontWeight: 600, marginBottom: 4 }}>{r.component}</div>}
                  {r.description && <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 4 }}>{r.description}</div>}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {r.performed_by && <span style={{ fontSize: 11, color: C.muted2 }}>By: {r.performed_by}</span>}
                    {r.cost != null && <span style={{ fontSize: 11, color: C.muted2 }}>Cost: ${r.cost}</span>}
                    {r.next_service_due && <span style={{ fontSize: 11, color: '#fbbf24' }}>Next: {fmtDate(r.next_service_due)}</span>}
                  </div>
                </div>
              ))
          }
        </DetailCard>

        {/* ── NOTES MODULE ────────────────────────────────────────────────────────── */}
        <DetailCard title="Notes" count={noteItems.length} defaultOpen={false}>
          {notesLoading
            ? <div style={{ fontSize: 13, color: C.muted, padding: '8px 0' }}>Loading…</div>
            : noteItems.length === 0
              ? <div style={{ fontSize: 13, color: C.muted, padding: '8px 0' }}>No notes — add them in Edit mode.</div>
              : noteItems.map((n, i) => (
                <div key={n.id || i} style={{ borderBottom: i < noteItems.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', padding: '12px 0' }}>
                  <div style={{ fontSize: 11, color: C.muted2, marginBottom: 4 }}>{n.note_date ? fmtDate(n.note_date) : ''}</div>
                  <div style={{ fontSize: 13, color: C.white, lineHeight: 1.65 }}>{n.note}</div>
                </div>
              ))
          }
        </DetailCard>

        {/* ── SHIP'S LOG MODULE ───────────────────────────────────────────────────── */}
        <DetailCard title="Ship's Log" count={logEntries.length} defaultOpen={true}
          action={
            <button onClick={e => { e.stopPropagation(); setShowLogForm(s => !s); setLogErr('') }}
              style={{ background: showLogForm ? 'rgba(255,255,255,0.08)' : C.teal, color: showLogForm ? C.white : '#0d2b4b', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: FONT }}>
              {showLogForm ? 'Cancel' : '+ Entry'}
            </button>
          }>

          {showLogForm && (
            <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: 14, marginBottom: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input type="date" value={logForm.log_date} onChange={e => setLogForm(f => ({ ...f, log_date: e.target.value }))} style={iStyle} />
                <textarea value={logForm.notes} onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))} placeholder="Trip notes…" rows={3} style={{ ...iStyle, resize: 'none' as const }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input placeholder="Departed from" value={logForm.departed_from} onChange={e => setLogForm(f => ({ ...f, departed_from: e.target.value }))} style={iStyle} />
                  <input placeholder="Arrived at" value={logForm.arrived_at} onChange={e => setLogForm(f => ({ ...f, arrived_at: e.target.value }))} style={iStyle} />
                  <input placeholder="Distance (nm)" type="number" value={logForm.distance_nm} onChange={e => setLogForm(f => ({ ...f, distance_nm: e.target.value }))} style={iStyle} />
                  <input placeholder="Weather" value={logForm.weather} onChange={e => setLogForm(f => ({ ...f, weather: e.target.value }))} style={iStyle} />
                </div>
                {logErr && <div style={{ fontSize: 12, color: C.danger }}>{logErr}</div>}
                <button onClick={saveLogEntry} disabled={logSaving}
                  style={{ background: C.teal, color: '#0d2b4b', border: 'none', borderRadius: 8, padding: '12px', fontSize: 13, fontWeight: 900, cursor: logSaving ? 'not-allowed' : 'pointer', fontFamily: FONT, opacity: logSaving ? 0.7 : 1 }}>
                  {logSaving ? 'Saving…' : 'Save Entry'}
                </button>
              </div>
            </div>
          )}

          {logLoading && <div style={{ fontSize: 13, color: C.muted, padding: '8px 0' }}>Loading…</div>}
          {!logLoading && logEntries.length === 0 && !showLogForm && (
            <div style={{ fontSize: 13, color: C.muted, padding: '8px 0' }}>No log entries yet.</div>
          )}
          {logEntries.slice(0, 20).map((e, i) => (
            <div key={e.id} style={{ borderBottom: i < Math.min(logEntries.length, 20) - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', padding: '12px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.white }}>{fmtDate(e.log_date)}</div>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.teal, background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '2px 8px' }}>
                  {e.source === 'skipper' ? '🤖 Skipper' : e.source === 'helm_event' ? '⚓ Marina' : 'You'}
                </span>
              </div>
              {e.notes && <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 4 }}>{e.notes}</div>}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(e.departed_from || e.arrived_at) && <span style={{ fontSize: 11, color: C.muted2 }}>{[e.departed_from, e.arrived_at].filter(Boolean).join(' → ')}</span>}
                {e.distance_nm != null && <span style={{ fontSize: 11, color: C.muted2 }}>📍 {e.distance_nm} nm</span>}
                {e.fuel_used_gallons != null && <span style={{ fontSize: 11, color: C.muted2 }}>⛽ {e.fuel_used_gallons} gal</span>}
                {e.weather && <span style={{ fontSize: 11, color: C.muted2 }}>🌤 {e.weather}</span>}
              </div>
            </div>
          ))}
          {logEntries.length > 20 && (
            <div style={{ fontSize: 12, color: C.muted, textAlign: 'center', padding: '8px 0' }}>
              Showing 20 of {logEntries.length} — see Ship's Log tab for full history
            </div>
          )}
        </DetailCard>

      </div>
    </div>
  )
}

// ─── TAB 2: Marinas ────────────────────────────────────────────────────────────
type TransientReq = {
  id: string; marina_id: string; status: string
  arrival_date: string; departure_date: string | null
  vessel_name: string | null; contact_name: string; created_at: string
  invoice_id?: string | null
}

function TabMarinas({ user, profile, vessel, vessels, spaceProfile, leaseProfile, marinaProfile }: { user: User; profile: Profile|null; vessel: Vessel|null; vessels: Vessel[]; spaceProfile: SpaceProfile|null; leaseProfile: LeaseProfile|null; marinaProfile: MarinaProfile|null }) {
  const [myBerthMap, setMyBerthMap] = useState<Record<string, string | null>>({}) // marina_id → slip label
  const [payingReqInvoice, setPayingReqInvoice] = useState<string|null>(null)
  const [reqPayError,      setReqPayError]      = useState<string|null>(null)

  async function handlePayTransientInvoice(invoiceId: string) {
    setPayingReqInvoice(invoiceId); setReqPayError(null)
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth_user_id: user.id }),
      })
      const data = await res.json()
      if (!res.ok || !data.checkout_url) {
        setReqPayError(data.error || 'Could not create payment session')
        return
      }
      window.open(data.checkout_url, '_blank')
    } catch {
      setReqPayError('Something went wrong — try again')
    } finally {
      setPayingReqInvoice(null)
    }
  }

  useEffect(() => {
    async function loadMyBerths() {
      try {
        const res = await fetch(`/api/berths?auth_user_id=${user.id}`)
        if (!res.ok) return
        const data = await res.json()
        const berthMap: Record<string, string | null> = {}
        for (const b of (data.berths ?? [])) {
          if (b.marinaId) berthMap[b.marinaId] = b.slipNumber ?? null
        }
        setMyBerthMap(berthMap)
      } catch { /* ignore */ }
    }
    loadMyBerths()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id])
  const [marinas,         setMarinas]         = useState<Marina[]>([])
  const [loading,         setLoading]         = useState(true)
  const [search,          setSearch]          = useState('')
  const [selected,        setSelected]        = useState<Marina|null>(null)
  const [coupledIds,      setCoupledIds]      = useState<Set<string>>(new Set())
  const [discTab, setDiscTab] = useState<'marinas'|'bookings'|'past'|'trips'>('marinas')
  const [coupling,        setCoupling]        = useState<string|null>(null)
  const [toast,           setToast]           = useState<string|null>(null)
  const [recentThreads,   setRecentThreads]   = useState<MsgRow[]>([])
  const [marinaMap,       setMarinaMap]       = useState<Record<string, Marina>>({})
  const [transientMarina, setTransientMarina] = useState<Marina|null>(null)
  const [viewMode,        setViewMode]        = useState<'list'|'map'>('list')
  const [myRequests,      setMyRequests]      = useState<TransientReq[]>([])
  const [profileMarina,   setProfileMarina]   = useState<Marina|null>(null)
  const [filterTransientOnly, setFilterTransientOnly] = useState(false)
  const [showFilters,     setShowFilters]     = useState(false)

  useEffect(() => {
    async function load() {
      const [marinasRes, threadsRes, reqRes] = await Promise.all([
        fetch(`/api/marinas?auth_user_id=${user.id}`, { cache: 'no-store' }),
        fetch(`/api/recent-threads?auth_user_id=${user.id}`),
        fetch(`/api/transient-requests?auth_user_id=${user.id}`),
      ])
      const marinasData = marinasRes.ok ? await marinasRes.json() : { marinas: [] }
      const rows: Marina[] = marinasData.marinas ?? []
      setMarinas(rows)
      const mMap: Record<string, Marina> = {}
      for (const m of rows) mMap[m.id] = m
      setMarinaMap(mMap)
      setCoupledIds(new Set<string>(rows.filter((m: Marina & {connected?: boolean}) => m.connected).map((m) => m.id)))

      const threadsData = threadsRes.ok ? await threadsRes.json() : { threads: [] }
      const threads: MsgRow[] = (threadsData.threads ?? []).map((t: { id:string; body:string; direction:string; marina_id:string; created_at:string }) => ({
        id: t.id, body: t.body, direction: t.direction, marina_id: t.marina_id, inserted_at: t.created_at,
      }))
      if (threads.length > 0) setRecentThreads(threads)

      const reqData = reqRes.ok ? await reqRes.json() : { requests: [] }
      setMyRequests((reqData.requests ?? []) as TransientReq[])
      setLoading(false)
    }
    load()
  }, [user.id, user.email])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3200)
  }

  async function handleRecouple(marinaId: string, marinaName: string, e: React.MouseEvent) {
    e.stopPropagation()
    setCoupling(marinaId)
    try {
      const res = await fetch(`/api/marinas/${marinaId}/relink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth_user_id: user.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.linked) {
        setCoupledIds(prev => { const s = new Set<string>(prev); s.add(marinaId); return s })
        showToast(`✅ Reconnected to ${marinaName}`)
      } else {
        showToast(`No existing record at ${marinaName} — use "Request to Connect"`)
      }
    } catch {
      showToast(`Couldn't reconnect — try again`)
    }
    setCoupling(null)
  }

  async function handleRequestConnect(marinaId: string, marinaName: string, e: React.MouseEvent) {
    e.stopPropagation()
    setCoupling(marinaId)
    try {
      await fetch(`/api/marinas/${marinaId}/request-connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth_user_id: user.id }),
      })
      showToast(`Request sent to ${marinaName}`)
    } catch {
      showToast(`Couldn't send request — try again`)
    }
    setCoupling(null)
  }

  const filtered = marinas.filter(m => {
    const matchesSearch = !search.trim() ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.city.toLowerCase().includes(search.toLowerCase())
    const matchesTransient = !filterTransientOnly || m.transient_available
    return matchesSearch && matchesTransient
  })

  if (transientMarina) return (
    <TransientRequestForm
      marina={transientMarina} user={user} profile={profile} vessels={vessels}
      onBack={() => setTransientMarina(null)}
      onSuccess={() => { setTransientMarina(null); showToast('✅ Request sent! Marina will respond shortly.') }}
    />
  )

  if (selected) return (
    <MarinaChat
      marina={selected} user={user} profile={profile} vessel={vessel}
      coupled={coupledIds.has(selected.id)}
      onBack={() => setSelected(null)}
      onAddVessel={() => { setSelected(null) }}
      spaceProfile={spaceProfile}
      leaseProfile={leaseProfile}
      marinaProfile={marinaProfile}
    />
  )

  if (profileMarina) return (
    <MarinaProfileScreen
      marina={profileMarina}
      coupled={coupledIds.has(profileMarina.id)}
      berth={myBerthMap[profileMarina.id]}
      onBack={() => setProfileMarina(null)}
      onMessage={() => { setSelected(profileMarina); setProfileMarina(null) }}
      onRequestSlip={() => { setTransientMarina(profileMarina); setProfileMarina(null) }}
      onConnect={(e) => handleRequestConnect(profileMarina.id, profileMarina.name, e)}
      connecting={coupling === profileMarina.id}
    />
  )

  return (
    <div style={{ padding:'20px 20px 0', animation:'fadeUp 0.35s ease both' }}>
      {toast && (
        <div style={{ position:'fixed', top:24, left:'50%', transform:'translateX(-50%)', background:'rgba(10,30,50,0.96)', border:'1px solid rgba(77,214,200,0.3)', borderRadius:12, padding:'10px 18px', fontSize:13, color:'#ffffff', zIndex:999, whiteSpace:'nowrap', boxShadow:'0 4px 24px rgba(0,0,0,0.5)' }}>
          {toast}
        </div>
      )}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <SectionTitle>Discovery</SectionTitle>
        <div style={{ display:'flex', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, overflow:'hidden' }}>
          <button onClick={() => setViewMode('list')} style={{ padding:'6px 14px', fontSize:12, fontWeight:700, background: viewMode==='list' ? 'rgba(77,214,200,0.2)' : 'transparent', color: viewMode==='list' ? '#4dd6c8' : 'rgba(255,255,255,0.45)', border:'none', cursor:'pointer', fontFamily:'inherit' }}>≡ List</button>
          <button onClick={() => setViewMode('map')}  style={{ padding:'6px 14px', fontSize:12, fontWeight:700, background: viewMode==='map'  ? 'rgba(77,214,200,0.2)' : 'transparent', color: viewMode==='map'  ? '#4dd6c8' : 'rgba(255,255,255,0.45)', border:'none', cursor:'pointer', fontFamily:'inherit' }}>🗺 Map</button>
        </div>
      </div>
      {/* Discovery sub-tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:16, overflowX:'auto' }}>
        {([['marinas','Marinas'],['bookings','My Bookings'],['past','Past'],['trips','Trip Planner']] as [typeof discTab,string][]).map(([key,label]) => (
          <button key={key} onClick={() => setDiscTab(key)}
            style={{ padding:'7px 14px', fontSize:12, fontWeight:700, whiteSpace:'nowrap', borderRadius:999, cursor:'pointer', fontFamily:'inherit',
              background: discTab===key ? 'rgba(77,214,200,0.2)' : 'rgba(255,255,255,0.05)',
              color: discTab===key ? '#4dd6c8' : 'rgba(255,255,255,0.5)',
              border:`1px solid ${discTab===key ? 'rgba(77,214,200,0.4)' : 'rgba(255,255,255,0.1)'}` }}>
            {label}
          </button>
        ))}
      </div>
      {(discTab==='bookings' || discTab==='past') && (() => {
        const today = new Date().toISOString().slice(0,10)
        const isPast = (r:{departure_date?:string|null}) => !!r.departure_date && r.departure_date < today
        const rows = myRequests.filter(r => discTab==='past' ? isPast(r) : !isPast(r))
        if (rows.length === 0) return (
          <div style={{ textAlign:'center', color:'rgba(255,255,255,0.5)', padding:'40px 16px', fontSize:14 }}>
            {discTab==='past' ? 'No past bookings yet.' : 'No upcoming bookings. Open Marinas to find a spot and book.'}
          </div>
        )
        return rows.map((r, i) => {
          const marina = marinaMap[r.marina_id]
          const sc = (r.status==='confirmed'||r.status==='accepted') ? '#4ade80' : r.status==='declined' ? C.danger : '#f59e0b'
          const sl = r.status==='confirmed' ? '💳 Paid · Confirmed' : r.status==='accepted' ? '✅ Accepted' : r.status==='declined' ? '✗ Declined' : '⏳ Pending'
          const nights = r.nights || (r.departure_date && r.arrival_date ? Math.max(0, Math.round((new Date(r.departure_date).getTime()-new Date(r.arrival_date).getTime())/86400000)) : null)
          const total = r.quoted_nightly && nights ? (r.quoted_nightly * nights) : null
          return (
            <div key={r.id||i} style={{ background:C.card, border:`1px solid ${C.cardBorder}`, borderRadius:14, padding:'14px', marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <span style={{ fontSize:15, fontWeight:700, color:C.white }}>{marina?.name || 'Marina'}</span>
                <span style={{ fontSize:11, fontWeight:700, color:sc }}>{sl}</span>
              </div>
              {r.assigned_slip_label && <div style={{ fontSize:13, fontWeight:700, color:C.teal, marginBottom:2 }}>Slip {r.assigned_slip_label}</div>}
              <div style={{ fontSize:12, color:C.muted }}>{r.vessel_name || 'Vessel'} · {r.arrival_date}{r.departure_date ? ` → ${r.departure_date}` : ''}{nights ? ` · ${nights} night${nights>1?'s':''}` : ''}</div>
              {(r.quoted_nightly || total) && (
                <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>
                  {r.quoted_nightly ? `$${Number(r.quoted_nightly).toFixed(2)}/night` : ''}{total ? ` · Total $${Number(total).toFixed(2)}` : ''}
                </div>
              )}
            </div>
          )
        })
      })()}
      {discTab==='trips' && (
        <div style={{ textAlign:'center', color:'rgba(255,255,255,0.5)', padding:'40px 16px', fontSize:14 }}>
          Trip Planner is coming soon — plan a multi-stop cruise and book marinas along the way.
        </div>
      )}
      {discTab==='marinas' && (<>
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
      {/* My Slip Requests */}
      {myRequests.length > 0 && (
        <>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:1.5, marginBottom:10, marginTop: recentThreads.length > 0 ? 0 : 4 }}>My Slip Requests</div>
          {myRequests.map((req, i) => {
            const marina = marinaMap[req.marina_id]
            const statusColor = req.status === 'accepted' ? '#4ade80' : req.status === 'declined' ? C.danger : '#f59e0b'
            const statusLabel = req.status === 'accepted' ? '\u2705 Confirmed' : req.status === 'declined' ? '\u2717 Declined' : '\u23f3 Pending'
            const arrFmt = req.arrival_date ? new Date(req.arrival_date).toLocaleDateString('en-US', { month:'short', day:'numeric' }) : null
            const depFmt = req.departure_date ? new Date(req.departure_date).toLocaleDateString('en-US', { month:'short', day:'numeric' }) : null
            return (
              <div key={req.id}
                style={{ background: req.status === 'accepted' ? 'rgba(74,222,128,0.06)' : C.card, border:`1px solid ${req.status === 'accepted' ? 'rgba(74,222,128,0.25)' : req.status === 'declined' ? 'rgba(248,113,113,0.2)' : C.cardBorder}`, borderRadius:14, padding:'12px 14px', marginBottom:8, animation:`fadeUp 0.3s ease ${i*0.05}s both` }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:C.white }}>{marina?.name ?? 'Marina'}</div>
                  <span style={{ fontSize:11, fontWeight:700, color:statusColor, background:`${statusColor}18`, border:`1px solid ${statusColor}40`, borderRadius:20, padding:'2px 8px' }}>{statusLabel}</span>
                </div>
                <div style={{ fontSize:12, color:C.muted }}>
                  {[arrFmt && depFmt ? `${arrFmt} → ${depFmt}` : arrFmt, req.vessel_name].filter(Boolean).join(' · ')}
                </div>
                {req.status === 'accepted' && (
                  <div style={{ fontSize:11, color:'#4ade80', marginTop:4, fontWeight:600 }}>Marina confirmed — check your email for details</div>
                )}
                {req.status === 'accepted' && req.invoice_id && (
                  <button onClick={() => handlePayTransientInvoice(req.invoice_id!)} disabled={payingReqInvoice === req.invoice_id}
                    style={{ marginTop:10, width:'100%', padding:'9px 0', fontSize:12.5, fontWeight:700, color:'#0d2b4b', background: payingReqInvoice === req.invoice_id ? 'rgba(77,214,200,0.5)' : '#4dd6c8', border:'none', borderRadius:10, cursor: payingReqInvoice === req.invoice_id ? 'default' : 'pointer', fontFamily:'inherit' }}>
                    {payingReqInvoice === req.invoice_id ? 'Opening checkout…' : '💳 Pay for This Stay'}
                  </button>
                )}
                {req.status === 'accepted' && reqPayError && payingReqInvoice === null && (
                  <div style={{ fontSize:11, color:C.danger, marginTop:6 }}>{reqPayError}</div>
                )}
                {req.status === 'pending' && (
                  <div style={{ fontSize:11, color:'#f59e0b', marginTop:4 }}>Waiting for marina response</div>
                )}
              </div>
            )
          })}
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:1.5, marginBottom:10, marginTop:16, paddingTop:12, borderTop:'1px solid rgba(255,255,255,0.06)' }}>All Marinas</div>
        </>
      )}

      {!vessel && (
        <div style={{ marginBottom:14, background:'rgba(77,214,200,0.07)', border:'1px solid rgba(77,214,200,0.2)', borderRadius:12, padding:'10px 14px', display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:16 }}>⛵</span>
          <span style={{ fontSize:12, color:'#4dd6c8', lineHeight:1.5 }}>Add your vessel under <strong>My Vessel</strong> so Skipper can match you to available slips.</span>
        </div>
      )}
      <div style={{ marginBottom:10 }}>
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or city…" />
      </div>
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        <button onClick={() => setFilterTransientOnly(v => !v)}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:999, fontSize:12, fontWeight:700,
            background: filterTransientOnly ? 'rgba(77,214,200,0.18)' : 'rgba(255,255,255,0.06)',
            color: filterTransientOnly ? '#4dd6c8' : 'rgba(255,255,255,0.6)',
            border: `1px solid ${filterTransientOnly ? 'rgba(77,214,200,0.4)' : 'rgba(255,255,255,0.12)'}`, cursor:'pointer', fontFamily:'inherit' }}>
          🛥️ Transient Welcome {filterTransientOnly ? '✓' : ''}
        </button>
      </div>
      {/* Map view */}
      {viewMode === 'map' && (
        <div style={{ height:'calc(100vh - 240px)', borderRadius:16, overflow:'hidden', border:'1px solid rgba(255,255,255,0.1)' }}>
          {loading
            ? <div style={{ width:'100%', height:'100%', background:'#0d1f2d', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.4)', fontSize:13 }}>Loading marinas…</div>
            : <MarinaMap marinas={filtered} onSelect={m => setTransientMarina(m)} onViewProfile={m => setProfileMarina(m)} />
          }
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && loading && <div style={{ textAlign:'center', color:'rgba(255,255,255,0.55)', padding:'32px 0' }}>Loading…</div>}
      {viewMode === 'list' && !loading && filtered.length === 0 && (
        <div style={{ textAlign:'center', color:'rgba(255,255,255,0.55)', padding:'32px 0', fontSize:14 }}>No marinas found</div>
      )}
      {viewMode === 'list' && filtered.map((m, i) => {
        const coupled = coupledIds.has(m.id)
        const acting  = coupling === m.id
        return (
          <div key={m.id}
            style={{ background:'rgba(255,255,255,0.07)', border:`1px solid ${coupled ? 'rgba(77,214,200,0.3)' : 'rgba(255,255,255,0.11)'}`, borderRadius:18, marginBottom:10, overflow:'hidden', animation:`fadeUp 0.3s ease ${i*0.04}s both` }}>
            {/* Main row — tap to open marina profile page */}
            <button onClick={() => setProfileMarina(m)}
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
              <div style={{ fontSize:12, color:'#4dd6c8', fontWeight:700, flexShrink:0 }}>View →</div>
            </button>
            {/* Action row */}
            <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'8px 16px 10px', display:'flex', gap:8 }}>
              {myBerthMap[m.id] !== undefined ? (
                <div style={{ flex:1, padding:'7px 12px', fontSize:12, fontWeight:700, color:'#4ade80', background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.3)', borderRadius:9, display:'flex', alignItems:'center', gap:6 }}>
                  ⚓ {myBerthMap[m.id] ? `Slip ${myBerthMap[m.id]}` : 'Active Berth'}
                </div>
              ) : (
                <button
                  onClick={e => { e.stopPropagation(); setTransientMarina(m) }}
                  style={{ flex:1, padding:'7px 0', fontSize:12, fontWeight:700, color:'#ffffff', background:'linear-gradient(135deg,rgba(77,214,200,0.25),rgba(77,214,200,0.15))', border:'1px solid rgba(77,214,200,0.4)', borderRadius:9, cursor:'pointer', fontFamily:'inherit' }}>
                  🛥️ Request a Slip
                </button>
              )}
              {/* Coupling actions — only when NOT connected */}
              {!coupled && (
                <>
                  <button
                    onClick={e => { e.stopPropagation(); setSelected(m) }}
                    style={{ flex:1, padding:'7px 0', fontSize:12, fontWeight:700, color:'#4dd6c8', background:'rgba(77,214,200,0.1)', border:'1px solid rgba(77,214,200,0.25)', borderRadius:9, cursor:'pointer', fontFamily:'inherit' }}>
                    💬 Contact this marina
                  </button>
                  <button
                    onClick={e => handleRequestConnect(m.id, m.name, e)}
                    disabled={acting}
                    style={{ flex:1, padding:'7px 0', fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.55)', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:9, cursor:'pointer', fontFamily:'inherit', opacity: acting ? 0.5 : 1 }}>
                    {acting ? '…' : 'Connect'}
                  </button>
                </>
              )}
            </div>
          </div>
        )
      })}
      </>)}
    </div>
  )
}
// ─── Marina Profile Screen — Dockwa/marinas.com-style storefront page ─────────
const AMENITY_LABELS: Record<string, string> = {
  dockage: 'Dockage', water_hookup: 'Water Hookup', transient_storage: 'Transient Storage',
  long_term_storage: 'Long-Term Storage', service_maintenance: 'Service & Maintenance',
  wifi: 'WiFi', restrooms: 'Restrooms', showers: 'Showers', laundry: 'Laundry',
  trash: 'Trash Disposal', ice: 'Ice', security: 'Security', swimming_pool: 'Swimming Pool',
  alcohol: 'Alcohol Sold', hotels: 'Nearby Hotels', restaurants: 'Nearby Restaurants',
  fixed_docks: 'Fixed Docks', floating_docks: 'Floating Docks', repair_crane: 'Repair Crane',
  engine_service: 'Engine Service', propeller_service: 'Propeller Service', land_storage: 'Land Storage',
  travel_lift: 'Travel Lift', pet_friendly: 'Pet Friendly', fuel_dock: 'Fuel Dock', pump_out: 'Pump-Out',
  groceries: 'Groceries Nearby', medical: 'Medical Nearby', pharmacy: 'Pharmacy Nearby',
  beach: 'Beach Nearby', dog_park: 'Dog Park Nearby', golf: 'Golf Nearby',
  atm: 'ATM', water_taxi: 'Water Taxi', dinghy_dock: 'Dinghy Dock', dry_stack: 'Dry Stack',
  ship_store: 'Ship Store', restaurant_on_property: 'Restaurant On-Site',
}
const AMENITY_ICONS: Record<string, string> = {
  dockage:'⚓', water_hookup:'💧', transient_storage:'📦', long_term_storage:'🏬', service_maintenance:'🔧',
  wifi:'📶', restrooms:'🚻', showers:'🚿', laundry:'🧺', trash:'🗑️', ice:'🧊', security:'🔒',
  swimming_pool:'🏊', alcohol:'🍷', hotels:'🏨', restaurants:'🍽️', fixed_docks:'🛠️', floating_docks:'🌊',
  repair_crane:'🏗️', engine_service:'⚙️', propeller_service:'🔩', land_storage:'🅿️', travel_lift:'🚧',
  pet_friendly:'🐾', fuel_dock:'⛽', pump_out:'🚰', groceries:'🛒', medical:'⚕️', pharmacy:'💊',
  beach:'🏖️', dog_park:'🐕', golf:'⛳',
  atm:'🏦', water_taxi:'🚤', dinghy_dock:'🛶', dry_stack:'🏗️',
  ship_store:'🏪', restaurant_on_property:'🍽️',
}
// Grouped categories — matches the marketing site's marina detail page layout exactly
const AMENITY_GROUPS: [string,string[]][] = [
  ['Docking & Fuel', ['fuel_dock','dockage','water_hookup','dry_stack','land_storage']],
  ['On-Site', ['ship_store','restaurant_on_property','swimming_pool','wifi','security']],
  ['Facilities', ['restrooms','showers','laundry','trash','ice','atm','pump_out']],
  ['Service & Repair', ['engine_service','propeller_service','service_maintenance','repair_crane','travel_lift']],
  ['Getting Around', ['water_taxi','dinghy_dock','pet_friendly','dog_park']],
  ['Nearby', ['groceries','alcohol','medical','hotels','restaurants','pharmacy','beach','golf']],
]

function MarinaProfileScreen({ marina, coupled, berth, onBack, onMessage, onRequestSlip, onConnect, connecting }: {
  marina: Marina; coupled: boolean; berth?: string | null
  onBack: () => void; onMessage: () => void; onRequestSlip: () => void
  onConnect: (e: React.MouseEvent) => void; connecting: boolean
}) {
  const [data,    setData]    = useState<MarinaStorefront | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/marinas/${marina.id}/storefront`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setData(d) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [marina.id])

  const hero = data?.photos?.find(p => p.is_hero) ?? data?.photos?.[0] ?? null
  const activeAmenities = data?.amenities
    ? Object.entries(data.amenities).filter(([, v]) => v === true)
    : []
  const m = data?.marina

  return (
    <div style={{ animation:'fadeUp 0.3s ease both', paddingBottom:100 }}>
      {/* Hero image / header */}
      <div style={{
        height: 200, position:'relative',
        background: hero ? `url(${hero.url}) center/cover no-repeat` : 'linear-gradient(135deg,#0d2b4b,#123a5e)',
        display:'flex', flexDirection:'column', justifyContent:'space-between',
      }}>
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg, rgba(5,17,31,0.55) 0%, rgba(5,17,31,0.15) 30%, rgba(5,17,31,0.85) 100%)' }} />
        <div style={{ position:'relative', padding:'16px 16px 0' }}>
          <button onClick={onBack} style={{ background:'rgba(0,0,0,0.4)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:10, padding:'7px 12px', color:'#fff', fontFamily:'inherit', cursor:'pointer', fontSize:13, backdropFilter:'blur(4px)' }}>← Back</button>
        </div>
        <div style={{ position:'relative', padding:'0 20px 16px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
            <span style={{ fontSize:22, fontWeight:800, color:'#fff' }}>{marina.name}</span>
            {coupled && (
              <span style={{ fontSize:10, fontWeight:700, color:'#4ade80', background:'rgba(74,222,128,0.18)', border:'1px solid rgba(74,222,128,0.4)', borderRadius:6, padding:'2px 7px' }}>CONNECTED</span>
            )}
          </div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.75)' }}>
            {[m?.address, [m?.city, m?.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ') || `${marina.city}, ${marina.state}`}
          </div>
        </div>
      </div>

      <div style={{ padding:'18px 20px 0' }}>
        {/* Quick stat row */}
        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
          <StatPill icon="⚓" label={`${marina.total_slips ?? m?.total_slips ?? 0} Slips`} />
          {(m?.transient_available ?? marina.transient_available) && <StatPill icon="🛥️" label="Transient Welcome" highlight />}
          {m?.transient_daily_rate ? <StatPill icon="💵" label={`$${m.transient_daily_rate}/night`} /> : null}
          {m?.vhf_channel && <StatPill icon="📻" label={`VHF ${m.vhf_channel}`} />}
        </div>

        {/* Action buttons */}
        {berth !== undefined ? (
          <div style={{ marginBottom:20, padding:'11px 12px', fontSize:13, fontWeight:700, color:'#4ade80', background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.3)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            ⚓ {berth ? `Slip ${berth}` : 'Active Berth'}
          </div>
        ) : (
          <div style={{ marginBottom:20 }}>
            {/* Intent hub — what do you need from THIS marina (spec §2). Transient books
                instantly; the rest are marina-fulfilled requests routed via Message. */}
            <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:1.2, marginBottom:8 }}>What do you need?</div>
            <button onClick={onRequestSlip}
              style={{ width:'100%', padding:'12px 0', fontSize:13, fontWeight:700, color:'#fff', background:'linear-gradient(135deg,rgba(77,214,200,0.35),rgba(77,214,200,0.2))', border:'1px solid rgba(77,214,200,0.5)', borderRadius:12, cursor:'pointer', fontFamily:'inherit', marginBottom:8 }}>
              🛥️ Transient slip — book & pay now
            </button>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {[['☀️ Seasonal slip','seasonal'],['❄️ Winter storage','storage'],['🔧 Repair / haul-out','repair']].map(([label,intent]) => (
                <button key={intent} onClick={onMessage}
                  style={{ flex:'1 1 45%', padding:'10px 0', fontSize:12, fontWeight:700, color:'#4dd6c8', background:'rgba(77,214,200,0.1)', border:'1px solid rgba(77,214,200,0.3)', borderRadius:12, cursor:'pointer', fontFamily:'inherit' }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display:'flex', gap:8, marginTop:8 }}>
              <button onClick={onMessage}
                style={{ flex:1, padding:'11px 0', fontSize:13, fontWeight:700, color:'#4dd6c8', background:'rgba(77,214,200,0.1)', border:'1px solid rgba(77,214,200,0.3)', borderRadius:12, cursor:'pointer', fontFamily:'inherit' }}>
                💬 Message
              </button>
              {!coupled && (
                <button onClick={onConnect} disabled={connecting}
                  style={{ padding:'11px 16px', fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.6)', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.14)', borderRadius:12, cursor:'pointer', fontFamily:'inherit', opacity: connecting?0.5:1 }}>
                  {connecting ? '…' : 'Connect'}
                </button>
              )}
            </div>
          </div>
        )}

        {loading && <div style={{ textAlign:'center', color:'rgba(255,255,255,0.5)', padding:'24px 0', fontSize:13 }}>Loading marina details…</div>}

        {!loading && data && (
          <>
            {/* About */}
            {m?.description && (
              <ProfileSection title="About">
                <div style={{ fontSize:13.5, color:'rgba(255,255,255,0.75)', lineHeight:1.6 }}>{m.description}</div>
              </ProfileSection>
            )}

            {/* Dimensions & capacity */}
            {(m?.max_vessel_loa_ft || m?.max_slip_length_ft || m?.max_draft_ft) && (
              <ProfileSection title="Dockage Specs">
                <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
                  {m?.max_vessel_loa_ft && <SpecChip label="Max LOA" value={`${m.max_vessel_loa_ft} ft`} />}
                  {m?.max_slip_length_ft && <SpecChip label="Max Slip Length" value={`${m.max_slip_length_ft} ft`} />}
                  {m?.max_slip_width_ft && <SpecChip label="Max Slip Width" value={`${m.max_slip_width_ft} ft`} />}
                  {m?.max_draft_ft && <SpecChip label="Max Draft" value={`${m.max_draft_ft} ft`} />}
                </div>
              </ProfileSection>
            )}

            {/* Shore power */}
            {(m?.shore_power_30a || m?.shore_power_50a || m?.shore_power_100a) && (
              <ProfileSection title="Shore Power">
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {m?.shore_power_30a && <SpecChip label="30 Amp" value="✓" />}
                  {m?.shore_power_50a && <SpecChip label="50 Amp" value="✓" />}
                  {m?.shore_power_100a && <SpecChip label="100 Amp" value="✓" />}
                </div>
              </ProfileSection>
            )}

            {/* Amenities — grouped by category, matches marketing site's marina detail page */}
            {activeAmenities.length > 0 && (() => {
              const activeKeys = new Set(activeAmenities.map(([key]) => key))
              return (
                <ProfileSection title="Amenities & Services">
                  {AMENITY_GROUPS.map(([groupName, keys]) => {
                    const active = keys.filter(k => activeKeys.has(k))
                    if (active.length === 0) return null
                    return (
                      <div key={groupName} style={{ marginBottom:14 }}>
                        <div style={{ fontSize:10.5, fontWeight:700, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:0.6, marginBottom:8 }}>{groupName}</div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                          {active.map(key => (
                            <div key={key} style={{ display:'flex', alignItems:'center', gap:7, background:'rgba(77,214,200,0.08)', border:'1px solid rgba(77,214,200,0.2)', borderRadius:999, padding:'7px 12px' }}>
                              <span style={{ fontSize:14 }}>{AMENITY_ICONS[key] ?? '✓'}</span>
                              <span style={{ fontSize:12.5, color:'rgba(255,255,255,0.9)', fontWeight:600 }}>{AMENITY_LABELS[key] ?? key}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </ProfileSection>
              )
            })()}

            {/* Photo gallery */}
            {data.photos.length > 1 && (
              <ProfileSection title="Photos">
                <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4 }}>
                  {data.photos.map(p => (
                    <img key={p.id} src={p.url} alt={p.caption ?? marina.name}
                      style={{ width:120, height:90, objectFit:'cover', borderRadius:10, border:'1px solid rgba(255,255,255,0.1)', flexShrink:0 }} />
                  ))}
                </div>
              </ProfileSection>
            )}

            {/* Contact info */}
            <ProfileSection title="Contact">
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {m?.phone && <ContactRow icon="📞" label={m.phone} href={`tel:${m.phone}`} />}
                {m?.email && <ContactRow icon="✉️" label={m.email} href={`mailto:${m.email}`} />}
                {m?.website && <ContactRow icon="🌐" label={m.website.replace(/^https?:\/\//,'')} href={m.website} />}
              </div>
            </ProfileSection>
          </>
        )}

        {!loading && !data?.marina?.description && !activeAmenities.length && (
          <div style={{ textAlign:'center', color:'rgba(255,255,255,0.4)', fontSize:12.5, padding:'20px 10px', background:'rgba(255,255,255,0.04)', borderRadius:12, marginTop:10 }}>
            This marina hasn&apos;t finished setting up their profile yet. Message them directly with any questions.
          </div>
        )}
      </div>
    </div>
  )
}

function StatPill({ icon, label, highlight }: { icon:string; label:string; highlight?:boolean }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:999, fontSize:12, fontWeight:700,
      color: highlight ? '#4dd6c8' : 'rgba(255,255,255,0.75)',
      background: highlight ? 'rgba(77,214,200,0.12)' : 'rgba(255,255,255,0.06)',
      border: `1px solid ${highlight ? 'rgba(77,214,200,0.35)' : 'rgba(255,255,255,0.12)'}`,
    }}>
      <span>{icon}</span>{label}
    </div>
  )
}

function ProfileSection({ title, children }: { title:string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:1.2, marginBottom:10 }}>{title}</div>
      {children}
    </div>
  )
}

function SpecChip({ label, value }: { label:string; value:string }) {
  return (
    <div style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'8px 12px', minWidth:90 }}>
      <div style={{ fontSize:10, color:'rgba(255,255,255,0.45)', fontWeight:700, textTransform:'uppercase', letterSpacing:0.5 }}>{label}</div>
      <div style={{ fontSize:15, color:'#fff', fontWeight:700, marginTop:2 }}>{value}</div>
    </div>
  )
}

function ContactRow({ icon, label, href }: { icon:string; label:string; href:string }) {
  return (
    <a href={href} style={{ display:'flex', alignItems:'center', gap:10, color:'#4dd6c8', textDecoration:'none', fontSize:13.5, fontWeight:600 }}>
      <span style={{ fontSize:15 }}>{icon}</span>{label}
    </a>
  )
}

// ─── Transient Request Form ─────────────────────────────────────────────────
type HotSlip = {
  id: string; label: string|null; dock: string|null
  max_loa_ft: number|null; max_beam_ft: number|null; depth_ft: number|null; max_air_draft_ft: number|null
  power_amps: string|null; water: boolean|null; daily_rate: number|null
  electric: string[]|null; pump_out: boolean|null; wifi: boolean|null
  nights: number|null; estimated_cost: number|null; holder_first_name: string|null; notes: string|null
}

type HotMooring = {
  id: string; label: string|null; dock: string|null
  max_loa_ft: number|null; max_weight_lbs: number|null; depth_ft: number|null; max_air_draft_ft: number|null
  daily_rate: number|null; nights: number|null; estimated_cost: number|null; notes: string|null
}

function TransientRequestForm({ marina, user, profile, vessels, onBack, onSuccess }: {
  marina: Marina; user: User; profile: Profile|null; vessels: Vessel[]
  onBack: () => void; onSuccess: () => void
}) {
  // Multi-vessel rule: if the boater owns more than one boat, stop and ask which one
  // they're bringing before we check slip fit or send anything. One-boat owners auto-select.
  // The chosen vessel's full specs (LOA, beam, draft, air draft, weight) drive every fit
  // check and the request payload, so availability is always accurate to that exact boat.
  const [selectedVesselId, setSelectedVesselId] = useState<string|null>(vessels.length === 1 ? vessels[0].id : null)
  const vessel = vessels.find(v => v.id === selectedVesselId) ?? null
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const [arrival,    setArrival]    = useState(today)
  const [departure,  setDeparture]  = useState(tomorrow)
  const [shorePower, setShorePower] = useState(false)
  const [fuelType,   setFuelType]   = useState('')
  // Auto-fill shore power + fuel from the chosen vessel's saved specs (no re-asking what we
  // already know). Runs when the selected boat changes; the boater can still override.
  useEffect(() => {
    if (!vessel) return
    setShorePower(!!vessel.shore_power)
    setFuelType(vessel.fuel_type || '')
  }, [selectedVesselId])  // eslint-disable-line react-hooks/exhaustive-deps
  const [notes,      setNotes]      = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState<string|null>(null)

  // Instant-book: if a transient slip already fits this vessel's dimensions (hard-stop
  // checks run server-side — LOA, beam, draft, air draft) and is open for these dates,
  // skip the request-and-wait flow entirely and let the boater book + pay right now.
  const [hotSlips,      setHotSlips]      = useState<HotSlip[]>([])
  const [hotSlipsLoading, setHotSlipsLoading] = useState(false)
  const [booking,       setBooking]       = useState<string|null>(null)
  const [bookError,     setBookError]     = useState<string|null>(null)

  useEffect(() => {
    if (!vessel?.length_ft) { setHotSlips([]); return }
    setHotSlipsLoading(true)
    const qs = new URLSearchParams({
      check_in: arrival, check_out: departure,
      loa_ft: String(vessel.length_ft || ''),
      ...(vessel.beam_ft ? { beam_ft: String(vessel.beam_ft) } : {}),
      ...(vessel.draft_ft ? { draft_ft: String(vessel.draft_ft) } : {}),
      ...(vessel.air_draft_ft ? { air_draft_ft: String(vessel.air_draft_ft) } : {}),
    })
    fetch(`/api/marinas/${marina.id}/available-hot-slips?${qs}`)
      .then(r => r.json())
      .then(d => setHotSlips(d.slips ?? []))
      .catch(() => setHotSlips([]))
      .finally(() => setHotSlipsLoading(false))
  }, [marina.id, vessel?.length_ft, vessel?.beam_ft, vessel?.draft_ft, vessel?.air_draft_ft, arrival, departure])

  async function handleInstantBook(slipId: string) {
    if (!vessel) return
    setBooking(slipId); setBookError(null)
    try {
      const res = await fetch(`/api/marinas/${marina.id}/transient-slips/${slipId}/instant-book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth_user_id: user.id, check_in: arrival, check_out: departure, vessel_id: vessel.id }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setBookError(data.error || data.detail || 'Could not book this slip')
        return
      }
      if (data.checkout_url) {
        window.open(data.checkout_url, '_blank')
      }
      onSuccess()
    } catch {
      setBookError('Something went wrong — try again')
    } finally {
      setBooking(null)
    }
  }

  // Moorings — SEPARATE hard-stop set from slips: weight, LOA, air draft, and draft
  // ONLY (no beam check — a boat swings freely on a mooring ball, unlike a fixed-width slip).
  const [hotMoorings,        setHotMoorings]        = useState<HotMooring[]>([])
  const [hotMooringsLoading, setHotMooringsLoading] = useState(false)
  const [bookingMooring,     setBookingMooring]      = useState<string|null>(null)

  useEffect(() => {
    if (!vessel?.length_ft) { setHotMoorings([]); return }
    setHotMooringsLoading(true)
    const qs = new URLSearchParams({
      check_in: arrival, check_out: departure,
      loa_ft: String(vessel.length_ft || ''),
      ...(vessel.weight_lbs ? { weight_lbs: String(vessel.weight_lbs) } : {}),
      ...(vessel.draft_ft ? { draft_ft: String(vessel.draft_ft) } : {}),
      ...(vessel.air_draft_ft ? { air_draft_ft: String(vessel.air_draft_ft) } : {}),
    })
    fetch(`/api/marinas/${marina.id}/available-hot-moorings?${qs}`)
      .then(r => r.json())
      .then(d => setHotMoorings(d.moorings ?? []))
      .catch(() => setHotMoorings([]))
      .finally(() => setHotMooringsLoading(false))
  }, [marina.id, vessel?.length_ft, vessel?.weight_lbs, vessel?.draft_ft, vessel?.air_draft_ft, arrival, departure])

  async function handleInstantBookMooring(mooringId: string) {
    if (!vessel) return
    setBookingMooring(mooringId); setBookError(null)
    try {
      const res = await fetch(`/api/marinas/${marina.id}/transient-moorings/${mooringId}/instant-book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth_user_id: user.id, check_in: arrival, check_out: departure, vessel_id: vessel.id }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setBookError(data.error || data.detail || 'Could not book this mooring')
        return
      }
      if (data.checkout_url) {
        window.open(data.checkout_url, '_blank')
      }
      onSuccess()
    } catch {
      setBookError('Something went wrong — try again')
    } finally {
      setBookingMooring(null)
    }
  }

  const displayName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || user.email
    : user.email

  function calcNights() {
    try {
      const a = new Date(arrival), d = new Date(departure)
      const n = Math.round((d.getTime() - a.getTime()) / 86400000)
      return n > 0 ? n : 1
    } catch { return 1 }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (vessels.length > 0 && !vessel) { setError('Please choose which vessel you\'re bringing'); return }
    setSubmitting(true); setError(null)
    try {
      const res = await fetch('/api/transient-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marina_id:     marina.id,
          boater_id:     user.id,
          contact_name:  displayName,
          contact_email: user.email,
          vessel_name:   vessel?.name || null,
          vessel_type:   vessel?.vessel_type || null,
          loa_ft:        vessel?.length_ft || null,
          beam_ft:       vessel?.beam_ft || null,
          draft_ft:      vessel?.draft_ft || null,
          shore_power:   shorePower,
          fuel_type:     fuelType || null,
          arrival_date:  arrival,
          departure_date: departure,
          nights:        calcNights(),
          notes:         notes || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Submission failed')
      onSuccess()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const labelStyle: React.CSSProperties = { fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.6)', display:'block', marginBottom:5 }
  const inputStyle: React.CSSProperties = { width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.16)', borderRadius:10, padding:'10px 12px', color:'#fff', fontSize:14, fontFamily:'inherit' }
  const sectionStyle: React.CSSProperties = { marginBottom:16 }

  return (
    <div style={{ padding:'20px 20px 100px', animation:'fadeUp 0.3s ease both' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        <button onClick={onBack} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, padding:'7px 12px', color:C.white, fontFamily:'inherit', cursor:'pointer', fontSize:13 }}>← Back</button>
        <div>
          <div style={{ fontSize:16, fontWeight:700 }}>Request a Slip</div>
          <div style={{ fontSize:12, color:C.muted }}>{marina.name} · {marina.city}, {marina.state}</div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Which vessel? — only shown when the boater has more than one boat. Must pick
            before fit checks run (availability is gated on a selected vessel below). */}
        {vessels.length > 1 && (
          <div style={sectionStyle}>
            <label style={labelStyle}>Which vessel are you bringing?</label>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {vessels.map(v => (
                <button type="button" key={v.id} onClick={() => setSelectedVesselId(v.id)}
                  style={{ textAlign:'left', display:'flex', alignItems:'center', gap:10, padding:'11px 13px', borderRadius:12, cursor:'pointer', fontFamily:'inherit',
                    background: v.id === selectedVesselId ? 'rgba(77,214,200,0.12)' : 'rgba(255,255,255,0.05)',
                    border: `1.5px solid ${v.id === selectedVesselId ? C.teal : 'rgba(255,255,255,0.12)'}` }}>
                  <span style={{ fontSize:18 }}>{vesselIcon(v.vessel_type)}</span>
                  <span style={{ flex:1 }}>
                    <span style={{ display:'block', fontSize:13, fontWeight:700, color:C.white }}>{v.name || 'Unnamed Vessel'}</span>
                    <span style={{ display:'block', fontSize:11, color:C.muted }}>{[v.length_ft && `${v.length_ft}ft LOA`, v.beam_ft && `${v.beam_ft}ft beam`, v.draft_ft && `${v.draft_ft}ft draft`].filter(Boolean).join(' · ') || 'No specs on file'}</span>
                  </span>
                  {v.id === selectedVesselId && <span style={{ color:C.teal, fontSize:16 }}>✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Dates */}
        <div style={{ display:'flex', gap:10, marginBottom:16 }}>
          <div style={{ flex:1 }}>
            <label style={labelStyle}>Arrival Date</label>
            <input type="date" value={arrival} min={today} onChange={e => setArrival(e.target.value)} required
              style={inputStyle} />
          </div>
          <div style={{ flex:1 }}>
            <label style={labelStyle}>Departure Date</label>
            <input type="date" value={departure} min={arrival} onChange={e => setDeparture(e.target.value)}
              style={inputStyle} />
          </div>
        </div>
        <div style={{ marginBottom:16, fontSize:12, color:C.muted }}>
          {calcNights()} night{calcNights() !== 1 ? 's' : ''}
        </div>

        {/* Instant Book — slips that already fit this vessel's dimensions (hard-stop
            checked server-side) and are open for these dates can be booked + paid right now,
            no waiting on the marina to respond. */}
        {vessel?.length_ft && hotSlipsLoading && (
          <div style={{ marginBottom:16, fontSize:12, color:C.muted, textAlign:'center', padding:'10px 0' }}>Checking for instant-book slips…</div>
        )}
        {vessel?.length_ft && !hotSlipsLoading && hotSlips.length > 0 && (
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:12, fontWeight:800, color:'#4ade80', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
              ⚡ Book Instantly — Fits Your Boat
            </div>
            {hotSlips.map(slip => (
              <div key={slip.id} style={{ background:'rgba(74,222,128,0.06)', border:'1px solid rgba(74,222,128,0.25)', borderRadius:12, padding:'12px 14px', marginBottom:8 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:C.white }}>Slip {slip.label}{slip.dock ? ` · Dock ${slip.dock}` : ''}</div>
                  {slip.daily_rate != null && <div style={{ fontSize:13, fontWeight:800, color:'#4ade80' }}>${slip.daily_rate}/night</div>}
                </div>
                <div style={{ fontSize:11, color:C.muted2, marginBottom:4 }}>
                  {[
                    slip.max_loa_ft && `📏 up to ${slip.max_loa_ft}ft LOA`,
                    slip.max_beam_ft && `${slip.max_beam_ft}ft beam`,
                    slip.depth_ft && `${slip.depth_ft}ft depth`,
                    slip.max_air_draft_ft && `${slip.max_air_draft_ft}ft clearance`,
                  ].filter(Boolean).join(' · ')}
                </div>
                <div style={{ fontSize:12, color:C.muted, marginBottom:8 }}>
                  {[
                    (slip.electric && slip.electric.length > 0) ? `⚡ ${slip.electric.join('/')}` : (slip.power_amps || null),
                    slip.water ? '💧 Water' : null,
                    slip.pump_out ? '🚽 Pump-out' : null,
                    slip.wifi ? '📶 WiFi' : null,
                  ].filter(Boolean).join(' · ') || 'Amenities: contact marina'}
                </div>
                {slip.estimated_cost != null && (
                  <div style={{ fontSize:12, color:C.white, fontWeight:600, marginBottom:8 }}>Total: ${slip.estimated_cost.toFixed(2)} for {slip.nights} night{slip.nights !== 1 ? 's' : ''}</div>
                )}
                <button type="button" onClick={() => handleInstantBook(slip.id)} disabled={booking === slip.id}
                  style={{ width:'100%', padding:'10px 0', fontSize:13, fontWeight:800, color:'#0d2b4b', background: booking === slip.id ? 'rgba(74,222,128,0.5)' : '#4ade80', border:'none', borderRadius:10, cursor: booking === slip.id ? 'default' : 'pointer', fontFamily:'inherit' }}>
                  {booking === slip.id ? 'Booking…' : '💳 Book & Pay Now'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Instant Book — moorings. Separate hard-stop set: weight, LOA, air draft, draft
            only (no beam check — the boat swings freely on a mooring ball). */}
        {vessel?.length_ft && hotMooringsLoading && (
          <div style={{ marginBottom:16, fontSize:12, color:C.muted, textAlign:'center', padding:'10px 0' }}>Checking for instant-book moorings…</div>
        )}
        {vessel?.length_ft && !hotMooringsLoading && hotMoorings.length > 0 && (
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:12, fontWeight:800, color:'#4ade80', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
              ⚓ Moorings — Fits Your Boat
            </div>
            {hotMoorings.map(m => (
              <div key={m.id} style={{ background:'rgba(74,222,128,0.06)', border:'1px solid rgba(74,222,128,0.25)', borderRadius:12, padding:'12px 14px', marginBottom:8 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:C.white }}>Mooring {m.label}{m.dock ? ` · ${m.dock}` : ''}</div>
                  {m.daily_rate != null && <div style={{ fontSize:13, fontWeight:800, color:'#4ade80' }}>${m.daily_rate}/night</div>}
                </div>
                <div style={{ fontSize:12, color:C.muted, marginBottom:8 }}>
                  {[m.max_loa_ft && `Fits up to ${m.max_loa_ft}ft`, m.max_weight_lbs && `Max ${m.max_weight_lbs}lbs`, m.depth_ft && `${m.depth_ft}ft depth`].filter(Boolean).join(' · ')}
                </div>
                {m.estimated_cost != null && (
                  <div style={{ fontSize:12, color:C.white, fontWeight:600, marginBottom:8 }}>Total: ${m.estimated_cost.toFixed(2)} for {m.nights} night{m.nights !== 1 ? 's' : ''}</div>
                )}
                <button type="button" onClick={() => handleInstantBookMooring(m.id)} disabled={bookingMooring === m.id}
                  style={{ width:'100%', padding:'10px 0', fontSize:13, fontWeight:800, color:'#0d2b4b', background: bookingMooring === m.id ? 'rgba(74,222,128,0.5)' : '#4ade80', border:'none', borderRadius:10, cursor: bookingMooring === m.id ? 'default' : 'pointer', fontFamily:'inherit' }}>
                  {bookingMooring === m.id ? 'Booking…' : '💳 Book & Pay Now'}
                </button>
              </div>
            ))}
          </div>
        )}

        {(hotSlips.length > 0 || hotMoorings.length > 0) && (
          <div style={{ marginBottom:20 }}>
            {bookError && (
              <div style={{ fontSize:12, color:C.danger, marginBottom:6 }}>{bookError}</div>
            )}
            <div style={{ fontSize:11, color:C.muted, textAlign:'center' }}>Or send a regular request below — the marina will find you a spot</div>
          </div>
        )}

        {/* Vessel info — single-boat owners see their one boat read-only here (multi-boat
            owners pick above). */}
        {vessels.length === 1 && vessel && (
          <div style={{ ...sectionStyle, background:'rgba(77,214,200,0.07)', border:'1px solid rgba(77,214,200,0.18)', borderRadius:12, padding:'12px 14px' }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.teal, textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>Your Vessel</div>
            <div style={{ fontSize:13, color:C.white, fontWeight:600 }}>{vessel.name || 'Unnamed Vessel'}</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>
              {[vessel.length_ft && `${vessel.length_ft}ft LOA`, vessel.beam_ft && `${vessel.beam_ft}ft beam`, vessel.draft_ft && `${vessel.draft_ft}ft draft`].filter(Boolean).join(' · ')}
            </div>
          </div>
        )}
        {vessels.length === 0 && (
          <div style={{ ...sectionStyle, background:'rgba(248,113,113,0.07)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:12, padding:'12px 14px', fontSize:12, color:'#f87171' }}>
            ⚠️ Add your vessel under My Vessel so the marina knows your specs
          </div>
        )}
        {vessels.length > 1 && !vessel && (
          <div style={{ ...sectionStyle, background:'rgba(248,113,113,0.07)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:12, padding:'12px 14px', fontSize:12, color:'#f87171' }}>
            ⚠️ Choose which vessel you're bringing above
          </div>
        )}

        {/* Shore power */}
        <div style={sectionStyle}>
          <label style={{ ...labelStyle, display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
            <input type="checkbox" checked={shorePower} onChange={e => setShorePower(e.target.checked)}
              style={{ width:16, height:16, accentColor:C.teal }} />
            <span>Shore power needed</span>
          </label>
        </div>

        {/* Fuel type */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Fuel Type</label>
          <select value={fuelType} onChange={e => setFuelType(e.target.value)} style={{ ...inputStyle, color: fuelType ? C.white : 'rgba(255,255,255,0.3)' }}>
            <option value="">Not needed / unknown</option>
            <option value="diesel">Diesel</option>
            <option value="gasoline">Gasoline</option>
            <option value="electric">Electric</option>
          </select>
        </div>

        {/* Notes */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Notes for the marina (optional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Any special requests, preferred slip type, etc."
            style={{ ...inputStyle, resize:'none' as const }} />
        </div>

        {/* Contact — read-only display */}
        <div style={{ ...sectionStyle, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'12px 14px' }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>Sending As</div>
          <div style={{ fontSize:13, color:C.white }}>{displayName}</div>
          <div style={{ fontSize:12, color:C.muted }}>{user.email}</div>
        </div>

        {error && (
          <div style={{ marginBottom:16, fontSize:13, color:C.danger, background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:10, padding:'10px 14px' }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={submitting}
          style={{ width:'100%', padding:'14px', fontSize:15, fontWeight:700, color:C.bg, background: submitting ? 'rgba(77,214,200,0.4)' : C.teal, border:'none', borderRadius:14, cursor: submitting ? 'default' : 'pointer', fontFamily:'inherit' }}>
          {submitting ? 'Sending…' : 'Send Request'}
        </button>
      </form>
    </div>
  )
}

// ─── Marina Chat ──────────────────────────────────────────────────────────────
function MarinaChat({ marina, user, profile, vessel, coupled, onBack, onAddVessel, spaceProfile, leaseProfile, marinaProfile }: { marina:Marina; user:User; profile:Profile|null; vessel:Vessel|null; coupled?:boolean; onBack:()=>void; onAddVessel:()=>void; spaceProfile?:SpaceProfile|null; leaseProfile?:LeaseProfile|null; marinaProfile?:MarinaProfile|null }) {
  const [msgs,    setMsgs]    = useState<{role:string;text:string}[]>([])
  const [draft,   setDraft]   = useState('')
  const [sending, setSending] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load persistent history on mount — localStorage first (instant), DB as fallback
  useEffect(() => {
    const cacheKey = `skipper_marina_chat_${user.id}_${marina.id}`
    async function loadHistory() {
      // 1. Try localStorage first — survives tab switches and in-app navigation
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMsgs(parsed)
            setHistoryLoaded(true)
            return
          }
        } catch { /* bad cache — fall through to DB */ }
      }
      // 2. Fall back to Railway — Rule 2 (single source, no direct DB read)
      let loaded: {role:string;text:string}[] = []
      try {
        const res = await fetch(`/api/marina-chat/${marina.id}?auth_user_id=${user.id}`)
        if (res.ok) {
          const data = await res.json()
          loaded = (data.messages ?? []).map((m: { direction: string; body: string }) => ({
            role: m.direction === 'inbound' ? 'user' : 'skipper',
            text: m.body,
          }))
        }
      } catch { /* fall through to greeting */ }
      if (loaded.length > 0) {
        setMsgs(loaded)
        localStorage.setItem(cacheKey, JSON.stringify(loaded))
      } else {
        setMsgs([{ role:'skipper', text:`Aye aye! I'm Skipper, your direct line to ${marina.name}. What can I help you with?` }])
      }
      setHistoryLoaded(true)
    }
    loadHistory()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marina.id, user.id])

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

    // Save inbound to Railway — Rule 2 (server resolves marina-scoped tenant for Helm inbox)
    fetch(`/api/marina-chat/${marina.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auth_user_id: user.id, direction: 'inbound', body: msg, sender_name: displayName ?? 'Boater' }),
    }).catch(() => {})

    // Full identity package — same as Global Skipper + marina-specific context
    // Rule 2: spaceProfile/leaseProfile/marinaProfile come from Railway (profile endpoint)
    const isTenant = coupled === true
    const identityPackage = {
      auth_user_id:  user.id,
      contact_id:    profile?.contact_id ?? null,
      first_name:    profile?.first_name ?? null,
      last_name:     profile?.last_name ?? null,
      display_name:  displayName,
      phone:         profile?.phone ?? null,
      email:         user.email ?? null,
      // Marina-specific context — slip, lease, berth
      slip:  spaceProfile  ? { label: spaceProfile.label, dock: spaceProfile.dock, type: spaceProfile.spaceType } : null,
      lease: leaseProfile  ? { status: leaseProfile.status, startDate: leaseProfile.startDate, endDate: leaseProfile.endDate, monthlyRate: leaseProfile.monthlyRate } : null,
      marina_name: marinaProfile?.name ?? marina.name,
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
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            session: { marina_id: marina.id, boater_id: user.id, access_type: isTenant ? 'tenant' : 'anonymous' },
            conversation_history: msgs.slice(-20).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
          })
      })
      const d = await r.json()
      const reply = d.reply || 'Let me check on that.'
      const checkoutUrl = d.checkout_url || null
      const updatedMsgs = [...msgs, { role:'user', text:msg }, { role:'skipper', text:reply, checkout_url: checkoutUrl }]
      setMsgs(updatedMsgs)
      // Persist to localStorage so history survives tab switches
      const cacheKey = `skipper_marina_chat_${user.id}_${marina.id}`
      localStorage.setItem(cacheKey, JSON.stringify(updatedMsgs))
      fetch(`/api/marina-chat/${marina.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth_user_id: user.id, direction: 'outbound', body: reply, sender_name: 'Skipper' }),
      }).catch(() => {})
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
        {!historyLoaded && (
          <div style={{ textAlign:'center', color:C.muted, fontSize:13, padding:'20px 0' }}>Loading conversation…</div>
        )}
        {msgs.map((m,i) => (
          <div key={i} style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start', gap:8, alignItems:'flex-end' }}>
            {m.role==='skipper' && (
              <div style={{ width:30, height:30, borderRadius:'50%', overflow:'hidden', border:`2px solid ${C.teal}`, flexShrink:0 }}>
                <Image src="/skipper-avatar.jpg" alt="Skipper" width={30} height={30} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top' }} />
              </div>
            )}
            <div style={{ maxWidth:'78%', borderRadius:m.role==='user'?'16px 16px 4px 16px':'16px 16px 16px 4px', overflow:'hidden', border:m.role==='skipper'?`1px solid ${C.cardBorder}`:'none' }}>
              <div style={{ padding:'11px 14px', background:m.role==='user'?`linear-gradient(135deg,${C.teal},#2fb3a3)`:C.card, color:m.role==='user'?C.navy:C.white, fontSize:14, lineHeight:1.55, fontWeight:m.role==='user'?600:400 }}>
                {m.text}
              </div>
              {(m as any).checkout_url && (
                <a href={(m as any).checkout_url} target="_blank" rel="noopener noreferrer"
                  style={{ display:'block', padding:'12px 16px', background:'#0d9488', color:'#fff', textAlign:'center', fontWeight:700, fontSize:14, textDecoration:'none' }}>
                  💳 Book &amp; Pay Now
                </a>
              )}
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

// ─── TAB: Ship's Log ────────────────────────────────────────────────────────────
type LogEntry = {
  id: string
  log_date: string
  notes: string | null
  departed_from: string | null
  arrived_at: string | null
  distance_nm: number | null
  engine_hours_start: number | null
  engine_hours_end: number | null
  fuel_used_gallons: number | null
  crew_count: number | null
  weather: string | null
  sea_conditions: string | null
  source: string
}

const BLANK_FORM = { log_date: new Date().toISOString().slice(0,10), notes: '', departed_from: '', arrived_at: '', distance_nm: '', engine_hours_start: '', engine_hours_end: '', fuel_used_gallons: '', crew_count: '', weather: '' }

function TabShipLog({ vessels, vessel: primaryVessel, vesselIds }: { vessels: Vessel[], vessel: Vessel | null, vesselIds: string[] }) {
  const [activeVesselId, setActiveVesselId] = useState<string | null>(primaryVessel?.id ?? null)
  const [entries, setEntries]               = useState<LogEntry[]>([])
  const [loading, setLoading]               = useState(false)
  const [showForm, setShowForm]             = useState(false)
  const [form, setForm]                     = useState({ ...BLANK_FORM })
  const [editingId, setEditingId]           = useState<string | null>(null)
  const [saving, setSaving]                 = useState(false)
  const [saveErr, setSaveErr]               = useState('')

  const activeVessel = vessels.find(v => v.id === activeVesselId) ?? primaryVessel

  useEffect(() => {
    if (!activeVesselId) return
    setLoading(true)
    fetch(`/api/asset-ship-log?vessel_id=${activeVesselId}`)
      .then(r => r.json())
      .then(data => setEntries(Array.isArray(data) ? data : (data.logs ?? [])))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [activeVesselId])

  async function handleSave() {
    if (!activeVesselId) return
    setSaving(true); setSaveErr('')
    try {
      const payload = {
          vessel_id:           activeVesselId,
          log_date:           form.log_date || new Date().toISOString().slice(0,10),
          notes:              form.notes || null,
          departed_from:      form.departed_from || null,
          arrived_at:         form.arrived_at || null,
          distance_nm:        form.distance_nm ? parseFloat(form.distance_nm) : null,
          engine_hours_start: form.engine_hours_start ? parseFloat(form.engine_hours_start) : null,
          engine_hours_end:   form.engine_hours_end   ? parseFloat(form.engine_hours_end)   : null,
          fuel_used_gallons:  form.fuel_used_gallons  ? parseFloat(form.fuel_used_gallons)  : null,
          crew_count:         form.crew_count         ? parseInt(form.crew_count)           : null,
          weather:            form.weather || null,
          source:             'manual',
        }
      const url    = editingId ? `/api/asset-ship-log/${editingId}` : '/api/asset-ship-log'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) { setSaveErr('Save failed'); return }
      if (editingId) {
        const updated = await res.json()
        setEntries(prev => prev.map(e => e.id === editingId ? (updated.log ?? updated) : e))
        setEditingId(null)
      } else {
        const newEntry = await res.json()
        setEntries(prev => [newEntry.log ?? newEntry, ...prev])
      }
      setForm({ ...BLANK_FORM })
      setShowForm(false)
    } catch { setSaveErr('Save failed') }
    finally { setSaving(false) }
  }

  function fmtDate(d: string) {
    const s = (d || '').slice(0, 10)
    const [y, m, day] = s.split('-').map(Number)
    if (!y) return '—'
    return new Date(y, m - 1, day).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
  }

  function sourceBadge(source: string) {
    const map: Record<string, { label: string; color: string }> = {
      manual:      { label: 'You', color: C.teal },
      skipper:     { label: '🤖 Skipper', color: '#a78bfa' },
      helm_event:  { label: '⚓ Marina', color: '#60a5fa' },
      fuel:        { label: '⛽ Fuel', color: '#fb923c' },
      work_order:  { label: '🔧 Service', color: '#facc15' },
    }
    const b = map[source] ?? { label: source, color: C.muted }
    return <span style={{ fontSize:10, fontWeight:700, color:b.color, background:'rgba(255,255,255,0.06)', borderRadius:10, padding:'2px 8px' }}>{b.label}</span>
  }

  const iStyle = { width:'100%', padding:'11px 13px', background:C.inputBg, border:`1px solid ${C.inputBorder}`, borderRadius:8, color:C.white, fontSize:14, fontFamily:FONT, outline:'none' } as React.CSSProperties

  return (
    <div style={{ padding:'0 0 80px' }}>

      {/* ── Header ── */}
      <div style={{ padding:'16px 16px 12px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontSize:18, fontWeight:800, color:C.white, letterSpacing:-0.4 }}>📓 Ship&apos;s Log</div>
        {activeVesselId && (
          <button onClick={() => { setShowForm(s => !s); setSaveErr(''); if (showForm) { setEditingId(null); setForm({ ...BLANK_FORM }) } }}
            style={{ background:showForm ? 'rgba(255,255,255,0.08)' : C.teal, color:showForm ? C.white : '#0d2b4b', border:'none', borderRadius:8, padding:'8px 14px', fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:FONT }}>
            {showForm ? 'Cancel' : '+ New Entry'}
          </button>
        )}
      </div>

      {/* ── Vessel selector (multiple vessels only) ── */}
      {vessels.length > 1 && (
        <div style={{ padding:'0 16px 12px', display:'flex', gap:8, overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
          {vessels.map(v => (
            <button key={v.id} onClick={() => setActiveVesselId(v.id)}
              style={{ flexShrink:0, background: v.id === activeVesselId ? C.teal : C.inputBg, color: v.id === activeVesselId ? '#0d2b4b' : C.muted, border: `1px solid ${v.id === activeVesselId ? C.teal : C.inputBorder}`, borderRadius:20, padding:'6px 14px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:FONT, whiteSpace:'nowrap' }}>
              {v.name || `Vessel ${v.id.slice(0,4)}`}
            </button>
          ))}
        </div>
      )}

      {/* ── No vessels ── */}
      {vessels.length === 0 && (
        <div style={{ padding:'60px 20px', textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>⚓</div>
          <div style={{ fontSize:16, fontWeight:700, color:C.white, marginBottom:8 }}>No vessel on file</div>
          <div style={{ fontSize:13, color:C.muted, lineHeight:1.65 }}>Add your vessel in the Vessel tab first.</div>
        </div>
      )}

      {/* ── Active vessel name ── */}
      {activeVessel && vessels.length === 1 && (
        <div style={{ padding:'0 16px 12px' }}>
          <span style={{ fontSize:12, color:C.muted, fontWeight:600 }}>{activeVessel.name || 'My Vessel'}</span>
        </div>
      )}

      {/* ── New entry form ── */}
      {showForm && activeVesselId && (
        <div style={{ margin:'0 16px 16px', background:C.card, border:`1px solid ${C.cardBorder}`, borderRadius:14, padding:18 }}>
          <div style={{ fontSize:14, fontWeight:800, color:C.white, marginBottom:14 }}>New Log Entry</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <input type="date" value={form.log_date} onChange={e => setForm(f => ({ ...f, log_date: e.target.value }))} style={iStyle} />
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Trip notes…" rows={3}
              style={{ ...iStyle, resize:'none' }} />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <input placeholder="Departed from" value={form.departed_from} onChange={e => setForm(f => ({ ...f, departed_from: e.target.value }))} style={iStyle} />
              <input placeholder="Arrived at" value={form.arrived_at} onChange={e => setForm(f => ({ ...f, arrived_at: e.target.value }))} style={iStyle} />
              <input placeholder="Distance (nm)" type="number" value={form.distance_nm} onChange={e => setForm(f => ({ ...f, distance_nm: e.target.value }))} style={iStyle} />
              <input placeholder="Fuel used (gal)" type="number" value={form.fuel_used_gallons} onChange={e => setForm(f => ({ ...f, fuel_used_gallons: e.target.value }))} style={iStyle} />
              <input placeholder="Engine hrs start" type="number" value={form.engine_hours_start} onChange={e => setForm(f => ({ ...f, engine_hours_start: e.target.value }))} style={iStyle} />
              <input placeholder="Engine hrs end" type="number" value={form.engine_hours_end} onChange={e => setForm(f => ({ ...f, engine_hours_end: e.target.value }))} style={iStyle} />
              <input placeholder="Crew count" type="number" value={form.crew_count} onChange={e => setForm(f => ({ ...f, crew_count: e.target.value }))} style={iStyle} />
              <input placeholder="Weather" value={form.weather} onChange={e => setForm(f => ({ ...f, weather: e.target.value }))} style={iStyle} />
            </div>
            {saveErr && <div style={{ fontSize:12, color:C.danger }}>{saveErr}</div>}
            <button onClick={handleSave} disabled={saving}
              style={{ background:C.teal, color:'#0d2b4b', border:'none', borderRadius:8, padding:'13px', fontSize:14, fontWeight:900, cursor:saving?'not-allowed':'pointer', fontFamily:FONT, opacity:saving?0.7:1 }}>
              {saving ? 'Saving…' : 'Save Entry'}
            </button>
          </div>
        </div>
      )}

      {/* ── Entries list ── */}
      {loading && (
        <div style={{ padding:'40px 16px', textAlign:'center', color:C.muted, fontSize:13 }}>Loading…</div>
      )}

      {!loading && !showForm && entries.length === 0 && activeVesselId && (
        <div style={{ padding:'60px 20px', textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📓</div>
          <div style={{ fontSize:16, fontWeight:700, color:C.white, marginBottom:8 }}>No log entries yet</div>
          <div style={{ fontSize:13, color:C.muted, lineHeight:1.65, maxWidth:260, margin:'0 auto' }}>
            Start the record. Every marina visit, fuel stop, and trip Skipper logs automatically.
          </div>
        </div>
      )}

      {!loading && entries.map((e, i) => (
        <div key={e.id} style={{ margin:'0 16px', borderBottom: i < entries.length-1 ? `1px solid rgba(255,255,255,0.06)` : 'none', padding:'16px 0' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
            <div style={{ fontSize:14, fontWeight:700, color:C.white }}>{fmtDate(e.log_date)}</div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              {sourceBadge(e.source)}
              <button onClick={() => {
                setForm({
                  log_date: e.log_date?.slice(0,10) ?? '',
                  notes: e.notes ?? '',
                  departed_from: e.departed_from ?? '',
                  arrived_at: e.arrived_at ?? '',
                  distance_nm: e.distance_nm != null ? String(e.distance_nm) : '',
                  engine_hours_start: e.engine_hours_start != null ? String(e.engine_hours_start) : '',
                  engine_hours_end: e.engine_hours_end != null ? String(e.engine_hours_end) : '',
                  fuel_used_gallons: e.fuel_used_gallons != null ? String(e.fuel_used_gallons) : '',
                  crew_count: e.crew_count != null ? String(e.crew_count) : '',
                  weather: e.weather ?? '',
                })
                setEditingId(e.id)
                setShowForm(true)
              }} style={{ fontSize:11, color:C.teal, background:'transparent', border:`1px solid ${C.teal}`, borderRadius:6, padding:'2px 8px', cursor:'pointer', fontFamily:FONT }}>Edit</button>
            </div>
          </div>
          {e.notes && <div style={{ fontSize:13, color:C.muted, lineHeight:1.65, marginBottom:8 }}>{e.notes}</div>}
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {(e.departed_from || e.arrived_at) && (
              <span style={{ fontSize:12, color:C.muted2 }}>
                {[e.departed_from, e.arrived_at].filter(Boolean).join(' → ')}
              </span>
            )}
            {e.distance_nm && <span style={{ fontSize:11, color:C.muted2 }}>📍 {e.distance_nm} nm</span>}
            {(e.engine_hours_start != null || e.engine_hours_end != null) && (
              <span style={{ fontSize:11, color:C.muted2 }}>⚙️ {e.engine_hours_start ?? '?'} → {e.engine_hours_end ?? '?'} hrs</span>
            )}
            {e.fuel_used_gallons && <span style={{ fontSize:11, color:C.muted2 }}>⛽ {e.fuel_used_gallons} gal</span>}
            {e.crew_count && <span style={{ fontSize:11, color:C.muted2 }}>👥 {e.crew_count}</span>}
            {e.weather && <span style={{ fontSize:11, color:C.muted2 }}>🌤 {e.weather}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── TAB: Skipper AI (Global) ────────────────────────────────────────────────
// ─── TAB: Messages ───────────────────────────────────────────────────────────
type DirectThread = { marina_id: string; marinaName: string; lastBody: string; lastAt: string; unread: number }
type DirectMsg    = { id: string; body: string; direction: string; inserted_at: string }

function TabMessages({ user, profile }: { user: User; profile: Profile|null }) {
  type MyMarina = { marina_id: string; contact_id: string; marina_name: string; tenantType: 'slip_holder' | 'transient' | 'external' }
  const [myMarinas,    setMyMarinas]    = useState<MyMarina[]>([])
  const [activeMarina, setActiveMarina] = useState<MyMarina | null>(null)
  const [msgs,         setMsgs]         = useState<{ id:string; body:string; direction:string; created_at:string }[]>([])
  const [draft,        setDraft]        = useState('')
  const [sending,      setSending]      = useState(false)
  const [loading,      setLoading]      = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  const displayName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || user.email
    : (user.email ?? 'Boater')

  // ── Load all marinas this user is connected to ───────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/my-marinas?auth_user_id=${user.id}`)
        const data = res.ok ? await res.json() : { marinas: [] }
        const marinas: MyMarina[] = data.marinas ?? []
        setMyMarinas(marinas)
        if (marinas.length === 1) setActiveMarina(marinas[0])
      } catch { /* ignore */ }
      setLoading(false)
    }
    load()
  }, [user.id])

  // ── Load messages for active marina via Railway (Rule 2 compliant) ────────
  const loadThread = useCallback(async (_m?: MyMarina) => {
    const res = await fetch(`/api/messages?auth_user_id=${user.id}`)
    const data = await res.json().catch(() => ({}))
    setMsgs(data.messages ?? [])
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id])

  useEffect(() => { if (activeMarina) loadThread(activeMarina) }, [activeMarina?.marina_id])

  // Marina channel — public, Railway already broadcasts here on message events.
  // This is how Helm → Boater messages arrive in real-time.
  useSkipperRealtime({
    scope: { kind: 'marina', id: activeMarina?.marina_id ?? '' },
    enabled: !!activeMarina?.marina_id,
    onChange: () => { loadThread() },
  })

  // ── Send ─────────────────────────────────────────────────────────────────
  async function send() {
    if (!draft.trim() || !activeMarina || sending) return
    setSending(true)
    const body = draft.trim()
    setDraft('')
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_user_id: user.id,
        body,
      }),
    })
    setSending(false)
    loadThread()
  }

  function fmtTime(iso: string) {
    try {
      const d = new Date(iso)
      const now = new Date()
      const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
      if (diff === 0) return d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
      if (diff === 1) return 'Yesterday'
      if (diff < 7)  return d.toLocaleDateString([], { weekday:'short' })
      return d.toLocaleDateString([], { month:'short', day:'numeric' })
    } catch { return '' }
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:C.muted, fontSize:13 }}>
      Loading…
    </div>
  )

  // ── Not connected to any marina ───────────────────────────────────────────
  if (!loading && myMarinas.length === 0) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', padding:'0 32px', textAlign:'center', color:C.muted }}>
      <div style={{ fontSize:40, marginBottom:16 }}>⚓</div>
      <div style={{ fontSize:16, fontWeight:700, color:C.white, marginBottom:8 }}>No marina connected</div>
      <div style={{ fontSize:13, lineHeight:1.6 }}>Once your marina links your account, your conversation will appear here.</div>
    </div>
  )

  // ── Marina picker (multiple marinas, none selected) ───────────────────────
  if (!activeMarina) return (
    <div style={{ padding:'24px 20px' }}>
      <h1 style={{ fontSize:22, fontWeight:800, color:C.white, margin:'0 0 6px', letterSpacing:-0.5 }}>Messages</h1>
      <p style={{ fontSize:13, color:C.muted, margin:'0 0 24px' }}>Select a marina to open your conversation.</p>
      <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
        {myMarinas.map(m => (
          <button key={m.marina_id} onClick={() => setActiveMarina(m)}
            style={{ background:'rgba(255,255,255,0.05)', border:`1px solid rgba(255,255,255,0.09)`, borderRadius:16, padding:'16px', display:'flex', alignItems:'center', gap:14, textAlign:'left', cursor:'pointer', width:'100%' }}>
            <div style={{ width:46, height:46, borderRadius:'50%', background:C.tealDim, border:`1.5px solid ${C.tealBorder}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>⚓</div>
            <div style={{ fontSize:15, fontWeight:700, color:C.white }}>{m.marina_name}</div>
          </button>
        ))}
      </div>
    </div>
  )

  // ── Chat view ─────────────────────────────────────────────────────────────
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', minHeight:0 }}>
      {/* Header */}
      <div style={{ padding:'16px 20px 12px', borderBottom:`1px solid rgba(255,255,255,0.08)`, display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
        {myMarinas.length > 1 && (
          <button onClick={() => setActiveMarina(null)} style={{ background:'none', border:'none', color:C.teal, fontSize:22, cursor:'pointer', padding:'0 4px', lineHeight:1 }}>‹</button>
        )}
        <div style={{ width:36, height:36, borderRadius:'50%', background:C.tealDim, border:`1.5px solid ${C.tealBorder}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>⚓</div>
        <div>
          <div style={{ fontSize:16, fontWeight:800, color:C.white }}>{activeMarina.marina_name}</div>
          <div style={{ fontSize:11, color:C.muted }}>Marina team</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', padding:'16px 20px', display:'flex', flexDirection:'column', gap:10 }}>
        {msgs.length === 0 && (
          <div style={{ textAlign:'center', color:C.muted, fontSize:13, padding:'40px 0' }}>
            <div style={{ fontSize:28, marginBottom:10 }}>👋</div>
            <div>Send a message to {activeMarina.marina_name}.</div>
          </div>
        )}
        {msgs.map(m => {
          const fromBoater = m.direction === 'inbound'
          return (
            <div key={m.id} style={{ display:'flex', flexDirection:'column', alignItems: fromBoater ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth:'78%', padding:'10px 14px',
                borderRadius: fromBoater ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: fromBoater ? `linear-gradient(135deg,${C.teal},#2fb3a3)` : 'rgba(255,255,255,0.1)',
                color: fromBoater ? C.navy : C.white,
                fontSize:14, lineHeight:1.45, fontWeight: fromBoater ? 600 : 400,
              }}>{m.body}</div>
              <div style={{ fontSize:10, color:C.muted2, marginTop:3, paddingInline:2 }}>{fmtTime(m.created_at)}</div>
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
          placeholder={`Message ${activeMarina.marina_name}…`}
          rows={1}
          style={{ flex:1, background:C.inputBg, border:`1.5px solid ${C.inputBorder}`, borderRadius:22, color:C.white, fontSize:15, fontFamily:FONT, padding:'11px 16px', outline:'none', resize:'none', maxHeight:100, overflowY:'auto' }}
        />
        <button
          onClick={send}
          disabled={!draft.trim() || sending}
          style={{ width:42, height:42, borderRadius:'50%', background: draft.trim() ? `linear-gradient(135deg,${C.teal},#2fb3a3)` : 'rgba(255,255,255,0.1)', border:'none', cursor: draft.trim() ? 'pointer' : 'default', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke={draft.trim()?C.navy:C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={draft.trim()?C.navy:C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
    </div>
  )
}

// ─── Floating Skipper ──────────────────────────────────────────────────────
// ─── TAB: Home Dashboard ────────────────────────────────────────────────────────
function TabHome({ user, profile, vessel, marinaProfile, spaceProfile, leaseProfile, weatherData, onTabChange }: {
  user: User; profile: Profile|null; vessel: Vessel|null
  marinaProfile: MarinaProfile|null; spaceProfile: SpaceProfile|null; leaseProfile: LeaseProfile|null
  weatherData: WeatherData|null; onTabChange: (t: HomeTab) => void
}) {
  const [invoices,        setInvoices]        = useState<any[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  const [showInvoices,    setShowInvoices]    = useState(false)
  const [paying,          setPaying]          = useState<string|null>(null) // invoice id being paid
  const [payError,        setPayError]        = useState<string|null>(null)
  const [expandedInv,     setExpandedInv]     = useState<string|null>(null)

  useEffect(() => {
    if (!user.id) return
    setInvoicesLoading(true)
    fetch(`/api/invoices?auth_user_id=${user.id}`)
      .then(r => r.json())
      .then(d => setInvoices(d.invoices ?? []))
      .catch(() => {})
      .finally(() => setInvoicesLoading(false))
  }, [user.id])

  // Upcoming/active transient bookings for the home 'Upcoming Stay' card (spec: home shows
  // your next stay, not a resident berth, unless you actually hold a lease).
  const [bookings, setBookings] = useState<any[]>([])
  useEffect(() => {
    if (!user.id) return
    fetch(`/api/transient-requests?auth_user_id=${user.id}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setBookings(d.requests ?? []))
      .catch(() => {})
  }, [user.id])
  const today = new Date().toISOString().slice(0,10)
  const upcomingBookings = (bookings || []).filter(b => !b.departure_date || b.departure_date >= today)

  const unpaidTotal = invoices
    .filter(inv => ['unpaid', 'overdue', 'partial', 'sent'].includes(inv.status))
    .reduce((sum, inv) => sum + ((inv.amountDue ?? 0) - (inv.amountPaid ?? 0)), 0)
  const hasOverdue = invoices.some(inv => inv.status === 'overdue')
  const firstName  = profile?.first_name ?? user.email?.split('@')[0] ?? 'Captain'

  async function handlePayNow(invoiceId: string) {
    setPaying(invoiceId); setPayError(null)
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth_user_id: user.id }),
      })
      const data = await res.json()
      if (!res.ok || !data.checkout_url) {
        setPayError(data.error || 'Could not create payment session')
        return
      }
      window.open(data.checkout_url, '_blank')
    } catch {
      setPayError('Something went wrong — try again')
    } finally {
      setPaying(null)
    }
  }

  function statusBadge(status: string) {
    const map: Record<string,{label:string;color:string;bg:string;border:string}> = {
      paid:     { label:'Paid',     color:'#4ade80', bg:'rgba(74,222,128,0.1)',  border:'rgba(74,222,128,0.3)' },
      overdue:  { label:'Overdue', color:'#f87171', bg:'rgba(248,113,113,0.1)', border:'rgba(248,113,113,0.3)' },
      unpaid:   { label:'Unpaid',  color:'#facc15', bg:'rgba(250,204,21,0.1)',  border:'rgba(250,204,21,0.3)' },
      partial:  { label:'Partial', color:'#fb923c', bg:'rgba(251,146,60,0.1)',  border:'rgba(251,146,60,0.3)' },
      sent:     { label:'Sent',    color:'#60a5fa', bg:'rgba(96,165,250,0.1)',  border:'rgba(96,165,250,0.3)' },
      void:     { label:'Void',    color:C.muted2,  bg:'rgba(255,255,255,0.05)',border:'rgba(255,255,255,0.1)' },
    }
    const s = map[status] ?? { label: status, color: C.muted, bg: C.card, border: C.cardBorder }
    return (
      <span style={{ fontSize:10, fontWeight:800, color:s.color, background:s.bg, border:`1px solid ${s.border}`, borderRadius:20, padding:'3px 9px', textTransform:'uppercase', letterSpacing:0.5 }}>{s.label}</span>
    )
  }

  function fmtDate(d: string|null) {
    if (!d) return '—'
    const [y,m,day] = d.slice(0,10).split('-').map(Number)
    return new Date(y, m-1, day).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
  }

  // ── Invoice History View ──────────────────────────────────────────────────
  if (showInvoices) {
    return (
      <div style={{ padding:'0 0 100px' }}>
        {/* Header */}
        <div style={{ padding:'16px 16px 12px', display:'flex', alignItems:'center', gap:12, borderBottom:`1px solid rgba(255,255,255,0.07)`, marginBottom:4 }}>
          <button onClick={() => { setShowInvoices(false); setPayError(null) }}
            style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, padding:'7px 14px', color:C.white, fontFamily:FONT, cursor:'pointer', fontSize:13, fontWeight:600 }}>← Back</button>
          <div>
            <div style={{ fontSize:17, fontWeight:800, color:C.white }}>Invoices & Payments</div>
            <div style={{ fontSize:11, color:C.muted }}>{marinaProfile?.name}</div>
          </div>
        </div>

        {payError && (
          <div style={{ margin:'0 16px 12px', padding:'10px 14px', background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.25)', borderRadius:12, fontSize:13, color:'#f87171' }}>{payError}</div>
        )}

        {invoicesLoading && (
          <div style={{ padding:'40px 16px', textAlign:'center', color:C.muted, fontSize:13 }}>Loading…</div>
        )}

        {!invoicesLoading && invoices.length === 0 && (
          <div style={{ padding:'60px 20px', textAlign:'center' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
            <div style={{ fontSize:16, fontWeight:700, color:C.white, marginBottom:8 }}>No invoices yet</div>
            <div style={{ fontSize:13, color:C.muted }}>Invoices from your marina will appear here.</div>
          </div>
        )}

        {!invoicesLoading && invoices.map((inv, i) => {
          const payable = ['unpaid','overdue','partial','sent'].includes(inv.status)
          const owed    = Math.max(0, (inv.amountDue ?? 0) - (inv.amountPaid ?? 0))
          const isExpanded = expandedInv === inv.id
          return (
            <div key={inv.id} style={{ margin:'0 16px', borderBottom: i < invoices.length-1 ? `1px solid rgba(255,255,255,0.06)` : 'none', padding:'16px 0' }}>
              {/* Invoice row header */}
              <button onClick={() => setExpandedInv(isExpanded ? null : inv.id)}
                style={{ width:'100%', background:'none', border:'none', padding:0, cursor:'pointer', textAlign:'left', fontFamily:FONT }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:C.white, marginBottom:4 }}>{inv.invoiceNumber ?? 'Invoice'}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      {statusBadge(inv.status)}
                      {inv.dueDate && <span style={{ fontSize:11, color:C.muted }}>Due {fmtDate(inv.dueDate)}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0, marginLeft:12 }}>
                    <div style={{ fontSize:20, fontWeight:900, letterSpacing:-0.5, color: inv.status==='paid' ? '#4ade80' : inv.status==='overdue' ? '#f87171' : C.white }}>${(inv.totalAmount ?? 0).toFixed(2)}</div>
                    {inv.amountPaid > 0 && inv.status !== 'paid' && (
                      <div style={{ fontSize:10, color:C.muted }}>Paid ${inv.amountPaid.toFixed(2)}</div>
                    )}
                  </div>
                </div>
                {inv.notes && <div style={{ fontSize:12, color:C.muted, marginBottom:6 }}>{inv.notes}</div>}
              </button>

              {/* Expanded line items */}
              {isExpanded && inv.lineItems?.length > 0 && (
                <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:10, padding:'10px 12px', marginBottom:10 }}>
                  {inv.lineItems.map((li: any) => (
                    <div key={li.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'5px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                      <div>
                        <div style={{ fontSize:12, color:C.white, fontWeight:600 }}>{li.description}</div>
                        {li.quantity > 1 && <div style={{ fontSize:11, color:C.muted }}>{li.quantity} × ${li.unit_price?.toFixed(2)}</div>}
                      </div>
                      <div style={{ fontSize:13, fontWeight:700, color:C.white, flexShrink:0, marginLeft:12 }}>${li.total?.toFixed(2)}</div>
                    </div>
                  ))}
                  <div style={{ display:'flex', justifyContent:'space-between', paddingTop:8, marginTop:4 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:C.muted }}>Total</div>
                    <div style={{ fontSize:13, fontWeight:900, color:C.white }}>${(inv.totalAmount ?? 0).toFixed(2)}</div>
                  </div>
                </div>
              )}

              {/* Pay Now button */}
              {payable && owed > 0 && (
                <button
                  onClick={() => handlePayNow(inv.id)}
                  disabled={paying === inv.id}
                  style={{ width:'100%', padding:'13px', background: paying===inv.id ? 'rgba(77,214,200,0.3)' : `linear-gradient(135deg,${C.teal},#2fb3a3)`, border:'none', borderRadius:12, color:'#0d2b4b', fontSize:14, fontWeight:900, cursor: paying===inv.id ? 'default':'pointer', fontFamily:FONT, marginTop:4 }}>
                  {paying === inv.id ? 'Opening payment…' : `Pay Now — $${owed.toFixed(2)}`}
                </button>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // ── Dashboard View ────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '16px 16px 100px' }}>

      {/* Greeting */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: C.white, letterSpacing: -0.5, marginBottom: 2 }}>Hey, {firstName} 👋</div>
        <div style={{ fontSize: 13, color: C.muted }}>{marinaProfile?.name ?? 'Your marina'}</div>
      </div>

      {/* Upcoming Stay card — transient bookings (shown when there's no resident lease) */}
      {(!leaseProfile || leaseProfile.status !== 'active') && upcomingBookings.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.teal, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>Upcoming Stay{upcomingBookings.length > 1 ? 's' : ''}</div>
          {upcomingBookings.map((b, i) => (
            <button key={b.id || i} onClick={() => onTabChange('marinas')}
              style={{ width:'100%', textAlign:'left', cursor:'pointer', fontFamily:FONT, background: 'linear-gradient(135deg,rgba(77,214,200,0.18) 0%,rgba(77,214,200,0.06) 100%)', border: `1px solid ${C.tealBorder}`, borderRadius: 18, padding: '16px', marginBottom: 8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                <span style={{ fontSize:16, fontWeight:800, color:C.white }}>{b.assigned_slip_label ? `Slip ${b.assigned_slip_label}` : 'Transient Stay'}</span>
                <span style={{ fontSize:11, fontWeight:700, color: b.status==='confirmed' ? '#4ade80' : '#f59e0b' }}>{b.status==='confirmed' ? '💳 Paid' : '⏳ Pending'}</span>
              </div>
              <div style={{ fontSize:12, color:C.muted }}>{b.vessel_name || 'Vessel'} · {b.arrival_date}{b.departure_date ? ` → ${b.departure_date}` : ''}{b.nights ? ` · ${b.nights} night${b.nights>1?'s':''}` : ''}</div>
            </button>
          ))}
        </div>
      )}

      {/* Vessel + Slip — boarding pass (resident berth only when a real lease exists) */}
      {leaseProfile?.status === 'active' && (
      <div style={{ background: 'linear-gradient(135deg,rgba(77,214,200,0.18) 0%,rgba(77,214,200,0.06) 100%)', border: `1px solid ${C.tealBorder}`, borderRadius: 20, padding: '20px', marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position:'absolute', right:-30, top:-30, width:140, height:140, borderRadius:'50%', background:'rgba(77,214,200,0.05)' }} />
        <div style={{ fontSize: 10, fontWeight: 700, color: C.teal, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>Your Berth</div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.white, letterSpacing: -0.3 }}>{vessel?.name ?? 'No vessel yet'}</div>
            {vessel && <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{[vessel.length_ft && `${vessel.length_ft}ft`, vessel.vessel_type].filter(Boolean).join(' · ')}</div>}
          </div>
          {spaceProfile?.label && (
            <div style={{ textAlign:'right', flexShrink:0, marginLeft:12 }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: C.teal, letterSpacing: -1 }}>{spaceProfile.label}</div>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{spaceProfile.dock ? `Dock ${spaceProfile.dock}` : 'Slip'}</div>
            </div>
          )}
        </div>
        {leaseProfile?.status === 'active' && (
          <div style={{ marginTop: 14, display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#4ade80' }} />
            <div style={{ fontSize: 11, color:'#4ade80', fontWeight:700 }}>Active Lease</div>
            {leaseProfile.monthlyRate && <div style={{ fontSize:11, color:C.muted }}>· ${leaseProfile.monthlyRate}/mo</div>}
          </div>
        )}
      </div>
      )}

      {/* No lease + no bookings — prompt to discover */}
      {(!leaseProfile || leaseProfile.status !== 'active') && upcomingBookings.length === 0 && (
        <button onClick={() => onTabChange('marinas')}
          style={{ width:'100%', textAlign:'left', cursor:'pointer', fontFamily:FONT, background:'rgba(255,255,255,0.05)', border:`1px dashed ${C.tealBorder}`, borderRadius:18, padding:'18px', marginBottom:14 }}>
          <div style={{ fontSize:15, fontWeight:800, color:C.white, marginBottom:3 }}>🧭 Find a slip</div>
          <div style={{ fontSize:12, color:C.muted }}>Browse marinas and book a transient stay.</div>
        </button>
      )}

      {/* Balance — tappable → invoice history */}
      <button onClick={() => setShowInvoices(true)} style={{ width:'100%', background:'none', border:'none', padding:0, cursor:'pointer', textAlign:'left', marginBottom:14 }}>
        <div style={{ background: C.card, border: `1px solid ${hasOverdue ? 'rgba(248,113,113,0.35)' : unpaidTotal > 0 ? 'rgba(250,204,21,0.35)' : 'rgba(74,222,128,0.3)'}`, borderRadius: 20, padding: '18px 20px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:8 }}>Balance Due</div>
              {invoicesLoading
                ? <div style={{ fontSize:13, color:C.muted }}>Loading…</div>
                : <div style={{ fontSize:32, fontWeight:900, letterSpacing:-1.5, color: hasOverdue ? '#f87171' : unpaidTotal > 0 ? '#facc15' : '#4ade80' }}>${unpaidTotal.toFixed(2)}</div>}
              {!invoicesLoading && hasOverdue && <div style={{ fontSize:11, color:'#f87171', fontWeight:700, marginTop:4 }}>Overdue — tap to pay</div>}
              {!invoicesLoading && !hasOverdue && unpaidTotal > 0 && <div style={{ fontSize:11, color:'#facc15', fontWeight:600, marginTop:4 }}>Tap to view & pay</div>}
              {!invoicesLoading && !hasOverdue && unpaidTotal <= 0 && <div style={{ fontSize:11, color:'#4ade80', fontWeight:600, marginTop:4 }}>All paid up — tap for history</div>}
            </div>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
              <div style={{ fontSize:32 }}>{hasOverdue ? '⚠️' : unpaidTotal > 0 ? '📋' : '✅'}</div>
              <div style={{ fontSize:10, color:C.muted2, fontWeight:600 }}>View all →</div>
            </div>
          </div>
        </div>
      </button>

      {/* Quick actions */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
        {(['messages','log','vessel','weather'] as HomeTab[]).map(tab => {
          const info: Record<string,[string,string,string]> = {
            messages: ['💬','Messages','Marina team'],
            log:      ['📓',"Ship's Log",'Add entry'],
            vessel:   ['⚓','My Vessel','Details & docs'],
            weather:  ['🌊','Weather','Marine forecast'],
          }
          const [emoji, label, sub] = info[tab] ?? ['','','']
          return (
            <button key={tab} onClick={() => onTabChange(tab)}
              style={{ background:C.card, border:`1px solid ${C.cardBorder}`, borderRadius:16, padding:'16px 14px', textAlign:'left', cursor:'pointer', fontFamily:FONT }}>
              <div style={{ fontSize:22, marginBottom:6 }}>{emoji}</div>
              <div style={{ fontSize:14, fontWeight:700, color:C.white }}>{label}</div>
              <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{sub}</div>
            </button>
          )
        })}
      </div>

      {/* Marina contact */}
      {marinaProfile && (
        <div style={{ background:C.card, border:`1px solid ${C.cardBorder}`, borderRadius:20, padding:'16px 18px' }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:10 }}>Your Marina</div>
          <div style={{ fontSize:16, fontWeight:700, color:C.white, marginBottom:4 }}>⚓ {marinaProfile.name}</div>
          {marinaProfile.address && <div style={{ fontSize:12, color:C.muted, marginBottom:10 }}>{marinaProfile.address}</div>}
          <div style={{ display:'flex', gap:8 }}>
            {marinaProfile.phone && (
              <a href={`tel:${marinaProfile.phone}`} style={{ flex:1, textAlign:'center', padding:'8px', background:'rgba(77,214,200,0.1)', border:`1px solid ${C.tealBorder}`, borderRadius:10, color:C.teal, fontSize:12, fontWeight:700, textDecoration:'none', display:'block' }}>📞 Call</a>
            )}
            <button onClick={() => onTabChange('messages')} style={{ flex:1, padding:'8px', background:'rgba(77,214,200,0.1)', border:`1px solid ${C.tealBorder}`, borderRadius:10, color:C.teal, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:FONT }}>💬 Message</button>
          </div>
        </div>
      )}
    </div>
  )
}

const SKIPPER_ENGINE = 'https://skipper-engine-production.up.railway.app'
const GREETING = `Welcome aboard — I'm Skipper, your personal boating assistant. You don't need to type a thing. Just talk to me and I'll record everything — boat specs, maintenance, anything. You can also upload documents right here (registration, insurance, whatever you have) so marinas always have them on file. Let's start: tell me your boat's name, make, length, and whatever specs you know. I'll build your first profile.`

function SkipperFloat({ user, profile, vessel, onRefreshVessels, coupledMarinas }: { user: User; profile: Profile|null; vessel: Vessel|null; onRefreshVessels: () => void; coupledMarinas: Marina[] }) {
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
        <SkipperChat user={user} profile={profile} vessel={vessel} msgs={msgs} setMsgs={setMsgs} onClose={() => setOpen(false)} onRefreshVessels={onRefreshVessels} coupledMarinas={coupledMarinas} />
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

function SkipperChat({ user, profile, vessel, msgs, setMsgs, onClose, onRefreshVessels, coupledMarinas }: { user: User; profile: Profile|null; vessel: Vessel|null; msgs: {role:string;text:string}[]; setMsgs: React.Dispatch<React.SetStateAction<{role:string;text:string}[]>>; onClose: () => void; onRefreshVessels: () => void; coupledMarinas: Marina[] }) {
  const [draft,      setDraft]      = useState('')
  const [sending,    setSending]    = useState(false)
  const [uploading,  setUploading]  = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const displayName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || user.email
    : user.email

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
      contact_id:    profile?.contact_id ?? null,
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
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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
    fetch(`/api/account?auth_user_id=${user.id}`)
      .then(res => res.ok ? res.json() : { contact: null })
      .then(({ contact }) => {
        if (contact) {
          setRawContact(contact as Record<string, unknown>)
          onProfileUpdated(contactToProfile(contact))
        }
      })
      .catch(() => {})
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
        <OPSShell>
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
        </OPSShell>
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
  const stripBase: React.CSSProperties = {
    width:'100%', background:'rgba(255,255,255,0.04)', border:'none',
    borderBottom:'1px solid rgba(255,255,255,0.06)', padding:'7px 20px',
    cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
    gap:14, fontFamily:FONT, flexShrink:0, minHeight:34,
  }

  // Always render — show subtle loading state until data arrives
  if (!data?.current?.temp_f) {
    return (
      <button onClick={onTap} style={stripBase}>
        <span style={{ fontSize:12, color:C.muted2, fontWeight:500 }}>📍 Tap for marine weather</span>
      </button>
    )
  }

  const { current, tides } = data
  const nextTide = tides?.next
  const tideDir  = tides?.is_rising ? '↑' : '↓'
  const tideTime = nextTide
    ? new Date(nextTide.time).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit', hour12:true })
    : null
  return (
    <button onClick={onTap} style={stripBase}>
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
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: w.location_name ? 4 : 20 }}>
        <SectionTitle>Marine Weather</SectionTitle>
        <button onClick={onRefresh} style={{ background:'none', border:'none', color:C.teal, fontSize:11, fontFamily:FONT, cursor:'pointer', fontWeight:700 }}>Refresh ↻</button>
      </div>
      {w.location_name && (
        <div style={{ fontSize:13, color:C.muted, marginBottom:16, display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:14 }}>📍</span>{w.location_name}
        </div>
      )}

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
function IcoHome({ active }: { active: boolean }) {
  const col = active ? '#4dd6c8' : 'rgba(255,255,255,0.55)'
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 21V12h6v9" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
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
function IcoLog({ active }: { active: boolean }) {
  const c = active ? C.teal : C.muted
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" fill={active?'rgba(77,214,200,0.1)':'none'}/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={c} strokeWidth="1.8" strokeLinecap="round"/></svg>
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
