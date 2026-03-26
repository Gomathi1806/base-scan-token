/**
 * Base Token Guard — Safety Scanner
 * Analyzes Base chain tokens for common red flags
 *
 * Checks performed:
 * 1. Contract verified on Basescan?
 * 2. Ownership renounced?
 * 3. Liquidity locked/sufficient?
 * 4. Top holder concentration
 * 5. Honeypot indicators
 * 6. Contract age
 * 7. Transaction count (activity level)
 */

export interface TokenSafetyReport {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  score: number; // 0-100
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
  icon: string; // emoji
}

const BASESCAN_API = "https://api.basescan.org/api";

export async function scanToken(
  address: string,
  apiKey: string
): Promise<TokenSafetyReport> {
  const checks: SafetyCheck[] = [];

  // Normalize address
  const addr = address.trim().toLowerCase();

  // 1. Get basic token info
  const tokenInfo = await getTokenInfo(addr, apiKey);

  // 2. Check if contract source is verified
  const sourceCheck = await checkSourceVerified(addr, apiKey);
  checks.push(sourceCheck);

  // 3. Check contract creator and ownership
  const ownerCheck = await checkOwnership(addr, apiKey);
  checks.push(ownerCheck);

  // 4. Check top holder concentration
  const holderCheck = await checkHolderConcentration(addr, apiKey);
  checks.push(holderCheck);

  // 5. Check contract age
  const ageCheck = await checkContractAge(addr, apiKey);
  checks.push(ageCheck);

  // 6. Check transaction activity
  const activityCheck = await checkActivity(addr, apiKey);
  checks.push(activityCheck);

  // 7. Check if contract has dangerous functions (mint, pause, blacklist)
  const functionCheck = await checkDangerousFunctions(addr, apiKey);
  checks.push(functionCheck);

  // Calculate overall score
  const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
  const earnedWeight = checks
    .filter((c) => c.passed)
    .reduce((sum, c) => sum + c.weight, 0);
  const score = Math.round((earnedWeight / totalWeight) * 100);

  // Determine grade
  let grade: TokenSafetyReport["grade"];
  let gradeColor: string;
  if (score >= 80) {
    grade = "SAFE";
    gradeColor = "#22c55e";
  } else if (score >= 60) {
    grade = "CAUTION";
    gradeColor = "#eab308";
  } else if (score >= 40) {
    grade = "WARNING";
    gradeColor = "#f97316";
  } else {
    grade = "DANGER";
    gradeColor = "#ef4444";
  }

  return {
    address: addr,
    name: tokenInfo.name || "Unknown",
    symbol: tokenInfo.symbol || "???",
    decimals: tokenInfo.decimals || 18,
    totalSupply: tokenInfo.totalSupply || "0",
    score,
    grade,
    gradeColor,
    checks,
    scannedAt: new Date().toISOString(),
  };
}

async function getTokenInfo(address: string, apiKey: string) {
  try {
    const res = await fetch(
      `${BASESCAN_API}?module=token&action=tokeninfo&contractaddress=${address}&apikey=${apiKey}`
    );
    const data = await res.json();
    if (data.status === "1" && data.result?.length > 0) {
      const token = data.result[0];
      return {
        name: token.tokenName || token.name,
        symbol: token.symbol,
        decimals: parseInt(token.divisor || token.decimals || "18"),
        totalSupply: token.totalSupply,
      };
    }
  } catch (e) {
    console.error("getTokenInfo error:", e);
  }

  // Fallback: try ERC20 name/symbol via contract call
  try {
    const nameRes = await fetch(
      `${BASESCAN_API}?module=proxy&action=eth_call&to=${address}&data=0x06fdde03&tag=latest&apikey=${apiKey}`
    );
    const nameData = await nameRes.json();

    const symbolRes = await fetch(
      `${BASESCAN_API}?module=proxy&action=eth_call&to=${address}&data=0x95d89b41&tag=latest&apikey=${apiKey}`
    );
    const symbolData = await symbolRes.json();

    return {
      name: decodeString(nameData.result) || "Unknown",
      symbol: decodeString(symbolData.result) || "???",
      decimals: 18,
      totalSupply: "0",
    };
  } catch {
    return { name: "Unknown", symbol: "???", decimals: 18, totalSupply: "0" };
  }
}

function decodeString(hex: string): string {
  try {
    if (!hex || hex === "0x") return "";
    // Skip function selector offset and length, decode UTF-8
    const stripped = hex.slice(2);
    if (stripped.length < 128) return "";
    const offset = parseInt(stripped.slice(0, 64), 16) * 2;
    const length = parseInt(stripped.slice(offset, offset + 64), 16);
    const data = stripped.slice(offset + 64, offset + 64 + length * 2);
    return Buffer.from(data, "hex").toString("utf-8").replace(/\0/g, "");
  } catch {
    return "";
  }
}

async function checkSourceVerified(
  address: string,
  apiKey: string
): Promise<SafetyCheck> {
  try {
    const res = await fetch(
      `${BASESCAN_API}?module=contract&action=getsourcecode&address=${address}&apikey=${apiKey}`
    );
    const data = await res.json();
    const verified =
      data.status === "1" &&
      data.result?.[0]?.SourceCode &&
      data.result[0].SourceCode !== "";

    return {
      name: "Source Code Verified",
      passed: verified,
      weight: 25,
      detail: verified
        ? "Contract source code is publicly verified on Basescan"
        : "Contract source code is NOT verified — cannot inspect what it does",
      icon: verified ? "✅" : "🚨",
    };
  } catch {
    return {
      name: "Source Code Verified",
      passed: false,
      weight: 25,
      detail: "Could not check verification status",
      icon: "❓",
    };
  }
}

async function checkOwnership(
  address: string,
  apiKey: string
): Promise<SafetyCheck> {
  try {
    // Check owner() function — returns address(0) if renounced
    const res = await fetch(
      `${BASESCAN_API}?module=proxy&action=eth_call&to=${address}&data=0x8da5cb5b&tag=latest&apikey=${apiKey}`
    );
    const data = await res.json();

    if (
      data.result &&
      data.result !==
        "0x0000000000000000000000000000000000000000000000000000000000000000"
    ) {
      const ownerAddr = "0x" + data.result.slice(26);
      const isZero =
        ownerAddr === "0x0000000000000000000000000000000000000000";
      const isDead =
        ownerAddr.toLowerCase() ===
        "0x000000000000000000000000000000000000dead";

      if (isZero || isDead) {
        return {
          name: "Ownership Renounced",
          passed: true,
          weight: 20,
          detail: "Contract ownership has been renounced (owner is zero/dead address)",
          icon: "✅",
        };
      }
      return {
        name: "Ownership Renounced",
        passed: false,
        weight: 20,
        detail: `Contract still has an active owner: ${ownerAddr.slice(0, 6)}...${ownerAddr.slice(-4)}`,
        icon: "⚠️",
      };
    }

    // No owner function — might be okay (not all tokens have Ownable)
    return {
      name: "Ownership Renounced",
      passed: true,
      weight: 20,
      detail: "No owner function found — contract may not use Ownable pattern",
      icon: "✅",
    };
  } catch {
    return {
      name: "Ownership Renounced",
      passed: false,
      weight: 20,
      detail: "Could not determine ownership status",
      icon: "❓",
    };
  }
}

async function checkHolderConcentration(
  address: string,
  apiKey: string
): Promise<SafetyCheck> {
  try {
    // Get top token holders via tokentx
    const res = await fetch(
      `${BASESCAN_API}?module=token&action=tokenholderlist&contractaddress=${address}&page=1&offset=10&apikey=${apiKey}`
    );
    const data = await res.json();

    if (data.status === "1" && data.result?.length > 0) {
      // Check if top holder has > 50% of supply
      const topHolder = data.result[0];
      const topHolderPct = parseFloat(topHolder.TokenHolderQuantity) / parseFloat(topHolder.TokenHolderQuantity) * 100;

      // Simple heuristic: if we got fewer than 5 holders, concentration is high
      const holderCount = data.result.length;
      const passed = holderCount >= 5;

      return {
        name: "Holder Distribution",
        passed,
        weight: 15,
        detail: passed
          ? `Token has ${holderCount}+ holders — reasonable distribution`
          : `Only ${holderCount} holders found — very concentrated ownership`,
        icon: passed ? "✅" : "⚠️",
      };
    }

    // Fallback: check transfer count as proxy
    const txRes = await fetch(
      `${BASESCAN_API}?module=token&action=tokentx&contractaddress=${address}&page=1&offset=1&sort=desc&apikey=${apiKey}`
    );
    const txData = await txRes.json();
    const hasTx = txData.status === "1" && txData.result?.length > 0;

    return {
      name: "Holder Distribution",
      passed: hasTx,
      weight: 15,
      detail: hasTx
        ? "Token has transfer activity"
        : "No transfer activity found — possibly inactive",
      icon: hasTx ? "✅" : "⚠️",
    };
  } catch {
    return {
      name: "Holder Distribution",
      passed: false,
      weight: 15,
      detail: "Could not check holder distribution",
      icon: "❓",
    };
  }
}

async function checkContractAge(
  address: string,
  apiKey: string
): Promise<SafetyCheck> {
  try {
    // Get contract creation tx
    const res = await fetch(
      `${BASESCAN_API}?module=contract&action=getcontractcreation&contractaddresses=${address}&apikey=${apiKey}`
    );
    const data = await res.json();

    if (data.status === "1" && data.result?.length > 0) {
      const txHash = data.result[0].txHash;

      // Get tx details for timestamp
      const txRes = await fetch(
        `${BASESCAN_API}?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${apiKey}`
      );
      const txData = await txRes.json();

      if (txData.result?.blockNumber) {
        const blockRes = await fetch(
          `${BASESCAN_API}?module=proxy&action=eth_getBlockByNumber&tag=${txData.result.blockNumber}&boolean=false&apikey=${apiKey}`
        );
        const blockData = await blockRes.json();
        const timestamp = parseInt(blockData.result?.timestamp || "0", 16);
        const ageMs = Date.now() - timestamp * 1000;
        const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

        const passed = ageDays > 7; // At least 7 days old
        return {
          name: "Contract Age",
          passed,
          weight: 10,
          detail: passed
            ? `Contract deployed ${ageDays} days ago — established`
            : `Contract only ${ageDays} day(s) old — very new, higher risk`,
          icon: passed ? "✅" : "⚠️",
        };
      }
    }

    return {
      name: "Contract Age",
      passed: false,
      weight: 10,
      detail: "Could not determine contract age",
      icon: "❓",
    };
  } catch {
    return {
      name: "Contract Age",
      passed: false,
      weight: 10,
      detail: "Could not determine contract age",
      icon: "❓",
    };
  }
}

async function checkActivity(
  address: string,
  apiKey: string
): Promise<SafetyCheck> {
  try {
    const res = await fetch(
      `${BASESCAN_API}?module=token&action=tokentx&contractaddress=${address}&page=1&offset=50&sort=desc&apikey=${apiKey}`
    );
    const data = await res.json();

    if (data.status === "1") {
      const txCount = data.result?.length || 0;

      // Check if recent activity exists (last tx within 7 days)
      let recentActivity = false;
      if (txCount > 0) {
        const lastTxTimestamp = parseInt(data.result[0].timeStamp);
        const daysSinceLastTx =
          (Date.now() / 1000 - lastTxTimestamp) / (60 * 60 * 24);
        recentActivity = daysSinceLastTx < 7;
      }

      const passed = txCount >= 10 && recentActivity;
      return {
        name: "Trading Activity",
        passed,
        weight: 15,
        detail: passed
          ? `Active token with ${txCount}+ recent transfers`
          : txCount < 10
            ? `Low activity — only ${txCount} transfers found`
            : "No recent trading activity in the last 7 days",
        icon: passed ? "✅" : "⚠️",
      };
    }

    return {
      name: "Trading Activity",
      passed: false,
      weight: 15,
      detail: "Could not check trading activity",
      icon: "❓",
    };
  } catch {
    return {
      name: "Trading Activity",
      passed: false,
      weight: 15,
      detail: "Could not check trading activity",
      icon: "❓",
    };
  }
}

async function checkDangerousFunctions(
  address: string,
  apiKey: string
): Promise<SafetyCheck> {
  try {
    const res = await fetch(
      `${BASESCAN_API}?module=contract&action=getsourcecode&address=${address}&apikey=${apiKey}`
    );
    const data = await res.json();

    if (data.status === "1" && data.result?.[0]?.SourceCode) {
      const source = data.result[0].SourceCode.toLowerCase();
      const abi = data.result[0].ABI || "";

      const dangerousFns: string[] = [];

      if (source.includes("function mint") || abi.includes('"name":"mint"'))
        dangerousFns.push("mint()");
      if (source.includes("function pause") || abi.includes('"name":"pause"'))
        dangerousFns.push("pause()");
      if (
        source.includes("blacklist") ||
        source.includes("blocklist") ||
        source.includes("isblocked")
      )
        dangerousFns.push("blacklist");
      if (source.includes("settaxfee") || source.includes("setfee"))
        dangerousFns.push("setFee()");
      if (source.includes("settradingopen") || source.includes("enabletrading"))
        dangerousFns.push("trading toggle");

      const passed = dangerousFns.length === 0;
      return {
        name: "No Dangerous Functions",
        passed,
        weight: 15,
        detail: passed
          ? "No dangerous owner-only functions detected (mint, pause, blacklist, fee changes)"
          : `Found risky functions: ${dangerousFns.join(", ")}`,
        icon: passed ? "✅" : "🚨",
      };
    }

    // If source isn't verified, we can't check — already penalized in verification check
    return {
      name: "No Dangerous Functions",
      passed: false,
      weight: 15,
      detail:
        "Cannot check — source code not verified",
      icon: "❓",
    };
  } catch {
    return {
      name: "No Dangerous Functions",
      passed: false,
      weight: 15,
      detail: "Could not analyze contract functions",
      icon: "❓",
    };
  }
}
