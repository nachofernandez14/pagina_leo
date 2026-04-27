import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Dominio Supabase (coincide con NEXT_PUBLIC_SUPABASE_URL — ya público en el bundle)
const supabaseHost = "https://mtuagiahpvklpkpbwsbn.supabase.co";

const cspDirectives = [
  "default-src 'self'",
  // Next.js requiere 'unsafe-inline' y 'unsafe-eval' para hidratación sin nonces
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  // Tailwind CSS genera estilos inline; Google Fonts requiere su dominio
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Solo cargar fuentes desde self y Google Fonts
  "font-src 'self' https://fonts.gstatic.com",
  // Imágenes: self, data URIs y blobs (Next.js Image + SVG inline)
  "img-src 'self' data: blob:",
  // Fetch / WebSocket solo hacia Supabase y self
  `connect-src 'self' ${supabaseHost} wss://mtuagiahpvklpkpbwsbn.supabase.co`,
  // Formularios solo hacia self (evita phishing mediante form hijacking)
  "form-action 'self'",
  // Evitar que esta app sea embebida en iframes externos
  "frame-ancestors 'none'",
  // Restringir la URL base del documento
  "base-uri 'self'",
  // Sin objetos Flash/Java/plugins
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  // Content Security Policy — protección XSS, clickjacking, inyección
  { key: "Content-Security-Policy", value: cspDirectives },
  // Evitar que la app se cargue en un iframe (refuerza frame-ancestors de CSP)
  { key: "X-Frame-Options", value: "DENY" },
  // Evitar MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // No enviar el Referer completo a dominios externos
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Deshabilitar acceso a cámara, micrófono y geolocalización
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Desactivar DNS prefetch para evitar filtración de URLs internas
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // HSTS: solo en producción para no bloquear el servidor de desarrollo HTTP
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
    : []),
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
