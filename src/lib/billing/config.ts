// Billing config — PayMongo (30-day Pro pass). The actual checkout session is
// created server-side by the billing Worker (which holds the secret key); the
// app only needs the Worker's public URL. No secret ever lives here.
//
// Set this to the deployed Worker base URL after `wrangler deploy`
// (e.g. https://aplomb-paymongo-webhook.<account>.workers.dev). Empty until then.
export const PAYMONGO_WORKER_URL = ''

// Pro pass pricing (display only — the real amount is enforced in the Worker).
export const PRO_PRICE = '₱499'
export const PRO_PASS_DAYS = 30
