let farcasterSdk: any = null;
let isInsideFarcaster = false;
let isInsideBaseApp = false;
let sdkReady = false;

/**
 * Initialize the SDK. Call once on app mount.
 * Detects whether we're in Farcaster, Base App, or plain browser.
 */
export async function initApp(): Promise<{
  context: 'farcaster' | 'base-app' | 'browser';
  user?: { fid?: number; username?: string; address?: string };
}> {
  // Try Farcaster SDK first
  try {
    const module = await import('@farcaster/frame-sdk');
    farcasterSdk = module.default || module.sdk || module;
    
    // Check if we're actually inside a Farcaster client
    const context = await Promise.race([
      farcasterSdk.context,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
    ]);
    
    if (context) {
      isInsideFarcaster = true;
      
      // Tell Farcaster we're ready (removes loading screen)
      await farcasterSdk.actions.ready();
      sdkReady = true;
      
      return {
        context: 'farcaster',
        user: {
          fid: context.user?.fid,
          username: context.user?.username,
        }
      };
    }
  } catch (e) {
    // Not in Farcaster — that's fine
    console.log('[SDK] Not in Farcaster environment');
  }

  // Check if we're in Base App (Coinbase Wallet webview)
  // Base App sets specific user agent or injects wallet
  if (typeof window !== 'undefined') {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('coinbase') || ua.includes('base')) {
      isInsideBaseApp = true;
      sdkReady = true;
      return { context: 'base-app' };
    }
  }

  // Plain browser
  sdkReady = true;
  return { context: 'browser' };
}

/**
 * Share a scan result.
 * In Farcaster: opens compose with cast text
 * In browser/Base App: opens native share or copies to clipboard
 */
export async function shareResult(params: {
  symbol: string;
  score: number;
  grade: string;
  address: string;
  appUrl: string;
}): Promise<void> {
  const { symbol, score, grade, address, appUrl } = params;
  
  const gradeEmoji = 
    grade === 'SAFE' ? '🟢' :
    grade === 'CAUTION' ? '🟡' :
    grade === 'WARNING' ? '🟠' : '🔴';
  
  const text = `${gradeEmoji} ${symbol} Safety Score: ${score}/100 (${grade})\n\nScanned with Base Token Guard 🛡️`;
  const shareUrl = `${appUrl}?address=${address}`;

  if (isInsideFarcaster && farcasterSdk) {
    // Use the official composeCast function (recommended over Warpcast deeplinks)
    try {
      await farcasterSdk.actions.composeCast({
        text,
        embeds: [shareUrl],
      });
      return;
    } catch {
      // Fallback to openUrl with Warpcast compose
      try {
        await farcasterSdk.actions.openUrl(
          `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(shareUrl)}`
        );
        return;
      } catch { /* fall through to clipboard */ }
    }
  }

  // Browser / Base App: use Web Share API or clipboard
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Base Token Guard', text, url: shareUrl });
      return;
    } catch { /* user cancelled or not supported */ }
  }

  // Final fallback: clipboard
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
    // You can show a toast "Copied to clipboard!" in the UI
  }
}

/**
 * Open an external URL.
 * In Farcaster: uses sdk.actions.openUrl
 * In browser: uses window.open
 */
export async function openUrl(url: string): Promise<void> {
  if (isInsideFarcaster && farcasterSdk) {
    try {
      await farcasterSdk.actions.openUrl(url);
      return;
    } catch { /* fall through */ }
  }
  window.open(url, '_blank');
}

/**
 * Check if we're in an embedded environment (Farcaster or Base App)
 * vs plain browser. Useful for adjusting UI.
 */
export function getEnvironment(): 'farcaster' | 'base-app' | 'browser' {
  if (isInsideFarcaster) return 'farcaster';
  if (isInsideBaseApp) return 'base-app';
  return 'browser';
}

export function isReady(): boolean {
  return sdkReady;
}
