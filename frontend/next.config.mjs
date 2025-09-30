import { execSync } from 'child_process';

// Generate unique build ID for cache busting - FORCE IMMEDIATE UPDATE
const buildId = process.env.VERCEL_GIT_COMMIT_SHA || 
  `${execSync('git rev-parse --short HEAD').toString().trim()}-${Date.now()}`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: undefined,
  reactStrictMode: true,
  
  // Generate unique build ID for cache busting
  generateBuildId: async () => buildId,
  
  // Environment variables for cache busting
  env: {
    NEXT_PUBLIC_APP_BUILD_ID: buildId,
    NEXT_PUBLIC_API_BASE_URL: 'https://influmatch-production.up.railway.app'
  },
  
  // Rewrite API calls to use relative URLs (bulletproof solution)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://influmatch-production.up.railway.app/:path*',
      },
    ];
  },
  
  // Cache control headers
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
        ],
      },
    ];
  },
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
