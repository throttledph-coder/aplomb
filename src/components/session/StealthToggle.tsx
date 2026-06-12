import { useEffect, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function StealthToggle() {
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (window.stealth) void window.stealth.status().then(setActive)
  }, [])

  // Cursor neutrality while stealthed: force the default arrow everywhere so
  // shape changes can't reveal interaction with the (capture-invisible) window.
  useEffect(() => {
    document.documentElement.classList.toggle('stealth-cursor', active)
    return () => document.documentElement.classList.remove('stealth-cursor')
  }, [active])

  async function toggle() {
    if (!window.stealth) return
    if (active) {
      await window.stealth.disable()
      setActive(false)
    } else {
      await window.stealth.enable()
      setActive(true)
    }
  }

  return (
    <Button
      size="icon"
      variant={active ? 'default' : 'outline'}
      className="h-8 w-8"
      onClick={() => void toggle()}
      title={active ? 'Stealth on — hidden from screen share' : 'Stealth off — visible to screen share'}
      aria-label={active ? 'Disable stealth mode' : 'Enable stealth mode'}
      aria-pressed={active}
    >
      {active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
    </Button>
  )
}
