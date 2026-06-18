// PayMongo "Pro pass" date math, shared by the webhook Worker and tests.
// A pass is a one-time purchase that unlocks Pro for a fixed number of days.
// Buying again before expiry STACKS onto the remaining time (you never lose
// days you already paid for); buying after expiry starts fresh from now.

const DAY_MS = 86_400_000

export const PASS_DAYS = 30

export function computePassEnd(
  existingEndIso: string | null | undefined,
  now: Date,
  days: number = PASS_DAYS,
): string {
  const existing = existingEndIso ? new Date(existingEndIso).getTime() : NaN
  const base = !Number.isNaN(existing) && existing > now.getTime() ? existing : now.getTime()
  return new Date(base + days * DAY_MS).toISOString()
}
