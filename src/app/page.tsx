'use client'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase-client'
import type { User } from '@supabase/supabase-js'

// ─── Design tokens ─────────────────────────────────────────────────────────────
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
  @keyframes fadeUp    { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes scaleIn   { from{opacity:0;transform:scale(0.88)} to{opacity:1;transform:scale(1)} }
  @keyframes glow      { 0%,100%{box-shadow:0 0 0 0 rgba(77,214,200,0.4)} 50%{box-shadow:0 0 0 14px rgba(77,214,200,0)} }
  @keyframes dot1      { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
  @keyframes dot2      { 0%,100%,20%{transform:scale(0)} 60%{transform:scale(1)} }
  @keyframes dot3      { 0%,40%,100%{transform:scale(0)} 80%{transform:scale(1)} }
  @keyframes spin      { to{transform:rotate(360deg)} }
  * { box-sizing:border-box }
  body { margin:0; padding:0; background:#05111f; }
  input::placeholder { color:rgba(255,255,255,0.3)!important }
  input,select { -webkit-appearance:none; appearance:none; }
`

type Screen = 'splash' | 'auth' | 'otp' | 'vessel' | 'home'
type HomeTab = 'vessel' | 'marinas' | 'messages' | 'account'
type Marina = { id:string; name:string; city:string; state:string; total_slips:number }
type Vessel = {
  id?: string
  name: string
  vessel_type: string
  length_ft: string
  beam_ft: string
  draft_ft: string
  shore_power: string
  fuel_type: string
}

// ─── Root ───────────────────────────────────────────────────────────────────────
export default function SkipperApp() {
  const [screen, setScreen] = useState<Screen>('splash')
  const [user,   setUser]   = useState<User | null>(null)
  const [vessel, setVessel] = useState<Vessel | null>(null)
  const [homeTab, setHomeTab] = useState<HomeTab>('vessel')

  // Bootstrap: check session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null
      setUser(u)
      if (!u) { setScreen('auth'); return }
      // load vessel
      supabase.from('boater_vessels').select('*').eq('boater_id', u.id).limit(1)
        .then(({ data: rows }) => {
          if (rows && rows.length > 0) {
            setVessel(rows[0])
            setScreen('home')
          } else {
            setScreen('vessel')
          }
        })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (!u && screen !== 'auth' && screen !== 'otp') setScreen('auth')
    })
    return () => subscription.unsubscribe()
  }, [])

  if (screen === 'splash') return <SplashScreen />

  if (screen === 'auth' || screen === 'otp') return (
    <AuthScreen
      screen={screen}
      onOtpSent={() => setScreen('otp')}
      onAuthed={(u) => {
        setUser(u)
        // check for existing vessel
        supabase.from('boater_vessels').select('*').eq('boater_id', u.id).limit(1)
          .then(({ data: rows }) => {
            if (rows && rows.length > 0) { setVessel(rows[0]); setScreen('home') }
            else setScreen('vessel')
          })
      }}
    />
  )

  if (screen === 'vessel') return (
    <VesselSetupScreen
      user={user!}
      onComplete={(v) => { setVessel(v); setScreen('home') }}
    />
  )

  return (
    <HomeScreen
      user={user!}
      vessel={vessel}
      activeTab={homeTab}
      onTabChange={setHomeTab}
      onSignOut={() => { supabase.auth.signOut(); setUser(null); setScreen('auth') }}
    />
  )
}

// ─── Splash ─────────────────────────────────────────────────────────────────────
function SplashScreen() {
  return (
    <div style={{ minHeight:'100vh', background:C.bgGrad, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:FONT }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ textAlign:'center', animation:'scaleIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}>
        <div style={{ width:96, height:96, borderRadius:'50%', overflow:'hidden', margin:'0 auto 20px', border:`3px solid ${C.teal}`, boxShadow:`0 0 0 8px rgba(77,214,200,0.1)`, animation:'glow 3s ease-in-out infinite' }}>
          <Image src="/skipper-avatar.jpg" alt="Skipper" width={96} height={96} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top' }} priority />
        </div>
        <div style={{ fontSize:30, fontWeight:800, color:C.white, letterSpacing:-0.5, marginBottom:4 }}>Skipper</div>
        <div style={{ fontSize:11, color:C.teal, fontWeight:700, letterSpacing:3, textTransform:'uppercase' }}>AyeAyeSkipper</div>
        <div style={{ display:'flex', gap:6, justifyContent:'center', marginTop:28 }}>
          {[0,0.2,0.4].map((d,i) => <div key={i} style={{ width:7, height:7, borderRadius:'50%', background:C.teal, animation:`dot${i+1} 1.2s ease-in-out ${d}s infinite` }} />)}
        </div>
      </div>
    </div>
  )
}

// ─── Auth (email OTP) ──────────────────────────────────────────────────────────
function AuthScreen({ screen, onOtpSent, onAuthed }: {
  screen: 'auth' | 'otp'
  onOtpSent: () => void
  onAuthed: (u: User) => void
}) {
  const [email,  setEmail]  = useState('')
  const [otp,    setOtp]    = useState('')
  const [busy,   setBusy]   = useState(false)
  const [err,    setErr]    = useState('')
  const [resent, setResent] = useState(false)
  const otpRef = useRef<HTMLInputElement>(null)

  async function sendCode() {
    if (!email.trim()) { setErr('Enter your email'); return }
    setBusy(true); setErr('')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true }
    })
    setBusy(false)
    if (error) { setErr(error.message); return }
    onOtpSent()
    setTimeout(() => otpRef.current?.focus(), 300)
  }

  async function verifyCode() {
    if (otp.length < 6) { setErr('Enter the 6-digit code'); return }
    setBusy(true); setErr('')
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: otp,
      type: 'email'
    })
    setBusy(false)
    if (error) { setErr('Invalid code — check your email and try again'); return }
    if (data.user) onAuthed(data.user)
  }

  async function resendCode() {
    setResent(false); setBusy(true)
    await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true } })
    setBusy(false); setResent(true)
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bgGrad, color:C.white, fontFamily:FONT, WebkitFontSmoothing:'antialiased', display:'flex', flexDirection:'column' }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ maxWidth:420, margin:'0 auto', width:'100%', flex:1, display:'flex', flexDirection:'column', padding:'0 24px' }}>

        {/* Hero */}
        <div style={{ paddingTop:64, paddingBottom:32, textAlign:'center', animation:'fadeUp 0.5s ease both' }}>
          <div style={{ width:90, height:90, borderRadius:'50%', overflow:'hidden', margin:'0 auto 20px', border:`3px solid ${C.teal}`, boxShadow:`0 0 0 8px rgba(77,214,200,0.1), 0 16px 48px rgba(0,0,0,0.4)`, animation:'glow 4s ease-in-out 0.5s infinite' }}>
            <Image src="/skipper-avatar.jpg" alt="Skipper" width={90} height={90} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top' }} priority />
          </div>
          <div style={{ fontSize:11, color:C.teal, fontWeight:700, letterSpacing:3.5, textTransform:'uppercase', marginBottom:8 }}>AyeAyeSkipper</div>
          <h1 style={{ fontSize:28, fontWeight:800, margin:'0 0 8px', letterSpacing:-0.5, lineHeight:1.15 }}>
            {screen === 'auth' ? 'Welcome aboard.' : 'Check your email.'}
          </h1>
          <p style={{ fontSize:14, color:C.muted, margin:0, lineHeight:1.6 }}>
            {screen === 'auth'
              ? 'Your vessel. Your marina. No passwords.'
              : <>We sent a 6-digit code to<br/><strong style={{ color:C.white }}>{email}</strong></>
            }
          </p>
        </div>

        {/* Form */}
        <div style={{ flex:1 }}>
          {screen === 'auth' ? (
            <div style={{ animation:'fadeUp 0.4s ease 0.1s both' }}>
              <Label>Email address</Label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="captain@boat.com"
                onKeyDown={e => e.key === 'Enter' && sendCode()}
                autoFocus
              />
              {err && <ErrMsg>{err}</ErrMsg>}
              <PrimaryBtn onClick={sendCode} loading={busy} style={{ marginTop:20 }}>
                Get Sign-In Code
              </PrimaryBtn>
              <p style={{ textAlign:'center', fontSize:12, color:C.muted2, marginTop:20, lineHeight:1.6 }}>
                New here? Just enter your email — we'll create your account automatically.
              </p>
            </div>
          ) : (
            <div style={{ animation:'fadeUp 0.4s ease both' }}>
              <Label>6-digit code</Label>
              <Input
                ref={otpRef}
                type="number"
                inputMode="numeric"
                value={otp}
                onChange={e => setOtp(e.target.value.slice(0,6))}
                placeholder="123456"
                onKeyDown={e => e.key === 'Enter' && verifyCode()}
                style={{ letterSpacing:8, fontSize:22, textAlign:'center' }}
              />
              {err && <ErrMsg>{err}</ErrMsg>}
              <PrimaryBtn onClick={verifyCode} loading={busy} style={{ marginTop:20 }}>
                Verify & Enter
              </PrimaryBtn>
              <div style={{ textAlign:'center', marginTop:16 }}>
                {resent
                  ? <span style={{ fontSize:13, color:C.green }}>✓ Code resent</span>
                  : <button onClick={resendCode} style={{ background:'none', border:'none', color:C.muted, fontSize:13, cursor:'pointer', fontFamily:FONT }}>
                      Didn't get it? Resend code
                    </button>
                }
              </div>
              <div style={{ textAlign:'center', marginTop:8 }}>
                <button onClick={() => { setOtp(''); setErr('') }} style={{ background:'none', border:'none', color:C.muted2, fontSize:12, cursor:'pointer', fontFamily:FONT }}>
                  ← Use a different email
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ paddingBottom:40, textAlign:'center' }}>
          <p style={{ fontSize:11, color:C.muted2, lineHeight:1.6 }}>
            We run on Skipper.™
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Vessel Setup ───────────────────────────────────────────────────────────────
function VesselSetupScreen({ user, onComplete }: { user: User; onComplete: (v: Vessel) => void }) {
  const [form, setForm] = useState<Vessel>({
    name:'', vessel_type:'', length_ft:'', beam_ft:'', draft_ft:'', shore_power:'', fuel_type:''
  })
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState('')

  function set(k: keyof Vessel, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    const missing = (['name','vessel_type','length_ft','beam_ft','draft_ft','shore_power','fuel_type'] as (keyof Vessel)[])
      .filter(k => !form[k])
    if (missing.length) { setErr('All fields are required — marinas need this for slip fit.'); return }
    setBusy(true); setErr('')
    const { data, error } = await supabase.from('boater_vessels').insert({
      boater_id:   user.id,
      name:        form.name.trim(),
      vessel_type: form.vessel_type,
      length_ft:   parseFloat(form.length_ft),
      beam_ft:     parseFloat(form.beam_ft),
      draft_ft:    parseFloat(form.draft_ft),
      shore_power: form.shore_power,
      fuel_type:   form.fuel_type,
    }).select().single()
    setBusy(false)
    if (error) { setErr(error.message); return }
    onComplete({ ...form, id: data.id })
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bgGrad, color:C.white, fontFamily:FONT, WebkitFontSmoothing:'antialiased' }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ maxWidth:420, margin:'0 auto', padding:'0 20px 100px' }}>

        <div style={{ padding:'48px 0 24px', animation:'fadeUp 0.4s ease both' }}>
          <div style={{ fontSize:11, color:C.teal, fontWeight:700, letterSpacing:3, textTransform:'uppercase', marginBottom:8 }}>Step 1 of 1</div>
          <h1 style={{ fontSize:26, fontWeight:800, margin:'0 0 6px', letterSpacing:-0.4 }}>Tell us about your vessel</h1>
          <p style={{ fontSize:13.5, color:C.muted, margin:0, lineHeight:1.6 }}>
            Every marina needs this to assign you a slip. You can't skip it — and you'll only do this once.
          </p>
        </div>

        {/* Vessel name */}
        <FieldGroup label="Vessel name">
          <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder='e.g. "Big Betty"' />
        </FieldGroup>

        {/* Type */}
        <FieldGroup label="Vessel type">
          <SelectInput value={form.vessel_type} onChange={e => set('vessel_type', e.target.value)}>
            <option value="">Select type…</option>
            {['Powerboat','Sailboat','Catamaran','Trawler','PWC','Center Console','Pontoon','Other'].map(t => <option key={t}>{t}</option>)}
          </SelectInput>
        </FieldGroup>

        {/* Dimensions */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
          <FieldGroup label="LOA (ft)">
            <Input type="number" value={form.length_ft} onChange={e => set('length_ft', e.target.value)} placeholder="34" />
          </FieldGroup>
          <FieldGroup label="Beam (ft)">
            <Input type="number" value={form.beam_ft} onChange={e => set('beam_ft', e.target.value)} placeholder="11" />
          </FieldGroup>
          <FieldGroup label="Draft (ft)">
            <Input type="number" value={form.draft_ft} onChange={e => set('draft_ft', e.target.value)} placeholder="3.5" />
          </FieldGroup>
        </div>

        {/* Shore power */}
        <FieldGroup label="Shore power">
          <SelectInput value={form.shore_power} onChange={e => set('shore_power', e.target.value)}>
            <option value="">Select…</option>
            {['None','30A','50A','100A','Dual 30A','Dual 50A'].map(v => <option key={v}>{v}</option>)}
          </SelectInput>
        </FieldGroup>

        {/* Fuel */}
        <FieldGroup label="Fuel type">
          <SelectInput value={form.fuel_type} onChange={e => set('fuel_type', e.target.value)}>
            <option value="">Select…</option>
            {['Gas','Diesel','Electric','Hybrid'].map(v => <option key={v}>{v}</option>)}
          </SelectInput>
        </FieldGroup>

        {err && <ErrMsg>{err}</ErrMsg>}

        <PrimaryBtn onClick={save} loading={busy} style={{ marginTop:8 }}>
          Save Vessel & Enter Skipper →
        </PrimaryBtn>
      </div>
    </div>
  )
}

// ─── Home (4-tab doctrine layout) ──────────────────────────────────────────────
function HomeScreen({ user, vessel, activeTab, onTabChange, onSignOut }: {
  user: User; vessel: Vessel | null; activeTab: HomeTab
  onTabChange: (t: HomeTab) => void; onSignOut: () => void
}) {
  return (
    <div style={{ minHeight:'100vh', background:C.bgGrad, color:C.white, fontFamily:FONT, WebkitFontSmoothing:'antialiased' }}>
      <style>{GLOBAL_CSS}</style>

      {/* Sticky header */}
      <header style={{
        padding:'16px 20px 12px', display:'flex', alignItems:'center', justifyContent:'space-between',
        background:'rgba(4,10,20,0.92)', backdropFilter:'blur(20px)',
        borderBottom:'1px solid rgba(255,255,255,0.08)',
        position:'sticky', top:0, zIndex:90,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <div style={{ width:32, height:32, borderRadius:8, overflow:'hidden', background:C.white, border:`1px solid ${C.tealBorder}` }}>
            <Image src="/skipper-logo.jpg" alt="Skipper" width={32} height={32} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          </div>
          <span style={{ fontSize:18, fontWeight:800, letterSpacing:-0.4 }}>Skipper</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {vessel && (
            <div style={{ background:C.tealDim, border:`1px solid ${C.tealBorder}`, borderRadius:8, padding:'4px 10px', fontSize:11, fontWeight:700, color:C.teal, letterSpacing:0.3, maxWidth:130, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              ⛵ {vessel.name}
            </div>
          )}
          <div style={{ width:30, height:30, borderRadius:'50%', overflow:'hidden', border:`2px solid ${C.teal}` }}>
            <Image src="/skipper-avatar.jpg" alt="Skipper" width={30} height={30} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top' }} />
          </div>
        </div>
      </header>

      {/* Content */}
      <div style={{ maxWidth:420, margin:'0 auto', paddingBottom:90 }}>
        {activeTab === 'vessel'  && <TabVessel  vessel={vessel} userEmail={user.email} />}
        {activeTab === 'marinas' && <TabMarinas userEmail={user.email} vessel={vessel} />}
        {activeTab === 'messages'&& <TabMessages />}
        {activeTab === 'account' && <TabAccount user={user} onSignOut={onSignOut} vessel={vessel} />}
      </div>

      {/* Bottom nav */}
      <nav style={{
        position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)',
        width:'100%', maxWidth:420,
        background:'rgba(3,8,18,0.96)', backdropFilter:'blur(24px)',
        borderTop:'1px solid rgba(255,255,255,0.09)',
        display:'grid', gridTemplateColumns:'repeat(4,1fr)',
        padding:`10px 0 calc(10px + env(safe-area-inset-bottom))`, zIndex:100,
      }}>
        <NavBtn icon={<IcoVessel  active={activeTab==='vessel'}  />}  label="My Vessel"  active={activeTab==='vessel'}  onClick={() => onTabChange('vessel')}  />
        <NavBtn icon={<IcoMarinas active={activeTab==='marinas'} />}  label="Marinas"    active={activeTab==='marinas'} onClick={() => onTabChange('marinas')} />
        <NavBtn icon={<IcoMsgs   active={activeTab==='messages'}/>}  label="Messages"   active={activeTab==='messages'}onClick={() => onTabChange('messages')}/>
        <NavBtn icon={<IcoAcct   active={activeTab==='account'} />}  label="Account"    active={activeTab==='account'} onClick={() => onTabChange('account')} />
      </nav>
    </div>
  )
}

// ─── TAB 1: My Vessel ───────────────────────────────────────────────────────────
function TabVessel({ vessel, userEmail }: { vessel: Vessel | null; userEmail?: string }) {
  return (
    <div style={{ padding:'20px 20px 0', animation:'fadeUp 0.35s ease both' }}>
      <SectionTitle>My Vessel</SectionTitle>

      {vessel ? (
        <div style={{ background:'linear-gradient(135deg,rgba(77,214,200,0.14) 0%,rgba(13,43,75,0.5) 100%)', border:`1px solid ${C.tealBorder}`, borderRadius:22, padding:22 }}>
          {/* Vessel name */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
            <div style={{ width:56, height:56, borderRadius:16, background:C.tealDim, border:`1px solid ${C.tealBorder}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>⛵</div>
            <div>
              <div style={{ fontSize:22, fontWeight:800, letterSpacing:-0.4 }}>{vessel.name}</div>
              <div style={{ fontSize:13, color:C.muted }}>{vessel.vessel_type}</div>
            </div>
          </div>

          {/* Specs grid */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[
              ['LOA', `${vessel.length_ft} ft`],
              ['Beam', `${vessel.beam_ft} ft`],
              ['Draft', `${vessel.draft_ft} ft`],
              ['Shore Power', vessel.shore_power],
              ['Fuel', vessel.fuel_type],
            ].map(([label, val]) => (
              <div key={label} style={{ background:'rgba(0,0,0,0.25)', borderRadius:12, padding:'12px 14px' }}>
                <div style={{ fontSize:10, color:C.muted, textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>{label}</div>
                <div style={{ fontSize:15, fontWeight:700 }}>{val}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop:14, background:'rgba(77,214,200,0.08)', border:`1px solid rgba(77,214,200,0.2)`, borderRadius:12, padding:'10px 14px', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:C.green, boxShadow:`0 0 8px ${C.green}`, flexShrink:0 }} />
            <span style={{ fontSize:12, color:C.muted }}>Identity visible to any marina you message</span>
          </div>
        </div>
      ) : (
        <div style={{ textAlign:'center', padding:'40px 20px' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>⛵</div>
          <div style={{ fontSize:16, fontWeight:700, marginBottom:6 }}>No vessel yet</div>
        </div>
      )}
    </div>
  )
}

// ─── TAB 2: Marinas ─────────────────────────────────────────────────────────────
function TabMarinas({ userEmail, vessel }: { userEmail?: string; vessel: Vessel | null }) {
  const [q,        setQ]        = useState('')
  const [marinas,  setMarinas]  = useState<Marina[]>([])
  const [loading,  setLoading]  = useState(true)
  const [chatMarina, setChatMarina] = useState<Marina | null>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setLoading(true)
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => {
      fetch(`/api/marinas${q ? `?q=${encodeURIComponent(q)}` : ''}`)
        .then(r => r.json())
        .then(d => { setMarinas(d.marinas ?? []); setLoading(false) })
        .catch(() => setLoading(false))
    }, q ? 300 : 0)
  }, [q])

  if (chatMarina) return <MarinaChat marina={chatMarina} vessel={vessel} onBack={() => setChatMarina(null)} />

  return (
    <div style={{ padding:'20px 20px 0', animation:'fadeUp 0.35s ease both' }}>
      <SectionTitle>Find a Marina</SectionTitle>

      {/* Law 2 callout */}
      <div style={{ background:C.tealDim, border:`1px solid ${C.tealBorder}`, borderRadius:14, padding:'12px 16px', marginBottom:16, display:'flex', gap:12, alignItems:'flex-start' }}>
        <Image src="/skipper-avatar.jpg" alt="Skipper" width={32} height={32} style={{ width:32, height:32, borderRadius:'50%', objectFit:'cover', objectPosition:'center top', border:`2px solid ${C.teal}`, flexShrink:0 }} />
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:C.teal, marginBottom:2 }}>Message any marina. No enrollment required.</div>
          <div style={{ fontSize:12, color:C.muted, lineHeight:1.5 }}>Transient, shopping for a slip, or just asking a question — just tap and message.</div>
        </div>
      </div>

      {/* Search */}
      <div style={{ position:'relative', marginBottom:12 }}>
        <svg style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', opacity:0.5 }} width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke="white" strokeWidth="2"/><path d="M16.5 16.5L21 21" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <input
          type="text" value={q} onChange={e => setQ(e.target.value)}
          placeholder="Search marina name or city…"
          style={{ width:'100%', padding:'14px 14px 14px 42px', background:C.inputBg, border:`1.5px solid ${C.inputBorder}`, borderRadius:14, color:C.white, fontSize:15, fontFamily:FONT, outline:'none' }}
          onFocus={e => e.currentTarget.style.borderColor = C.teal}
          onBlur={e => e.currentTarget.style.borderColor = C.inputBorder}
        />
      </div>

      {loading && <div style={{ textAlign:'center', color:C.muted, padding:'32px 0', fontSize:14 }}>Loading…</div>}
      {!loading && marinas.length === 0 && <div style={{ textAlign:'center', color:C.muted, padding:'32px 0', fontSize:14 }}>{q ? `No results for "${q}"` : 'No marinas in network yet.'}</div>}

      {!loading && marinas.map((m, i) => (
        <button key={m.id} onClick={() => setChatMarina(m)}
          style={{
            width:'100%', display:'flex', alignItems:'center', gap:14,
            background:C.card, border:`1px solid ${C.cardBorder}`, borderRadius:18,
            padding:'14px 16px', marginBottom:10,
            color:C.white, fontFamily:FONT, cursor:'pointer', textAlign:'left',
            animation:`fadeUp 0.3s ease ${i*0.05}s both`, transition:'background 0.15s, transform 0.1s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background=C.tealDim; e.currentTarget.style.transform='translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.background=C.card; e.currentTarget.style.transform='translateY(0)' }}
        >
          <div style={{ width:46, height:46, borderRadius:13, background:C.white, border:`1px solid ${C.tealBorder}`, overflow:'hidden', flexShrink:0 }}>
            <Image src="/skipper-logo.jpg" alt={m.name} width={46} height={46} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:3 }}>{m.name}</div>
            <div style={{ fontSize:12, color:C.muted }}>{[m.city, m.state].filter(Boolean).join(', ')}{m.total_slips ? ` · ${m.total_slips} slips` : ''}</div>
          </div>
          <div style={{ fontSize:12, color:C.teal, fontWeight:700, whiteSpace:'nowrap' }}>Message →</div>
        </button>
      ))}
    </div>
  )
}

// ─── Marina Chat ────────────────────────────────────────────────────────────────
function MarinaChat({ marina, vessel, onBack }: { marina: Marina; vessel: Vessel | null; onBack: () => void }) {
  const [messages, setMessages] = useState([
    { role:'skipper', text:`Aye aye! I'm Skipper, your direct line to ${marina.name}. What can I help you with?` }
  ])
  const [draft,   setDraft]   = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function send() {
    if (!draft.trim() || sending) return
    const msg = draft.trim(); setDraft('')
    setMessages(m => [...m, { role:'user', text:msg }])
    setSending(true)
    try {
      const r = await fetch('https://skipper-engine-production.up.railway.app/chat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ message:msg, session:{ access_type:'guest', marina_id:marina.id, vessel: vessel ? { name:vessel.name, loa:vessel.length_ft, type:vessel.vessel_type } : null } })
      })
      const d = await r.json()
      setMessages(m => [...m, { role:'skipper', text:d.reply || 'Let me check on that.' }])
    } catch {
      setMessages(m => [...m, { role:'skipper', text:'Sorry — rough seas on my end. Try again in a moment.' }])
    }
    setSending(false)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 100)
  }

  return (
    <div style={{ padding:'0 20px', animation:'fadeUp 0.3s ease both' }}>
      {/* Marina header */}
      <div style={{ padding:'14px 0 10px', display:'flex', alignItems:'center', gap:10, borderBottom:`1px solid rgba(255,255,255,0.08)`, marginBottom:14 }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:C.muted, cursor:'pointer', fontSize:20, padding:'0 4px 0 0', fontFamily:FONT }}>←</button>
        <div style={{ width:36, height:36, borderRadius:10, background:C.white, border:`1px solid ${C.tealBorder}`, overflow:'hidden', flexShrink:0 }}>
          <Image src="/skipper-logo.jpg" alt={marina.name} width={36} height={36} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
        </div>
        <div>
          <div style={{ fontSize:15, fontWeight:700 }}>{marina.name}</div>
          <div style={{ fontSize:11, color:C.teal, fontWeight:600 }}>Skipper-powered™</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:14, minHeight:200 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start', gap:8, alignItems:'flex-end' }}>
            {m.role==='skipper' && (
              <div style={{ width:30, height:30, borderRadius:'50%', overflow:'hidden', border:`2px solid ${C.teal}`, flexShrink:0 }}>
                <Image src="/skipper-avatar.jpg" alt="Skipper" width={30} height={30} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top' }} />
              </div>
            )}
            <div style={{
              maxWidth:'78%', padding:'11px 14px',
              borderRadius: m.role==='user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: m.role==='user' ? `linear-gradient(135deg,${C.teal},#2fb3a3)` : C.card,
              color: m.role==='user' ? C.navy : C.white,
              border: m.role==='skipper' ? `1px solid ${C.cardBorder}` : 'none',
              fontSize:14, lineHeight:1.55, fontWeight:m.role==='user'?600:400,
            }}>{m.text}</div>
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

      {/* Compose */}
      <div style={{ display:'flex', gap:8, paddingBottom:8 }}>
        <input
          type="text" value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder={`Message ${marina.name}…`}
          style={{ flex:1, padding:'13px 14px', background:C.inputBg, border:`1.5px solid ${C.inputBorder}`, borderRadius:13, color:C.white, fontSize:14, fontFamily:FONT, outline:'none' }}
          onFocus={e => e.currentTarget.style.borderColor=C.teal}
          onBlur={e => e.currentTarget.style.borderColor=C.inputBorder}
        />
        <button onClick={send} disabled={sending || !draft.trim()}
          style={{ padding:'0 18px', background:(!draft.trim()||sending)?'rgba(77,214,200,0.3)':`linear-gradient(135deg,${C.teal},#2fb3a3)`, border:'none', borderRadius:13, color:C.navy, cursor:(!draft.trim()||sending)?'default':'pointer', flexShrink:0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke={C.navy} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── TAB 3: Messages ─────────────────────────────────────────────────────────────
function TabMessages() {
  return (
    <div style={{ padding:'20px 20px 0', animation:'fadeUp 0.35s ease both' }}>
      <SectionTitle>Messages</SectionTitle>
      <div style={{ textAlign:'center', padding:'48px 20px' }}>
        <div style={{ width:60, height:60, borderRadius:'50%', overflow:'hidden', margin:'0 auto 14px', border:`2px solid ${C.teal}` }}>
          <Image src="/skipper-avatar.jpg" alt="Skipper" width={60} height={60} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top' }} />
        </div>
        <div style={{ fontSize:16, fontWeight:700, marginBottom:6 }}>No messages yet</div>
        <div style={{ fontSize:13, color:C.muted, lineHeight:1.6, maxWidth:260, margin:'0 auto' }}>
          Message any marina from the Marinas tab — your threads will appear here.
        </div>
      </div>
    </div>
  )
}

// ─── TAB 4: Account ───────────────────────────────────────────────────────────────
function TabAccount({ user, onSignOut, vessel }: { user: User; onSignOut: () => void; vessel: Vessel | null }) {
  return (
    <div style={{ padding:'20px 20px 0', animation:'fadeUp 0.35s ease both' }}>
      <SectionTitle>Account</SectionTitle>

      <div style={{ background:C.card, border:`1px solid ${C.cardBorder}`, borderRadius:20, padding:20, marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
          <div style={{ width:52, height:52, borderRadius:'50%', overflow:'hidden', border:`2px solid ${C.teal}` }}>
            <Image src="/skipper-avatar.jpg" alt="Skipper" width={52} height={52} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top' }} />
          </div>
          <div>
            <div style={{ fontSize:16, fontWeight:700, marginBottom:2 }}>{vessel?.name ?? 'My Account'}</div>
            <div style={{ fontSize:13, color:C.muted }}>{user.email}</div>
          </div>
        </div>

        {vessel && (
          <div style={{ background:'rgba(0,0,0,0.2)', borderRadius:12, padding:'12px 14px', marginBottom:14 }}>
            <div style={{ fontSize:10, color:C.muted, textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>Vessel</div>
            <div style={{ fontSize:14, fontWeight:700 }}>{vessel.name} · {vessel.vessel_type}</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{vessel.length_ft}ft LOA · {vessel.shore_power} · {vessel.fuel_type}</div>
          </div>
        )}

        <div style={{ background:'rgba(77,214,200,0.08)', border:`1px solid rgba(77,214,200,0.2)`, borderRadius:12, padding:'10px 14px' }}>
          <div style={{ fontSize:10, color:C.muted, textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>Identity package</div>
          <div style={{ fontSize:12, color:C.muted, lineHeight:1.6 }}>
            Your vessel specs are sent to every marina you message — so they know exactly who's coming and what slip to assign. You control your data.
          </div>
        </div>
      </div>

      <button onClick={onSignOut} style={{
        width:'100%', padding:'14px', background:'transparent',
        border:`1px solid rgba(248,113,113,0.3)`, borderRadius:14,
        color:C.danger, fontFamily:FONT, fontSize:14, fontWeight:600, cursor:'pointer',
      }}>Sign Out</button>
    </div>
  )
}

// ─── Nav icons ────────────────────────────────────────────────────────────────────
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

// ─── Shared UI primitives ────────────────────────────────────────────────────────
const Input = ({ style, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { ref?: React.Ref<HTMLInputElement> }) => (
  <input style={{ width:'100%', padding:'14px 15px', background:C.inputBg, border:`1.5px solid ${C.inputBorder}`, borderRadius:14, color:C.white, fontSize:15, fontFamily:FONT, outline:'none', ...style }} {...p} />
)
const SelectInput = ({ style, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select style={{ width:'100%', padding:'14px 15px', background:'#0d1f35', border:`1.5px solid ${C.inputBorder}`, borderRadius:14, color:p.value?C.white:C.muted, fontSize:15, fontFamily:FONT, outline:'none', ...style }} {...p} />
)
const Label = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize:12, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>{children}</div>
)
const FieldGroup = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ marginBottom:16 }}>
    <Label>{label}</Label>
    {children}
  </div>
)
const ErrMsg = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize:13, color:C.danger, marginTop:8, padding:'10px 14px', background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.25)', borderRadius:10 }}>{children}</div>
)
const PrimaryBtn = ({ children, loading, style, onClick }: { children: React.ReactNode; loading?: boolean; style?: React.CSSProperties; onClick?: () => void }) => (
  <button onClick={onClick} disabled={loading} style={{ width:'100%', padding:'15px', background:loading?'rgba(77,214,200,0.4)':`linear-gradient(135deg,${C.teal},#2fb3a3)`, border:'none', borderRadius:14, color:C.navy, fontFamily:FONT, fontSize:15, fontWeight:800, cursor:loading?'default':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, letterSpacing:-0.2, ...style }}>
    {loading ? <><Spinner/>Please wait…</> : children}
  </button>
)
const Spinner = () => <div style={{ width:16, height:16, border:`2px solid ${C.navy}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:1.8, margin:'0 0 14px' }}>{children}</h2>
)
const NavBtn = ({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) => (
  <button onClick={onClick} style={{ background:'transparent', border:'none', padding:'4px 0', display:'flex', flexDirection:'column', alignItems:'center', gap:3, color:active?C.teal:C.muted, fontFamily:FONT, fontSize:10, fontWeight:active?700:500, cursor:'pointer' }}>
    {icon}
    <span style={{ letterSpacing:0.2 }}>{label}</span>
  </button>
)
