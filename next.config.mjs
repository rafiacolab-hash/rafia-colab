/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ESLint roda separado do build — não bloqueia o deploy
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
