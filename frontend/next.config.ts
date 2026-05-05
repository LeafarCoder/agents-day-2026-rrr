import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.NEXT_OUTPUT as "standalone" | "export" | undefined ?? "standalone",
};

export default nextConfig;
