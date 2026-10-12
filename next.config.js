/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // All media is served from /public, so no remote patterns are required.
    formats: ['image/avif', 'image/webp'],
  },
};

module.exports = nextConfig;
