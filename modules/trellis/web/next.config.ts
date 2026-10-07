import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // pg uses Node APIs; keep it out of the client bundle and the edge runtime.
  serverExternalPackages: ["pg"],
};

export default nextConfig;
