# 🛡️ Base Token Guard

**Check any Base token for safety in 1 click — inside Farcaster.**

A Farcaster Mini App (Frame v2) that scans Base chain tokens for rug pulls, honeypots, and red flags. Users paste a contract address and get an instant safety report they can share as a cast.

## Safety Checks Performed

| Check | Weight | What it detects |
|-------|--------|----------------|
| Source Code Verified | 25% | Unverified contracts can't be inspected |
| Ownership Renounced | 20% | Active owners can change contract behavior |
| Holder Distribution | 15% | Concentrated ownership = dump risk |
| Contract Age | 10% | Very new contracts are higher risk |
| Trading Activity | 15% | Dead tokens with no activity |
| Dangerous Functions | 15% | mint(), pause(), blacklist(), setFee() |

## Tech Stack

- **Next.js 15** + TypeScript + Tailwind CSS
- **@farcaster/frame-sdk** for Mini App integration
- **Basescan API** for on-chain data
- **Vercel** for deployment

---

## 3-DAY WEEKEND BUILD PLAN

### Day 1 (Friday) — Core App + Deploy

**Morning (2-3 hours):**
1. `npx create-next-app@latest base-token-guard --typescript --tailwind --app`
2. Copy all files from this package into the project
3. Get free Basescan API key: https://basescan.org/myapikey
4. Set up `.env.local` with your API key
5. `npm run dev` — test locally with a few token addresses:
   - USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
   - WETH: `0x4200000000000000000000000000000000000006`
   - Any random meme token on Base

**Afternoon (2 hours):**
6. Fix any bugs from testing
7. Deploy to Vercel: `npx vercel`
8. Update `NEXT_PUBLIC_APP_URL` in Vercel env vars
9. Create simple splash.png and og-default.png (can use Canva, 5 minutes)
10. Sign the Farcaster manifest in Warpcast developer tools
11. Update `public/.well-known/farcaster.json` with signed values

**Evening (1 hour):**
12. Test in Warpcast Frame Playground (mobile only)
13. Fix any mobile UI issues (test at 400x567 viewport)
14. Redeploy

**Day 1 Deliverable:** Working Mini App deployed on Vercel, testable in Warpcast

---

### Day 2 (Saturday) — Distribution + Content

**Morning (2 hours):**
1. Cast the frame on Farcaster with your account
2. Post in these Farcaster channels:
   - /base — The main Base channel
   - /defi — DeFi discussions
   - /dev — Developer channel
   - /security — Security focused
3. Use this cast template:

```
🛡️ Built something this weekend: Base Token Guard

Paste any Base token address → instant safety report

Checks: source verification, ownership, holder distribution, 
dangerous functions (mint/pause/blacklist), activity level

Free. No signup. Open source.

Try it 👇
[embed frame URL]
```

**Afternoon (2 hours):**
4. Post on Twitter/X with the OG image of a scan result
5. Post in these communities:
   - r/ethdev on Reddit
   - Base Discord #builders channel
   - Uniswap Discord
   - Farcaster /frames channel
6. Find 5-10 tweets asking "is this token safe?" or "anyone know about $TOKEN on Base?" and reply helpfully with a link to your scan

**Evening (1 hour):**
7. Monitor for any bugs from real users
8. Check analytics (Vercel Analytics is free)
9. Respond to any Farcaster comments/replies

**Day 2 Deliverable:** 50-100 first users, feedback collected

---

### Day 3 (Sunday) — Iterate + Automate

**Morning (2 hours):**
1. Fix bugs reported by users
2. Add any quick wins based on feedback
3. Improvements to consider:
   - Add more popular tokens to quick-scan buttons
   - Improve error messages
   - Add "scan history" (localStorage)
   - Improve OG image design

**Afternoon (2 hours):**
4. Build the Nick Saraev distribution skill:
   - Skill that searches Twitter for "Base token safe" type queries
   - Generates helpful replies with a link to your frame
   - Runs daily
5. Set up a simple analytics tracking (how many scans per day)

**Evening (1 hour):**
6. Write a short thread about what you learned building this
7. Plan week 2 features:
   - Chrome extension version (same scanner, different distribution)
   - Telegram bot version
   - "Watchdog" mode (monitor tokens you hold)

**Day 3 Deliverable:** Bug-fixed app, distribution automation, plan for week 2

---

## Setup Instructions

```bash
# 1. Clone/copy files
npx create-next-app@latest base-token-guard --typescript --tailwind --app
# Copy src/, public/, and config files from this package

# 2. Install Farcaster SDK
npm install @farcaster/frame-sdk viem wagmi @tanstack/react-query

# 3. Environment variables
cp .env.example .env.local
# Edit .env.local with your Basescan API key

# 4. Run locally
npm run dev
# Open http://localhost:3000

# 5. Deploy
npx vercel

# 6. Sign manifest
# Go to Warpcast > Developer Tools > Sign Manifest
# Update public/.well-known/farcaster.json

# 7. Test in Warpcast
# Open Warpcast mobile > Developer Tools > Frame Playground
# Enter your Vercel URL
```

## File Structure

```
base-token-guard/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── scan/route.ts      # Token scanning endpoint
│   │   │   └── og/route.ts        # OG image generation
│   │   ├── layout.tsx              # Root layout with frame meta
│   │   ├── page.tsx                # Main page
│   │   └── globals.css
│   ├── components/
│   │   └── TokenScanner.tsx        # Main Mini App UI
│   └── lib/
│       └── scanner.ts              # Safety scoring algorithm
├── public/
│   └── .well-known/
│       └── farcaster.json          # Farcaster manifest
├── .env.example
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

## Connecting to Newsie.tech

This is the same SafeScore algorithm from Newsie.tech, repackaged as a Farcaster Mini App. The scanner logic in `src/lib/scanner.ts` can be shared between:
- This Farcaster frame
- A Chrome extension (future)
- A Telegram bot (future)
- The Newsie.tech website (existing)

Brand it as "Base Token Guard by Newsie.tech" — the frame drives users back to Newsie for deeper analysis.

## License

MIT — Built by Newsie.tech
