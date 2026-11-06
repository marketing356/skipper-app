'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Public, read-only marina layout (Mike 2026-10-31): docks plus slip and mooring LABELS only.
// No vessel/owner names and no occupied/vacant status - the engine never sends them.
type Pt = { x: number; y: number }
type MapData = {
  slot: number; label: string | null
  sections: { id: string; x: number; y: number; width: number; height: number; rotation: number; color: string }[]
  bulkheads: { x1: number; y1: number; x2: number; y2: number }[]
  shore: Pt[]
  hardscapes: { type: string; points: any }[]
  fenceItems: { x1: number; y1: number; x2: number; y2: number }[]
  slips: { label: string; x: number; y: number }[]
  moorings: { label: string; x: number; y: number }[]
  yard: { label: string; x: number; y: number }[]
  accessories: { kind: string; x: number; y: number }[]
  dockLabels: Record<string, string>
  buildingLabels: Record<string, string>
}
type VB = { x: number; y: number; w: number; h: number }
// The logged-in customer's own spaces (from /api/my-spaces): lit up on the map. Only their own, never anyone else's.
export type Highlight = { label: string; kind?: string; space_type?: string | null; asset_name?: string | null }

const DOCK_FILL: Record<string, string> = { walnut: '#9a7b55', driftwood: '#b49b78', slate: '#7b8794' }
const toPts = (p: any): Pt[] => (Array.isArray(p) ? p.map((q: any) => (Array.isArray(q) ? { x: q[0], y: q[1] } : { x: q?.x, y: q?.y })).filter(q => typeof q.x === 'number' && typeof q.y === 'number') : [])

export default function MarinaLayoutMap({ marinaId, highlights = [] }: { marinaId: string; highlights?: Highlight[] }) {
  const [maps, setMaps] = useState<MapData[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [err, setErr] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [query, setQuery] = useState('')
  const [vb, setVb] = useState<VB | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const pointers = useRef<Map<number, Pt>>(new Map())
  const lastDist = useRef(0)

  useEffect(() => {
    let off = false
    fetch('/api/marina-map/' + marinaId).then(r => r.json()).then(d => { if (!off) setMaps(d.maps || []) }).catch(() => { if (!off) setErr(true) })
    return () => { off = true }
  }, [marinaId])

  const m = maps && maps[idx]
  const bounds = useMemo(() => {
    if (!m) return null
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9
    const add = (x: number, y: number, r = 0) => { x0 = Math.min(x0, x - r); y0 = Math.min(y0, y - r); x1 = Math.max(x1, x + r); y1 = Math.max(y1, y + r) }
    m.sections.forEach(s => add(s.x, s.y, Math.max(s.width, s.height) / 2))
    m.slips.forEach(p => add(p.x, p.y, 4)); m.moorings.forEach(p => add(p.x, p.y, 6)); m.yard.forEach(p => add(p.x, p.y, 4))
    if (x0 > x1) return null
    const pad = 20
    return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + 2 * pad, h: y1 - y0 + 2 * pad }
  }, [m])

  // Spaces to light up: matched to this map by label (preferred space type first, then any).
  const mine = useMemo(() => {
    if (!m) return []
    const arrays = { slip: m.slips, mooring: m.moorings, yard: m.yard }
    const out: { h: Highlight; p: { label: string; x: number; y: number }; type: 'slip' | 'mooring' | 'yard' }[] = []
    for (const h of highlights) {
      const lab = (h.label || '').trim().toLowerCase(); if (!lab) continue
      const t = (h.space_type || 'slip').toLowerCase()
      const pref: 'slip' | 'mooring' | 'yard' = t === 'mooring' ? 'mooring' : (t === 'slip' ? 'slip' : 'yard')
      const order = [pref, ...(['slip', 'mooring', 'yard'] as const).filter(k => k !== pref)]
      for (const k of order) { const p = arrays[k].find(q => q.label.toLowerCase() === lab); if (p) { out.push({ h, p, type: k }); break } }
    }
    return out
  }, [m, highlights])
  const mineKey = mine.map(x => x.type + ':' + x.p.label).join('|')

  const rect = () => boxRef.current?.getBoundingClientRect()
  // Fit the whole marina into the box (keeps the box's aspect ratio).
  const fit = () => {
    const r = rect(); if (!r || !bounds || !r.width || !r.height) return
    const asp = r.height / r.width
    let w = bounds.w, h = w * asp
    if (h < bounds.h) { h = bounds.h; w = h / asp }
    setVb({ x: bounds.x + bounds.w / 2 - w / 2, y: bounds.y + bounds.h / 2 - h / 2, w, h })
  }
  // Zoom so the customer's own space(s) fill the view (several spaces: fit them all).
  const zoomMine = () => {
    const r = rect(); if (!r || !bounds || !r.width || !r.height || !mine.length) return
    const asp = r.height / r.width
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9
    mine.forEach(({ p }) => { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y) })
    let w = Math.max(x1 - x0 + 40, bounds.w / 7), h = w * asp
    if (h < y1 - y0 + 40) { h = y1 - y0 + 40; w = h / asp }
    setVb({ x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w, h })
  }
  useEffect(() => { setQuery(''); const t = setTimeout(fit, 30); const t2 = setTimeout(zoomMine, 90); return () => { clearTimeout(t); clearTimeout(t2) } }, [idx, maps, expanded, bounds, mineKey]) // eslint-disable-line

  const zoomAt = (px: number, py: number, factor: number) => setVb(v => {
    const r = rect(); if (!v || !r || !bounds) return v
    const w = Math.max(bounds.w / 30, Math.min(v.w / factor, bounds.w * 1.6)); const h = w * (r.height / r.width)
    const mx = v.x + (px / r.width) * v.w, my = v.y + (py / r.height) * v.h
    return { x: mx - (px / r.width) * w, y: my - (py / r.height) * h, w, h }
  })
  const lp = (e: { clientX: number; clientY: number }) => { const r = rect()!; return { x: e.clientX - r.left, y: e.clientY - r.top } }
  const downAt = useRef<{ x: number; y: number } | null>(null)
  const onDown = (e: React.PointerEvent) => { downAt.current = { x: e.clientX, y: e.clientY }; if (!expanded) return; (e.currentTarget as Element).setPointerCapture(e.pointerId); pointers.current.set(e.pointerId, lp(e)) }
  const onMove = (e: React.PointerEvent) => {
    if (!expanded) return // the small preview does not pan: the page scrolls, a tap opens it full screen
    const prev = pointers.current.get(e.pointerId); if (!prev) return
    const p = lp(e); pointers.current.set(e.pointerId, p)
    if (pointers.current.size === 1) {
      const r = rect()!
      setVb(v => v && ({ ...v, x: v.x - (p.x - prev.x) * (v.w / r.width), y: v.y - (p.y - prev.y) * (v.h / r.height) }))
    } else if (pointers.current.size === 2) {
      const [a, c] = Array.from(pointers.current.values()); const d = Math.hypot(a.x - c.x, a.y - c.y)
      if (lastDist.current) zoomAt((a.x + c.x) / 2, (a.y + c.y) / 2, d / lastDist.current)
      lastDist.current = d
    }
  }
  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId); lastDist.current = 0
    const d = downAt.current; downAt.current = null
    if (!expanded && d && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 8) openFull()
  }
  // Full screen (Mike 2026-11-06): tap the map to open it, Close or the phone Back button shrinks it again.
  const openFull = () => { try { window.history.pushState({ marinaMapFull: 1 }, '') } catch { /* ignore */ } setExpanded(true) }
  const closeFull = () => { if (typeof window !== 'undefined' && window.history.state && (window.history.state as any).marinaMapFull) window.history.back(); else setExpanded(false) }
  useEffect(() => {
    if (!expanded) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [expanded])
  useEffect(() => {
    if (!expanded) return
    const onPop = () => setExpanded(false)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [expanded])
  const onWheel = (e: React.WheelEvent) => { const p = lp(e); zoomAt(p.x, p.y, e.deltaY < 0 ? 1.25 : 0.8) }

  const match = useMemo(() => {
    const q = query.trim().toLowerCase(); if (!q || !m) return null
    return [...m.slips, ...m.moorings, ...m.yard].find(p => p.label.toLowerCase() === q) || null
  }, [query, m])
  useEffect(() => {
    const r = rect(); if (!match || !bounds || !r) return
    const w = bounds.w / 7, h = w * (r.height / r.width)
    setVb({ x: match.x - w / 2, y: match.y - h / 2, w, h })
  }, [match]) // eslint-disable-line

  if (err) return <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>The map could not be loaded.</div>
  if (!maps) return <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Loading map…</div>
  if (!m || !bounds) return <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>This marina has not published a map yet.</div>

  const zoomedIn = !!vb && vb.w < bounds.w / 2.2
  const labelSize = 4.6
  const box: React.CSSProperties = expanded
    ? { position: 'fixed', inset: 0, zIndex: 2000, background: '#0d1f2d', display: 'flex', flexDirection: 'column', padding: 12 }
    : { position: 'relative' }
  const btn = (on?: boolean): React.CSSProperties => ({ padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', color: on ? '#0d2b4b' : '#4dd6c8', background: on ? '#4dd6c8' : 'rgba(77,214,200,0.1)', border: '1px solid rgba(77,214,200,0.4)' })
  const halo: React.CSSProperties = { paintOrder: 'stroke', stroke: '#fff', strokeWidth: 1.4, strokeLinejoin: 'round' }
  const content = (
    <div style={box}>
      {expanded && (
        <button data-map-close="1" onClick={closeFull} aria-label="Close map"
          style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 10px)', right: 12, zIndex: 5, padding: '10px 16px', borderRadius: 24, border: 'none', background: '#4dd6c8', color: '#042b2a', fontWeight: 800, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.4)' }}>
          Close map
        </button>
      )}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center', paddingRight: expanded ? 120 : 0, paddingTop: expanded ? 'env(safe-area-inset-top, 0px)' : 0 }}>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a slip, e.g. A12"
          style={{ flex: '1 1 140px', padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontFamily: 'inherit', fontSize: 13 }} />
        {maps.length > 1 && maps.map((mm, i) => <button key={i} onClick={() => setIdx(i)} style={btn(i === idx)}>{mm.label || 'Map ' + (i + 1)}</button>)}
        {mine.length > 0 && <button onClick={zoomMine} style={btn(true)}>My spot</button>}
        <button onClick={fit} style={btn()}>Reset</button>
        <button onClick={() => (expanded ? closeFull() : openFull())} style={btn(expanded)}>{expanded ? 'Close map' : 'Full screen'}</button>
      </div>
      {!expanded && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 6 }}>Tap the map to open it full screen.</div>}
      {query.trim() && !match && <div style={{ fontSize: 12, color: '#fbbf24', marginBottom: 6 }}>No space labelled "{query.trim()}" on this map.</div>}
      <div ref={boxRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onWheel={onWheel}
        style={{ width: '100%', height: expanded ? undefined : 380, flex: expanded ? 1 : undefined, minHeight: 200, borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)', background: '#dff1fb', touchAction: expanded ? 'none' : 'pan-y', cursor: expanded ? 'grab' : 'pointer' }}>
        {vb && (
          <svg width="100%" height="100%" viewBox={vb.x + ' ' + vb.y + ' ' + vb.w + ' ' + vb.h} preserveAspectRatio="none" style={{ display: 'block' }}>
            {m.shore.length > 2 && <polygon points={m.shore.map(p => p.x + ',' + p.y).join(' ')} fill="#ece3cc" stroke="#cdbf9b" strokeWidth={0.8} />}
            {m.hardscapes.map((h, i) => { const pts = toPts(h.points); return pts.length > 2 ? <polygon key={i} points={pts.map(p => p.x + ',' + p.y).join(' ')} fill="#cfd4d9" stroke="#aeb4ba" strokeWidth={0.5} /> : null })}
            {m.bulkheads.map((b, i) => <line key={i} x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} stroke="#5b6670" strokeWidth={1.4} />)}
            {m.fenceItems.map((f, i) => <line key={i} x1={f.x1} y1={f.y1} x2={f.x2} y2={f.y2} stroke="#8a8f94" strokeWidth={0.6} strokeDasharray="2 2" />)}
            {m.sections.map(s => (
              <rect key={s.id} x={s.x - s.width / 2} y={s.y - s.height / 2} width={s.width} height={s.height} fill={DOCK_FILL[s.color] || '#8a8f94'} stroke="#3d4650" strokeWidth={0.4}
                transform={'rotate(' + s.rotation + ' ' + s.x + ' ' + s.y + ')'} />
            ))}
            {m.accessories.map((a, i) => <circle key={i} cx={a.x} cy={a.y} r={a.kind === 'piling' ? 0.8 : 1.4} fill={a.kind === 'fire_box' ? '#dc2626' : '#475569'} />)}
            {m.yard.map((p, i) => (
              <g key={'y' + i}>
                <rect x={p.x - 2} y={p.y - 2} width={4} height={4} fill="#fff" stroke="#6b7280" strokeWidth={0.4} />
                {zoomedIn && <text x={p.x} y={p.y - 3} fontSize={labelSize} textAnchor="middle" fill="#374151" style={halo}>{p.label}</text>}
              </g>
            ))}
            {m.slips.map((p, i) => (
              <g key={'s' + i}>
                <circle cx={p.x} cy={p.y} r={match && match.label === p.label ? 4 : 1.7} fill={match && match.label === p.label ? '#f59e0b' : '#0f766e'} stroke="#fff" strokeWidth={0.4} />
                {(zoomedIn || (match && match.label === p.label)) && <text x={p.x} y={p.y - 2.8} fontSize={labelSize} fontWeight={700} textAnchor="middle" fill="#0d2b4b" style={halo}>{p.label}</text>}
              </g>
            ))}
            {m.moorings.map((p, i) => (
              <g key={'m' + i}>
                <circle cx={p.x} cy={p.y} r={match && match.label === p.label ? 6 : 3.4} fill="#fff" stroke="#d97706" strokeWidth={1.2} />
                <text x={p.x} y={p.y - 5} fontSize={labelSize * 1.5} fontWeight={800} textAnchor="middle" fill="#9a3412" style={halo}>{p.label}</text>
              </g>
            ))}
            {mine.map(({ p }, i) => (
              <g key={'mine' + i} pointerEvents="none">
                <circle cx={p.x} cy={p.y} r={5} fill="none" stroke="#e11d48" strokeWidth={1.4}>
                  <animate attributeName="r" values="5;14;5" dur="1.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="1;0.1;1" dur="1.8s" repeatCount="indefinite" />
                </circle>
                <circle cx={p.x} cy={p.y} r={3.2} fill="#e11d48" stroke="#fff" strokeWidth={0.9} />
                <text x={p.x} y={p.y - 6.5} fontSize={labelSize * 1.35} fontWeight={800} textAnchor="middle" fill="#9f1239" style={halo}>{p.label}</text>
              </g>
            ))}
            {m.sections.filter(s => m.dockLabels[s.id]).map(s => <text key={'d' + s.id} x={s.x} y={s.y} fontSize={13} fontWeight={800} textAnchor="middle" fill="#1f2937" style={halo}>{m.dockLabels[s.id]}</text>)}
            {m.sections.filter(s => m.buildingLabels[s.id]).map(s => <text key={'b' + s.id} x={s.x} y={s.y} fontSize={11} fontWeight={700} textAnchor="middle" fill="#7c2d12" style={halo}>{m.buildingLabels[s.id]}</text>)}
          </svg>
        )}
      </div>
      {mine.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {mine.map(({ h, p, type }, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#fff' }}>
              <span style={{ width: 10, height: 10, borderRadius: 5, background: '#e11d48', flexShrink: 0 }} />
              <span style={{ fontWeight: 700 }}>{h.kind === 'transient' ? 'Your booked slip ' : type === 'yard' ? 'Your yard space ' : type === 'mooring' ? 'Your mooring ' : 'Your slip '}{p.label}</span>
              {h.asset_name && <span style={{ color: 'rgba(255,255,255,0.6)' }}>{h.asset_name}</span>}
            </div>
          ))}
        </div>
      )}
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 6 }}>Pinch or scroll to zoom, drag to move. Zoom in to see slip numbers. Layout only — no vessel information is shown.</div>
    </div>
  )
  return expanded && typeof document !== 'undefined' ? createPortal(content, document.body) : content
}
