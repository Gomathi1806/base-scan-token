"use client";

import { useEffect, useState, useCallback } from "react";
import sdk from "@farcaster/frame-sdk";
import type { TokenSafetyReport } from "@/lib/scanner";

export default function TokenScanner() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [address, setAddress] = useState("");
  const [scanning, setScanning] = useState(false);
  const [report, setReport] = useState<TokenSafetyReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize Farcaster SDK
  useEffect(() => {
    const load = async () => {
      sdk.actions.ready();
    };
    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
    }
  }, [isSDKLoaded]);

  const handleScan = useCallback(async () => {
    if (!address || scanning) return;

    // Basic validation
    const trimmed = address.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      setError("Please enter a valid contract address (0x...)");
      return;
    }

    setScanning(true);
    setError(null);
    setReport(null);

    try {
      const res = await fetch(`/api/scan?address=${trimmed}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Scan failed");
      }
      const data: TokenSafetyReport = await res.json();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to scan token");
    } finally {
      setScanning(false);
    }
  }, [address, scanning]);

  const handleShare = useCallback(async () => {
    if (!report) return;

    const gradeEmoji =
      report.grade === "SAFE"
        ? "🟢"
        : report.grade === "CAUTION"
          ? "🟡"
          : report.grade === "WARNING"
            ? "🟠"
            : "🔴";

    const text = `${gradeEmoji} ${report.symbol} Safety Score: ${report.score}/100 (${report.grade})\n\nScanned with Base Token Guard 🛡️`;

    const appUrl = typeof window !== "undefined" ? window.location.origin : "";

    try {
      await sdk.actions.openUrl(
        `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(`${appUrl}?address=${report.address}`)}`
      );
    } catch {
      // Fallback: copy to clipboard
      navigator.clipboard?.writeText(text);
    }
  }, [report]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🛡️</span>
          <h1 className="text-xl font-bold text-white">Base Token Guard</h1>
        </div>
        <p className="text-sm text-slate-400">
          Check any Base token for safety in seconds
        </p>
      </div>

      {/* Search Input */}
      <div className="px-4 pb-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Paste token address (0x...)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleScan()}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
          />
          <button
            onClick={handleScan}
            disabled={scanning || !address}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold px-4 py-3 rounded-lg text-sm transition-colors"
          >
            {scanning ? "..." : "Scan"}
          </button>
        </div>
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      </div>

      {/* Scanning Animation */}
      {scanning && (
        <div className="px-4 py-12 text-center">
          <div className="inline-block animate-spin text-4xl mb-4">🔍</div>
          <p className="text-slate-400 text-sm">
            Analyzing contract on Base...
          </p>
        </div>
      )}

      {/* Report */}
      {report && !scanning && (
        <div className="px-4">
          {/* Score Card */}
          <div
            className="rounded-xl p-4 mb-4 border"
            style={{
              borderColor: report.gradeColor + "40",
              background: report.gradeColor + "10",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {report.symbol}
                </h2>
                <p className="text-xs text-slate-400">{report.name}</p>
                <p className="text-xs text-slate-500 font-mono mt-1">
                  {report.address.slice(0, 10)}...{report.address.slice(-6)}
                </p>
              </div>
              <div className="text-center">
                <div
                  className="text-4xl font-bold"
                  style={{ color: report.gradeColor }}
                >
                  {report.score}
                </div>
                <div
                  className="text-xs font-semibold px-2 py-0.5 rounded-full mt-1"
                  style={{
                    color: report.gradeColor,
                    background: report.gradeColor + "20",
                  }}
                >
                  {report.grade}
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${report.score}%`,
                  background: report.gradeColor,
                }}
              />
            </div>
          </div>

          {/* Checks List */}
          <div className="space-y-2 mb-4">
            {report.checks.map((check, i) => (
              <div
                key={i}
                className="bg-slate-900 rounded-lg p-3 border border-slate-800"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-white">
                    {check.icon} {check.name}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      color: check.passed ? "#22c55e" : "#ef4444",
                      background: check.passed ? "#22c55e20" : "#ef444420",
                    }}
                  >
                    {check.passed ? "PASS" : "FAIL"}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{check.detail}</p>
              </div>
            ))}
          </div>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-lg text-sm transition-colors mb-4"
          >
            📤 Share Result on Farcaster
          </button>

          {/* View on Basescan */}
          <button
            onClick={() =>
              sdk.actions.openUrl(
                `https://basescan.org/token/${report.address}`
              )
            }
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 rounded-lg text-sm transition-colors mb-6"
          >
            View on Basescan ↗
          </button>
        </div>
      )}

      {/* Empty State */}
      {!report && !scanning && (
        <div className="px-4 py-8">
          <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
            <h3 className="text-sm font-semibold text-white mb-3">
              What we check:
            </h3>
            <div className="space-y-2 text-xs text-slate-400">
              <p>✅ Source code verified on Basescan</p>
              <p>✅ Contract ownership renounced</p>
              <p>✅ Holder distribution analysis</p>
              <p>✅ Contract age and maturity</p>
              <p>✅ Trading activity level</p>
              <p>✅ Dangerous function detection (mint, pause, blacklist)</p>
            </div>
          </div>

          {/* Popular tokens for quick scan */}
          <div className="mt-4">
            <h3 className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
              Quick scan popular tokens
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
                { name: "USDC", addr: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
                { name: "WETH", addr: "0x4200000000000000000000000000000000000006" },
                { name: "DAI", addr: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb" },
              ].map((token) => (
                <button
                  key={token.name}
                  onClick={() => {
                    setAddress(token.addr);
                    setTimeout(() => {
                      setScanning(true);
                      fetch(`/api/scan?address=${token.addr}`)
                        .then((r) => r.json())
                        .then(setReport)
                        .catch(() => setError("Scan failed"))
                        .finally(() => setScanning(false));
                    }, 100);
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-full transition-colors"
                >
                  {token.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-4 text-center">
        <p className="text-xs text-slate-600">
          Built by Newsie.tech • Not financial advice
        </p>
      </div>
    </div>
  );
}
