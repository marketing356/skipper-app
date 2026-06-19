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
type Screen = 'splash' | 'auth' | 'otp' | 'contact_setup' | 'pin_setup' | 'pin_login' | 'home'
type HomeTab = 'vessel' | 'marinas' | 'messages' | 'account'
type Marina = { id:string; name:string; city:string; state:string; total_slips:number }

type Profile = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  display_name: string | null
  phone: string | null
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
}

type MsgRow = { id:string; body:string; direction:string; inserted_at:string; marina_id:string }

// ─── PIN helpers (SHA-256 in browser) ─────────────────────────────────────────
async function hashPin(pin: string): Promise<string> {
  const enc = new TextEncoder()
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(pin))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function SkipperApp() {
  const [screen,    setScreen]    = useState<Screen>('splash')
  const [user,      setUser]      = useState<User | null>(null)
  const [profile,   setProfile]   = useState<Profile | null>(null)
  const [vessel,    setVessel]    = useState<Vessel | null>(null)
  const [homeTab,   setHomeTab]   = useState<HomeTab>('vessel')
  const [savedEmail,setSavedEmail]= useState('')

  useEffect(() => {
    const storedEmail = localStorage.getItem('skipper_email') ?? ''
    const storedUserId = localStorage.getItem('skipper_user_id') ?? ''
    setSavedEmail(storedEmail)

    async function init() {
      const { data } = await supabase.auth.getSession()
      let u = data.session?.user ?? null

      if (!u) {
        // Try explicit refresh before giving up — covers most token-expired cases
        const { data: refreshed } = await supabase.auth.refreshSession()
        u = refreshed.session?.user ?? null
      }

      if (!u) {
        // Find userId: prefer explicit key, fall back to scanning for any skipper_pin_* entry
        // (old-code users never had skipper_user_id set, but do have skipper_pin_${id})
        let resolvedUid = storedUserId
        if (!resolvedUid) {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i)
            if (k?.startsWith('skipper_pin_')) {
              resolvedUid = k.slice('skipper_pin_'.length)
              localStorage.setItem('skipper_user_id', resolvedUid) // backfill for next time
              break
            }
          }
        }
        if (resolvedUid && localStorage.getItem(`skipper_pin_${resolvedUid}`)) {
          setUser({ id: resolvedUid, email: storedEmail } as User)
          setScreen('pin_login')
          return
        }
        setScreen('auth')
        return
      }

      setUser(u)
      await routeAfterAuth(u)
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
      } else {
        // Don't force to auth if the user has a local PIN — let them re-verify with PIN
        const uid = localStorage.getItem('skipper_user_id') ?? ''
        if (!uid || !localStorage.getItem(`skipper_pin_${uid}`)) {
          setScreen('auth')
          setUser(null)
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function routeAfterAuth(u: User) {
    // Persist user ID so PIN screen works after session expiry
    localStorage.setItem('skipper_user_id', u.id)

    // Load profile
    let { data: prof } = await supabase
      .from('boater_profiles')
      .select('*')
      .eq('id', u.id)
      .maybeSingle()

    // New user — create bare row
    if (!prof) {
      const { data: newProf } = await supabase
        .from('boater_profiles')
        .insert({ id: u.id, email: u.email ?? null, onboarding_complete: false })
        .select()
        .single()
      prof = newProf
    }

    setProfile(prof)

    // Load vessel
    const { data: vessels } = await supabase
      .from('boater_vessels')
      .select('*')
      .eq('boater_id', u.id)
      .limit(1)
    setVessel(vessels?.[0] ?? null)

    // ── Routing logic ──
    // 1. No first name = contact form not filled out yet
    if (!prof?.first_name) {
      setScreen('contact_setup')
      return
    }

    // 2. No PIN = must set one before using app
    if (!prof?.pin_hash) {
      setScreen('pin_setup')
      return
    }

    // 3. Already unlocked this device session
    const unlocked = localStorage.getItem(`skipper_unlocked_${u.id}`)
    if (unlocked) {
      setScreen('home')
      return
    }

    // 4. Returning user with PIN set — show PIN login
    setScreen('pin_login')
  }

  function handleSignOut() {
    const uid = user?.id ?? localStorage.getItem('skipper_user_id') ?? ''
    supabase.auth.signOut()
    if (uid) {
      localStorage.removeItem(`skipper_unlocked_${uid}`)
      localStorage.removeItem(`skipper_pin_${uid}`)
    }
    localStorage.removeItem('skipper_user_id')
    setUser(null); setProfile(null); setVessel(null)
    setScreen('auth')
  }

  // ── Splash ──
  if (screen === 'splash') return <SplashScreen />

  // ── Auth / OTP ──
  if (screen === 'auth' || screen === 'otp') return (
    <AuthScreen
      screen={screen}
      savedEmail={savedEmail}
      onOtpSent={(email) => { setSavedEmail(email); setScreen('otp') }}
      onAuthed={async (u, email) => {
        localStorage.setItem('skipper_email', email)
        localStorage.setItem('skipper_user_id', u.id)
        localStorage.setItem(`skipper_unlocked_${u.id}`, '1')
        setUser(u)
        await routeAfterAuth(u)
      }}
      onBackToEmail={() => setScreen('auth')}
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
      onUnlock={async (authedUser?: User) => {
        const uid = authedUser?.id ?? user!.id
        localStorage.setItem(`skipper_unlocked_${uid}`, '1')
        // If PIN was verified while session was expired, restore profile + route properly
        if (authedUser && authedUser.id !== user?.id) setUser(authedUser)
        if (authedUser) await routeAfterAuth(authedUser)
        else setScreen('home')
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
      onVesselSaved={(v) => setVessel(v)}
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

// ─── Auth (email + OTP) ───────────────────────────────────────────────────────
function AuthScreen({ screen, savedEmail, onOtpSent, onAuthed, onBackToEmail }: {
  screen: 'auth' | 'otp'
  savedEmail: string
  onOtpSent: (email: string) => void
  onAuthed: (u: User, email: string) => void
  onBackToEmail: () => void
}) {
  const [email,  setEmail]  = useState(savedEmail)
  const [otp,    setOtp]    = useState('')
  const [busy,   setBusy]   = useState(false)
  const [err,    setErr]    = useState('')
  const [resent, setResent] = useState(false)

  async function sendOtp() {
    if (!email.trim()) { setErr('Enter your email'); return }
    setBusy(true); setErr('')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true }
    })
    setBusy(false)
    if (error) { setErr(error.message); return }
    onOtpSent(email.trim().toLowerCase())
  }

  async function verifyOtp() {
    if (otp.length < 6) { setErr('Enter the 6-digit code'); return }
    setBusy(true); setErr('')
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: otp.trim(),
      type: 'email'
    })
    setBusy(false)
    if (error) { setErr('Invalid code — check your email and try again'); return }
    if (data.user) onAuthed(data.user, email.trim().toLowerCase())
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bgGrad, color:C.white, fontFamily:FONT, WebkitFontSmoothing:'antialiased', display:'flex', flexDirection:'column' }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'0 28px', maxWidth:420, margin:'0 auto', width:'100%' }}>
        <div style={{ marginBottom:40, animation:'scaleIn 0.5s ease both' }}>
          <div style={{ width:64, height:64, borderRadius:'50%', overflow:'hidden', border:`2px solid ${C.teal}`, marginBottom:20, animation:'glow 4s ease-in-out infinite' }}>
            <Image src="/skipper-avatar.jpg" alt="Skipper" width={64} height={64} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top' }} />
          </div>
          <h1 style={{ fontSize:28, fontWeight:800, margin:'0 0 8px', letterSpacing:-0.5, lineHeight:1.15 }}>
            {screen === 'auth' ? 'Welcome aboard.' : 'Check your email.'}
          </h1>
          <p style={{ fontSize:14, color:C.muted, margin:0, lineHeight:1.6 }}>
            {screen === 'auth'
              ? 'Your marina, your slip, everything in one place.'
              : <>
                  {savedEmail
                    ? <>Session expired — we sent a new code to<br/><strong style={{ color:C.white }}>{email || savedEmail}</strong></>
                    : <>We sent a 6-digit code to<br/><strong style={{ color:C.white }}>{email}</strong></>}
                </>}
          </p>
        </div>

        <div style={{ animation:'fadeUp 0.4s ease 0.1s both' }}>
          {screen === 'auth' ? (
            <>
              <FieldGroup label="Email address">
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" onKeyDown={e => e.key==='Enter' && sendOtp()} autoFocus />
              </FieldGroup>
              {err && <ErrMsg>{err}</ErrMsg>}
              <PrimaryBtn onClick={sendOtp} loading={busy} style={{ marginTop:8 }}>Continue →</PrimaryBtn>
              <p style={{ fontSize:12, color:C.muted2, textAlign:'center', marginTop:16, lineHeight:1.7 }}>
                New here? Just enter your email — we&apos;ll set up your account.
              </p>
            </>
          ) : (
            <>
              <FieldGroup label="6-digit code">
                <Input type="text" inputMode="numeric" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                  placeholder="000000" autoFocus onKeyDown={e => e.key==='Enter' && verifyOtp()} />
              </FieldGroup>
              {err && <ErrMsg>{err}</ErrMsg>}
              <PrimaryBtn onClick={verifyOtp} loading={busy} style={{ marginTop:8 }}>Sign In →</PrimaryBtn>
              <div style={{ textAlign:'center', marginTop:20, display:'flex', flexDirection:'column', gap:12 }}>
                {resent
                  ? <span style={{ fontSize:13, color:C.green }}>✓ Code resent</span>
                  : <button onClick={async () => { setResent(false); setBusy(true); await supabase.auth.signInWithOtp({ email, options:{shouldCreateUser:true} }); setBusy(false); setResent(true) }}
                      style={{ background:'none', border:'none', color:C.muted2, fontSize:13, cursor:'pointer', fontFamily:FONT }}>
                      Resend code
                    </button>
                }
                <button onClick={onBackToEmail}
                  style={{ background:'none', border:'none', color:C.muted2, fontSize:13, cursor:'pointer', fontFamily:FONT }}>
                  ← Use a different email
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Contact Setup (Step 1 — new user) ────────────────────────────────────────
function ContactSetupScreen({ user, onComplete }: { user: User; onComplete: (p: Profile) => void }) {
  const [firstName,   setFirstName]   = useState('')
  const [lastName,    setLastName]    = useState('')
  const [phone,       setPhone]       = useState('')
  const [address,     setAddress]     = useState('')
  const [city,        setCity]        = useState('')
  const [state,       setState]       = useState('')
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
      .from('boater_profiles')
      .update({
        first_name:        firstName.trim(),
        last_name:         lastName.trim(),
        display_name:      `${firstName.trim()} ${lastName.trim()}`,
        email:             user.email ?? null,
        phone:             phone.trim() || null,
        address:           address.trim() || null,
        address_city:      city.trim() || null,
        address_state:     state.trim() || null,
        address_zip:       zip.trim() || null,
        emergency_contact: emergName.trim() || null,
        emergency_phone:   emergPhone.trim() || null,
      })
      .eq('id', user.id)
      .select()
      .single()

    setBusy(false)
    if (error) { setErr(error.message); return }

    // Request notification permission — system prompt fires automatically
    if (typeof window !== 'undefined' && 'Notification' in window) {
      Notification.requestPermission().catch(() => {})
    }

    onComplete(data)
  }

  return (
    <OnboardingShell step={1} total={2} title="About you" subtitle="Your marina needs this on file. You'll only do this once.">
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <FieldGroup label="First name">
          <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" autoFocus />
        </FieldGroup>
        <FieldGroup label="Last name">
          <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" />
        </FieldGroup>
      </div>

      <FieldGroup label="Mobile phone">
        <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 867-5309" />
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
          <Input value={state} onChange={e => setState(e.target.value)} placeholder="RI" maxLength={2} />
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
      .from('boater_profiles')
      .update({ pin_hash: hash, onboarding_complete: true })
      .eq('id', user.id)
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
  onUnlock: (authedUser?: User) => void
  onForgotPin: () => void
}) {
  const [pin,        setPin]        = useState('')
  const [shake,      setShake]      = useState(false)
  const [err,        setErr]        = useState('')
  const [busy,       setBusy]       = useState(false)
  const [reauthing,  setReauthing]  = useState(false)
  const [reauthOtp,  setReauthOtp]  = useState('')
  const [reauthErr,  setReauthErr]  = useState('')

  async function verify(p: string) {
    setBusy(true)
    const hash = await hashPin(p)
    // Fast path: local cache
    const localHash = localStorage.getItem(`skipper_pin_${user.id}`)
    let match = localHash ? hash === localHash : false
    // Fallback: DB (only if we have a valid session)
    if (!match) {
      const { data } = await supabase.from('boater_profiles').select('pin_hash').eq('id', user.id).single()
      match = !!data?.pin_hash && data.pin_hash === hash
      if (match && data?.pin_hash) localStorage.setItem(`skipper_pin_${user.id}`, data.pin_hash)
    }
    if (!match) {
      setBusy(false)
      setPin('')
      setErr('Wrong PIN')
      setShake(true)
      setTimeout(() => setShake(false), 600)
      return
    }
    // PIN correct — check if session is alive
    const { data: sessionData } = await supabase.auth.getSession()
    if (sessionData.session?.user) {
      setBusy(false)
      onUnlock(sessionData.session.user)
      return
    }
    // No session — try silent refresh
    const { data: refreshed } = await supabase.auth.refreshSession()
    if (refreshed.session?.user) {
      setBusy(false)
      onUnlock(refreshed.session.user)
      return
    }
    // Session fully expired — send OTP silently, ask user to enter code once
    await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
    setBusy(false)
    setReauthing(true)
  }

  async function completeReauth() {
    if (reauthOtp.length < 6) { setReauthErr('Enter the 6-digit code'); return }
    setBusy(true); setReauthErr('')
    const { data, error } = await supabase.auth.verifyOtp({
      email, token: reauthOtp.trim(), type: 'email'
    })
    setBusy(false)
    if (error || !data.user) { setReauthErr('Invalid code — check your email'); return }
    onUnlock(data.user)
  }

  if (reauthing) return (
    <div style={{ minHeight:'100vh', background:C.bgGrad, color:C.white, fontFamily:FONT, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 24px' }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ width:'100%', maxWidth:360 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:18, fontWeight:800, marginBottom:8 }}>One quick re-verify</div>
          <div style={{ fontSize:13, color:C.muted, lineHeight:1.6 }}>It’s been a while. We sent a code to<br/><strong style={{ color:C.white }}>{email}</strong></div>
        </div>
        <div style={{ marginBottom:16 }}>
          <Label>6-digit code</Label>
          <Input type="text" inputMode="numeric" value={reauthOtp} onChange={e => setReauthOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
            placeholder="000000" autoFocus onKeyDown={e => e.key==='Enter' && completeReauth()} />
        </div>
        {reauthErr && <ErrMsg>{reauthErr}</ErrMsg>}
        <PrimaryBtn onClick={completeReauth} loading={busy} style={{ marginTop:8 }}>Verify →</PrimaryBtn>
        <button onClick={() => setReauthing(false)} style={{ background:'none', border:'none', color:C.muted2, fontSize:12, cursor:'pointer', fontFamily:FONT, marginTop:16, display:'block', width:'100%', textAlign:'center' }}>Back</button>
      </div>
    </div>
  )

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
          Forgot PIN? Sign in with email →
        </button>
      </div>
    </div>
  )
}

// ─── Home ──────────────────────────────────────────────────────────────────────
function HomeScreen({ user, profile, vessel, activeTab, onTabChange, onSignOut, onVesselSaved, onProfileUpdated }: {
  user: User; profile: Profile|null; vessel: Vessel|null; activeTab: HomeTab
  onTabChange: (t: HomeTab) => void; onSignOut: () => void
  onVesselSaved: (v: Vessel) => void; onProfileUpdated: (p: Profile) => void
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
        {activeTab === 'vessel'   && <TabVessel   vessel={vessel}  user={user} onVesselSaved={onVesselSaved} />}
        {activeTab === 'marinas'  && <TabMarinas  user={user} profile={profile} vessel={vessel} />}
        {activeTab === 'messages' && <TabMessages user={user} profile={profile} vessel={vessel} />}
        {activeTab === 'account'  && <TabAccount  user={user} profile={profile} vessel={vessel} onSignOut={onSignOut} onProfileUpdated={onProfileUpdated} />}
      </div>

      {/* Bottom nav */}
      <div style={{ flexShrink:0, borderTop:`1px solid rgba(255,255,255,0.08)`, background:'rgba(5,17,31,0.95)', backdropFilter:'blur(12px)', display:'flex', justifyContent:'space-around', alignItems:'center', padding:'10px 0 env(safe-area-inset-bottom,10px)' }}>
        <NavBtn icon={<IcoVessel  active={activeTab==='vessel'}  />} label="My Vessel"  active={activeTab==='vessel'}  onClick={() => onTabChange('vessel')}  />
        <NavBtn icon={<IcoMarinas active={activeTab==='marinas'} />} label="Marinas"    active={activeTab==='marinas'} onClick={() => onTabChange('marinas')} />
        <NavBtn icon={<IcoMsgs   active={activeTab==='messages'} />} label="Messages"   active={activeTab==='messages'} onClick={() => onTabChange('messages')} />
        <NavBtn icon={<IcoAcct   active={activeTab==='account'}  />} label="Account"    active={activeTab==='account'}  onClick={() => onTabChange('account')}  />
      </div>
    </div>
  )
}

// ─── TAB 1: My Vessel ─────────────────────────────────────────────────────────
function TabVessel({ vessel, user, onVesselSaved }: {
  vessel: Vessel|null; user: User; onVesselSaved: (v: Vessel) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  // Form state — covers all columns
  const blank = {
    name:'', vessel_type:'',
    make:'', model:'', year:'', color:'',
    length_ft:'', beam_ft:'', draft_ft:'', weight_lbs:'', air_draft_ft:''
    hin:'', registration_number:'', registration_state:'', registration_expiry:'',
    documentation_number:'', mmsi_number:'', flag_state:'',
    hull_material:'',
    engine_count:'', engine_type:'', engine_make:'', engine_model:'', engine_year:'', horsepower_per_engine:'', fuel_type:'', fuel_tank_gallons:'', shore_power:'',
    insurance_provider:'', insurance_policy:'', insurance_expiry:'', insurance_agent_name:'', insurance_agent_phone:'',
    last_survey_date:'', photo_url:'', notes:''
  }
  const [form, setForm] = useState<Record<string,string>>(blank)
  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  function openEdit() {
    if (vessel) {
      setForm({
        name: vessel.name ?? '',
        vessel_type: vessel.vessel_type ?? '',
        make: vessel.make ?? '',
        model: vessel.model ?? '',
        year: vessel.year?.toString() ?? '',
        color: vessel.color ?? '',
        length_ft: vessel.length_ft?.toString() ?? '',
        beam_ft: vessel.beam_ft?.toString() ?? '',
        draft_ft: vessel.draft_ft?.toString() ?? '',
        weight_lbs: vessel.weight_lbs?.toString() ?? '',
        air_draft_ft: vessel.air_draft_ft?.toString() ?? '',
        hin: vessel.hin ?? '',
        registration_number: vessel.registration_number ?? '',
        registration_state: vessel.registration_state ?? '',
        registration_expiry: vessel.registration_expiry ?? '',
        documentation_number: vessel.documentation_number ?? '',
        mmsi_number: vessel.mmsi_number ?? '',
        flag_state: vessel.flag_state ?? '',
        hull_material: vessel.hull_material ?? '',
        engine_count: vessel.engine_count?.toString() ?? '',
        engine_type: vessel.engine_type ?? '',
        engine_make: vessel.engine_make ?? '',
        engine_model: vessel.engine_model ?? '',
        engine_year: vessel.engine_year?.toString() ?? '',
        horsepower_per_engine: vessel.horsepower_per_engine?.toString() ?? '',
        fuel_type: vessel.fuel_type ?? '',
        fuel_tank_gallons: vessel.fuel_tank_gallons?.toString() ?? '',
        shore_power: vessel.shore_power ?? '',
        insurance_provider: vessel.insurance_provider ?? '',
        insurance_policy: vessel.insurance_policy ?? '',
        insurance_expiry: vessel.insurance_expiry ?? '',
        insurance_agent_name: vessel.insurance_agent_name ?? '',
        insurance_agent_phone: vessel.insurance_agent_phone ?? '',
        last_survey_date: vessel.last_survey_date ?? '',
        photo_url: vessel.photo_url ?? '',
        notes: vessel.notes ?? '',
      })
    } else {
      setForm(blank)
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

    const payload = {
      boater_id:            user.id,
      name:                 form.name.trim(),
      vessel_type:          form.vessel_type,
      make:                 form.make.trim() || null,
      model:                form.model.trim() || null,
      year:                 intOrNull(form.year),
      color:                form.color.trim() || null,
      length_ft:            numOrNull(form.length_ft),
      beam_ft:              numOrNull(form.beam_ft),
      draft_ft:             numOrNull(form.draft_ft),
      weight_lbs:           numOrNull(form.weight_lbs),
      air_draft_ft:         numOrNull(form.air_draft_ft),
      hin:                  form.hin.trim() || null,
      registration_number:  form.registration_number.trim() || null,
      registration_state:   form.registration_state.trim() || null,
      registration_expiry:  form.registration_expiry || null,
      documentation_number: form.documentation_number.trim() || null,
      mmsi_number:          form.mmsi_number.trim() || null,
      flag_state:           form.flag_state.trim() || null,
      hull_material:        form.hull_material || null,
      engine_count:         intOrNull(form.engine_count),
      engine_type:          form.engine_type || null,
      engine_make:          form.engine_make.trim() || null,
      engine_model:         form.engine_model.trim() || null,
      engine_year:          intOrNull(form.engine_year),
      horsepower_per_engine:intOrNull(form.horsepower_per_engine),
      fuel_type:            form.fuel_type || null,
      fuel_tank_gallons:    intOrNull(form.fuel_tank_gallons),
      shore_power:          form.shore_power || null,
      insurance_provider:   form.insurance_provider.trim() || null,
      insurance_policy:     form.insurance_policy.trim() || null,
      insurance_expiry:     form.insurance_expiry || null,
      insurance_agent_name: form.insurance_agent_name.trim() || null,
      insurance_agent_phone:form.insurance_agent_phone.trim() || null,
      last_survey_date:     form.last_survey_date || null,
      photo_url:            form.photo_url.trim() || null,
      notes:                form.notes.trim() || null,
      updated_at:           new Date().toISOString(),
    }

    let data: Vessel | null = null
    let error: { message: string } | null = null

    if (vessel) {
      // Edit existing
      const result = await supabase.from('boater_vessels').update(payload).eq('id', vessel.id).select().single()
      data = result.data; error = result.error
    } else {
      // New vessel
      const result = await supabase.from('boater_vessels').insert(payload).select().single()
      data = result.data; error = result.error
    }

    setBusy(false)
    if (error) { setErr(error.message); return }
    onVesselSaved(data!)
    setShowForm(false)
  }

  if (showForm) return (
    <div style={{ padding:'20px 20px 100px', animation:'fadeUp 0.3s ease both' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <button onClick={() => setShowForm(false)}
          style={{ background:'none', border:'none', color:C.muted, cursor:'pointer', fontSize:20, padding:'0 4px 0 0', fontFamily:FONT }}>←</button>
        <h2 style={{ margin:0, fontSize:20, fontWeight:800 }}>{vessel ? 'Edit Vessel' : 'Add Your Vessel'}</h2>
      </div>

      <FormSectionLabel>Identity</FormSectionLabel>
      <FieldGroup label="Vessel name *">
        <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder='e.g. "Happy Days"' autoFocus />
      </FieldGroup>
      <FieldGroup label="Type *">
        <SelectInput value={form.vessel_type} onChange={e => set('vessel_type', e.target.value)}>
          <option value="">Select type…</option>
          {['Powerboat','Sailboat','Catamaran','Trawler','Center Console','Pontoon','PWC','Kayak','Other'].map(t => <option key={t}>{t}</option>)}
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
            {['Outboard','Inboard','Sterndrive (I/O)','Jet Drive','Diesel Inboard','Electric','Sail'].map(v => <option key={v}>{v}</option>)}
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

      {err && <ErrMsg>{err}</ErrMsg>}
      <PrimaryBtn onClick={saveVessel} loading={busy} style={{ marginTop:8 }}>
        {vessel ? 'Save Changes' : 'Add Vessel'}
      </PrimaryBtn>
    </div>
  )

  return (
    <div style={{ padding:'20px 20px 0', animation:'fadeUp 0.35s ease both' }}>
      <SectionTitle>My Vessel</SectionTitle>
      {vessel ? (
        <div style={{ background:'linear-gradient(135deg,rgba(77,214,200,0.14) 0%,rgba(13,43,75,0.5) 100%)', border:`1px solid ${C.tealBorder}`, borderRadius:22, padding:22 }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:56, height:56, borderRadius:16, background:C.tealDim, border:`1px solid ${C.tealBorder}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>⛵</div>
              <div>
                <div style={{ fontSize:22, fontWeight:800, letterSpacing:-0.4 }}>{vessel.name}</div>
                <div style={{ fontSize:13, color:C.muted }}>{vessel.vessel_type}{vessel.year ? ` · ${vessel.year}` : ''}</div>
                {vessel.make && <div style={{ fontSize:13, color:C.muted }}>{vessel.make}{vessel.model ? ` ${vessel.model}` : ''}</div>}
              </div>
            </div>
            <button onClick={openEdit}
              style={{ background:C.tealDim, border:`1px solid ${C.tealBorder}`, borderRadius:10, padding:'6px 12px', color:C.teal, fontFamily:FONT, fontSize:12, fontWeight:700, cursor:'pointer', flexShrink:0 }}>
              Edit
            </button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[
              vessel.length_ft && ['LOA', `${vessel.length_ft} ft`],
              vessel.beam_ft && ['Beam', `${vessel.beam_ft} ft`],
              vessel.draft_ft && ['Draft', `${vessel.draft_ft} ft`],
              vessel.shore_power && ['Shore Power', vessel.shore_power],
              vessel.fuel_type && ['Fuel', vessel.fuel_type],
              vessel.registration_number && ['Reg #', vessel.registration_number],
            ].filter(Boolean).map(([l, v]) => (
              <div key={String(l)} style={{ background:'rgba(0,0,0,0.25)', borderRadius:10, padding:'10px 12px' }}>
                <div style={{ fontSize:10, color:C.muted, textTransform:'uppercase', letterSpacing:1, marginBottom:3 }}>{l}</div>
                <div style={{ fontSize:14, fontWeight:700 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:12, background:'rgba(77,214,200,0.08)', border:`1px solid rgba(77,214,200,0.2)`, borderRadius:10, padding:'8px 12px', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:C.green, boxShadow:`0 0 8px ${C.green}`, flexShrink:0 }} />
            <span style={{ fontSize:12, color:C.muted }}>Identity sent to every marina you message</span>
          </div>
        </div>
      ) : (
        <div style={{ textAlign:'center', padding:'48px 20px' }}>
          <div style={{ fontSize:52, marginBottom:14 }}>⛵</div>
          <div style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>No vessel on file</div>
          <div style={{ fontSize:13, color:C.muted, marginBottom:24, lineHeight:1.7, maxWidth:260, margin:'0 auto 24px' }}>
            Add your vessel so marinas know who&apos;s coming and what slip fits you.
          </div>
          <PrimaryBtn onClick={openEdit} style={{ maxWidth:220, margin:'0 auto' }}>+ Add Your Vessel</PrimaryBtn>
        </div>
      )}
    </div>
  )
}

// ─── TAB 2: Marinas ────────────────────────────────────────────────────────────
function TabMarinas({ user, profile, vessel }: { user: User; profile: Profile|null; vessel: Vessel|null }) {
  const [marinas,  setMarinas]  = useState<Marina[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [selected, setSelected] = useState<Marina|null>(null)

  useEffect(() => {
    supabase.from('marinas').select('id,name,city,state,total_slips').order('name').then(({ data }) => {
      setMarinas(data ?? [])
      setLoading(false)
    })
  }, [])

  const filtered = marinas.filter(m =>
    !search.trim() ||
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.city.toLowerCase().includes(search.toLowerCase())
  )

  if (selected) return <MarinaChat marina={selected} user={user} profile={profile} vessel={vessel} onBack={() => setSelected(null)} onAddVessel={() => { setSelected(null) }} />

  return (
    <div style={{ padding:'20px 20px 0', animation:'fadeUp 0.35s ease both' }}>
      <SectionTitle>Marinas</SectionTitle>
      {!vessel && (
        <div style={{ marginBottom:14, background:'rgba(77,214,200,0.07)', border:`1px solid rgba(77,214,200,0.2)`, borderRadius:12, padding:'10px 14px', display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:16 }}>⛵</span>
          <span style={{ fontSize:12, color:C.teal, lineHeight:1.5 }}>Add your vessel under <strong>My Vessel</strong> so Skipper can match you to available slips.</span>
        </div>
      )}
      <div style={{ marginBottom:14 }}>
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or city…" />
      </div>
      {loading && <div style={{ textAlign:'center', color:C.muted, padding:'32px 0' }}>Loading…</div>}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign:'center', color:C.muted, padding:'32px 0', fontSize:14 }}>No marinas found</div>
      )}
      {filtered.map((m, i) => (
        <button key={m.id} onClick={() => setSelected(m)}
          style={{ width:'100%', display:'flex', alignItems:'center', gap:14, background:C.card, border:`1px solid ${C.cardBorder}`, borderRadius:18, padding:'14px 16px', marginBottom:10, color:C.white, fontFamily:FONT, cursor:'pointer', textAlign:'left', animation:`fadeUp 0.3s ease ${i*0.04}s both` }}>
          <div style={{ width:44, height:44, borderRadius:12, background:C.tealDim, border:`1px solid ${C.tealBorder}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>⚓</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:3 }}>{m.name}</div>
            <div style={{ fontSize:12, color:C.muted }}>{m.city}, {m.state} · {m.total_slips} slips</div>
          </div>
          <div style={{ fontSize:12, color:C.teal, fontWeight:700 }}>Message →</div>
        </button>
      ))}
    </div>
  )
}

// ─── Marina Chat ──────────────────────────────────────────────────────────────
function MarinaChat({ marina, user, profile, vessel, onBack }: { marina:Marina; user:User; profile:Profile|null; vessel:Vessel|null; onBack:()=>void }) {
  const [msgs,    setMsgs]    = useState<{role:string;text:string}[]>([
    { role:'skipper', text:`Aye aye! I'm Skipper, your direct line to ${marina.name}. What can I help you with?` }
  ])
  const [draft,   setDraft]   = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const displayName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.display_name || user.email
    : user.email

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
        engine_hp:            vessel.horsepower_per_engine,
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
        body: JSON.stringify({ message:msg, marina_id:marina.id, identity: identityPackage })
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

// ─── TAB 3: Messages ───────────────────────────────────────────────────────────
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
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    first_name:               profile?.first_name ?? '',
    last_name:                profile?.last_name ?? '',
    phone:                    profile?.phone ?? '',
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

  async function saveProfile() {
    if (!form.first_name.trim()) { setErr('First name is required'); return }
    setBusy(true); setErr('')
    const { data, error } = await supabase
      .from('boater_profiles')
      .update({
        first_name:               form.first_name.trim(),
        last_name:                form.last_name.trim() || null,
        display_name:             `${form.first_name.trim()} ${form.last_name.trim()}`.trim(),
        phone:                    form.phone.trim() || null,
        address:                  form.address.trim() || null,
        address_city:             form.address_city.trim() || null,
        address_state:            form.address_state.trim() || null,
        address_zip:              form.address_zip.trim() || null,
        emergency_contact:        form.emergency_contact.trim() || null,
        emergency_phone:          form.emergency_phone.trim() || null,
        title:                    form.title.trim() || null,
        date_of_birth:            form.date_of_birth || null,
        driver_license_number:    form.driver_license_number.trim() || null,
        preferred_contact_method: form.preferred_contact_method || null,
        language_preference:      form.language_preference || 'en',
      })
      .eq('id', user.id)
      .select()
      .single()
    setBusy(false)
    if (error) { setErr(error.message); return }
    onProfileUpdated(data)
    setEditing(false)
  }

  const displayName = profile ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Set your name' : 'Set your name'
  const initials = displayName[0]?.toUpperCase() ?? 'U'

  return (
    <div style={{ padding:'20px 20px 0', animation:'fadeUp 0.35s ease both' }}>
      <SectionTitle>Account</SectionTitle>

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
            <button onClick={() => { setEditing(true); setForm({ first_name:profile?.first_name??'', last_name:profile?.last_name??'', phone:profile?.phone??'', address:profile?.address??'', address_city:profile?.address_city??'', address_state:profile?.address_state??'', address_zip:profile?.address_zip??'', emergency_contact:profile?.emergency_contact??'', emergency_phone:profile?.emergency_phone??'', title:profile?.title??'', date_of_birth:profile?.date_of_birth??'', driver_license_number:profile?.driver_license_number??'', preferred_contact_method:profile?.preferred_contact_method??'', language_preference:profile?.language_preference??'en' }); setErr('') }}
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
