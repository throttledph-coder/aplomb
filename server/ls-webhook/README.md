# Aplomb — Lemon Squeezy webhook (Cloudflare Worker)

Receives Lemon Squeezy subscription webhooks, verifies the signature, and upserts
the buyer's row into Supabase `subscriptions` (service role). The desktop app then
sees the user as **Pro** on `refreshSubscription`.

## Deploy

```bash
cd server/ls-webhook
npm install
npx wrangler login            # one-time, opens browser
npx wrangler secret put LS_WEBHOOK_SECRET          # from LS → Settings → Webhooks (signing secret)
npx wrangler secret put SUPABASE_URL               # https://kuhqwqtvgdijqnnrrzie.supabase.co
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY  # Supabase → Project Settings → API → service_role (secret!)
npx wrangler deploy
```

`wrangler deploy` prints the Worker URL, e.g. `https://aplomb-ls-webhook.<you>.workers.dev`.

## Lemon Squeezy setup
1. Create a **Store** + a **Subscription product** (set the price). Copy its **Checkout / buy link**
   into the app: `src/lib/billing/config.ts` → `LS_CHECKOUT_URL`.
2. LS → **Settings → Webhooks → +** : URL = the Worker URL above, signing secret = the same value you
   put in `LS_WEBHOOK_SECRET`. Subscribe to `subscription_created`, `subscription_updated`,
   `subscription_cancelled`, `subscription_expired`, `subscription_paused`, `subscription_unpaused`.
3. The app passes `checkout[custom][user_id]` = the Supabase user id, which the webhook reads to link the
   subscription to the account.

## Test
- LS has a **test mode** — make a test purchase, confirm a row appears in `subscriptions`, then in the app
  click **Account → Refresh status** → plan flips to **Pro**.
