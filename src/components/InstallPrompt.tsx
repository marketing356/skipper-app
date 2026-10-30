'use client'
// Add-to-Home-Screen prompt (Mike GO 2026-10-30).
// Shown to signed-in boaters on a phone browser (not already installed):
// first time they reach home after sign-in, then again on the next 2 app opens
// if they tap Not now. Hidden while installed ('appinstalled' or opened standalone).
// Re-prompt (Mike GO 2026-10-30): Chrome fires 'beforeinstallprompt' ONLY when the app is
// not installed (web.dev), so if it fires while we have the app marked installed, the icon
// was deleted -> clear the mark + reset the count so the card shows again (same 3-open rule).
// Account tab 'Install app on home screen' row uses startInstall()/isBrowserTab() below.
// The early window-level 'beforeinstallprompt' capture + sw.js registration live in
// the inline script in src/app/layout.tsx (it must run before React hydrates).
import React, { useEffect, useRef, useState } from 'react'

const KEY_INSTALLED = 'skipper_a2hs_installed'
const KEY_SHOWN     = 'skipper_a2hs_shown'
const MAX_SHOWS     = 3 // first sign-in + next 2 app opens

// One showing per page load (= one app open).
let shownThisLoad = false

type BIPEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function getStoredPrompt(): BIPEvent | null {
  return ((window as any).__skipperBIP as BIPEvent | undefined) ?? null
}

function isStandalone(): boolean {
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true
    if (window.matchMedia('(display-mode: fullscreen)').matches) return true
    if (window.matchMedia('(display-mode: minimal-ui)').matches) return true
  } catch { /* old browser */ }
  return (navigator as any).standalone === true
}

function isIos(): boolean {
  const ua = navigator.userAgent || ''
  return /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1)
}

function isMobile(): boolean {
  return isIos() || /Android|Mobi/i.test(navigator.userAgent || '')
}

function readNum(key: string): number {
  try { return parseInt(localStorage.getItem(key) || '0', 10) || 0 } catch { return 0 }
}

// Icon was deleted (browser offered install again): forget 'installed', restart the count.
// The inline boot script in layout.tsx does the same before React loads; this is the backup.
function resetIfUninstalled(): void {
  try {
    if (localStorage.getItem(KEY_INSTALLED) === '1') {
      localStorage.removeItem(KEY_INSTALLED)
      localStorage.setItem(KEY_SHOWN, '0')
    }
  } catch { /* ignore */ }
}

// True when Skipper is running in a normal browser tab (not opened from the home-screen icon).
export function isBrowserTab(): boolean {
  if (typeof window === 'undefined') return false
  return !isStandalone()
}

// Account tab button: use the browser's own install dialog when it offered one,
// otherwise open the install card with the simple Android / iPhone steps.
export async function startInstall(): Promise<'accepted' | 'dismissed' | 'steps'> {
  const evt = getStoredPrompt()
  if (evt) {
    try {
      await evt.prompt()
      const choice = await evt.userChoice
      ;(window as any).__skipperBIP = null // a prompt event can only be used once
      if (choice?.outcome === 'accepted') {
        try { localStorage.setItem(KEY_INSTALLED, '1') } catch { /* ignore */ }
        return 'accepted'
      }
      return 'dismissed'
    } catch {
      ;(window as any).__skipperBIP = null // fall through to the manual steps
    }
  }
  window.dispatchEvent(new Event('skipper-open-install'))
  return 'steps'
}

const T = {
  bgGrad: 'linear-gradient(160deg, #071e38 0%, #051524 50%, #030e19 100%)',
  card:   'rgba(255,255,255,0.07)',
  border: 'rgba(255,255,255,0.11)',
  teal:   '#4dd6c8',
  white:  '#ffffff',
  muted:  'rgba(255,255,255,0.55)',
  font:   '"SF Pro Display", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
}

function DotsIcon() {
  return (
    <svg width='22' height='22' viewBox='0 0 24 24' aria-hidden='true'>
      <circle cx='12' cy='5' r='2.2' fill={T.white} />
      <circle cx='12' cy='12' r='2.2' fill={T.white} />
      <circle cx='12' cy='19' r='2.2' fill={T.white} />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke={T.white} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
      <path d='M12 3v12' />
      <path d='M7.5 7.5 12 3l4.5 4.5' />
      <path d='M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1' />
    </svg>
  )
}

function Step({ icon, title, text }: { icon: React.ReactNode; title: string; text: React.ReactNode }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:14, background:T.card, border:`1px solid ${T.border}`, borderRadius:16, padding:'14px 16px', textAlign:'left' }}>
      <div style={{ width:44, height:44, flexShrink:0, borderRadius:12, background:'rgba(77,214,200,0.15)', border:'1px solid rgba(77,214,200,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>{icon}</div>
      <div>
        <div style={{ color:T.teal, fontSize:12, fontWeight:700, letterSpacing:0.4, textTransform:'uppercase', marginBottom:3 }}>{title}</div>
        <div style={{ color:T.white, fontSize:15, lineHeight:1.35 }}>{text}</div>
      </div>
    </div>
  )
}

export default function InstallPrompt({ active }: { active: boolean }) {
  const [open, setOpen] = useState(false)
  const [hasPrompt, setHasPrompt] = useState(false)
  const [ios, setIos] = useState(false)
  const activeRef = useRef(active)
  activeRef.current = active

  // Decide whether to show the card (signed in, home screen, phone browser, not installed).
  // Runs when the boater reaches home AND again whenever the browser offers install
  // ('beforeinstallprompt' can arrive ~30s later, e.g. after the icon was deleted).
  function maybeShow() {
    if (!activeRef.current || shownThisLoad || typeof window === 'undefined') return
    if (isStandalone()) {
      // Opened from the home-screen icon: installed right now.
      try { localStorage.setItem(KEY_INSTALLED, '1') } catch { /* ignore */ }
      return
    }
    if (!isMobile()) return
    try { if (localStorage.getItem(KEY_INSTALLED) === '1') return } catch { return }
    const shown = readNum(KEY_SHOWN)
    if (shown >= MAX_SHOWS) return
    shownThisLoad = true
    setTimeout(() => {
      try { localStorage.setItem(KEY_SHOWN, String(shown + 1)) } catch { /* ignore */ }
      setHasPrompt(!!getStoredPrompt())
      setOpen(true)
    }, 900)
  }

  // Track the captured browser install event + installs + the Account tab button.
  useEffect(() => {
    if (typeof window === 'undefined') return
    setIos(isIos())
    setHasPrompt(!!getStoredPrompt())
    if (getStoredPrompt()) resetIfUninstalled()
    const onBip = () => {
      resetIfUninstalled()
      setHasPrompt(!!getStoredPrompt())
      maybeShow()
    }
    const onInstalled = () => {
      try { localStorage.setItem(KEY_INSTALLED, '1') } catch { /* ignore */ }
      setOpen(false)
    }
    const onOpenInstall = () => {
      setHasPrompt(!!getStoredPrompt())
      setOpen(true)
    }
    window.addEventListener('skipper-bip', onBip)
    window.addEventListener('skipper-installed', onInstalled)
    window.addEventListener('appinstalled', onInstalled)
    window.addEventListener('skipper-open-install', onOpenInstall)
    return () => {
      window.removeEventListener('skipper-bip', onBip)
      window.removeEventListener('skipper-installed', onInstalled)
      window.removeEventListener('appinstalled', onInstalled)
      window.removeEventListener('skipper-open-install', onOpenInstall)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Boater reached the home screen after sign-in.
  useEffect(() => {
    maybeShow()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  async function handleInstall() {
    const evt = getStoredPrompt()
    if (!evt) { setHasPrompt(false); return }
    try {
      await evt.prompt()
      const choice = await evt.userChoice
      ;(window as any).__skipperBIP = null // a prompt event can only be used once
      setHasPrompt(false)
      if (choice?.outcome === 'accepted') {
        try { localStorage.setItem(KEY_INSTALLED, '1') } catch { /* ignore */ }
      }
      setOpen(false)
    } catch {
      ;(window as any).__skipperBIP = null
      setHasPrompt(false) // fall back to the manual steps
    }
  }

  if (!open) return null

  return (
    <div role='dialog' aria-modal='true' aria-label='Add Skipper to your home screen'
      style={{ position:'fixed', inset:0, zIndex:100000, background:T.bgGrad, fontFamily:T.font, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'max(24px, env(safe-area-inset-top)) 24px max(24px, env(safe-area-inset-bottom))', overflowY:'auto' }}>
      <div style={{ width:'100%', maxWidth:380, display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', gap:18 }}>
        <img src='/skipper-icon-192.png' alt='Skipper' width={96} height={96}
          style={{ width:96, height:96, borderRadius:24, border:`2px solid ${T.teal}`, boxShadow:'0 8px 32px rgba(77,214,200,0.25)' }} />
        <div style={{ color:T.white, fontSize:26, fontWeight:800, lineHeight:1.2 }}>Add Skipper to your home screen</div>
        <div style={{ color:T.muted, fontSize:16, lineHeight:1.45 }}>So you can open your marina in one tap, like any app.</div>

        {hasPrompt ? (
          <button onClick={handleInstall}
            style={{ width:'100%', marginTop:10, padding:'18px 20px', borderRadius:16, border:'none', background:T.teal, color:'#05111f', fontSize:18, fontWeight:800, fontFamily:T.font, cursor:'pointer', boxShadow:'0 6px 24px rgba(77,214,200,0.35)' }}>
            Add to Home Screen
          </button>
        ) : (
          <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:12, marginTop:6 }}>
            {ios ? (
              <Step icon={<ShareIcon />} title='iPhone (Safari)'
                text={<>Tap <b>Share</b> {'\u2192'} <b>Add to Home Screen</b></>} />
            ) : (
              <Step icon={<DotsIcon />} title='Android (Chrome)'
                text={<>Tap <b>{'\u22EE'}</b> (top right) {'\u2192'} <b>Add to Home screen</b> or <b>Install app</b></>} />
            )}
            {ios ? (
              <Step icon={<DotsIcon />} title='Android (Chrome)'
                text={<>Tap <b>{'\u22EE'}</b> (top right) {'\u2192'} <b>Add to Home screen</b> or <b>Install app</b></>} />
            ) : (
              <Step icon={<ShareIcon />} title='iPhone (Safari)'
                text={<>Tap <b>Share</b> {'\u2192'} <b>Add to Home Screen</b></>} />
            )}
          </div>
        )}

        <button onClick={() => setOpen(false)}
          style={{ width:'100%', padding:'14px 20px', borderRadius:16, border:`1px solid ${T.border}`, background:'transparent', color:T.muted, fontSize:16, fontWeight:600, fontFamily:T.font, cursor:'pointer' }}>
          Not now
        </button>
      </div>
    </div>
  )
}
