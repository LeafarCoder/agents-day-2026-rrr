import type { NextConfig } from "next";

// NEXT_OUTPUT=standalone  →  Docker (slim runner image)
// NEXT_OUTPUT=export      →  Cloudflare Pages static export
// NEXT_OUTPUT unset       →  local dev / default Next.js server
const nextConfig: NextConfig = {
  ...(process.env.NEXT_OUTPUT && {
    output: process.env.NEXT_OUTPUT as "standalone" | "export",
  }),
};

export default nextConfig;
