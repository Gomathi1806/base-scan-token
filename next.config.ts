import type { NextConfig } from "next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/.well-known/farcaster.json",
        destination:
          "https://api.farcaster.xyz/miniapps/hosted-manifest/019d3e80-f692-59f3-67f1-5b1d4af4006f",
        permanent: false, // 307 temporary redirect
      },
    ];
  },
};

export default nextConfig;
const nextConfig: NextConfig = {};
export default nextConfig;
