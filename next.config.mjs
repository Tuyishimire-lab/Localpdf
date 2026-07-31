/** @type {import('next').NextConfig} */
const nextConfig = {
  // ─────────────────────────────────────────────────────────────────────────
  // Static-first rendering strategy
  // All pages default to static generation. Pages that genuinely need
  // dynamic data must explicitly opt in with `export const dynamic = 'force-dynamic'`.
  // This is the single most impactful change for reducing Vercel Edge Requests.
  // ─────────────────────────────────────────────────────────────────────────

  // Aggressive HTTP caching for static assets served from Vercel's CDN.
  // Pages and API responses that Next.js marks as immutable will carry a
  // long-lived Cache-Control header, preventing repeated edge invocations.
  async headers() {
    return [
      {
        // Static page HTML — cache for 1 year, stale-while-revalidate 24h.
        // Vercel automatically adds this for statically generated pages,
        // but being explicit ensures it also applies at the CDN layer.
        source: '/((?!api).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // Browser static assets (_next/static) — immutable, 1-year cache.
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Public folder static assets (images, fonts, icons, manifest, etc.)
        // Using separate rules per extension group to avoid capturing groups (not allowed by Next.js)
        source: '/:file(.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|otf|json))',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent Webpack from trying to bundle Node-specific modules when building for the client browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
        path: false,
        http: false,
        https: false,
        zlib: false,
        url: false,
        stream: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
