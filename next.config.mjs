/** @type {import('next').NextConfig} */
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://www.googletagmanager.com https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://www.google-analytics.com https://www.googletagmanager.com",
  "font-src 'self' data:",
  "connect-src 'self' blob: data: https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com https://vitals.vercel-insights.com https://cdn.jsdelivr.net",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: cspDirectives },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },

  turbopack: {
    resolveAlias: {
      canvas: { browser: './src/lib/emptyModule.js' },
      fs: { browser: './src/lib/emptyModule.js' },
      path: { browser: './src/lib/emptyModule.js' },
      http: { browser: './src/lib/emptyModule.js' },
      https: { browser: './src/lib/emptyModule.js' },
      zlib: { browser: './src/lib/emptyModule.js' },
      url: { browser: './src/lib/emptyModule.js' },
      stream: { browser: './src/lib/emptyModule.js' },
      crypto: { browser: './src/lib/emptyModule.js' },
    },
  },

  webpack(config, { isServer }) {
    if (!isServer) {
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
