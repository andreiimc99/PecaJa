import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const dest = process.env.NEXT_PUBLIC_API_URL;
    if (!dest) return [];
    return [
      {
        source: '/api/:path*',
        destination: `${dest}/api/:path*`
      }
    ];
  },
  eslint: {
    // Permite build mesmo com erros de lint (útil para deploy rápido)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignora erros de tipos durante build (opcional, remova se preferir strict)
    ignoreBuildErrors: true,
  },
  images: {
    // Formatos modernos para melhor compressão e qualidade
    formats: ["image/avif", "image/webp"],
    // Permite otimização de imagens servidas pelo backend em desenvolvimento
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3001",
        pathname: "/**",
      },
      // Cloudinary (produz URLs https://res.cloudinary.com/<cloud>/image/upload/...)
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
