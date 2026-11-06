/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  reactStrictMode: false,
  compress: true,
  poweredByHeader: false,
  env: { NEXT_PUBLIC_BUILD_ID: String(Date.now()) },
}

module.exports = nextConfig
