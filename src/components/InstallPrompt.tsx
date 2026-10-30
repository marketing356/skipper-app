'use client'
// Add-to-Home-Screen card (Mike GO 2026-10-30; simplified 2026-10-30 19:49 UTC per Mike:
// 'all you should say is just add the app to your home screen').
// Auto card: signed-in boaters on a phone browser (not installed), first time they reach home
// after sign-in, then again on the next 2 app opens if they tap Not now.
// Account tab row ALWAYS shown; tap -> startInstall(): Chrome's one-tap install dialog if the
// browser offered one (beforeinstallprompt), otherwise ONE short line for THIS phone only.
// Note (web.dev): beforeinstallprompt never fires while the app is still installed, so after a
// home-screen shortcut is removed the only way back is the phone's own app list (Android) or
// Safari Share (iPhone). A web page cannot add a home-screen shortcut by itself.
// The early window-level 'beforeinstallprompt' capture + sw.js registration live in
// the inline script in src/app/layout.tsx (it must run before React hydrates).
import React, { useEffect, useRef, useState } from 'react'

const KEY_INSTALLED = 'skipper_a2hs_installed'
const KEY_SHOWN     = 'skipper_a2hs_shown'
const MAX_SHOWS     = 3 // first sign-in + next 2 app opens

export const A2HS_TITLE   = 'Add Skipper to your home screen'
// Shown (not tappable) when Skipper is already running as the installed app (2026-10-30, Mike):
// inside an installed app there is no browser menu and no way for a page to re-add its icon.
export const INSTALLED_TITLE = '\u2713 Skipper app is installed'
const LINE_ANDROID = 'Tap the \u22EE menu, then Add to Home screen.'
const LINE_IPHONE  = 'Tap Share, then Add to Home Screen.'

// One showing per page load (= one app open).
let shownThisLoad = false

type BIPEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function getStoredPrompt(): BIPEvent | null {
  return ((window as any).__skipperBIP as BIPEvent | undefined) ?? null
}

const KEY_TWA = 'skipper_twa'

// Installed-app check (web.dev/learn/pwa/detection): any app display mode, iOS home-screen
// icon (navigator.standalone), or Android TWA (referrer android-app://, remembered for the
// session because the referrer is only set on the first page load).
function isStandalone(): boolean {
  try {
    if (window.matchMedia('(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui), (display-mode: window-controls-overlay)').matches) return true
  } catch { /* old browser */ }
  try {
    if ((navigator as any).standalone === true) return true
  } catch { /* ignore */ }
  try {
    if ((document.referrer || '').startsWith('android-app://')) {
      try { sessionStorage.setItem(KEY_TWA, '1') } catch { /* ignore */ }
      return true
    }
    if (sessionStorage.getItem(KEY_TWA) === '1') return true
  } catch { /* ignore */ }
  return false
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

// True when Skipper is running as the installed app (opened from the icon / app list).
export function isInstalledApp(): boolean {
  if (typeof window === 'undefined') return false
  return isStandalone()
}

// React hook: true once mounted inside the installed app (false during server render, so no
// hydration mismatch). Re-checks if the display mode changes.
export function useIsInstalledApp(): boolean {
  const [installed, setInstalled] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const check = () => setInstalled(isStandalone())
    check()
    let mq: MediaQueryList | null = null
    try {
      mq = window.matchMedia('(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui), (display-mode: window-controls-overlay)')
      mq.addEventListener?.('change', check)
    } catch { /* old browser */ }
    return () => { try { mq?.removeEventListener?.('change', check) } catch { /* ignore */ } }
  }, [])
  return installed
}

// True when Skipper is running in a normal browser tab (not opened from the home-screen icon).
export function isBrowserTab(): boolean {
  if (typeof window === 'undefined') return false
  return !isStandalone()
}

// Account tab row: one tap. Browser offered install -> its own install dialog right away.
// Otherwise -> the one-line card for this phone (Android or iPhone, never both).
export async function startInstall(): Promise<'accepted' | 'dismissed' | 'steps' | 'installed'> {
  // Already the installed app: no browser menu here, nothing to show (row is a status row anyway).
  if (isStandalone()) return 'installed'
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
      ;(window as any).__skipperBIP = null // fall through to the one-line card
    }
  }
  window.dispatchEvent(new Event('skipper-open-install'))
  return 'steps'
}

const T = {
  bgGrad: 'linear-gradient(160deg, #071e38 0%, #051524 50%, #030e19 100%)',
  border: 'rgba(255,255,255,0.11)',
  teal:   '#4dd6c8',
  white:  '#ffffff',
  muted:  'rgba(255,255,255,0.55)',
  font:   '"SF Pro Display", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
}

const bigBtn: React.CSSProperties = { width:'100%', marginTop:8, padding:'20px 20px', borderRadius:16, border:'none', background:T.teal, color:'#05111f', fontSize:20, fontWeight:800, fontFamily:T.font, cursor:'pointer', boxShadow:'0 6px 24px rgba(77,214,200,0.35)' }

export default function InstallPrompt({ active }: { active: boolean }) {
  const [open, setOpen] = useState(false)
  const [hasPrompt, setHasPrompt] = useState(false)
  const [ios, setIos] = useState(false)
  const activeRef = useRef(active)
  activeRef.current = active

  // Decide whether to show the auto card (signed in, home screen, phone browser, not installed).
  function maybeShow() {
    if (!activeRef.current || shownThisLoad || typeof window === 'undefined') return
    if (isStandalone()) {
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
      setHasPrompt(false) // fall back to the one-line card
    }
  }

  if (!open) return null
  // Never show menu instructions inside the installed app (there is no menu there).
  if (!hasPrompt && isStandalone()) return null

  // ONE short card: title + one line for THIS phone + one big button. No fake icon boxes.
  return (
    <div role='dialog' aria-modal='true' aria-label={A2HS_TITLE}
      style={{ position:'fixed', inset:0, zIndex:100000, background:T.bgGrad, fontFamily:T.font, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'max(24px, env(safe-area-inset-top)) 24px max(24px, env(safe-area-inset-bottom))', overflowY:'auto' }}>
      <div style={{ width:'100%', maxWidth:380, display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', gap:20 }}>
        <img src='/skipper-icon-192.png' alt='Skipper' width={96} height={96}
          style={{ width:96, height:96, borderRadius:24, border:`2px solid ${T.teal}`, boxShadow:'0 8px 32px rgba(77,214,200,0.25)' }} />
        <div style={{ color:T.white, fontSize:28, fontWeight:800, lineHeight:1.2 }}>{A2HS_TITLE}</div>
        {hasPrompt ? (
          <>
            <button onClick={handleInstall} style={bigBtn}>Add to Home Screen</button>
            <button onClick={() => setOpen(false)}
              style={{ width:'100%', padding:'14px 20px', borderRadius:16, border:`1px solid ${T.border}`, background:'transparent', color:T.muted, fontSize:17, fontWeight:600, fontFamily:T.font, cursor:'pointer' }}>
              Not now
            </button>
          </>
        ) : (
          <>
            <div style={{ color:T.white, fontSize:21, lineHeight:1.45 }}>{ios ? LINE_IPHONE : LINE_ANDROID}</div>
            <button onClick={() => setOpen(false)} style={bigBtn}>OK</button>
          </>
        )}
      </div>
    </div>
  )
}
