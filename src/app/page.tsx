'use client'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase-client'
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
type Screen = 'splash' | 'auth' | 'contact_setup' | 'pin_setup' | 'pin_login' | 'home'
type HomeTab = 'vessel' | 'skipper' | 'marinas' | 'account'
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
}

type Vessel = {
  id: string
  name: string
  vessel_type: string
  length_ft: number | null
  beam_ft: number | null
  draft_ft: number | null
  shore_power: string | null
  fuel_type: string | null
  make: string | null
  model: string | null
  year: number | null
  color: string | null
  weight_lbs: number | null
  air_draft_ft: number | null
  hin: string | null
  registration_number: string | null
  registration_state: string | null
  registration_expiry: string | null
  documentation_number: string | null
  mmsi_number: string | null
  flag_state: string | null
  hull_material: string | null
  engine_count: number | null
  engine_type: string | null
  engine_make: string | null
  engine_model: string | null
  engine_year: number | null
  horsepower_per_engine: number | null
  fuel_tank_gallons: number | null
  insurance_provider: string | null
  insurance_policy: string | null
  insurance_expiry: string | null
  insurance_agent_name: string | null
  insurance_agent_phone: string | null
  last_survey_date: string | null
  photo_url: string | null
  notes: string | null
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
    photo_url: a.photo_url ?? null,
    notes: a.notes ?? null,
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
  const [screen,    setScreen]    = useState<Screen>('splash')
  const [user,      setUser]      = useState<User | null>(null)
  const [profile,   setProfile]   = useState<Profile | null>(null)
  const [vessel,    setVessel]    = useState<Vessel | null>(null)   // primary (top bar)
  const [vessels,   setVessels]   = useState<Vessel[]>([])
  const [vesselIds, setVesselIds] = useState<string[]>([])
  const [homeTab,   setHomeTab]   = useState<HomeTab>('vessel')
  const [savedEmail,setSavedEmail]= useState('')
  const [vesselId,  setVesselId]  = useState<string|null>(null)

  useEffect(() => {
    const storedEmail = localStorage.getItem('skipper_email') ?? ''
    const storedUserId = localStorage.getItem('skipper_user_id') ?? ''
    setSavedEmail(storedEmail)

    if (!storedUserId) {
      setScreen('auth')
      return
    }

    const fakeUser = { id: storedUserId, email: storedEmail } as User
    setUser(fakeUser)

    if (localStorage.getItem(`skipper_pin_${storedUserId}`)) {
      setScreen('pin_login')
    } else {
      routeAfterAuth(fakeUser)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function routeAfterAuth(u: User) {
    localStorage.setItem('skipper_user_id', u.id)
    try {
      // Look up national-pool contacts row (marina_id IS NULL)
      let { data: contact } = await supabase
        .from('contacts')
        .select('*')
        .eq('auth_user_id', u.id)
        .is('marina_id', null)
        .maybeSingle()

      if (!contact) {
        const { data: newContact, error: insertErr } = await supabase
          .from('contacts')
          .insert({ auth_user_id: u.id, email: u.email ?? null })
          .select()
          .single()
        if (insertErr) console.error('[Skipper] contact insert:', insertErr.message)
        contact = newContact
      }

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
      setVessel(loadedVessels[0] ?? null)
      setVesselId(loadedIds[0] ?? null)

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

      // ── Bidirectional sync: pull marina (abc-marina.ayeayeskipper.com) data into
      // national-pool row on every login. If Helm has a more recent record (updated_at
      // newer than national-pool), overwrite all profile fields so the boater always
      // sees the current marina data. Falls back to fill-gaps if updated_at is equal.
      if (contact) {
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
          const marinaTime  = new Date(marinaContact.updated_at ?? 0).getTime()
          const nationalTime = new Date((contact as any).updated_at ?? 0).getTime()
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
            const marinaVal  = (marinaContact as any)[f]
            const nationalVal = (contact as any)[f]
            // Overwrite if marina is newer, or fill gap if national is null
            if (marinaVal != null && (marinaTime > nationalTime || nationalVal == null)) {
              patch[f] = marinaVal
            }
          }
          if (Object.keys(patch).length > 0) {
            const { data: synced } = await supabase
              .from('contacts')
              .update(patch)
              .eq('auth_user_id', u.id)
              .is('marina_id', null)
              .select()
              .single()
            if (synced) contact = synced
            console.log(`[Skipper] Synced ${Object.keys(patch).length} field(s) from Helm → app`)
          }
        }
      }

      // Build profile AFTER sync so display reflects latest data
      const prof = contact ? contactToProfile(contact) : null
      setProfile(prof)

      if (!prof?.first_name)  { setScreen('contact_setup'); return }
      if (!contact?.pin_hash) { setScreen('pin_setup'); return }

      const unlocked = localStorage.getItem(`skipper_unlocked_${u.id}`)
      if (unlocked) { setScreen('home'); return }

      setScreen('pin_login')
    } catch(err) {
      console.error('[Skipper] routeAfterAuth failed:', err)
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
    setUser(null); setProfile(null); setVessel(null); setVesselId(null)
    setVessels([]); setVesselIds([])
    setScreen('auth')
  }

  // ── Splash ──
  if (screen === 'splash') return <SplashScreen />

  // ── Auth ──
  if (screen === 'auth') return (
    <AuthScreen
      savedEmail={savedEmail}
      onAuthed={async (u, email) => {
        localStorage.setItem('skipper_email', email)
        localStorage.setItem('skipper_user_id', u.id)
        setUser(u)
        await routeAfterAuth(u)
      }}
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

  // ── PIN Login (returning user) ──
  if (screen === 'pin_login') return (
    <PinLoginScreen
      user={user!}
      email={savedEmail || user?.email || ''}
      onUnlock={() => {
        localStorage.setItem(`skipper_unlocked_${user!.id}`, '1')
        setScreen('home')
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
      onProfileUpdated={(p) => setProfile(p)}
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

// ─── Auth (email only — no OTP, no magic link) ────────────────────────────────
function AuthScreen({ savedEmail, onAuthed }: {
  savedEmail: string
  onAuthed: (u: User, email: string) => void
}) {
  const [email, setEmail] = useState(savedEmail)
  const [busy,  setBusy]  = useState(false)
  const [err,   setErr]   = useState('')

  async function submit() {
    const clean = email.trim().toLowerCase()
    if (!clean || !clean.includes('@')) { setErr('Enter your email'); return }
    setBusy(true); setErr('')

    // Look up existing national-pool contact
    const { data: contact } = await supabase
      .from('contacts')
      .select('id, auth_user_id')
      .eq('email', clean)
      .is('marina_id', null)
      .maybeSingle()

    let authUserId = contact?.auth_user_id as string | null

    if (!contact) {
      // Brand-new boater — create national-pool row
      const newId = crypto.randomUUID()
      const { error } = await supabase
        .from('contacts')
        .insert({ auth_user_id: newId, email: clean })
      if (error) { setBusy(false); setErr(error.message); return }
      authUserId = newId
    } else if (!authUserId) {
      // Marina-added contact without auth — link a new UUID
      const newId = crypto.randomUUID()
      await supabase.from('contacts').update({ auth_user_id: newId }).eq('id', contact.id)
      authUserId = newId
    }

    setBusy(false)
    onAuthed({ id: authUserId!, email: clean } as User, clean)
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
            New here? Just enter your email — we&apos;ll set up your account.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Contact Setup (Step 1 — new user) ────────────────────────────────────────
function ContactSetupScreen({ user, onComplete }: { user: User; onComplete: (p: Profile) => void }) {
  const [firstName,   setFirstName]   = useState('')
  const [lastName,    setLastName]    = useState('')
  const [mobile,      setMobile]      = useState('')
  const [title,       setTitle]       = useState('')
  const [dob,         setDob]         = useState('')
  const [dlNum,       setDlNum]       = useState('')
  const [prefContact, setPrefContact] = useState('')
  const [language,    setLanguage]    = useState('en')
  const [address,     setAddress]     = useState('')
  const [city,        setCity]        = useState('')
  const [addrState,   setAddrState]   = useState('')
  const [zip,         setZip]         = useState('')
  const [emergName,   setEmergName]   = useState('')
  const [emergPhone,  setEmergPhone]  = useState('')
  const [busy,        setBusy]        = useState(false)
  const [err,         setErr]         = useState('')

  async function save() {
    if (!firstName.trim()) { setErr('First name is required'); return }
    if (!lastName.trim())  { setErr('Last name is required'); return }
    setBusy(true); setErr('')

    const { data, error } = await supabase
      .from('contacts')
      .update({
        first_name:               firstName.trim(),
        last_name:                lastName.trim(),
        email:                    user.email ?? null,
        mobile:                   mobile.trim() || null,
        title:                    title || null,
        date_of_birth:            dob || null,
        driver_license_number:    dlNum.trim() || null,
        preferred_contact_method: prefContact || null,
        language_preference:      language || 'en',
        address:                  address.trim() || null,
        address_city:             city.trim() || null,
        address_state:            addrState.trim() || null,
        address_zip:              zip.trim() || null,
        emergency_name:           emergName.trim() || null,
        emergency_phone:          emergPhone.trim() || null,
        setup_complete:           false,
      })
      .eq('auth_user_id', user.id)
      .is('marina_id', null)
      .select()
      .single()

    setBusy(false)
    if (error) { setErr(error.message); return }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      Notification.requestPermission().catch(() => {})
    }

    onComplete(contactToProfile(data))
  }

  return (
    <OnboardingShell step={1} total={2} title="About you" subtitle="Your marina needs this on file. You'll only do this once.">
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <FieldGroup label="First name *">
          <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" autoFocus />
        </FieldGroup>
        <FieldGroup label="Last name *">
          <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" />
        </FieldGroup>
      </div>

      <FieldGroup label="Email">
        <Input type="email" value={user.email ?? ''} readOnly style={{ opacity:0.6, cursor:'default' }} />
      </FieldGroup>
      <FieldGroup label="Mobile phone">
        <Input type="tel" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="(555) 867-5309" />
      </FieldGroup>

      <FormSectionLabel>ID &amp; Preferences</FormSectionLabel>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <FieldGroup label="Title">
          <SelectInput value={title} onChange={e => setTitle(e.target.value)}>
            <option value="">Select…</option>
            {['Mr.','Mrs.','Ms.','Dr.','Capt.','Other'].map(v => <option key={v}>{v}</option>)}
          </SelectInput>
        </FieldGroup>
        <FieldGroup label="Date of Birth">
          <Input type="date" value={dob} onChange={e => setDob(e.target.value)} />
        </FieldGroup>
        <FieldGroup label="Driver License #">
          <Input value={dlNum} onChange={e => setDlNum(e.target.value)} placeholder="DL12345678" />
        </FieldGroup>
        <FieldGroup label="Preferred Contact">
          <SelectInput value={prefContact} onChange={e => setPrefContact(e.target.value)}>
            <option value="">Select…</option>
            {['email','sms','phone','app'].map(v => <option key={v} value={v}>{v.toUpperCase()}</option>)}
          </SelectInput>
        </FieldGroup>
      </div>
      <FieldGroup label="Language">
        <SelectInput value={language} onChange={e => setLanguage(e.target.value)}>
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="fr">Français</option>
          <option value="pt">Português</option>
          <option value="zh">中文</option>
          <option value="other">Other</option>
        </SelectInput>
      </FieldGroup>

      <FormSectionLabel>Home Address</FormSectionLabel>
      <FieldGroup label="Street address">
        <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Harbor Dr" />
      </FieldGroup>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 90px', gap:10 }}>
        <FieldGroup label="City">
          <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Newport" />
        </FieldGroup>
        <FieldGroup label="State">
          <Input value={addrState} onChange={e => setAddrState(e.target.value)} placeholder="RI" maxLength={2} />
        </FieldGroup>
        <FieldGroup label="ZIP">
          <Input value={zip} onChange={e => setZip(e.target.value)} placeholder="02840" />
        </FieldGroup>
      </div>

      <FormSectionLabel>Emergency Contact</FormSectionLabel>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <FieldGroup label="Name">
          <Input value={emergName} onChange={e => setEmergName(e.target.value)} placeholder="John Smith" />
        </FieldGroup>
        <FieldGroup label="Phone">
          <Input type="tel" value={emergPhone} onChange={e => setEmergPhone(e.target.value)} placeholder="(555) 000-0000" />
        </FieldGroup>
      </div>

      {err && <ErrMsg>{err}</ErrMsg>}
      <PrimaryBtn onClick={save} loading={busy} style={{ marginTop:8 }}>Save & Continue →</PrimaryBtn>
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
    const { error } = await supabase
      .from('contacts')
      .update({ pin_hash: hash, setup_complete: true })
      .eq('auth_user_id', user.id)
      .is('marina_id', null)
    setBusy(false)
    if (error) { setErr(error.message); return }
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
      const { data } = await supabase.from('contacts').select('pin_hash').eq('auth_user_id', user.id).is('marina_id', null).single()
      match = !!data?.pin_hash && data.pin_hash === hash
      if (match && data?.pin_hash) localStorage.setItem(`skipper_pin_${user.id}`, data.pin_hash)
    }
    setBusy(false)
    if (!match) {
      setPin(''); setErr('Wrong PIN'); setShake(true)
      setTimeout(() => setShake(false), 600)
      return
    }
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
function HomeScreen({ user, profile, vessel, vessels, vesselIds, activeTab, onTabChange, onSignOut, onVesselSaved, onProfileUpdated }: {
  user: User; profile: Profile|null; vessel: Vessel|null; vessels: Vessel[]; vesselIds: string[]; activeTab: HomeTab
  onTabChange: (t: HomeTab) => void; onSignOut: () => void
  onVesselSaved: (v: Vessel, id: string) => void; onProfileUpdated: (p: Profile) => void
}) {
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
          {vessel && (
            <div style={{ fontSize:12, color:C.teal, fontWeight:700, background:C.tealDim, border:`1px solid ${C.tealBorder}`, borderRadius:20, padding:'4px 10px' }}>
              ⛵ {vessel.name}
            </div>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch' }}>
        {activeTab === 'vessel'   && <TabVessel   vessels={vessels} vesselIds={vesselIds} user={user} profile={profile} onVesselSaved={onVesselSaved} />}
        {activeTab === 'skipper'  && <TabSkipper  user={user} profile={profile} vessel={vessel} />}
        {activeTab === 'marinas'  && <TabMarinas  user={user} profile={profile} vessel={vessel} />}
        {activeTab === 'account'  && <TabAccount  user={user} profile={profile} vessel={vessel} onSignOut={onSignOut} onProfileUpdated={onProfileUpdated} />}
      </div>

      {/* Bottom nav */}
      <div style={{ flexShrink:0, borderTop:`1px solid rgba(255,255,255,0.08)`, background:'rgba(5,17,31,0.95)', backdropFilter:'blur(12px)', display:'flex', justifyContent:'space-around', alignItems:'center', padding:'10px 0 env(safe-area-inset-bottom,10px)' }}>
        <NavBtn icon={<IcoVessel  active={activeTab==='vessel'}  />} label="My Vessel"  active={activeTab==='vessel'}  onClick={() => onTabChange('vessel')}  />
        <NavBtn icon={<IcoSkipper active={activeTab==='skipper'} />} label="Skipper"    active={activeTab==='skipper'} onClick={() => onTabChange('skipper')} />
        <NavBtn icon={<IcoMarinas active={activeTab==='marinas'} />} label="Marinas"    active={activeTab==='marinas'} onClick={() => onTabChange('marinas')} />
        <NavBtn icon={<IcoAcct   active={activeTab==='account'}  />} label="Account"    active={activeTab==='account'}  onClick={() => onTabChange('account')}  />
      </div>
    </div>
  )
}

// ─── TAB 1: My Vessel ─────────────────────────────────────────────────────────
function TabVessel({ vessels, vesselIds, user, profile, onVesselSaved }: {
  vessels: Vessel[]; vesselIds: string[]; user: User; profile: Profile|null; onVesselSaved: (v: Vessel, id: string) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [editingVessel, setEditingVessel] = useState<Vessel|null>(null)
  const [editingVesselId, setEditingVesselId] = useState<string|null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [berths, setBerths] = useState<BerthData[]>([])
  const [berthLoading, setBerthLoading] = useState(true)

  useEffect(() => {
    async function loadBerths() {
      setBerthLoading(true)
      // 1. Get all coupled marina contacts for this boater
      const { data: coupled } = await supabase
        .from('contacts')
        .select('id, marina_id')
        .eq('auth_user_id', user.id)
        .not('marina_id', 'is', null)

      if (!coupled || coupled.length === 0) { setBerthLoading(false); return }

      const contactIds = coupled.map((c: { id: string }) => c.id)
      const marinaIds  = coupled.map((c: { marina_id: string }) => c.marina_id).filter(Boolean)

      // 2. Active leases for all coupled contacts
      const { data: leases } = await supabase
        .from('leases')
        .select('id, tenant_id, slip_id, monthly_rate, lease_type, start_date, end_date')
        .in('tenant_id', contactIds)
        .eq('status', 'active')

      if (!leases || leases.length === 0) { setBerthLoading(false); return }

      // 3. Slip details
      const slipIds = leases.map((l: { slip_id: string }) => l.slip_id).filter(Boolean)
      const [{ data: slips }, { data: marinas }] = await Promise.all([
        slipIds.length > 0
          ? supabase.from('slips').select('id, slip_number, dock').in('id', slipIds)
          : Promise.resolve({ data: [] }),
        supabase.from('marinas').select('id, name').in('id', marinaIds),
      ])

      // 4. Build lookup maps
      const slipMap: Record<string, { slip_number: string; dock: string }> =
        Object.fromEntries((slips ?? []).map((s: { id: string; slip_number: string; dock: string }) => [s.id, s]))
      const marinaMap: Record<string, string> =
        Object.fromEntries((marinas ?? []).map((m: { id: string; name: string }) => [m.id, m.name]))
      const contactMarinaMap: Record<string, string> =
        Object.fromEntries(coupled.map((c: { id: string; marina_id: string }) => [c.id, c.marina_id]))

      // 5. Build BerthData array
      const result: BerthData[] = leases.map((lease: {
        id: string; tenant_id: string; slip_id: string;
        monthly_rate: number | null; lease_type: string | null;
        start_date: string | null; end_date: string | null;
      }) => {
        const marinaId  = contactMarinaMap[lease.tenant_id]
        const slip      = slipMap[lease.slip_id]
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

  // Form state — covers all columns
  const blank = {
    name:'', vessel_type:'',
    make:'', model:'', year:'', color:'',
    length_ft:'', beam_ft:'', draft_ft:'', weight_lbs:'', air_draft_ft:'',
    hin:'', registration_number:'', registration_state:'', registration_expiry:'',
    documentation_number:'', mmsi_number:'', flag_state:'',
    hull_material:'',
    engine_count:'', engine_type:'', engine_make:'', engine_model:'', engine_year:'', horsepower_per_engine:'', fuel_type:'', fuel_tank_gallons:'', shore_power:'',
    insurance_provider:'', insurance_policy:'', insurance_expiry:'', insurance_agent_name:'', insurance_agent_phone:'',
    last_survey_date:'', photo_url:'', notes:''
  }
  const [form, setForm] = useState<Record<string,string>>(blank)
  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  // Doc / flag fields (match Helm boat tab)
  const [docRegistration,   setDocRegistration]   = useState(false)
  const [docInsuranceCert,  setDocInsuranceCert]  = useState(false)
  const [docSignedContract, setDocSignedContract] = useState(false)
  const [docPhotoId,        setDocPhotoId]        = useState(false)
  const [isLiveaboard,      setIsLiveaboard]      = useState(false)
  const [petOnBoard,        setPetOnBoard]        = useState(false)
  const [parkingPermit,     setParkingPermit]     = useState('')

  function openEdit(v: Vessel|null, id: string|null) {
    setEditingVessel(v)
    setEditingVesselId(id)
    if (v) {
      setForm({
        name: v.name ?? '',
        vessel_type: v.vessel_type ?? '',
        make: v.make ?? '',
        model: v.model ?? '',
        year: v.year?.toString() ?? '',
        color: v.color ?? '',
        length_ft: v.length_ft?.toString() ?? '',
        beam_ft: v.beam_ft?.toString() ?? '',
        draft_ft: v.draft_ft?.toString() ?? '',
        weight_lbs: v.weight_lbs?.toString() ?? '',
        air_draft_ft: v.air_draft_ft?.toString() ?? '',
        hin: v.hin ?? '',
        registration_number: v.registration_number ?? '',
        registration_state: v.registration_state ?? '',
        registration_expiry: v.registration_expiry ?? '',
        documentation_number: v.documentation_number ?? '',
        mmsi_number: v.mmsi_number ?? '',
        flag_state: v.flag_state ?? '',
        hull_material: v.hull_material ?? '',
        engine_count: v.engine_count?.toString() ?? '',
        engine_type: v.engine_type ?? '',
        engine_make: v.engine_make ?? '',
        engine_model: v.engine_model ?? '',
        engine_year: v.engine_year?.toString() ?? '',
        horsepower_per_engine: v.horsepower_per_engine?.toString() ?? '',
        fuel_type: v.fuel_type ?? '',
        fuel_tank_gallons: v.fuel_tank_gallons?.toString() ?? '',
        shore_power: v.shore_power ?? '',
        insurance_provider: v.insurance_provider ?? '',
        insurance_policy: v.insurance_policy ?? '',
        insurance_expiry: v.insurance_expiry ?? '',
        insurance_agent_name: v.insurance_agent_name ?? '',
        insurance_agent_phone: v.insurance_agent_phone ?? '',
        last_survey_date: v.last_survey_date ?? '',
        photo_url: v.photo_url ?? '',
        notes: v.notes ?? '',
      })
      setDocRegistration(v.doc_registration ?? false)
      setDocInsuranceCert(v.doc_insurance_cert ?? false)
      setDocSignedContract(v.doc_signed_contract ?? false)
      setDocPhotoId(v.doc_photo_id ?? false)
      setIsLiveaboard(v.liveaboard ?? false)
      setPetOnBoard(v.pet_on_board ?? false)
      setParkingPermit(v.parking_permit ?? '')
    } else {
      setForm(blank)
      setDocRegistration(false); setDocInsuranceCert(false)
      setDocSignedContract(false); setDocPhotoId(false)
      setIsLiveaboard(false); setPetOnBoard(false); setParkingPermit('')
    }
    setErr('')
    setShowForm(true)
  }

  function numOrNull(v: string) { const n = parseFloat(v); return isNaN(n) ? null : n }
  function intOrNull(v: string) { const n = parseInt(v); return isNaN(n) ? null : n }

  async function saveVessel() {
    if (!form.name.trim())        { setErr('Vessel name is required'); return }
    if (!form.vessel_type.trim()) { setErr('Vessel type is required'); return }
    if (!form.length_ft.trim())   { setErr('Length (LOA) is required'); return }
    if (!form.beam_ft.trim())     { setErr('Beam is required'); return }
    if (!form.draft_ft.trim())    { setErr('Draft is required'); return }
    if (!form.air_draft_ft.trim()){ setErr('Air Draft is required'); return }
    setBusy(true); setErr('')

    // Resolve contact_id — never allow null tenant_id
    let contactId = profile?.contact_id ?? null
    if (!contactId) {
      const { data: c } = await supabase
        .from('contacts')
        .select('id')
        .eq('auth_user_id', user.id)
        .is('marina_id', null)
        .maybeSingle()
      contactId = c?.id ?? null
    }
    if (!contactId) { setBusy(false); setErr('Could not resolve your account — please sign out and back in.'); return }

    // Write vessel data to marina_assets
    const assetPayload = {
      tenant_id:            contactId,
      marina_id:            null,
      owner_type:           'customer',
      status:               'active',
      asset_type:           form.vessel_type,
      name:                 form.name.trim(),
      make:                 form.make || null,
      model:                form.model || null,
      year:                 intOrNull(form.year),
      color:                form.color || null,
      length_ft:            numOrNull(form.length_ft),
      beam_ft:              numOrNull(form.beam_ft),
      draft_ft:             numOrNull(form.draft_ft),
      air_draft_ft:         numOrNull(form.air_draft_ft),
      weight_lbs:           numOrNull(form.weight_lbs),
      hin:                  form.hin || null,
      registration_number:  form.registration_number || null,
      registration_state:   form.registration_state || null,
      registration_expiry:  form.registration_expiry || null,
      documentation_number: form.documentation_number || null,
      mmsi_number:          form.mmsi_number || null,
      flag_state:           form.flag_state || null,
      hull_material:        form.hull_material || null,
      engine_count:         intOrNull(form.engine_count),
      engine_type:          form.engine_type || null,
      engine_make:          form.engine_make || null,
      engine_model:         form.engine_model || null,
      engine_year:          intOrNull(form.engine_year),
      horsepower_per_engine: intOrNull(form.horsepower_per_engine),
      fuel_type:            form.fuel_type || null,
      fuel_tank_gallons:    intOrNull(form.fuel_tank_gallons),
      shore_power:          form.shore_power || null,
      insurance_provider:   form.insurance_provider || null,
      insurance_policy:     form.insurance_policy || null,
      insurance_expiry:     form.insurance_expiry || null,
      insurance_agent_name: form.insurance_agent_name || null,
      insurance_agent_phone:form.insurance_agent_phone || null,
      last_survey_date:     form.last_survey_date || null,
      photo_url:            form.photo_url || null,
      notes:                form.notes || null,
      updated_at:           new Date().toISOString(),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let assetData: Record<string, any> | null = null
    let assetError: { message: string } | null = null

    if (editingVesselId) {
      const { data, error } = await supabase.from('marina_assets').update(assetPayload).eq('id', editingVesselId).select().single()
      assetData = data; assetError = error
    } else {
      const { data, error } = await supabase.from('marina_assets').insert(assetPayload).select().single()
      assetData = data; assetError = error
    }

    if (assetError) { setBusy(false); setErr(assetError.message); return }

    // Update doc/flag fields on contacts row — those columns still live there
    const { error: contactError } = await supabase
      .from('contacts')
      .update({
        doc_registration:    docRegistration,
        doc_insurance_cert:  docInsuranceCert,
        doc_signed_contract: docSignedContract,
        doc_photo_id:        docPhotoId,
        liveaboard:          isLiveaboard,
        pet_on_board:        petOnBoard,
        parking_permit:      parkingPermit.trim() || null,
        updated_at:          new Date().toISOString(),
      })
      .eq('auth_user_id', user.id)
      .is('marina_id', null)

    setBusy(false)
    if (contactError) { setErr(contactError.message); return }

    const contactFlags = {
      doc_registration: docRegistration,
      doc_insurance_cert: docInsuranceCert,
      doc_signed_contract: docSignedContract,
      doc_photo_id: docPhotoId,
      liveaboard: isLiveaboard,
      pet_on_board: petOnBoard,
      parking_permit: parkingPermit.trim() || null,
    }
    const newVesselId = assetData!.id as string
    onVesselSaved(assetRowToVessel(assetData!, contactFlags), newVesselId)
    setShowForm(false)
  }

  if (showForm) return (
    <div style={{ padding:'20px 20px 100px', animation:'fadeUp 0.3s ease both' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <button onClick={() => setShowForm(false)}
          style={{ background:'none', border:'none', color:C.muted, cursor:'pointer', fontSize:20, padding:'0 4px 0 0', fontFamily:FONT }}>←</button>
        <h2 style={{ margin:0, fontSize:20, fontWeight:800 }}>{editingVessel ? 'Edit Vessel' : 'Add Vessel'}</h2>
      </div>

      <FormSectionLabel>Identity</FormSectionLabel>
      <FieldGroup label="Vessel name *">
        <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder='e.g. "Happy Days"' autoFocus />
      </FieldGroup>
      <FieldGroup label="Type *">
        <SelectInput value={form.vessel_type} onChange={e => set('vessel_type', e.target.value)}>
          <option value="">Select type…</option>
          {['powerboat','sailboat','catamaran','trawler','pwc','pontoon','yacht','tender','kayak','trailer','other'].map(t => <option key={t}>{t}</option>)}
        </SelectInput>
      </FieldGroup>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <FieldGroup label="Make">
          <Input value={form.make} onChange={e => set('make', e.target.value)} placeholder="Sea Ray" />
        </FieldGroup>
        <FieldGroup label="Model">
          <Input value={form.model} onChange={e => set('model', e.target.value)} placeholder="240 SX" />
        </FieldGroup>
        <FieldGroup label="Year">
          <Input type="number" value={form.year} onChange={e => set('year', e.target.value)} placeholder="2022" />
        </FieldGroup>
        <FieldGroup label="Color">
          <Input value={form.color} onChange={e => set('color', e.target.value)} placeholder="White / Blue" />
        </FieldGroup>
      </div>

      <FormSectionLabel>Dimensions <span style={{fontSize:11,color:C.teal,fontWeight:600}}>* required for slip matching</span></FormSectionLabel>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
        <FieldGroup label="Length (ft) *">
          <Input type="number" value={form.length_ft} onChange={e => set('length_ft', e.target.value)} placeholder="34" />
        </FieldGroup>
        <FieldGroup label="Beam (ft) *">
          <Input type="number" value={form.beam_ft} onChange={e => set('beam_ft', e.target.value)} placeholder="11" />
        </FieldGroup>
        <FieldGroup label="Draft (ft) *">
          <Input type="number" value={form.draft_ft} onChange={e => set('draft_ft', e.target.value)} placeholder="3.5" />
        </FieldGroup>
        <FieldGroup label="Weight (lbs)">
          <Input type="number" value={form.weight_lbs} onChange={e => set('weight_lbs', e.target.value)} placeholder="6200" />
        </FieldGroup>
        <FieldGroup label="Air Draft (ft) *">
          <Input type="number" value={form.air_draft_ft} onChange={e => set('air_draft_ft', e.target.value)} placeholder="12" />
        </FieldGroup>
      </div>

      <FormSectionLabel>Registration</FormSectionLabel>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <FieldGroup label="Hull ID (HIN)">
          <Input value={form.hin} onChange={e => set('hin', e.target.value)} placeholder="ABC12345D678" />
        </FieldGroup>
        <FieldGroup label="Registration #">
          <Input value={form.registration_number} onChange={e => set('registration_number', e.target.value)} />
        </FieldGroup>
        <FieldGroup label="Reg State">
          <Input value={form.registration_state} onChange={e => set('registration_state', e.target.value)} placeholder="NY" maxLength={2} />
        </FieldGroup>
        <FieldGroup label="Reg Expiry">
          <Input type="date" value={form.registration_expiry} onChange={e => set('registration_expiry', e.target.value)} />
        </FieldGroup>
        <FieldGroup label="USCG Doc #">
          <Input value={form.documentation_number} onChange={e => set('documentation_number', e.target.value)} />
        </FieldGroup>
        <FieldGroup label="MMSI #">
          <Input value={form.mmsi_number} onChange={e => set('mmsi_number', e.target.value)} />
        </FieldGroup>
        <FieldGroup label="Flag State">
          <Input value={form.flag_state} onChange={e => set('flag_state', e.target.value)} placeholder="USA" />
        </FieldGroup>
        <FieldGroup label="Hull Material">
          <SelectInput value={form.hull_material} onChange={e => set('hull_material', e.target.value)}>
            <option value="">Select…</option>
            {['Fiberglass','Aluminum','Steel','Wood','Carbon Fiber','Other'].map(v => <option key={v}>{v}</option>)}
          </SelectInput>
        </FieldGroup>
      </div>

      <FormSectionLabel>Engine & Fuel</FormSectionLabel>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <FieldGroup label="# Engines">
          <Input type="number" value={form.engine_count} onChange={e => set('engine_count', e.target.value)} placeholder="1" />
        </FieldGroup>
        <FieldGroup label="Engine Type">
          <SelectInput value={form.engine_type} onChange={e => set('engine_type', e.target.value)}>
            <option value="">Select…</option>
            {['Outboard','Inboard','Sterndrive (I/O)','Jet Drive','Diesel Inboard','Electric','None / Sail'].map(v => <option key={v}>{v}</option>)}
          </SelectInput>
        </FieldGroup>
        <FieldGroup label="Engine Make">
          <Input value={form.engine_make} onChange={e => set('engine_make', e.target.value)} placeholder="Yamaha" />
        </FieldGroup>
        <FieldGroup label="Engine Model">
          <Input value={form.engine_model} onChange={e => set('engine_model', e.target.value)} />
        </FieldGroup>
        <FieldGroup label="Engine Year">
          <Input type="number" value={form.engine_year} onChange={e => set('engine_year', e.target.value)} />
        </FieldGroup>
        <FieldGroup label="HP (per engine)">
          <Input type="number" value={form.horsepower_per_engine} onChange={e => set('horsepower_per_engine', e.target.value)} placeholder="150" />
        </FieldGroup>
        <FieldGroup label="Fuel Type">
          <SelectInput value={form.fuel_type} onChange={e => set('fuel_type', e.target.value)}>
            <option value="">Select…</option>
            {['Gas','Diesel','Electric','Hybrid'].map(v => <option key={v}>{v}</option>)}
          </SelectInput>
        </FieldGroup>
        <FieldGroup label="Fuel Tank (gal)">
          <Input type="number" value={form.fuel_tank_gallons} onChange={e => set('fuel_tank_gallons', e.target.value)} />
        </FieldGroup>
      </div>
      <FieldGroup label="Shore Power">
        <SelectInput value={form.shore_power} onChange={e => set('shore_power', e.target.value)}>
          <option value="">Select…</option>
          {['None','30A','50A','100A','Dual 30A','Dual 50A'].map(v => <option key={v}>{v}</option>)}
        </SelectInput>
      </FieldGroup>

      <FormSectionLabel>Insurance</FormSectionLabel>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <FieldGroup label="Provider">
          <Input value={form.insurance_provider} onChange={e => set('insurance_provider', e.target.value)} placeholder="BoatUS" />
        </FieldGroup>
        <FieldGroup label="Policy #">
          <Input value={form.insurance_policy} onChange={e => set('insurance_policy', e.target.value)} />
        </FieldGroup>
        <FieldGroup label="Expiry">
          <Input type="date" value={form.insurance_expiry} onChange={e => set('insurance_expiry', e.target.value)} />
        </FieldGroup>
        <FieldGroup label="Agent Name">
          <Input value={form.insurance_agent_name} onChange={e => set('insurance_agent_name', e.target.value)} />
        </FieldGroup>
        <FieldGroup label="Agent Phone">
          <Input type="tel" value={form.insurance_agent_phone} onChange={e => set('insurance_agent_phone', e.target.value)} />
        </FieldGroup>
        <FieldGroup label="Last Survey">
          <Input type="date" value={form.last_survey_date} onChange={e => set('last_survey_date', e.target.value)} />
        </FieldGroup>
      </div>

      <FormSectionLabel>Notes</FormSectionLabel>
      <FieldGroup label="Notes">
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
          placeholder="Anything the marina should know…"
          style={{ width:'100%', padding:'14px 15px', background:C.inputBg, border:`1.5px solid ${C.inputBorder}`, borderRadius:14, color:C.white, fontSize:15, fontFamily:FONT, outline:'none' }} />
      </FieldGroup>

      <FormSectionLabel>Documents on File</FormSectionLabel>
      <div style={{ display:'flex', flexDirection:'column', gap:14, marginBottom:8 }}>
        {([
          ['Boat Registration',  docRegistration,   setDocRegistration],
          ['Insurance Cert',     docInsuranceCert,  setDocInsuranceCert],
          ['Signed Contract',    docSignedContract, setDocSignedContract],
          ['Photo ID',           docPhotoId,        setDocPhotoId],
        ] as [string, boolean, (v:boolean)=>void][]).map(([label, val, setter]) => (
          <label key={label} style={{ display:'flex', alignItems:'center', gap:12, cursor:'pointer' }}>
            <input type="checkbox" checked={val} onChange={e => setter(e.target.checked)}
              style={{ width:18, height:18, accentColor:C.teal, cursor:'pointer' }} />
            <span style={{ fontSize:14, color:C.white }}>{label}</span>
          </label>
        ))}
      </div>

      <FormSectionLabel>On Board</FormSectionLabel>
      <div style={{ display:'flex', flexDirection:'column', gap:14, marginBottom:8 }}>
        {([
          ['Liveaboard',   isLiveaboard, setIsLiveaboard],
          ['Pet on Board', petOnBoard,   setPetOnBoard],
        ] as [string, boolean, (v:boolean)=>void][]).map(([label, val, setter]) => (
          <label key={label} style={{ display:'flex', alignItems:'center', gap:12, cursor:'pointer' }}>
            <input type="checkbox" checked={val} onChange={e => setter(e.target.checked)}
              style={{ width:18, height:18, accentColor:C.teal, cursor:'pointer' }} />
            <span style={{ fontSize:14, color:C.white }}>{label}</span>
          </label>
        ))}
      </div>
      <FieldGroup label="Parking Permit #">
        <Input value={parkingPermit} onChange={e => setParkingPermit(e.target.value)} placeholder="Optional" />
      </FieldGroup>

      {err && <ErrMsg>{err}</ErrMsg>}
      <PrimaryBtn onClick={saveVessel} loading={busy} style={{ marginTop:8 }}>
        {editingVessel ? 'Save Changes' : 'Add Vessel'}
      </PrimaryBtn>
    </div>
  )

  return (
    <div style={{ padding:'20px 20px 40px', animation:'fadeUp 0.35s ease both' }}>
      <SectionTitle>My Vessels</SectionTitle>

      {/* ── Active Berths ── */}
      {!berthLoading && berths.length > 0 && (
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:1.5, marginBottom:10 }}>Current Berth{berths.length > 1 ? 's' : ''}</div>
          {berths.map(b => <BerthCard key={b.id} berth={b} />)}
        </div>
      )}

      {/* ── Vessel list ── */}
      {vessels.length === 0 ? (
        <div style={{ textAlign:'center', padding:'48px 20px' }}>
          <div style={{ fontSize:52, marginBottom:14 }}>⛵</div>
          <div style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>No vessels on file</div>
          <div style={{ fontSize:13, color:C.muted, marginBottom:24, lineHeight:1.7, maxWidth:260, margin:'0 auto 24px' }}>
            Add your vessel so marinas know who&apos;s coming and what slip fits you.
          </div>
          <PrimaryBtn onClick={() => openEdit(null, null)} style={{ maxWidth:220, margin:'0 auto' }}>+ Add Your First Vessel</PrimaryBtn>
        </div>
      ) : (
        <>
          {vessels.map((v, i) => (
            <div key={vesselIds[i]} style={{ background:'linear-gradient(135deg,rgba(77,214,200,0.14) 0%,rgba(13,43,75,0.5) 100%)', border:`1px solid ${C.tealBorder}`, borderRadius:22, padding:22, marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:56, height:56, borderRadius:16, background:C.tealDim, border:`1px solid ${C.tealBorder}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>⛵</div>
                  <div>
                    <div style={{ fontSize:20, fontWeight:800, letterSpacing:-0.4 }}>{v.name}</div>
                    <div style={{ fontSize:13, color:C.muted }}>{v.vessel_type}{v.year ? ` · ${v.year}` : ''}</div>
                    {v.make && <div style={{ fontSize:13, color:C.muted }}>{v.make}{v.model ? ` ${v.model}` : ''}</div>}
                  </div>
                </div>
                <button onClick={() => openEdit(v, vesselIds[i])}
                  style={{ background:C.tealDim, border:`1px solid ${C.tealBorder}`, borderRadius:10, padding:'6px 12px', color:C.teal, fontFamily:FONT, fontSize:12, fontWeight:700, cursor:'pointer', flexShrink:0 }}>
                  Edit
                </button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {[
                  v.length_ft && ['LOA', `${v.length_ft} ft`],
                  v.beam_ft   && ['Beam', `${v.beam_ft} ft`],
                  v.draft_ft  && ['Draft', `${v.draft_ft} ft`],
                  v.air_draft_ft && ['Air Draft', `${v.air_draft_ft} ft`],
                  v.weight_lbs && ['Weight', `${v.weight_lbs.toLocaleString()} lbs`],
                  v.shore_power && ['Shore Power', v.shore_power],
                  v.registration_number && ['Reg #', v.registration_number],
                ].filter(Boolean).map(([l, val]) => (
                  <div key={String(l)} style={{ background:'rgba(0,0,0,0.25)', borderRadius:10, padding:'10px 12px' }}>
                    <div style={{ fontSize:10, color:C.muted, textTransform:'uppercase', letterSpacing:1, marginBottom:3 }}>{l}</div>
                    <div style={{ fontSize:14, fontWeight:700 }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <PrimaryBtn onClick={() => openEdit(null, null)} style={{ marginTop:8 }}>+ Add Another Vessel / Asset</PrimaryBtn>
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
function TabSkipper({ user, profile, vessel }: { user: User; profile: Profile|null; vessel: Vessel|null }) {
  const [msgs,    setMsgs]    = useState<{role:string;text:string}[]>([
    { role:'skipper', text:`Aye aye! I'm Skipper — your personal marine intelligence. I know your boat, I know the marinas, I know transient availability, the marketplace, everything. What do you need?` }
  ])
  const [draft,   setDraft]   = useState('')
  const [sending, setSending] = useState(false)
  const [coupledMarinas, setCoupledMarinas] = useState<Marina[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

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

  async function send() {
    if (!draft.trim() || sending) return
    const msg = draft.trim(); setDraft('')
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
          session: { boater_id: user.id, access_type: 'boater', context: 'global' },
        })
      })
      const d = await r.json()
      setMsgs(m => [...m, { role:'skipper', text: d.reply || 'Let me look into that.' }])
    } catch {
      setMsgs(m => [...m, { role:'skipper', text:'Rough seas on my end — try again in a moment.' }])
    }
    setSending(false)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 100)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', padding:'0 20px' }}>
      {/* Header */}
      <div style={{ padding:'14px 0 10px', display:'flex', alignItems:'center', gap:12, borderBottom:`1px solid rgba(255,255,255,0.08)`, marginBottom:14, flexShrink:0 }}>
        <div style={{ width:42, height:42, borderRadius:'50%', overflow:'hidden', border:`2px solid ${C.teal}`, animation:'glow 4s ease-in-out infinite', flexShrink:0 }}>
          <Image src="/skipper-avatar.jpg" alt="Skipper" width={42} height={42} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top' }} />
        </div>
        <div>
          <div style={{ fontSize:17, fontWeight:800, letterSpacing:-0.3 }}>Skipper</div>
          <div style={{ fontSize:11, color:C.teal, fontWeight:600 }}>Marine Intelligence · Always On</div>
        </div>
        {vessel && (
          <div style={{ marginLeft:'auto', fontSize:11, color:C.teal, fontWeight:700, background:C.tealDim, border:`1px solid ${C.tealBorder}`, borderRadius:20, padding:'4px 10px', flexShrink:0 }}>
            ⛵ {vessel.name}
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
        <div style={{ display:'flex', gap:8 }}>
          <input
            type="text" value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send() } }}
            placeholder="Ask Skipper anything…"
            style={{ flex:1, padding:'13px 14px', background:C.inputBg, border:`1.5px solid ${C.inputBorder}`, borderRadius:13, color:C.white, fontSize:14, fontFamily:FONT, outline:'none' }}
            onFocus={e => e.currentTarget.style.borderColor=C.teal}
            onBlur={e => e.currentTarget.style.borderColor=C.inputBorder}
          />
          <button onClick={send} disabled={sending||!draft.trim()}
            style={{ padding:'0 18px', background:(!draft.trim()||sending)?'rgba(77,214,200,0.3)':`linear-gradient(135deg,${C.teal},#2fb3a3)`, border:'none', borderRadius:13, color:C.navy, cursor:(!draft.trim()||sending)?'default':'pointer', flexShrink:0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke={C.navy} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── TAB 3: Messages (legacy — kept for reference) ──────────────────────────────
function TabMessages({ user, profile, vessel }: { user: User; profile: Profile|null; vessel: Vessel|null }) {
  const [threads,  setThreads]  = useState<{marina: Marina; last: MsgRow}[]>([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState<Marina|null>(null)

  useEffect(() => {
    async function load() {
      const { data: rows } = await supabase
        .from('messages')
        .select('id, body, direction, inserted_at, marina_id')
        .eq('tenant_id', user.id)
        .eq('channel', 'skipper')
        .order('inserted_at', { ascending: false })

      if (!rows || rows.length === 0) { setLoading(false); return }

      const seen = new Set<string>()
      const grouped: {marina_id:string; last:MsgRow}[] = []
      for (const row of rows) {
        if (!seen.has(row.marina_id)) { seen.add(row.marina_id); grouped.push({ marina_id: row.marina_id, last: row }) }
      }

      const ids = grouped.map(g => g.marina_id)
      const { data: marinas } = await supabase.from('marinas').select('id,name,city,state,total_slips').in('id', ids)
      const marinaMap: Record<string,Marina> = {}
      for (const m of (marinas ?? [])) marinaMap[m.id] = m

      setThreads(grouped.filter(g => marinaMap[g.marina_id]).map(g => ({ marina: marinaMap[g.marina_id], last: g.last })))
      setLoading(false)
    }
    load()
  }, [user.id])

  if (selected) return <MarinaChat marina={selected} user={user} profile={profile} vessel={vessel} onBack={() => setSelected(null)} onAddVessel={() => setSelected(null)} />

  return (
    <div style={{ padding:'20px 20px 0', animation:'fadeUp 0.35s ease both' }}>
      <SectionTitle>Messages</SectionTitle>
      {loading && <div style={{ textAlign:'center', color:C.muted, padding:'32px 0' }}>Loading…</div>}
      {!loading && threads.length === 0 && (
        <div style={{ textAlign:'center', padding:'48px 20px' }}>
          <div style={{ width:60, height:60, borderRadius:'50%', overflow:'hidden', margin:'0 auto 14px', border:`2px solid ${C.teal}` }}>
            <Image src="/skipper-avatar.jpg" alt="Skipper" width={60} height={60} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top' }} />
          </div>
          <div style={{ fontSize:16, fontWeight:700, marginBottom:6 }}>No messages yet</div>
          <div style={{ fontSize:13, color:C.muted, lineHeight:1.6, maxWidth:260, margin:'0 auto' }}>
            Message any marina from the Marinas tab — your threads show up here.
          </div>
        </div>
      )}
      {!loading && threads.map(({ marina, last }, i) => (
        <button key={marina.id} onClick={() => setSelected(marina)}
          style={{ width:'100%', display:'flex', alignItems:'center', gap:14, background:C.card, border:`1px solid ${C.cardBorder}`, borderRadius:18, padding:'14px 16px', marginBottom:10, color:C.white, fontFamily:FONT, cursor:'pointer', textAlign:'left', animation:`fadeUp 0.3s ease ${i*0.05}s both` }}>
          <div style={{ width:46, height:46, borderRadius:13, background:C.tealDim, border:`1px solid ${C.tealBorder}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>⚓</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:3 }}>{marina.name}</div>
            <div style={{ fontSize:12, color:C.muted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{last.body}</div>
          </div>
          <div style={{ fontSize:11, color:C.muted2, flexShrink:0 }}>{new Date(last.inserted_at).toLocaleDateString()}</div>
        </button>
      ))}
    </div>
  )
}

// ─── TAB 4: Account ────────────────────────────────────────────────────────────
function TabAccount({ user, profile, vessel, onSignOut, onProfileUpdated }: {
  user:User; profile:Profile|null; vessel:Vessel|null; onSignOut:()=>void;
  onProfileUpdated:(p:Profile)=>void
}) {
  const [editing,      setEditing]      = useState(false)
  const [changingEmail,setChangingEmail] = useState(false)
  const [newEmail,     setNewEmail]      = useState('')
  const [emailMsg,     setEmailMsg]      = useState('')
  const [emailBusy,    setEmailBusy]     = useState(false)
  const [changingPin,  setChangingPin]   = useState(false)
  const [pinStep,      setPinStep]       = useState<'verify'|'new'|'confirm'>('verify')
  const [pinVal,       setPinVal]        = useState('')
  const [pinFirst,     setPinFirst]      = useState('')
  const [pinErr,       setPinErr]        = useState('')
  const [pinBusy,      setPinBusy]       = useState(false)
  const [form, setForm] = useState({
    first_name:               profile?.first_name ?? '',
    last_name:                profile?.last_name ?? '',
    phone:                    profile?.phone ?? '',
    mobile:                   profile?.mobile ?? '',
    address:                  profile?.address ?? '',
    address_city:             profile?.address_city ?? '',
    address_state:            profile?.address_state ?? '',
    address_zip:              profile?.address_zip ?? '',
    emergency_contact:        profile?.emergency_contact ?? '',
    emergency_phone:          profile?.emergency_phone ?? '',
    title:                    profile?.title ?? '',
    date_of_birth:            profile?.date_of_birth ?? '',
    driver_license_number:    profile?.driver_license_number ?? '',
    preferred_contact_method: profile?.preferred_contact_method ?? '',
    language_preference:      profile?.language_preference ?? 'en',
  })
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState('')

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handlePinChange(p: string) {
    if (pinStep === 'verify') {
      setPinBusy(true)
      const hash = await hashPin(p)
      const localHash = localStorage.getItem(`skipper_pin_${user.id}`)
      let match = localHash ? hash === localHash : false
      if (!match) {
        const { data } = await supabase.from('contacts').select('pin_hash').eq('auth_user_id', user.id).is('marina_id', null).single()
        match = !!data?.pin_hash && data.pin_hash === hash
      }
      setPinBusy(false)
      if (!match) { setPinErr('Wrong PIN — try again'); setPinVal(''); return }
      setPinErr(''); setPinStep('new'); setPinVal('')
    } else if (pinStep === 'new') {
      setPinFirst(p); setPinStep('confirm'); setPinVal('')
    } else {
      if (p !== pinFirst) { setPinErr("PINs don't match"); setPinStep('new'); setPinVal(''); setPinFirst(''); return }
      setPinBusy(true)
      const hash = await hashPin(p)
      const { error } = await supabase.from('contacts').update({ pin_hash: hash }).eq('auth_user_id', user.id).is('marina_id', null)
      setPinBusy(false)
      if (error) { setPinErr(error.message); return }
      localStorage.setItem(`skipper_pin_${user.id}`, hash)
      setChangingPin(false); setPinStep('verify'); setPinVal(''); setPinFirst(''); setPinErr('')
    }
  }

  async function requestEmailChange() {
    if (!newEmail.trim() || !newEmail.includes('@')) { setEmailMsg('Enter a valid email'); return }
    setEmailBusy(true); setEmailMsg('')
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim().toLowerCase() })
    setEmailBusy(false)
    if (error) { setEmailMsg(error.message); return }
    setEmailMsg('✓ Confirmation sent to both emails. Click the link to confirm the change.')
    setNewEmail('')
  }

  async function saveProfile() {
    if (!form.first_name.trim()) { setErr('First name is required'); return }
    setBusy(true); setErr('')
    const payload = {
      first_name:               form.first_name.trim(),
      last_name:                form.last_name.trim() || null,
      phone:                    form.phone.trim() || null,
      mobile:                   form.mobile.trim() || null,
      address:                  form.address.trim() || null,
      address_city:             form.address_city.trim() || null,
      address_state:            form.address_state.trim() || null,
      address_zip:              form.address_zip.trim() || null,
      emergency_name:           form.emergency_contact.trim() || null,
      emergency_phone:          form.emergency_phone.trim() || null,
      title:                    form.title.trim() || null,
      date_of_birth:            form.date_of_birth || null,
      driver_license_number:    form.driver_license_number.trim() || null,
      preferred_contact_method: form.preferred_contact_method || null,
      language_preference:      form.language_preference || 'en',
    }
    // Update ALL contacts rows for this user — national-pool + all marina-scoped rows
    // so changes appear in Ops regardless of which row is displayed
    const { data, error } = await supabase
      .from('contacts')
      .update(payload)
      .eq('auth_user_id', user.id)
      .select()
    setBusy(false)
    if (error) { setErr(error.message); return }
    // Use the national-pool row (marina_id = null) for local profile state
    const nationalRow = (data ?? []).find((r: any) => !r.marina_id) ?? data?.[0]
    if (nationalRow) onProfileUpdated(contactToProfile(nationalRow))
    setEditing(false)
  }

  const displayName = profile ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Set your name' : 'Set your name'
  const initials = displayName[0]?.toUpperCase() ?? 'U'

  return (
    <div style={{ padding:'20px 20px 0', animation:'fadeUp 0.35s ease both' }}>
      {/* Always-visible header row with sign out */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <h2 style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:1.8, margin:0 }}>Account</h2>
        <button onClick={onSignOut}
          style={{ background:'none', border:`1px solid rgba(248,113,113,0.4)`, borderRadius:8, padding:'5px 12px', color:'#fca5a5', fontFamily:FONT, fontSize:12, fontWeight:600, cursor:'pointer' }}>
          Sign out
        </button>
      </div>

      {/* Profile card */}
      <div style={{ background:C.card, border:`1px solid ${C.cardBorder}`, borderRadius:20, padding:20, marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: editing ? 16 : 0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:52, height:52, borderRadius:'50%', background:C.teal, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:800, color:C.navy, flexShrink:0 }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize:16, fontWeight:700, marginBottom:2 }}>{displayName}</div>
              <div style={{ fontSize:13, color:C.muted }}>{user.email}</div>
              {profile?.phone && <div style={{ fontSize:12, color:C.muted2, marginTop:2 }}>{profile.phone}</div>}
            </div>
          </div>
          {!editing && (
            <button onClick={() => { setEditing(true); setForm({ first_name:profile?.first_name??'', last_name:profile?.last_name??'', phone:profile?.phone??'', mobile:profile?.mobile??'', address:profile?.address??'', address_city:profile?.address_city??'', address_state:profile?.address_state??'', address_zip:profile?.address_zip??'', emergency_contact:profile?.emergency_contact??'', emergency_phone:profile?.emergency_phone??'', title:profile?.title??'', date_of_birth:profile?.date_of_birth??'', driver_license_number:profile?.driver_license_number??'', preferred_contact_method:profile?.preferred_contact_method??'', language_preference:profile?.language_preference??'en' }); setErr('') }}
              style={{ background:C.tealDim, border:`1px solid ${C.tealBorder}`, borderRadius:10, padding:'6px 12px', color:C.teal, fontFamily:FONT, fontSize:12, fontWeight:700, cursor:'pointer' }}>
              Edit
            </button>
          )}
        </div>

        {editing && (
          <div style={{ borderTop:`1px solid rgba(255,255,255,0.08)`, paddingTop:16 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <FieldGroup label="First name">
                <Input value={form.first_name} onChange={e => set('first_name', e.target.value)} autoFocus />
              </FieldGroup>
              <FieldGroup label="Last name">
                <Input value={form.last_name} onChange={e => set('last_name', e.target.value)} />
              </FieldGroup>
            </div>
            <FieldGroup label="Mobile phone">
              <Input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 867-5309" />
            </FieldGroup>
            <FieldGroup label="Mobile (alt)">
              <Input type="tel" value={form.mobile} onChange={e => set('mobile', e.target.value)} placeholder="(555) 000-0000" />
            </FieldGroup>
            <FormSectionLabel>Home Address</FormSectionLabel>
            <FieldGroup label="Street">
              <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="123 Harbor Dr" />
            </FieldGroup>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 60px 80px', gap:10 }}>
              <FieldGroup label="City">
                <Input value={form.address_city} onChange={e => set('address_city', e.target.value)} />
              </FieldGroup>
              <FieldGroup label="State">
                <Input value={form.address_state} onChange={e => set('address_state', e.target.value)} maxLength={2} />
              </FieldGroup>
              <FieldGroup label="ZIP">
                <Input value={form.address_zip} onChange={e => set('address_zip', e.target.value)} />
              </FieldGroup>
            </div>
            <FormSectionLabel>Emergency Contact</FormSectionLabel>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <FieldGroup label="Name">
                <Input value={form.emergency_contact} onChange={e => set('emergency_contact', e.target.value)} />
              </FieldGroup>
              <FieldGroup label="Phone">
                <Input type="tel" value={form.emergency_phone} onChange={e => set('emergency_phone', e.target.value)} />
              </FieldGroup>
            </div>
            <FormSectionLabel>ID &amp; Preferences</FormSectionLabel>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <FieldGroup label="Title">
                <SelectInput value={form.title} onChange={e => set('title', e.target.value)}>
                  <option value="">Select…</option>
                  {['Mr.','Mrs.','Ms.','Dr.','Capt.','Other'].map(v => <option key={v}>{v}</option>)}
                </SelectInput>
              </FieldGroup>
              <FieldGroup label="Date of Birth">
                <Input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
              </FieldGroup>
              <FieldGroup label="Driver License #">
                <Input value={form.driver_license_number} onChange={e => set('driver_license_number', e.target.value)} placeholder="DL12345678" />
              </FieldGroup>
              <FieldGroup label="Preferred Contact">
                <SelectInput value={form.preferred_contact_method} onChange={e => set('preferred_contact_method', e.target.value)}>
                  <option value="">Select…</option>
                  {['email','sms','phone','app'].map(v => <option key={v} value={v}>{v.toUpperCase()}</option>)}
                </SelectInput>
              </FieldGroup>
            </div>
            <FieldGroup label="Language">
              <SelectInput value={form.language_preference} onChange={e => set('language_preference', e.target.value)}>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="pt">Português</option>
              </SelectInput>
            </FieldGroup>

            {/* Email change section */}
            <FormSectionLabel>Login Email</FormSectionLabel>
            <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:12, padding:'12px 14px', marginBottom:12 }}>
              <div style={{ fontSize:12, color:C.muted, marginBottom:6 }}>Current email</div>
              <div style={{ fontSize:14, fontWeight:600, color:C.white, marginBottom:10 }}>{user.email}</div>
              {!changingEmail ? (
                <button onClick={() => { setChangingEmail(true); setEmailMsg('') }}
                  style={{ background:'none', border:`1px solid rgba(255,255,255,0.15)`, borderRadius:8, padding:'6px 12px', color:C.muted, fontFamily:FONT, fontSize:12, cursor:'pointer' }}>
                  Change email
                </button>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                    placeholder="New email address" autoFocus />
                  {emailMsg && <div style={{ fontSize:12, color: emailMsg.startsWith('✓') ? C.green : C.danger, lineHeight:1.5 }}>{emailMsg}</div>}
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={requestEmailChange} disabled={emailBusy}
                      style={{ flex:1, padding:'10px', background:C.tealDim, border:`1px solid ${C.tealBorder}`, borderRadius:10, color:C.teal, fontFamily:FONT, fontSize:13, fontWeight:700, cursor:'pointer' }}>
                      {emailBusy ? 'Sending…' : 'Send confirmation'}
                    </button>
                    <button onClick={() => { setChangingEmail(false); setEmailMsg(''); setNewEmail('') }}
                      style={{ padding:'10px 14px', background:'none', border:`1px solid rgba(255,255,255,0.12)`, borderRadius:10, color:C.muted, fontFamily:FONT, fontSize:13, cursor:'pointer' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {err && <ErrMsg>{err}</ErrMsg>}
            <div style={{ display:'flex', gap:8 }}>
              <PrimaryBtn onClick={saveProfile} loading={busy} style={{ flex:1 }}>Save</PrimaryBtn>
              <button onClick={() => { setEditing(false); setErr('') }}
                style={{ flex:1, padding:'15px', background:'transparent', border:`1px solid rgba(255,255,255,0.12)`, borderRadius:14, color:C.muted, fontFamily:FONT, fontSize:14, cursor:'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Vessel summary */}
      {vessel && (
        <div style={{ background:C.card, border:`1px solid ${C.cardBorder}`, borderRadius:16, padding:'14px 16px', marginBottom:14 }}>
          <div style={{ fontSize:10, color:C.muted, textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>Vessel on file</div>
          <div style={{ fontSize:14, fontWeight:700 }}>{vessel.name} · {vessel.vessel_type}</div>
          <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>
            {[vessel.length_ft && `${vessel.length_ft}ft`, vessel.shore_power, vessel.fuel_type].filter(Boolean).join(' · ')}
          </div>
        </div>
      )}

      {/* Identity note */}
      <div style={{ background:'rgba(77,214,200,0.06)', border:`1px solid rgba(77,214,200,0.15)`, borderRadius:14, padding:'12px 16px', marginBottom:20 }}>
        <div style={{ fontSize:10, color:C.muted, textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>Your identity package</div>
        <div style={{ fontSize:12, color:C.muted, lineHeight:1.7 }}>
          Your contact info and vessel specs are sent to every marina you message — so they know who&apos;s coming and what slip to assign. You own your data.
        </div>
      </div>

      {/* Change PIN */}
      {!changingPin ? (
        <button onClick={() => { setChangingPin(true); setPinStep('verify'); setPinVal(''); setPinErr('') }}
          style={{ width:'100%', padding:'14px', background:'transparent', border:`1px solid rgba(255,255,255,0.12)`, borderRadius:14, color:C.muted, fontFamily:FONT, fontSize:14, fontWeight:600, cursor:'pointer', marginBottom:10 }}>
          🔒 Change PIN
        </button>
      ) : (
        <div style={{ background:C.card, border:`1px solid ${C.cardBorder}`, borderRadius:16, padding:'20px 16px', marginBottom:10, textAlign:'center' }}>
          <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>
            {pinStep==='verify' ? 'Enter current PIN' : pinStep==='new' ? 'Enter new PIN' : 'Confirm new PIN'}
          </div>
          <div style={{ fontSize:12, color:C.muted, marginBottom:16 }}>
            {pinStep==='verify' ? 'Verify your identity first' : pinStep==='new' ? 'Choose a new 4-digit PIN' : 'Enter it again to confirm'}
          </div>
          <PinDots value={pinVal} />
          <PinPad value={pinVal} onChange={v => { setPinVal(v); setPinErr('') }} max={4} onFull={p => { setPinVal(''); handlePinChange(p) }} />
          {pinErr && <div style={{ fontSize:12, color:C.danger, marginTop:8 }}>{pinErr}</div>}
          {pinBusy && <div style={{ marginTop:8 }}><Spinner /></div>}
          <button onClick={() => { setChangingPin(false); setPinStep('verify'); setPinVal(''); setPinErr('') }}
            style={{ background:'none', border:'none', color:C.muted2, fontSize:12, cursor:'pointer', fontFamily:FONT, marginTop:12 }}>
            Cancel
          </button>
        </div>
      )}

      <button onClick={onSignOut}
        style={{ width:'100%', padding:'14px', background:'transparent', border:`1px solid rgba(248,113,113,0.3)`, borderRadius:14, color:C.danger, fontFamily:FONT, fontSize:14, fontWeight:600, cursor:'pointer' }}>
        Sign Out
      </button>
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
const Spinner = () => <div style={{ width:16, height:16, border:`2px solid ${C.navy}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
const SectionTitle = ({ children }: { children:React.ReactNode }) => (
  <h2 style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:1.8, margin:'0 0 14px' }}>{children}</h2>
)
const NavBtn = ({ icon, label, active, onClick }: { icon:React.ReactNode; label:string; active:boolean; onClick:()=>void }) => (
  <button onClick={onClick} style={{ background:'transparent', border:'none', padding:'4px 0', display:'flex', flexDirection:'column', alignItems:'center', gap:3, color:active?C.teal:C.muted, fontFamily:FONT, fontSize:10, fontWeight:active?700:500, cursor:'pointer' }}>
    {icon}
    <span style={{ letterSpacing:0.2 }}>{label}</span>
  </button>
)
