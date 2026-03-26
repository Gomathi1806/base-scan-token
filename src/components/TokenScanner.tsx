"use client";

import { useEffect, useState, useCallback } from "react";
import { initApp, shareResult, openUrl } from "@/lib/sdk-wrapper";
import type { TokenSafetyReport } from "@/lib/scanner";

export default function TokenScanner() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [address, setAddress] = useState("");
  const [scanning, setScanning] = useState(false);
  const [report, setReport] = useState<TokenSafetyReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<string[]>([]);

  // Initialize Hybrid SDK
  useEffect(() => {
    if (!isSDKLoaded) {
      setIsSDKLoaded(true);
      initApp().catch(console.error);
    }
  }, [isSDKLoaded]);

  // Check URL params for pre-filled address
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const addrParam = params.get("address");
      if (addrParam && /^0x[a-fA-F0-9]{40}$/.test(addrParam)) {
        setAddress(addrParam);
        // Auto-scan if address in URL
        doScan(addrParam);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doScan = useCallback(async (scanAddress: string) => {
    const trimmed = scanAddress.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      setError("Enter a valid contract address (0x...)");
      return;
    }

    setScanning(true);
    setError(null);
    setReport(null);

    try {
      const res = await fetch(`/api/scan?address=${trimmed}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Scan failed (HTTP ${res.status})`);
      }
      const data: TokenSafetyReport = await res.json();
      setReport(data);
      // Add to history
      setScanHistory((prev) => {
        const updated = [trimmed, ...prev.filter((a) => a !== trimmed)].slice(0, 5);
        return updated;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to scan token");
    } finally {
      setScanning(false);
    }
  }, []);

  const handleScan = () => doScan(address);

  const handleNewScan = () => {
    setReport(null);
    setError(null);
    setAddress("");
  };

  const handleShare = useCallback(async () => {
    if (!report) return;
    const appUrl = typeof window !== "undefined" ? window.location.origin : "";
    await shareResult({
      symbol: report.symbol,
      score: report.score,
      grade: report.grade,
      address: report.address,
      appUrl
    });
  }, [report]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ===== HEADER ===== */}
      <div className="sticky top-0 z-10 bg-slate-950 border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛡️</span>
            <h1 className="text-lg font-bold text-white">Base Token Guard</h1>
          </div>
          {/* Nav buttons */}
          <div className="flex gap-2">
            {report && (
              <button
                onClick={handleNewScan}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-lg transition-colors"
              >
                ← New Scan
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Check any Base token for safety in seconds
        </p>
      </div>

      {/* ===== SEARCH ===== */}
      <div className="px-4 py-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Paste token address (0x...)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleScan()}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
            spellCheck={false}
            autoComplete="off"
          />
          <button
            onClick={handleScan}
            disabled={scanning || !address.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold px-5 py-3 rounded-lg text-sm transition-colors whitespace-nowrap"
          >
            {scanning ? "Scanning..." : "Scan"}
          </button>
        </div>
        {error && (
          <div className="mt-2 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
            <p className="text-red-400 text-xs">{error}</p>
          </div>
        )}
      </div>

      {/* ===== SCANNING STATE ===== */}
      {scanning && (
        <div className="px-4 py-16 text-center">
          <div className="text-5xl mb-4 animate-pulse">🔍</div>
          <p className="text-slate-400 text-sm mb-1">Analyzing contract on Base...</p>
          <p className="text-slate-600 text-xs">This takes 5-10 seconds (checking 6 safety criteria)</p>
        </div>
      )}

      {/* ===== REPORT ===== */}
      {report && !scanning && (
        <div className="px-4">
          {/* Score Card */}
          <div
            className="rounded-xl p-4 mb-4 border"
            style={{
              borderColor: report.gradeColor + "40",
              background: report.gradeColor + "08",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-white truncate">
                  {report.symbol}
                </h2>
                <p className="text-sm text-slate-400 truncate">{report.name}</p>
                <p className="text-xs text-slate-500 font-mono mt-1">
                  {report.address.slice(0, 10)}...{report.address.slice(-6)}
                </p>
              </div>
              <div className="text-center ml-4 flex-shrink-0">
                <div
                  className="text-5xl font-bold leading-none"
                  style={{ color: report.gradeColor }}
                >
                  {report.score}
                </div>
                <div
                  className="text-xs font-bold px-3 py-1 rounded-full mt-2 inline-block"
                  style={{
                    color: report.gradeColor,
                    background: report.gradeColor + "20",
                  }}
                >
                  {report.grade}
                </div>
              </div>
            </div>

            {/* Score bar */}
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-2.5 rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${report.score}%`,
                  background: report.gradeColor,
                }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-slate-600">0</span>
              <span className="text-xs text-slate-600">100</span>
            </div>
          </div>

          {/* Checks */}
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
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      color: check.passed ? "#22c55e" : "#ef4444",
                      background: check.passed ? "#22c55e15" : "#ef444415",
                    }}
                  >
                    {check.passed ? "PASS" : "FAIL"}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{check.detail}</p>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="space-y-2 mb-4">
            <button
              onClick={handleShare}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-lg text-sm transition-colors"
            >
              📤 Share Result on Farcaster
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  openUrl(`https://basescan.org/token/${report.address}`);
                }}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 rounded-lg text-sm transition-colors"
              >
                Basescan ↗
              </button>
              <button
                onClick={handleNewScan}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 rounded-lg text-sm transition-colors"
              >
                ← Scan Another
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== EMPTY STATE ===== */}
      {!report && !scanning && (
        <div className="px-4 pb-8">
          {/* What we check */}
          <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 mb-4">
            <h3 className="text-sm font-semibold text-white mb-3">
              6 safety checks performed:
            </h3>
            <div className="grid grid-cols-1 gap-2 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span> Source code verified on Basescan
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span> Contract ownership renounced
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span> Holder distribution analysis
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span> Contract age and maturity
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span> Trading activity level
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span> Dangerous function detection
              </div>
            </div>
          </div>

          {/* Quick scan buttons */}
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
              Quick scan popular tokens
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
                { name: "USDC", addr: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
                { name: "WETH", addr: "0x4200000000000000000000000000000000000006" },
                { name: "DAI", addr: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb" },
                { name: "cbETH", addr: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22" },
              ].map((token) => (
                <button
                  key={token.name}
                  onClick={() => {
                    setAddress(token.addr);
                    doScan(token.addr);
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-2 rounded-lg transition-colors border border-slate-700"
                >
                  {token.name}
                </button>
              ))}
            </div>
          </div>

          {/* Recent scans */}
          {scanHistory.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                Recent scans
              </h3>
              <div className="space-y-1">
                {scanHistory.map((addr) => (
                  <button
                    key={addr}
                    onClick={() => {
                      setAddress(addr);
                      doScan(addr);
                    }}
                    className="w-full text-left bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs px-3 py-2 rounded-lg font-mono transition-colors"
                  >
                    {addr.slice(0, 10)}...{addr.slice(-6)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== FOOTER ===== */}
      <div className="px-4 py-4 text-center border-t border-slate-900 mt-4">
        <p className="text-xs text-slate-600">
          Base Token Guard • Not financial advice • Always DYOR
        </p>
      </div>
    </div>
  );
}
