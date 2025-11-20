import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
