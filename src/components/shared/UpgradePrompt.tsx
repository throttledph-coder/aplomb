import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface UpgradePromptProps {
  feature: string
  description: string
}

export function UpgradePrompt({ feature, description }: UpgradePromptProps) {
  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardContent className="flex items-start gap-3 py-4">
        <span className="text-lg text-amber-400">⭐</span>
        <div>
          <p className="text-sm font-medium text-amber-400">{feature} — Premium Feature</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          <Button size="sm" className="mt-3 bg-amber-500 text-black hover:bg-amber-400">
            Upgrade to Premium
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
