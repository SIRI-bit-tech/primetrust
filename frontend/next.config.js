/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Development
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/media/**',
      },
      // Production - replace with your actual domain
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_API_HOST || 'your-domain.com',
        pathname: '/media/**',
      },
    ],
  },
};

module.exports = nextConfig;
