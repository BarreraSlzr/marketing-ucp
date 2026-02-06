import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/entities", "@repo/ui"],
};

export default nextConfig;
