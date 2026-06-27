/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/:path*`,
      },
      {
        source: '/health',
        destination: `${process.env.BACKEND_URL || 'http://localhost:3001'}/health`,
      },
    ];
  },
};

module.exports = nextConfig;
