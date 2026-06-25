'use client'
/**
 * OPSShell — universal CSS reset wrapper for OPS-originated components rendered in mobile.
 *
 * Problem: the mobile app uses a dark-theme shell (inline styles, dark background).
 * OPS components (AssetForm, ContactForm, etc.) are built for a light background.
 * Without a reset layer, Tailwind light-theme classes render invisible on a dark background.
 *
 * Solution: drop any OPS component inside <OPSShell>. It resets to light-theme defaults.
 * One fix. Works forever for every OPS component added in the future. No per-component patches.
 *
 * Usage:
 *   <OPSShell>
 *     <AssetForm ... />
 *   </OPSShell>
 */

interface OPSShellProps {
  children: React.ReactNode
  className?: string
}

export default function OPSShell({ children, className = '' }: OPSShellProps) {
  return (
    <div
      className={`ops-shell ${className}`}
      style={{
        backgroundColor: '#ffffff',
        color: '#0f172a',        // slate-900 — matches Tailwind light-theme default text
        colorScheme: 'light',   // tells browser to use light-mode form controls
      }}
    >
      {children}
    </div>
  )
}
