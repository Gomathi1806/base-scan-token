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


1. `npx create-next-app@latest base-token-guard --typescript --tailwind --app`
2. Copy all files from this package into the project
3. Get free Basescan API key: https://basescan.org/myapikey
4. Set up `.env.local` with your API key
5. `npm run dev` — test locally with a few token addresses:
   - USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
   - WETH: `0x4200000000000000000000000000000000000006`
   - Any random meme token on Base


6. Fix any bugs from testing
7. Deploy to Vercel: `npx vercel`
8. Update `NEXT_PUBLIC_APP_URL` in Vercel env vars
9. Create simple splash.png and og-default.png (can use Canva, 5 minutes)
10. Sign the Farcaster manifest in Warpcast developer tools
11. Update `public/.well-known/farcaster.json` with signed values


12. Test in Warpcast Frame Playground (mobile only)
13. Fix any mobile UI issues (test at 400x567 viewport)
14. Redeploy


1. Cast the frame on Farcaster with your account
2. Post in these Farcaster channels:
   - /base — The main Base channel
   - /defi — DeFi discussions
   - /dev — Developer channel
   - /security — Security focused


```









- A Telegram bot (future)
- The Newsie.tech website (existing)

Brand it as "Base Token Guard by Newsie.tech" — the frame drives users back to Newsie for deeper analysis.

## License

MIT — Built by Newsie.tech
