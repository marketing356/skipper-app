'use client'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'

const C = {
  bg:          '#05111f',
  bgGrad:      'linear-gradient(160deg, #071e38 0%, #051524 50%, #030e19 100%)',
  bgGrad2:     'linear-gradient(180deg, #071e38 0%, #040f1c 100%)',
  card:        'rgba(255,255,255,0.07)',
  cardBorder:  'rgba(255,255,255,0.11)',
  teal:        '#4dd6c8',
  tealDim:     'rgba(77,214,200,0.15)',
  tealBorder:  'rgba(77,214,200,0.3)',
  tealGlow:    'rgba(77,214,200,0.2)',
  white:       '#ffffff',
  muted:       'rgba(255,255,255,0.55)',
  muted2:      'rgba(255,255,255,0.35)',
  green:       '#4ade80',
  navy:        '#0d2b4b',
  gold:        '#f5c842',
  inputBg:     'rgba(255,255,255,0.06)',
  inputBorder: 'rgba(255,255,255,0.16)',
}
const FONT = '"SF Pro Display", "SF Pro Text", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

type Marina = { id: string; name: string; city: string; state: string; total_slips: number }

// ─── SVG Nav Icons ─────────────────────────────────────────────────────────────
function IconHome({ active }: { active: boolean }) {
  const c = active ? C.teal : C.muted
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1H5a1 1 0 01-1-1V10.5z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" fill={active ? 'rgba(77,214,200,0.15)' : 'none'}/>
      <path d="M9 22V12h6v10" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}
function IconChat({ active }: { active: boolean }) {
  const c = active ? C.teal : C.muted
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" fill={active ? 'rgba(77,214,200,0.15)' : 'none'}/>
      {active && <circle cx="8.5" cy="10" r="1.2" fill={c}/> }
      {active && <circle cx="12" cy="10" r="1.2" fill={c}/> }
      {active && <circle cx="15.5" cy="10" r="1.2" fill={c}/> }
    </svg>
  )
}
function IconCard({ active }: { active: boolean }) {
  const c = active ? C.teal : C.muted
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="5" width="20" height="14" rx="2.5" stroke={c} strokeWidth="1.8" fill={active ? 'rgba(77,214,200,0.15)' : 'none'}/>
      <path d="M2 10h20" stroke={c} strokeWidth="1.8"/>
      <rect x="5" y="14" width="4" height="2" rx="0.5" fill={c}/>
    </svg>
  )
}
function IconDoc({ active }: { active: boolean }) {
  const c = active ? C.teal : C.muted
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" fill={active ? 'rgba(77,214,200,0.15)' : 'none'}/>
      <path d="M14 2v6h6M8 13h8M8 17h5" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

// ─── Skipper Logo Lockup ──────────────────────────────────────────────────────
function SkipperLogo({ size = 36 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <div style={{
        width: size, height: size, borderRadius: size * 0.24,
        overflow: 'hidden', flexShrink: 0,
        boxShadow: `0 0 0 1.5px ${C.tealBorder}, 0 4px 16px rgba(77,214,200,0.18)`,
        background: C.white,
      }}>
        <Image src="/skipper-logo.jpg" alt="Skipper" width={size} height={size} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <span style={{
        fontSize: size * 0.56, fontWeight: 800, color: C.white,
        letterSpacing: -0.6, fontFamily: FONT, lineHeight: 1,
      }}>
        Skipper
      </span>
    </div>
  )
}

// ─── Captain Avatar ────────────────────────────────────────────────────────────
function CaptainAvatar({ size = 32 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
      border: `2px solid ${C.teal}`,
      boxShadow: `0 0 12px rgba(77,214,200,0.35), 0 2px 8px rgba(0,0,0,0.4)`,
      background: 'rgba(77,214,200,0.1)',
    }}>
      <Image src="/skipper-avatar.jpg" alt="Skipper" width={size} height={size}
        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
    </div>
  )
}

// ─── Marina Coupler / Welcome Screen ─────────────────────────────────────────
function MarinaCouplerScreen({ onSelect }: { onSelect: (m: Marina | null) => void }) {
  const [q, setQ]               = useState('')
  const [marinas, setMarinas]   = useState<Marina[]>([])
  const [loading, setLoading]   = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setLoading(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetch(`/api/marinas${q ? `?q=${encodeURIComponent(q)}` : ''}`)
        .then(r => r.json())
        .then(d => { setMarinas(d.marinas ?? []); setLoading(false) })
        .catch(() => setLoading(false))
    }, q ? 300 : 0)
  }, [q])

  return (
    <div style={{ minHeight: '100vh', background: C.bgGrad, color: C.white, fontFamily: FONT, WebkitFontSmoothing: 'antialiased', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes fadeUp     { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
        @keyframes captainIn  { from { opacity:0; transform:scale(0.88) translateY(10px) } to { opacity:1; transform:scale(1) translateY(0) } }
        @keyframes glow       { 0%,100% { box-shadow: 0 0 0 0 rgba(77,214,200,0.35), 0 8px 32px rgba(0,0,0,0.5) } 50% { box-shadow: 0 0 0 14px rgba(77,214,200,0), 0 8px 32px rgba(0,0,0,0.5) } }
        @keyframes bubbleIn   { from { opacity:0; transform:translateX(-8px) } to { opacity:1; transform:translateX(0) } }
        input::placeholder { color: rgba(255,255,255,0.3) !important; }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ maxWidth: 420, margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* ── Hero ── */}
        <div style={{ padding: '48px 24px 24px', textAlign: 'center' }}>

          {/* Captain + speech bubble */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>

            {/* Captain circle */}
            <div style={{
              width: 110, height: 110, borderRadius: '50%', overflow: 'hidden',
              border: `3px solid ${C.teal}`,
              boxShadow: `0 0 0 6px rgba(77,214,200,0.12), 0 16px 48px rgba(0,0,0,0.5)`,
              animation: 'captainIn 0.55s cubic-bezier(0.34,1.56,0.64,1) both, glow 4s ease-in-out 1s infinite',
              background: 'rgba(77,214,200,0.08)',
              flexShrink: 0,
            }}>
              <Image src="/skipper-avatar.jpg" alt="Captain Skipper" width={110} height={110}
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
                priority />
            </div>

            {/* Speech bubble */}
            <div style={{
              marginTop: 14,
              background: 'rgba(77,214,200,0.1)',
              border: `1px solid ${C.tealBorder}`,
              borderRadius: '0 16px 16px 16px',
              padding: '10px 16px',
              fontSize: 13,
              color: C.white,
              lineHeight: 1.5,
              maxWidth: 260,
              animation: 'bubbleIn 0.4s ease 0.4s both',
              position: 'relative',
            }}>
              <span style={{ color: C.teal, fontWeight: 700 }}>Aye aye!</span> I&apos;m Skipper — your marina connection. Which marina are you at?
              {/* Tail */}
              <div style={{
                position: 'absolute', top: -8, left: 16,
                width: 0, height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderBottom: `8px solid ${C.tealBorder}`,
              }}/>
            </div>
          </div>

          {/* Wordmark */}
          <div style={{ animation: 'fadeUp 0.45s ease 0.25s both' }}>
            <div style={{ color: C.teal, fontSize: 11, fontWeight: 700, letterSpacing: 3.5, textTransform: 'uppercase', marginBottom: 6 }}>
              AyeAyeSkipper
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 6px', lineHeight: 1.15, letterSpacing: -0.5 }}>
              Find your marina
            </h1>
            <p style={{ fontSize: 13, color: C.teal, margin: 0, fontWeight: 600, letterSpacing: 0.3 }}>
              We run on Skipper.™
            </p>
          </div>
        </div>

        {/* ── Search ── */}
        <div style={{ padding: '0 20px 10px', animation: 'fadeUp 0.4s ease 0.3s both' }}>
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.5 }} width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="white" strokeWidth="2"/>
              <path d="M16.5 16.5L21 21" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <input
              type="text" value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search marina name or city…"
              autoFocus
              style={{
                width: '100%', padding: '15px 15px 15px 44px',
                background: C.inputBg, border: `1.5px solid ${C.inputBorder}`,
                borderRadius: 16, color: C.white, fontSize: 15, fontFamily: FONT, outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = C.teal; e.currentTarget.style.boxShadow = `0 0 0 3px rgba(77,214,200,0.1)` }}
              onBlur={e => { e.currentTarget.style.borderColor = C.inputBorder; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>
        </div>

        {/* ── Marina list ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 0' }}>
          {loading && (
            <div style={{ textAlign: 'center', color: C.muted, fontSize: 14, padding: '32px 0', opacity: 0.7 }}>
              <div style={{ marginBottom: 8 }}>⚓</div>Loading marinas…
            </div>
          )}
          {!loading && marinas.length === 0 && (
            <div style={{ textAlign: 'center', color: C.muted, fontSize: 14, padding: '32px 0' }}>
              {q ? `No marinas found for "${q}"` : 'No marinas in network yet.'}
            </div>
          )}
          {!loading && marinas.map((m, i) => (
            <button key={m.id} onClick={() => onSelect(m)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                background: C.card, border: `1px solid ${C.cardBorder}`,
                borderRadius: 18, padding: '14px 16px', marginBottom: 10,
                color: C.white, fontFamily: FONT, cursor: 'pointer', textAlign: 'left',
                animation: `fadeUp 0.35s ease ${i * 0.05}s both`,
                transition: 'background 0.15s, border-color 0.15s, transform 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = C.tealDim; e.currentTarget.style.borderColor = C.tealBorder; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = C.card; e.currentTarget.style.borderColor = C.cardBorder; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              {/* Marina icon */}
              <div style={{
                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                overflow: 'hidden', background: C.white,
                boxShadow: `0 0 0 1.5px ${C.tealBorder}`,
              }}>
                <Image src="/skipper-logo.jpg" alt={m.name} width={48} height={48} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                <div style={{ fontSize: 12, color: C.muted }}>
                  {[m.city, m.state].filter(Boolean).join(', ')}
                  {m.total_slips ? ` · ${m.total_slips} slips` : ''}
                </div>
              </div>
              <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
                <path d="M1 1l6 6-6 6" stroke={C.teal} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ))}
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: '16px 20px calc(36px + env(safe-area-inset-bottom))' }}>
          {showInvite ? (
            <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 18, padding: 18, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <CaptainAvatar size={30} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.teal }}>Staff / crew access</div>
                  <div style={{ fontSize: 11, color: C.muted }}>Enter your marina invite code</div>
                </div>
              </div>
              <input
                type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())}
                placeholder="e.g. ABC-2026"
                style={{
                  width: '100%', padding: '13px 14px',
                  background: C.inputBg, border: `1.5px solid ${C.inputBorder}`,
                  borderRadius: 12, color: C.white, fontSize: 16, fontFamily: FONT,
                  outline: 'none', letterSpacing: 2.5, marginBottom: 12,
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowInvite(false)} style={{ flex: 1, padding: '13px', background: 'transparent', border: `1px solid ${C.cardBorder}`, borderRadius: 12, color: C.muted, fontFamily: FONT, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
                <button style={{ flex: 2, padding: '13px', background: C.teal, border: 'none', borderRadius: 12, color: C.navy, fontFamily: FONT, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Join Marina ⚓</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowInvite(true)} style={{
              width: '100%', padding: '14px', background: 'transparent',
              border: `1px solid ${C.cardBorder}`, borderRadius: 14,
              color: C.muted, fontFamily: FONT, fontSize: 14, cursor: 'pointer', marginBottom: 10,
              transition: 'border-color 0.2s, color 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.tealBorder; e.currentTarget.style.color = C.white }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.cardBorder; e.currentTarget.style.color = C.muted }}
            >
              🏴‍☠️ I work at a marina — enter invite code
            </button>
          )}
          <button onClick={() => onSelect(null)} style={{
            width: '100%', padding: '12px', background: 'transparent', border: 'none',
            color: 'rgba(255,255,255,0.28)', fontFamily: FONT, fontSize: 13, cursor: 'pointer',
          }}>
            I&apos;m a transient — browse without a marina
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Boater Dashboard ────────────────────────────────────────────────────
export default function BoaterPortal() {
  const [marina, setMarina]       = useState<Marina | null | 'loading'>('loading')
  const [activeTab, setActiveTab] = useState<'home' | 'chat' | 'payments' | 'documents'>('home')
  const [showHotSlip, setShowHotSlip] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('skipper:marina')
      setMarina(saved ? JSON.parse(saved) : null)
    } catch { setMarina(null) }
  }, [])

  function selectMarina(m: Marina | null) {
    try {
      if (m) localStorage.setItem('skipper:marina', JSON.stringify(m))
      else localStorage.removeItem('skipper:marina')
    } catch {}
    setMarina(m)
  }

  // ── Splash screen ──
  if (marina === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: C.bgGrad, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>
        <style>{`
          @keyframes splashCaptain { from { opacity:0; transform:scale(0.7) } to { opacity:1; transform:scale(1) } }
          @keyframes splashText    { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
          @keyframes splashDot1    { 0%,80%,100%{transform:scale(0)}40%{transform:scale(1)} }
          @keyframes splashDot2    { 0%,100%,20%{transform:scale(0)}60%{transform:scale(1)} }
          @keyframes splashDot3    { 0%,40%,100%{transform:scale(0)}80%{transform:scale(1)} }
        `}</style>
        <div style={{ textAlign: 'center' }}>
          {/* Captain */}
          <div style={{
            width: 90, height: 90, borderRadius: '50%', overflow: 'hidden', margin: '0 auto 18px',
            border: `3px solid ${C.teal}`,
            boxShadow: `0 0 0 8px rgba(77,214,200,0.1), 0 16px 48px rgba(0,0,0,0.6)`,
            animation: 'splashCaptain 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
          }}>
            <Image src="/skipper-avatar.jpg" alt="Skipper" width={90} height={90}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} priority />
          </div>
          {/* Wordmark */}
          <div style={{ animation: 'splashText 0.4s ease 0.2s both' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: C.white, letterSpacing: -0.5, marginBottom: 4 }}>Skipper</div>
            <div style={{ fontSize: 11, color: C.teal, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' }}>AyeAyeSkipper</div>
          </div>
          {/* Loading dots */}
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 28 }}>
            {[1,2,3].map(n => (
              <div key={n} style={{
                width: 7, height: 7, borderRadius: '50%', background: C.teal,
                animation: `splashDot${n} 1.2s ease-in-out infinite`,
              }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (marina === null) return <MarinaCouplerScreen onSelect={selectMarina} />

  return (
    <div style={{ minHeight: '100vh', background: C.bgGrad, color: C.white, fontFamily: FONT, WebkitFontSmoothing: 'antialiased' }}>
      <style>{`
        @keyframes fadeUp  { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes shimmer { from { background-position: -200% 0 } to { background-position: 200% 0 } }
        input::placeholder { color: rgba(255,255,255,0.3) !important; }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ maxWidth: 420, margin: '0 auto', paddingBottom: 90, minHeight: '100vh' }}>

        {/* ── HEADER ── */}
        <header style={{
          padding: '18px 20px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
          position: 'sticky', top: 0, zIndex: 90,
          background: 'rgba(5,17,31,0.9)',
        }}>
          <SkipperLogo size={34} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              background: C.tealDim, border: `1px solid ${C.tealBorder}`,
              borderRadius: 9, padding: '5px 11px',
              fontSize: 11, fontWeight: 700, color: C.teal, letterSpacing: 0.6,
              maxWidth: 130, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              ⚓ {marina.name}
            </div>
            <button onClick={() => selectMarina(null)} style={{
              background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.cardBorder}`,
              borderRadius: 9, padding: '5px 9px',
              color: C.muted, fontFamily: FONT, fontSize: 12, cursor: 'pointer',
              transition: 'background 0.15s',
            }}
              title="Switch marina"
            >↕</button>
          </div>
        </header>

        {/* ── HERO CARD ── */}
        <section style={{ padding: '16px 20px 0', animation: 'fadeUp 0.4s ease both' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(77,214,200,0.16) 0%, rgba(13,43,75,0.55) 60%, rgba(3,14,25,0.8) 100%)',
            border: `1px solid ${C.tealBorder}`,
            borderRadius: 24, padding: '20px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(77,214,200,0.08)',
          }}>
            {/* Captain greeting row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
              <CaptainAvatar size={52} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 3, letterSpacing: -0.3 }}>
                  Aye aye, Captain! 👋
                </div>
                <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.45 }}>
                  Skipper is standing by at <span style={{ color: C.teal, fontWeight: 600 }}>{marina.name}</span>
                </div>
              </div>
            </div>

            {/* Marina status row */}
            <div style={{
              background: 'rgba(0,0,0,0.25)', borderRadius: 14, padding: '13px 14px', marginBottom: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 }}>Connected</div>
                <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.2 }}>{marina.name}</div>
                <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
                  {[marina.city, marina.state].filter(Boolean).join(', ')}
                  {marina.total_slips ? ` · ${marina.total_slips} slips` : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end', marginBottom: 5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.green, boxShadow: `0 0 8px ${C.green}`, display: 'inline-block' }} />
                  <span style={{ fontSize: 12, color: C.green, fontWeight: 700 }}>Active</span>
                </div>
                <div style={{
                  fontSize: 10, color: C.teal, fontWeight: 700, letterSpacing: 0.5,
                  background: 'rgba(77,214,200,0.1)', borderRadius: 6, padding: '3px 7px',
                }}>Skipper-powered™</div>
              </div>
            </div>

            {/* Message CTA */}
            <button
              onClick={() => setActiveTab('chat')}
              style={{
                width: '100%', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                background: `linear-gradient(135deg, ${C.teal} 0%, #2fb3a3 100%)`,
                border: 'none', borderRadius: 14,
                color: C.navy, fontFamily: FONT, fontSize: 14.5, fontWeight: 800, cursor: 'pointer',
                boxShadow: '0 4px 24px rgba(77,214,200,0.4), 0 2px 8px rgba(0,0,0,0.2)',
                letterSpacing: -0.2,
                transition: 'transform 0.1s, box-shadow 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(77,214,200,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(77,214,200,0.4)' }}
            >
              <CaptainAvatarXS />
              <span>Message {marina.name} via Skipper</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 2 }}>
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke={C.navy} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </section>

        {activeTab === 'home' && (
          <>
            {/* ── QUICK ACTIONS ── */}
            <section style={{ padding: '20px 20px 8px', animation: 'fadeUp 0.4s ease 0.06s both' }}>
              <SectionTitle>Quick Actions</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <ActionCard icon={<WrenchIcon />}  label="Request Service" />
                <ActionCard icon={<CalIcon />}      label="Mark Away Dates" onClick={() => setShowHotSlip(s => !s)} />
                <ActionCard icon={<PayIcon />}      label="Pay Invoice" />
                <ActionCard icon={<DocSmIcon />}    label="My Documents" />
              </div>
              {showHotSlip && <HotSlipPanel onClose={() => setShowHotSlip(false)} />}
            </section>

            {/* ── RECENT MESSAGES ── */}
            <section style={{ padding: '8px 20px 0', animation: 'fadeUp 0.4s ease 0.12s both' }}>
              <SectionTitle>Recent Messages</SectionTitle>
              <div style={{
                background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 20, padding: '22px 20px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
              }}>
                <CaptainAvatar size={48} />
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 12, marginBottom: 5 }}>No messages yet</div>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5, maxWidth: 240 }}>
                  Tap the button above to start your first conversation with {marina.name}.
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === 'chat' && (
          <section style={{ padding: '16px 20px 8px', animation: 'fadeUp 0.3s ease both' }}>
            <SectionTitle>Skipper Chat</SectionTitle>
            <SkipperChat marinaName={marina.name} />
          </section>
        )}

        {(activeTab === 'payments' || activeTab === 'documents') && (
          <section style={{ padding: '56px 20px', textAlign: 'center' }}>
            <CaptainAvatar size={64} />
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 14, marginBottom: 6, letterSpacing: -0.3, textTransform: 'capitalize' }}>{activeTab}</div>
            <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6 }}>Coming soon —<br/>Skipper is building this.</div>
          </section>
        )}
      </div>

      {/* ── BOTTOM NAV ── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 420,
        background: 'rgba(4,12,22,0.95)', backdropFilter: 'blur(24px)',
        borderTop: `1px solid rgba(255,255,255,0.09)`,
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        padding: `10px 0 calc(10px + env(safe-area-inset-bottom))`, zIndex: 100,
      }}>
        <NavItem icon={<IconHome  active={activeTab === 'home'}      />} label="Home"     active={activeTab === 'home'}      onClick={() => setActiveTab('home')} />
        <NavItem icon={<IconChat  active={activeTab === 'chat'}      />} label="Chat"     active={activeTab === 'chat'}      onClick={() => setActiveTab('chat')} />
        <NavItem icon={<IconCard  active={activeTab === 'payments'}  />} label="Payments" active={activeTab === 'payments'}  onClick={() => setActiveTab('payments')} />
        <NavItem icon={<IconDoc   active={activeTab === 'documents'} />} label="Docs"     active={activeTab === 'documents'} onClick={() => setActiveTab('documents')} />
      </nav>
    </div>
  )
}

// ─── Skipper Chat ─────────────────────────────────────────────────────────────
function SkipperChat({ marinaName }: { marinaName: string }) {
  const [messages, setMessages] = useState([
    { role: 'skipper', text: `Aye aye! I'm Skipper, your direct line to ${marinaName}. Ask me about your slip, marina services, hours, or anything else. What can I help you with?` }
  ])
  const [draft, setDraft]   = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function send() {
    if (!draft.trim() || sending) return
    const userMsg = draft.trim()
    setDraft('')
    setMessages(m => [...m, { role: 'user', text: userMsg }])
    setSending(true)
    try {
      const r = await fetch('https://skipper-engine-production.up.railway.app/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, session: { access_type: 'guest' } }),
      })
      const d = await r.json()
      setMessages(m => [...m, { role: 'skipper', text: d.reply || 'Let me check on that for you.' }])
    } catch {
      setMessages(m => [...m, { role: 'skipper', text: 'Sorry — rough seas on my end. Try again in a moment.' }])
    }
    setSending(false)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 8, alignItems: 'flex-end' }}>
            {m.role === 'skipper' && <CaptainAvatar size={32} />}
            <div style={{
              maxWidth: '78%', padding: '12px 15px',
              borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: m.role === 'user'
                ? `linear-gradient(135deg, ${C.teal} 0%, #2fb3a3 100%)`
                : C.card,
              color: m.role === 'user' ? C.navy : C.white,
              border: m.role === 'skipper' ? `1px solid ${C.cardBorder}` : 'none',
              fontSize: 14, lineHeight: 1.55, fontWeight: m.role === 'user' ? 600 : 400,
              boxShadow: m.role === 'user' ? '0 2px 12px rgba(77,214,200,0.25)' : 'none',
            }}>
              {m.text}
            </div>
          </div>
        ))}
        {sending && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <CaptainAvatar size={32} />
            <div style={{
              padding: '12px 16px', background: C.card, border: `1px solid ${C.cardBorder}`,
              borderRadius: '18px 18px 18px 4px', display: 'flex', gap: 5, alignItems: 'center',
            }}>
              {[0,0.2,0.4].map((d, i) => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: C.teal, opacity: 0.8, animation: `splashDot${i+1} 1.2s ease-in-out ${d}s infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text" value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder={`Message ${marinaName}…`}
          style={{
            flex: 1, padding: '14px 15px',
            background: C.inputBg, border: `1.5px solid ${C.inputBorder}`,
            borderRadius: 14, color: C.white, fontSize: 14, fontFamily: FONT, outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => e.currentTarget.style.borderColor = C.teal}
          onBlur={e => e.currentTarget.style.borderColor = C.inputBorder}
        />
        <button onClick={send} disabled={sending || !draft.trim()}
          style={{
            padding: '0 20px',
            background: (sending || !draft.trim()) ? 'rgba(77,214,200,0.3)' : `linear-gradient(135deg, ${C.teal}, #2fb3a3)`,
            border: 'none', borderRadius: 14,
            color: C.navy, fontFamily: FONT, fontSize: 14, fontWeight: 800,
            cursor: (sending || !draft.trim()) ? 'default' : 'pointer', flexShrink: 0,
            transition: 'background 0.2s',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke={C.navy} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── Shared UI ─────────────────────────────────────────────────────────────────
function CaptainAvatarXS() {
  return (
    <div style={{ width: 22, height: 22, borderRadius: '50%', overflow: 'hidden', border: `1.5px solid ${C.navy}`, flexShrink: 0 }}>
      <Image src="/skipper-avatar.jpg" alt="Skipper" width={22} height={22} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1.8, margin: '0 0 12px' }}>
      {children}
    </h2>
  )
}

function ActionCard({ icon, label, primary, onClick }: { icon: React.ReactNode; label: string; primary?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: primary ? `linear-gradient(135deg, ${C.teal}, #2fb3a3)` : C.card,
      border: primary ? 'none' : `1px solid ${C.cardBorder}`,
      borderRadius: 18, padding: '18px 14px',
      color: primary ? C.navy : C.white, fontFamily: FONT, fontSize: 13, fontWeight: 600,
      cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      transition: 'background 0.15s, transform 0.1s',
    }}
      onMouseEnter={e => { if (!primary) e.currentTarget.style.background = C.tealDim; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { if (!primary) e.currentTarget.style.background = C.card; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <span style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
      <span style={{ fontSize: 12.5, textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
    </button>
  )
}

function HotSlipPanel({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ marginTop: 14, background: 'rgba(30,15,5,0.95)', border: '1px solid rgba(255,165,60,0.4)', borderRadius: 20, padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 24 }}>🔥</span>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#ffd28a', letterSpacing: -0.3 }}>Hot Slip</div>
          <div style={{ fontSize: 11, color: 'rgba(255,210,138,0.7)' }}>Earn while you&apos;re away</div>
        </div>
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 1.55, marginBottom: 16 }}>
        Mark away dates and we&apos;ll rent your slip to transient boaters. You earn <strong style={{ color: '#ffd28a' }}>30%</strong> of the nightly rate.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 10 }}>
        <button onClick={onClose} style={{ padding: '13px', background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.cardBorder}`, borderRadius: 12, color: C.white, fontFamily: FONT, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
        <button style={{ padding: '13px', background: 'linear-gradient(135deg, #ffd28a, #f59e0b)', border: 'none', borderRadius: 12, color: '#1a0a00', fontFamily: FONT, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>List My Slip 🔥</button>
      </div>
    </div>
  )
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: 'transparent', border: 'none', padding: '4px 0',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      color: active ? C.teal : C.muted, fontFamily: FONT, fontSize: 10, fontWeight: active ? 700 : 500, cursor: 'pointer',
      transition: 'color 0.15s',
    }}>
      {icon}
      <span style={{ letterSpacing: 0.2 }}>{label}</span>
    </button>
  )
}

// ─── SVG Quick Action Icons ───────────────────────────────────────────────────
function WrenchIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" stroke={C.teal} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function CalIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="18" rx="3" stroke={C.teal} strokeWidth="1.8"/>
      <path d="M16 2v4M8 2v4M3 10h18" stroke={C.teal} strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="8" cy="15" r="1.3" fill={C.teal}/>
      <circle cx="12" cy="15" r="1.3" fill={C.teal}/>
      <circle cx="16" cy="15" r="1.3" fill={C.teal}/>
    </svg>
  )
}
function PayIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="5" width="20" height="14" rx="2.5" stroke={C.teal} strokeWidth="1.8"/>
      <path d="M2 10h20" stroke={C.teal} strokeWidth="1.8"/>
      <rect x="5" y="14" width="5" height="2" rx="0.6" fill={C.teal}/>
      <rect x="14" y="14" width="3" height="2" rx="0.6" fill={C.teal}/>
    </svg>
  )
}
function DocSmIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9l-7-7z" stroke={C.teal} strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M13 2v7h7M8 13h8M8 17h5" stroke={C.teal} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}
