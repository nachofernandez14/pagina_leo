import type { NextConfig } from "next";

const securityHeaders = [
  // Evitar que la app se cargue en un iframe (clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
  // Evitar MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // No enviar el Referer completo a dominios externos
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Deshabilitar acceso a cámara, micrófono y geolocalización
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Desactivar DNS prefetch para evitar filtración de URLs internas
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
