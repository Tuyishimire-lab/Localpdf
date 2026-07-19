/** @type {import('next').NextConfig} */
const nextConfig = {
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
