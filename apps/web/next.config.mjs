/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  ...(process.env.NEXT_E2E === "1" ? { distDir: ".next-e2e" } : {}),
};

export default nextConfig;
