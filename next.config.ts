import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: { position: "bottom-right" },
  allowedDevOrigins: ['10.10.110.54'],
};

export default nextConfig;
