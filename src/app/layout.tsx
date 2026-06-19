import type { Metadata, Viewport } from 'next'

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
    apple: '/skipper-logo.jpg',
    icon: '/skipper-logo.jpg',
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#05111f' }}>
        {children}
      </body>
    </html>
  )
}
