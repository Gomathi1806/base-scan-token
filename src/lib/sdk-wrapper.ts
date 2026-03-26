let farcasterSdk: any = null;
let currentContext: 'farcaster' | 'base-app' | 'browser' = 'browser';

export async function initApp(): Promise<{
  context: 'farcaster' | 'base-app' | 'browser';
  user?: { fid?: number; username?: string };
}> {
  // Try Farcaster SDK (for Warpcast users)
  try {
    const module = await import('@farcaster/frame-sdk');
    farcasterSdk = module.default || module.sdk || module;
    
    const ctx = await Promise.race([
      farcasterSdk.context,
      new Promise((_, reject) => setTimeout(() => reject('timeout'), 2000))
    ]);
    
    if (ctx) {
      currentContext = 'farcaster';
      // sdk.actions.ready() — tells Farcaster to show the app
      // NOT needed in Base App, but still needed in Warpcast
      await farcasterSdk.actions.ready();
      return {
        context: 'farcaster',
        user: { fid: ctx.user?.fid, username: ctx.user?.username }
      };
    }
  } catch {
    // Not in Farcaster — totally fine
  }

  // Check if we're in Base App (Coinbase Wallet in-app browser)
  if (typeof window !== 'undefined') {
    const ua = navigator.userAgent.toLowerCase();
    // Base App uses Coinbase Wallet's in-app browser
    if (ua.includes('coinbasewallet') || ua.includes('coinbase')) {
      currentContext = 'base-app';
      // In Base App: ready() is NOT needed — app displays when it loads
      return { context: 'base-app' };
    }
  }

  // Plain browser — works as standard web app
  currentContext = 'browser';
  return { context: 'browser' };
}

export async function shareResult(params: {
  symbol: string;
  score: number;
  grade: string;
  address: string;
  appUrl: string;
}): Promise<void> {
  const { symbol, score, grade, address, appUrl } = params;
  const emoji = grade === 'SAFE' ? '🟢' : grade === 'CAUTION' ? '🟡' : grade === 'WARNING' ? '🟠' : '🔴';
  const text = `${emoji} ${symbol} Safety Score: ${score}/100 (${grade})\n\nScanned with Base Token Guard 🛡️`;
  const shareUrl = `${appUrl}?address=${address}`;

  if (currentContext === 'farcaster' && farcasterSdk) {
    // In Warpcast: use composeCast
    try {
      await farcasterSdk.actions.composeCast({ text, embeds: [shareUrl] });
      return;
    } catch { /* fall through */ }
  }

  // Base App + Browser: use Web Share API (works on mobile)
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Base Token Guard', text, url: shareUrl });
      return;
    } catch { /* user cancelled */ }
  }

  // Final fallback: clipboard
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
    // Show a toast in your UI: "Copied to clipboard!"
  }
}

// Official migration: sdk.actions.openUrl → window.open
export async function openExternalUrl(url: string): Promise<void> {
  if (currentContext === 'farcaster' && farcasterSdk) {
    try { 
      await farcasterSdk.actions.openUrl(url); 
      return; 
    } catch { /* fall through */ }
  }
  // Base App + Browser: standard web
  window.open(url, '_blank');
}

// Official migration: viewToken → deeplink
export function getTokenViewUrl(tokenAddress: string): string {
  if (currentContext === 'base-app') {
    // Base App deeplink format
    return `https://base.app/coin/base-mainnet/${tokenAddress}`;
  }
  // Default: Basescan
  return `https://basescan.org/token/${tokenAddress}`;
}

// Official migration: swapToken → Uniswap URL (transactions get builder code via wagmi config)
export function getSwapUrl(tokenAddress: string): string {
  return `https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=${tokenAddress}&chain=base`;
}

export function getContext(): 'farcaster' | 'base-app' | 'browser' {
  return currentContext;
}
