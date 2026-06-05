// Plan limits + gating (docs/11-plan-limits.md). Pure, renderer-safe.

export interface PlanLimits {
  sessionsPerMonth: number // -1 = unlimited
  resumeCount: number // -1 = unlimited
  autoListenEnabled: boolean
  stealthModeEnabled: boolean
  trayModeEnabled: boolean
  exportEnabled: boolean
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    // Prep is free forever (BYO key → no inference cost to us). Only the live
    // in-interview superpowers are gated to Pro.
    sessionsPerMonth: -1,
    resumeCount: -1,
    autoListenEnabled: false,
    stealthModeEnabled: false,
    trayModeEnabled: false,
    exportEnabled: true,
  },
  premium: {
    sessionsPerMonth: -1,
    resumeCount: -1,
    autoListenEnabled: true,
    stealthModeEnabled: true,
    trayModeEnabled: true,
    exportEnabled: true,
  },
}

function limitsFor(plan: string): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free
}

export function checkFeatureAccess(feature: keyof PlanLimits, plan: string): boolean {
  const value = limitsFor(plan)[feature]
  if (typeof value === 'boolean') return value
  return value === -1
}

export function checkSessionLimit(sessionsUsed: number, plan: string): boolean {
  const limit = limitsFor(plan).sessionsPerMonth
  if (limit === -1) return true
  return sessionsUsed < limit
}

export function canAddResume(currentCount: number, plan: string): boolean {
  const limit = limitsFor(plan).resumeCount
  if (limit === -1) return true
  return currentCount < limit
}
