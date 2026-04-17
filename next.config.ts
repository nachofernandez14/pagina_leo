import type { NextConfig } from "next";
import path from "path";

const securityHeaders = [
  // Evitar que la app se cargue en un iframe (clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
  // Evitar MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // No enviar el Referer completo a dominios externos
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Deshabilitar acceso a cámara, micrófono y geolocalización
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Evita que Turbopack tome como raíz otra carpeta si hay otro package-lock fuera del proyecto.
  turbopack: {
    root: path.resolve(process.cwd()),
  },
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
