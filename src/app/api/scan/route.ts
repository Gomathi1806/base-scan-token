import { NextRequest, NextResponse } from "next/server";
import { scanToken } from "@/lib/scanner";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Missing address parameter" }, { status: 400 });
  }

  // Basic validation
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid contract address" }, { status: 400 });
  }

  const apiKey = process.env.BASESCAN_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Basescan API key not configured" }, { status: 500 });
  }

  try {
    const report = await scanToken(address, apiKey);
    return NextResponse.json(report);
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json({ error: "Failed to scan token" }, { status: 500 });
  }
}
