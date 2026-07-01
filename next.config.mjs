/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'localhost:3001', '127.0.0.1:3001'],
      bodySizeLimit: '25mb',
    },
  },
};

export default nextConfig;