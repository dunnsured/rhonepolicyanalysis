import type { NextConfig } from "next";
import path from "node:path";

// Loader path from orchids-visual-edits - use direct resolve to get the actual file
const loaderPath = require.resolve('orchids-visual-edits/loader.js');

// Portal mode: 'crm' | 'partner' | 'client' | undefined (all)
const portalMode = process.env.NEXT_PUBLIC_PORTAL_MODE as 'crm' | 'partner' | 'client' | undefined;

// Configure rewrites based on portal mode
function getPortalRewrites() {
  if (portalMode === 'partner') {
    return [
      // Rewrite root to partner portal
      { source: '/', destination: '/portal/partner' },
      { source: '/login', destination: '/portal/partner/login' },
      { source: '/companies', destination: '/portal/partner/companies' },
      { source: '/contacts', destination: '/portal/partner/contacts' },
      { source: '/referrals', destination: '/portal/partner/referrals' },
      { source: '/incidents', destination: '/portal/partner/incidents' },
      { source: '/incidents/:id', destination: '/portal/partner/incidents/:id' },
      { source: '/tickets', destination: '/portal/partner/tickets' },
      { source: '/rewards', destination: '/portal/partner/rewards' },
      { source: '/onboarding', destination: '/portal/partner/onboarding' },
    ];
  }
  
  if (portalMode === 'client') {
    return [
      // Rewrite root to client portal
      { source: '/', destination: '/portal/client' },
      { source: '/login', destination: '/portal/client/login' },
      { source: '/company', destination: '/portal/client/company' },
      { source: '/contacts', destination: '/portal/client/contacts' },
      { source: '/policies', destination: '/portal/client/policies' },
      { source: '/incidents', destination: '/portal/client/incidents' },
      { source: '/incidents/:id', destination: '/portal/client/incidents/:id' },
      { source: '/tickets', destination: '/portal/client/tickets' },
      { source: '/risks', destination: '/portal/client/risks' },
      { source: '/recommendations', destination: '/portal/client/recommendations' },
    ];
  }
  
  // CRM mode or default - no rewrites needed
  return [];
}

// Configure redirects to block access to other portals
function getPortalRedirects() {
  if (portalMode === 'partner') {
    return [
      // Block access to CRM routes
      { source: '/pipeline', destination: '/', permanent: false },
      { source: '/partners', destination: '/', permanent: false },
      { source: '/settings', destination: '/', permanent: false },
      // Block access to client portal
      { source: '/portal/client/:path*', destination: '/', permanent: false },
    ];
  }
  
  if (portalMode === 'client') {
    return [
      // Block access to CRM routes
      { source: '/pipeline', destination: '/', permanent: false },
      { source: '/partners', destination: '/', permanent: false },
      { source: '/settings', destination: '/', permanent: false },
      // Block access to partner portal
      { source: '/portal/partner/:path*', destination: '/', permanent: false },
    ];
  }
  
  if (portalMode === 'crm') {
    return [
      // Block access to portals when in CRM mode
      { source: '/portal/:path*', destination: '/', permanent: false },
    ];
  }
  
  return [];
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  outputFileTracingRoot: path.resolve(__dirname),
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  turbopack: {
    rules: {
      "*.{jsx,tsx}": {
        loaders: [loaderPath]
      }
    }
  },
  async rewrites() {
    return getPortalRewrites();
  },
  async redirects() {
    return getPortalRedirects();
  },
} as NextConfig;

export default nextConfig;
