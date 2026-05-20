/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // This will allow the build to succeed even if there are lint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Optional: Add this if you want to skip type checking during build too
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
