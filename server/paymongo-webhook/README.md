# Aplomb — PayMongo billing Worker

Hosts checkout-session creation + the PayMongo webhook that grants a 30-day Pro
pass. Replaces the old Lemon Squeezy Worker. **No API key ever lives in this
repo** — secrets are set with `wrangler secret put` and stored encrypted by
Cloudflare.

## Endpoints
- `POST /checkout` `{ user_id, email }` → `{ url }` — creates a hosted PayMongo
  Checkout Session (₱499, GCash/Maya/Card/QRPh) tagged with the user id. Called
  by the Aplomb app's main process.
- `POST /` — PayMongo webhook. Verifies `Paymongo-Signature`, and on
  `checkout_session.payment.paid` upserts the user's `subscriptions` row with a
  30-day pass (stacks onto any remaining time).
- `GET /` — health check (`ok`).

## Deploy
```
cd server/paymongo-webhook
npm install          # if package.json present, else just wrangler
npx wrangler login
npx wrangler secret put PAYMONGO_SECRET_KEY        # sk_test_… first, then sk_live_…
npx wrangler secret put SUPABASE_URL               # https://<ref>.supabase.co
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY  # Supabase service_role key
npx wrangler deploy                                # prints the Worker URL
```
Then in PayMongo → **Developers → Webhooks → Add endpoint**: URL = the Worker
URL, event = `checkout_session.payment.paid`. Copy the signing secret and:
```
npx wrangler secret put PAYMONGO_WEBHOOK_SECRET    # whsk_…
```
Paste the Worker URL back so it's wired into the app (`PAYMONGO_WORKER_URL` in
`src/lib/billing/config.ts`). **Test in PayMongo test mode first.**
