import { NextRequest, NextResponse } from "next/server";
import { scanToken } from "@/lib/scanner";

/**
 * Generates an HTML-based OG image for a token safety report.
 * Used when users share their scan results as a Farcaster cast.
 * 
 * Usage: /api/og?address=0x...
 * 
 * For production, replace with @vercel/og ImageResponse for proper
 * PNG generation. This HTML version works for development.
 */
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return new NextResponse("Invalid address", { status: 400 });
  }

  const apiKey = process.env.BASESCAN_API_KEY;
  if (!apiKey) {
    return new NextResponse("API key not configured", { status: 500 });
  }

  try {
    const report = await scanToken(address, apiKey);

    // Generate a simple SVG-based OG image
    const svg = `
      <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#0f172a"/>
            <stop offset="100%" style="stop-color:#1e293b"/>
          </linearGradient>
        </defs>
        <rect width="1200" height="630" fill="url(#bg)"/>
        
        <!-- Logo area -->
        <text x="60" y="70" font-family="Arial, sans-serif" font-size="28" fill="#94a3b8" font-weight="bold">
          🛡️ Base Token Guard
        </text>
        
        <!-- Token name -->
        <text x="60" y="160" font-family="Arial, sans-serif" font-size="48" fill="#f8fafc" font-weight="bold">
          ${escapeXml(report.symbol)} — ${escapeXml(report.name)}
        </text>
        
        <!-- Address -->
        <text x="60" y="210" font-family="monospace" font-size="22" fill="#64748b">
          ${address.slice(0, 6)}...${address.slice(-4)} on Base
        </text>
        
        <!-- Score circle -->
        <circle cx="960" cy="300" r="140" fill="none" stroke="#334155" stroke-width="12"/>
        <circle cx="960" cy="300" r="140" fill="none" stroke="${report.gradeColor}" stroke-width="12"
          stroke-dasharray="${(report.score / 100) * 880} 880"
          stroke-linecap="round" transform="rotate(-90 960 300)"/>
        <text x="960" y="290" font-family="Arial, sans-serif" font-size="72" fill="${report.gradeColor}" 
          text-anchor="middle" font-weight="bold">${report.score}</text>
        <text x="960" y="340" font-family="Arial, sans-serif" font-size="28" fill="${report.gradeColor}" 
          text-anchor="middle">${report.grade}</text>
        
        <!-- Checks summary -->
        ${report.checks
          .map(
            (check, i) => `
          <text x="60" y="${290 + i * 45}" font-family="Arial, sans-serif" font-size="24" fill="${check.passed ? '#22c55e' : '#ef4444'}">
            ${check.passed ? "✓" : "✗"} ${escapeXml(check.name)}
          </text>`
          )
          .join("")}
        
        <!-- Footer -->
        <text x="60" y="590" font-family="Arial, sans-serif" font-size="20" fill="#475569">
          Scanned by Base Token Guard • newsie.tech
        </text>
      </svg>
    `;

    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=300", // 5 min cache
      },
    });
  } catch (error) {
    console.error("OG generation error:", error);
    return new NextResponse("Failed to generate image", { status: 500 });
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .slice(0, 30); // Limit length for SVG
}
