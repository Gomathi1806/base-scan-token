import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://base-scan-token.vercel.app";

export const metadata: Metadata = {
  title: "Base Token Guard — Check Any Token Safety",
  description: "Instantly scan Base chain tokens for rug pulls, honeypots, and red flags.",
  openGraph: {
    title: "🛡️ Base Token Guard",
    description: "Check any Base token safety in 1 click",
    images: [`${appUrl}/og-default.png`],
  },
  twitter: {
    card: "summary_large_image",
    title: "🛡️ Base Token Guard",
    description: "Check any Base token safety in 1 click",
    images: [`${appUrl}/og-default.png`],
  },
  other: {
    // ⭐ Base.dev app verification — paste YOUR app_id from base.dev
    "base:app_id": "69c67557638fc70642e54a00",

    // Farcaster frame embed (keeps Warpcast working)
    "fc:frame": JSON.stringify({
      version: "next",
      imageUrl: `${appUrl}/og-default.png`,
      button: {
        title: "🛡️ Check Token Safety",
        action: {
          type: "launch_frame",
          name: "Base Token Guard",
          url: appUrl,
          splashImageUrl: `${appUrl}/splash.png`,
          splashBackgroundColor: "#0f172a",
        },
      },
    }),
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-white antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
