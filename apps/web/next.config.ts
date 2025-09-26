import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    instrumentationHook: true
  },
  output: "standalone",
  trailingSlash: false,
  reactStrictMode: true
};

export default nextConfig;
