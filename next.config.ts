import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/.well-known/farcaster.json",
        destination:
          "https://api.farcaster.xyz/miniapps/hosted-manifest/019d3ee8-a4ea-15ed-aa20-fc6222899b01",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
