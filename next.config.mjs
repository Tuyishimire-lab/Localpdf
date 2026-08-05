/** @type {import('next').NextConfig} */
const nextConfig = {
  // ─────────────────────────────────────────────────────────────────────────
  // Next.js handles Cache-Control headers automatically for statically
  // generated pages and /_next/static/ immutable assets. Overriding them manually
  // breaks Next.js Fast Refresh and dev hot reloading.
  // ─────────────────────────────────────────────────────────────────────────

  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent Webpack from trying to bundle Node-specific modules when building for client browser
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
