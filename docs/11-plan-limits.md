FREE TIER VS PREMIUM TIER LOGIC
Plan Enforcement (Client-Side for MVP)
TypeScript

// src/lib/plan.ts

interface PlanLimits {
  sessionsPerMonth: number     // -1 = unlimited
  resumeCount: number
  autoListenEnabled: boolean
  stealthModeEnabled: boolean
  trayModeEnabled: boolean
  exportEnabled: boolean
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    // Prep is free + unlimited (BYO key → no inference cost to us). Only the
    // live in-interview features are gated to Pro.
    sessionsPerMonth: -1,      // Unlimited
    resumeCount: -1,           // Unlimited
    autoListenEnabled: false,
    stealthModeEnabled: false,
    trayModeEnabled: false,
    exportEnabled: true,
  },
  premium: {
    sessionsPerMonth: -1,      // Unlimited
    resumeCount: -1,           // Unlimited
    autoListenEnabled: true,
    stealthModeEnabled: true,
    trayModeEnabled: true,
    exportEnabled: true,
  }
}

function checkFeatureAccess(feature: keyof PlanLimits, plan: string): boolean {
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free
  const value = limits[feature]
  if (typeof value === 'boolean') return value
  if (value === -1) return true
  return false
}

function checkSessionLimit(sessionsUsed: number, plan: string): boolean {
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free
  if (limits.sessionsPerMonth === -1) return true
  return sessionsUsed < limits.sessionsPerMonth
}
Upgrade Prompt Component
React

// src/components/UpgradePrompt.tsx

interface UpgradePromptProps {
  feature: string
  description: string
}

export function UpgradePrompt({ feature, description }: UpgradePromptProps) {
  return (
    <div className="border border-amber-500/30 bg-amber-500/5 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <span className="text-amber-400 text-lg">⭐</span>
        <div>
          <p className="text-sm font-medium text-amber-400">{feature} — Premium Feature</p>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
          <button className="mt-3 text-sm bg-amber-500 text-black px-3 py-1.5 rounded-md font-medium hover:bg-amber-400">
            Upgrade to Premium
          </button>
        </div>
      </div>
    </div>
  )
}

