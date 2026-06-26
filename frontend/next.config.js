/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Permite que las llamadas a la API se hagan al backend de FastAPI durante desarrollo.
  // En producción, se configura mediante NEXT_PUBLIC_API_URL.
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;