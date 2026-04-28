// Production drops `'unsafe-eval'`. Three.js compiles WebGL shaders via the
// GPU driver (not via JS eval), and Next.js's production bundle doesn't use
// eval either — only dev-mode HMR does, which is why we keep it in dev.
const isProd = process.env.NODE_ENV === "production";
const scriptSrc = isProd
  ? "script-src 'self' 'unsafe-inline'"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
const csp = `default-src 'self'; ${scriptSrc}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.googleusercontent.com; connect-src 'self' https://*.supabase.co; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep RSC payloads in the App Router client cache longer. Next.js 14.2's
  // default evicts dynamic-segment payloads after 30s, which means hopping
  // between pages re-fetches the Server Component every time. Bumping the
  // `dynamic` window to 5min and `static` to 15min so back/forward and
  // sidebar nav within a session reuse the cache instead of round-tripping
  // to the edge for every click.
  experimental: {
    staleTimes: {
      dynamic: 300,
      static: 900,
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-XSS-Protection", value: "0" },
          { key: "Content-Security-Policy", value: csp },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/uploads/:path*",
        headers: [
          { key: "Content-Disposition", value: "attachment" },
          { key: "Content-Security-Policy", value: "default-src 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
