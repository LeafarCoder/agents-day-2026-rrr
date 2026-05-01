import type { NextConfig } from "next";

// NEXT_OUTPUT=standalone  →  Docker (slim runner image)
// NEXT_OUTPUT unset       →  Cloudflare Pages (let their build system decide)
const nextConfig: NextConfig = {
  ...(process.env.NEXT_OUTPUT && {
    output: process.env.NEXT_OUTPUT as "standalone" | "export",
  }),
};

export default nextConfig;
