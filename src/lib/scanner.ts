/**
 * Base Token Guard — Safety Scanner v4
 * 
 * Built for Etherscan V2 API (chainid=8453 for Base)
 * 
 * V2 BREAKING CHANGES HANDLED:
 * - token/tokentx requires `address` param (can't query by contractaddress alone)
 * - Uses account/txlist instead (works with just contract address)
 * - Gets contract age from oldest transaction (asc sort) as fallback
 * - All calls sequential with 300ms delay
 */

export interface TokenSafetyReport {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  score: number;
  grade: "SAFE" | "CAUTION" | "WARNING" | "DANGER";
  gradeColor: string;
  checks: SafetyCheck[];
  scannedAt: string;
}

export interface SafetyCheck {
  name: string;
  passed: boolean;
  weight: number;
  detail: string;
  icon: string;
}

const API_BASE = "https://api.etherscan.io/v2/api?chainid=8453";

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function apiFetch(params: string, apiKey: string): Promise<any> {
  // Note: API_BASE already has ? so we use & to append
  const url = `${API_BASE}&${params}&apikey=${apiKey}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.message === "NOTOK") {
      console.error(`[TokenGuard] API error for ${params.slice(0, 60)}: ${typeof data.result === 'string' ? data.result : JSON.stringify(data.result).slice(0, 100)}`);
    }
    return data;
  } catch (err) {
    console.error(`[TokenGuard] Fetch error:`, err);
    return null;
  }
}

export async function scanToken(address: string, apiKey: string): Promise<TokenSafetyReport> {
  const checks: SafetyCheck[] = [];
  const addr = address.trim();

  // ============================================================
  // API CALL 1: Source code (reused for Check 1 + Check 6)
  // ============================================================
  const sourceData = await apiFetch(
    `module=contract&action=getsourcecode&address=${addr}`,
    apiKey
  );
  await delay(300);

  // ============================================================
  // API CALL 2: Token name via eth_call → name() selector 0x06fdde03
  // ============================================================
  const nameData = await apiFetch(
    `module=proxy&action=eth_call&to=${addr}&data=0x06fdde03&tag=latest`,
    apiKey
  );
  await delay(300);

  // ============================================================
  // API CALL 3: Token symbol via eth_call → symbol() selector 0x95d89b41
  // ============================================================
  const symbolData = await apiFetch(
    `module=proxy&action=eth_call&to=${addr}&data=0x95d89b41&tag=latest`,
    apiKey
  );
  await delay(300);

  // ============================================================
  // API CALL 4: Owner via eth_call → owner() selector 0x8da5cb5b
  // ============================================================
  const ownerData = await apiFetch(
    `module=proxy&action=eth_call&to=${addr}&data=0x8da5cb5b&tag=latest`,
    apiKey
  );
  await delay(300);

  // ============================================================
  // API CALL 5: Recent transactions TO/FROM contract (for activity + holders)
  // NOTE: This uses account/txlist NOT token/tokentx
  // V2 API requires `address` for tokentx, but txlist works with just the contract
  // ============================================================
  const recentTxData = await apiFetch(
    `module=account&action=txlist&address=${addr}&page=1&offset=50&sort=desc&startblock=0&endblock=99999999`,
    apiKey
  );
  await delay(300);

  // ============================================================
  // API CALL 6: Oldest transactions (for contract age)
  // Get the very first transaction to determine deployment date
  // ============================================================
  const oldestTxData = await apiFetch(
    `module=account&action=txlist&address=${addr}&page=1&offset=1&sort=asc&startblock=0&endblock=99999999`,
    apiKey
  );

  // ============================================================
  // PARSE TOKEN INFO
  // ============================================================
  const tokenName = decodeString(nameData?.result) || sourceData?.result?.[0]?.ContractName || "Unknown";
  const tokenSymbol = decodeString(symbolData?.result) || "???";

  // ============================================================
  // CHECK 1: Source Code Verified (weight: 25)
  // ============================================================
  const isVerified =
    sourceData?.status === "1" &&
    !!sourceData?.result?.[0]?.SourceCode &&
    sourceData.result[0].SourceCode !== "";

  checks.push({
    name: "Source Code Verified",
    passed: isVerified,
    weight: 25,
    detail: isVerified
      ? `Verified on Basescan (${sourceData.result[0].CompilerVersion?.split("+")[0] || "Solidity"})`
      : "Source code NOT verified — cannot inspect contract logic",
    icon: isVerified ? "✅" : "🚨",
  });

  // ============================================================
  // CHECK 2: Ownership Renounced (weight: 20)
  // ============================================================
  let ownerPassed = true;
  let ownerDetail = "No owner function — not an Ownable contract";

  if (ownerData?.result && ownerData.result !== "0x" && ownerData.result.length === 66) {
    const ownerHex = "0x" + ownerData.result.slice(26);
    const isZero = ownerHex === "0x0000000000000000000000000000000000000000";
    const isDead = ownerHex.toLowerCase() === "0x000000000000000000000000000000000000dead";

    if (isZero || isDead) {
      ownerPassed = true;
      ownerDetail = "Ownership renounced (zero/dead address)";
    } else {
      ownerPassed = false;
      ownerDetail = `Active owner: ${ownerHex.slice(0, 6)}...${ownerHex.slice(-4)}`;
    }
  }

  checks.push({
    name: "Ownership Renounced",
    passed: ownerPassed,
    weight: 20,
    detail: ownerDetail,
    icon: ownerPassed ? "✅" : "⚠️",
  });

  // ============================================================
  // CHECK 3: Holder Distribution (weight: 15)
  // Count unique addresses from recent contract transactions
  // ============================================================
  let holdersPassed = false;
  let holdersDetail = "No transaction data found";

  if (recentTxData?.status === "1" && Array.isArray(recentTxData.result) && recentTxData.result.length > 0) {
    const uniqueAddrs = new Set<string>();
    for (const tx of recentTxData.result) {
      if (tx.from) uniqueAddrs.add(tx.from.toLowerCase());
      if (tx.to) uniqueAddrs.add(tx.to.toLowerCase());
    }
    const count = uniqueAddrs.size;
    holdersPassed = count >= 10;
    holdersDetail = holdersPassed
      ? `${count}+ unique addresses interacting with contract`
      : `Only ${count} unique addresses found — limited activity`;
  }

  checks.push({
    name: "Holder Distribution",
    passed: holdersPassed,
    weight: 15,
    detail: holdersDetail,
    icon: holdersPassed ? "✅" : "⚠️",
  });

  // ============================================================
  // CHECK 4: Contract Age (weight: 10)
  // Uses the timestamp of the oldest transaction
  // ============================================================
  let agePassed = false;
  let ageDetail = "Could not determine contract age";

  if (oldestTxData?.status === "1" && Array.isArray(oldestTxData.result) && oldestTxData.result.length > 0) {
    const firstTx = oldestTxData.result[0];
    if (firstTx.timeStamp) {
      const timestamp = parseInt(firstTx.timeStamp);
      const ageDays = Math.floor((Date.now() / 1000 - timestamp) / 86400);
      agePassed = ageDays > 7;
      ageDetail = agePassed
        ? `First activity ${ageDays} days ago — established contract`
        : `Only ${ageDays} day(s) old — very new, higher risk`;
    }
  }

  checks.push({
    name: "Contract Age",
    passed: agePassed,
    weight: 10,
    detail: ageDetail,
    icon: agePassed ? "✅" : "⚠️",
  });

  // ============================================================
  // CHECK 5: Trading Activity (weight: 15)
  // ============================================================
  let activityPassed = false;
  let activityDetail = "No trading data available";

  if (recentTxData?.status === "1" && Array.isArray(recentTxData.result) && recentTxData.result.length > 0) {
    const txCount = recentTxData.result.length;
    const newestTx = recentTxData.result[0]; // sorted desc, so first = newest
    if (newestTx.timeStamp) {
      const hoursSince = (Date.now() / 1000 - parseInt(newestTx.timeStamp)) / 3600;
      const recentActivity = hoursSince < 168; // within 7 days

      activityPassed = txCount >= 10 && recentActivity;
      activityDetail = activityPassed
        ? `${txCount}+ transactions (last activity ${Math.floor(hoursSince)}h ago)`
        : txCount < 10
          ? `Low activity — only ${txCount} transactions found`
          : `Last activity was ${Math.floor(hoursSince / 24)} days ago`;
    }
  }

  checks.push({
    name: "Trading Activity",
    passed: activityPassed,
    weight: 15,
    detail: activityDetail,
    icon: activityPassed ? "✅" : "⚠️",
  });

  // ============================================================
  // CHECK 6: Dangerous Functions (weight: 15)
  // Reuses sourceData — no extra API call
  // ============================================================
  let dangerPassed = false;
  let dangerDetail = "Cannot check — source not verified";

  if (isVerified && sourceData?.result?.[0]?.SourceCode) {
    const src = sourceData.result[0].SourceCode.toLowerCase();
    const dangers: string[] = [];

    if (src.includes("function mint(") || src.includes("function mint (")) dangers.push("mint()");
    if (src.includes("function pause(") || src.includes("function pause (")) dangers.push("pause()");
    if (src.includes("blacklist") || src.includes("blocklist")) dangers.push("blacklist");
    if (src.includes("settaxfee") || src.includes("function setfee")) dangers.push("setFee()");
    if (src.includes("enabletrading") || src.includes("settradingopen")) dangers.push("trading toggle");

    dangerPassed = dangers.length === 0;
    dangerDetail = dangerPassed
      ? "No dangerous owner functions detected"
      : `Risky functions found: ${dangers.join(", ")}`;
  }

  checks.push({
    name: "No Dangerous Functions",
    passed: dangerPassed,
    weight: 15,
    detail: dangerDetail,
    icon: dangerPassed ? "✅" : "🚨",
  });

  // ============================================================
  // CALCULATE SCORE
  // ============================================================
  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.filter((c) => c.passed).reduce((s, c) => s + c.weight, 0);
  const score = Math.round((earned / totalWeight) * 100);

  let grade: TokenSafetyReport["grade"];
  let gradeColor: string;
  if (score >= 80) { grade = "SAFE"; gradeColor = "#22c55e"; }
  else if (score >= 60) { grade = "CAUTION"; gradeColor = "#eab308"; }
  else if (score >= 40) { grade = "WARNING"; gradeColor = "#f97316"; }
  else { grade = "DANGER"; gradeColor = "#ef4444"; }

  return {
    address: addr,
    name: tokenName,
    symbol: tokenSymbol,
    decimals: 18,
    totalSupply: "0",
    score,
    grade,
    gradeColor,
    checks,
    scannedAt: new Date().toISOString(),
  };
}

// ============================================================
// DECODE ABI-ENCODED STRING
// ============================================================
function decodeString(hex: string | undefined | null): string {
  try {
    if (!hex || hex === "0x" || hex === "0x0" || hex.length < 66) return "";
    const stripped = hex.slice(2);

    // ABI-encoded string: 32-byte offset + 32-byte length + data
    if (stripped.length >= 128) {
      const offset = parseInt(stripped.slice(0, 64), 16);
      if (offset === 32) {
        const length = parseInt(stripped.slice(64, 128), 16);
        if (length > 0 && length <= 64) {
          const data = stripped.slice(128, 128 + length * 2);
          const decoded = Buffer.from(data, "hex").toString("utf-8").replace(/\0/g, "").trim();
          if (decoded.length > 0) return decoded;
        }
      }
    }

    // bytes32: some tokens encode name/symbol as bytes32
    const b32 = Buffer.from(stripped.slice(0, 64), "hex").toString("utf-8").replace(/\0/g, "").trim();
    if (b32 && /^[\x20-\x7E]+$/.test(b32)) return b32;

    return "";
  } catch {
    return "";
  }
}
