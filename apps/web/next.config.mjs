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
};

export default nextConfig;
