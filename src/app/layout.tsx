import type { Metadata } from "next";
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://base-token-guard.vercel.app";

export const metadata: Metadata = {
  title: "Base Token Guard — Check Any Token Safety",
  description: "Instantly scan Base chain tokens for rug pulls, honeypots, and red flags. Free safety reports powered by Newsie.tech.",
  openGraph: {
    title: "🛡️ Base Token Guard",
    description: "Check any Base token safety in 1 click",
    images: [`${appUrl}/og-default.png`],
  },
  other: {
    // Farcaster Frame embed meta tag
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
      <body className="bg-slate-950 text-white antialiased">{children}</body>
    </html>
  );
}
