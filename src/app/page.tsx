"use client";

import dynamic from "next/dynamic";

// Dynamic import needed since @farcaster/frame-sdk is client-only
const TokenScanner = dynamic(() => import("@/components/TokenScanner"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">🛡️</div>
        <p className="text-slate-400 text-sm">Loading Base Token Guard...</p>
      </div>
    </div>
  ),
});


export default function Home() {
  return <TokenScanner />;
}
