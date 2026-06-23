'use client'
/**
 * TagInput — dark-theme version for Skipper mobile app.
 * Stores value as JSON array in a hidden input.
 * Copied from OPS; adapted to inline styles (no Tailwind).
 */
import { useState, KeyboardEvent } from 'react'

interface Props {
  name: string
  defaultValue?: string[] | null
  placeholder?: string
}

const FONT = '"SF Pro Display", system-ui, -apple-system, sans-serif'

export default function TagInput({ name, defaultValue, placeholder = 'Type and press Enter…' }: Props) {
  const [tags, setTags] = useState<string[]>(
    Array.isArray(defaultValue) ? defaultValue.filter(Boolean) : []
  )
  const [input, setInput] = useState('')

  function add(raw: string) {
    const val = raw.trim()
    if (val && !tags.includes(val)) setTags(prev => [...prev, val])
    setInput('')
  }

  function remove(tag: string) {
    setTags(prev => prev.filter(t => t !== tag))
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input) }
    if (e.key === 'Backspace' && !input && tags.length) setTags(prev => prev.slice(0, -1))
  }

  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.16)', borderRadius: 8, padding: '8px 10px', background: 'rgba(255,255,255,0.06)', fontFamily: FONT }}>
      <input type="hidden" name={name} value={JSON.stringify(tags)} />
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
          {tags.map(tag => (
            <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'rgba(77,214,200,0.15)', border: '1px solid rgba(77,214,200,0.3)', borderRadius: 20, color: '#4dd6c8', fontSize: 13, fontWeight: 500 }}>
              {tag}
              <button type="button" onClick={() => remove(tag)}
                style={{ background: 'none', border: 'none', color: '#4dd6c8', cursor: 'pointer', padding: 0, fontSize: 15, lineHeight: 1, fontFamily: FONT }}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={onKey}
        onBlur={() => { if (input.trim()) add(input) }}
        placeholder={tags.length === 0 ? placeholder : 'Add another…'}
        style={{ width: '100%', background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 14, fontFamily: FONT }}
      />
    </div>
  )
}
