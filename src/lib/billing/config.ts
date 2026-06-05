// Lemon Squeezy checkout link for the Pro subscription product.
// Paste your product's "buy link" here (LS → product → Share / Checkout URL).
// Leave empty until configured — the Upgrade button then shows a setup notice.
export const LS_CHECKOUT_URL = ''

// Build a checkout URL that prefills the email and tags the Supabase user id so
// the webhook can link the subscription to the account.
export function buildCheckoutUrl(userId: string, email: string | null): string | null {
  if (!LS_CHECKOUT_URL) return null
  const u = new URL(LS_CHECKOUT_URL)
  if (email) u.searchParams.set('checkout[email]', email)
  u.searchParams.set('checkout[custom][user_id]', userId)
  return u.toString()
}
