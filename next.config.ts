import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["@repo/entities", "@repo/ui"],
};

export default nextConfig;
