/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // All media is served from /public, so no remote patterns are required.
    // Netlify's Next.js runtime handles the optimizer endpoint automatically.
    formats: ['image/avif', 'image/webp'],
  },
};

module.exports = nextConfig;
