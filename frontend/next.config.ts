import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No default output — @cloudflare/next-on-pages owns the build for Cloudflare Pages.
  // Set NEXT_OUTPUT=standalone for Docker or NEXT_OUTPUT=export for static builds.
  ...(process.env.NEXT_OUTPUT ? { output: process.env.NEXT_OUTPUT as "standalone" | "export" } : {}),
};

export default nextConfig;
