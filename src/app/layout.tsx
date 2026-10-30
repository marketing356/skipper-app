import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Skipper',
  description: 'We run on Skipper. Your marina, your slip, everything in one place.',
  manifest: '/skipper-manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Skipper',
    startupImage: '/skipper-logo.jpg',
  },
  icons: {
    apple: '/apple-touch-icon.png',
    icon: [
      { url: '/skipper-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/skipper-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'Skipper by AyeAyeSkipper',
    description: 'We run on Skipper.',
    images: ['/skipper-logo.jpg'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#4dd6c8',
}

// Add-to-Home-Screen support (Mike GO 2026-10-30): capture Chrome's install event as early
// as possible (before React loads) so InstallPrompt can trigger it, and register /sw.js on
// every app load so the app is installable. sw.js itself is unchanged (push still works).
const A2HS_BOOT = "(function(){try{window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__skipperBIP=e;try{if(localStorage.getItem('skipper_a2hs_installed')==='1'){localStorage.removeItem('skipper_a2hs_installed');localStorage.setItem('skipper_a2hs_shown','0')}}catch(_){}window.dispatchEvent(new Event('skipper-bip'));});window.addEventListener('appinstalled',function(){window.__skipperBIP=null;try{localStorage.setItem('skipper_a2hs_installed','1')}catch(_){}window.dispatchEvent(new Event('skipper-installed'));});if('serviceWorker' in navigator){var r=function(){navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(function(){})};if(document.readyState==='complete'){r()}else{window.addEventListener('load',r)}}}catch(_){}})();"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: A2HS_BOOT }} />
      </head>
      <body style={{ margin: 0, padding: 0, background: '#05111f' }}>
        {children}
      </body>
    </html>
  )
}
