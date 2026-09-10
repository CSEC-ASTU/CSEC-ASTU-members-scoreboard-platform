/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    const backendUrl =
      process.env.BACKEND_URL ||
      "https://csec-astu-members-scoreboard-platform.onrender.com"
    return [
      {
        // All /api/proxy/** calls are forwarded to the Render backend's /api/v1/**
        // The browser only ever talks to YOUR Vercel domain, so cookies stay same-site.
        source: "/api/proxy/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ]
  },
}

export default nextConfig
