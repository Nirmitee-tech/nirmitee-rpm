/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@nirmitee/ui', '@nirmitee/types'],
  experimental: {
    optimizePackageImports: ['lucide-react', '@nirmitee/ui'],
  },
  images: {
    domains: [],
  },
  output: 'standalone',

  // Security Headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Strict Transport Security (HSTS)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // XSS Protection (legacy browsers)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Referrer Policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Permissions Policy (restrict browser features, allow camera/mic for telehealth)
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=(), interest-cohort=()',
          },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval and unsafe-inline in dev
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' http://localhost:* ws://localhost:* wss://* https://*.100ms.live wss://*.100ms.live https://api.100ms.live",
              "worker-src 'self' blob:", // Required for 100ms SDK workers
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
              "media-src 'self' blob:", // Required for video/audio streams
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
