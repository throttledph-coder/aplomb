# Billing setup (Lemon Squeezy → Cloudflare Worker → Supabase)

Pro (auto-listen + stealth) unlocks when an **active subscription** row exists in Supabase for the signed-in
user. Lemon Squeezy (Merchant of Record — handles global tax + PH payout) sells the subscription; a
Cloudflare Worker receives its webhook and writes the row.

## One-time setup
1. **Lemon Squeezy**: create a Store + a **Subscription** product. Copy the product's **checkout/buy link**
   into `src/lib/billing/config.ts` → `LS_CHECKOUT_URL`, then rebuild the app.
2. **Cloudflare Worker**: deploy `server/ls-webhook/` (see its `README.md`). Set secrets:
   - `LS_WEBHOOK_SECRET` — LS → Settings → Webhooks signing secret.
   - `SUPABASE_URL` — `https://kuhqwqtvgdijqnnrrzie.supabase.co`.
   - `SUPABASE_SERVICE_ROLE_KEY` — Supabase → Project Settings → API → `service_role` (secret; Worker-only).
3. **LS webhook**: point it at the deployed Worker URL; subscribe to the `subscription_*` events.

## Flow
- App: **Account → Upgrade to Pro** opens the checkout in the browser, tagging `checkout[custom][user_id]`
  with the Supabase user id (+ prefilled email).
- On purchase, LS → Worker (verifies `X-Signature` HMAC) → upserts `subscriptions` (service role).
- App `refreshSubscription` (auto-poll after checkout, or "Refresh status") flips the user to **Pro**.

## Test
Use LS **test mode** for a no-cost purchase; confirm a `subscriptions` row appears, then Refresh status.

## Payout (PH)
LS pays out via PayPal / Wise. Confirm your payout method in LS settings.
