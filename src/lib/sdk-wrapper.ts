let farcasterSdk: any = null;
let isInsideFarcaster = false;
let isInsideBaseApp = false;
let sdkReady = false;

export async function initApp(): Promise<{
  context: 'farcaster' | 'base-app' | 'browser';
  user?: { fid?: number; username?: string };
}> {
  try {
    const module = await import('@farcaster/frame-sdk');
    farcasterSdk = module.default || module.sdk || module;
    
    const context = await Promise.race([
      farcasterSdk.context,
      new Promise((_, reject) => setTimeout(() => reject('timeout'), 2000))
    ]);
    
    if (context) {
      isInsideFarcaster = true;
      await farcasterSdk.actions.ready();
      sdkReady = true;
      return {
        context: 'farcaster',
        user: { fid: context.user?.fid, username: context.user?.username }
      };
    }
  } catch {
    // Not in Farcaster
  }

  // Check Base App
  if (typeof window !== 'undefined') {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('coinbase') || ua.includes('base')) {
      isInsideBaseApp = true;
      sdkReady = true;
      return { context: 'base-app' };
    }
  }

  sdkReady = true;
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
  const gradeEmoji = grade === 'SAFE' ? '🟢' : grade === 'CAUTION' ? '🟡' : grade === 'WARNING' ? '🟠' : '🔴';
  const text = `${gradeEmoji} ${symbol} Safety Score: ${score}/100 (${grade})\n\nScanned with Base Token Guard 🛡️`;
  const shareUrl = `${appUrl}?address=${address}`;

  if (isInsideFarcaster && farcasterSdk) {
    try {
      await farcasterSdk.actions.composeCast({ text, embeds: [shareUrl] });
      return;
    } catch {
      try {
        await farcasterSdk.actions.openUrl(
          `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(shareUrl)}`
        );
        return;
      } catch { /* fall through */ }
    }
  }

  // Browser / Base App fallback
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Base Token Guard', text, url: shareUrl });
      return;
    } catch { /* cancelled */ }
  }
  
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
    alert('Copied to clipboard!');
  }
}

export async function openUrl(url: string): Promise<void> {
  if (isInsideFarcaster && farcasterSdk) {
    try { await farcasterSdk.actions.openUrl(url); return; } catch { /* fall through */ }
  }
  window.open(url, '_blank');
}

export function getEnvironment(): 'farcaster' | 'base-app' | 'browser' {
  if (isInsideFarcaster) return 'farcaster';
  if (isInsideBaseApp) return 'base-app';
  return 'browser';
}
