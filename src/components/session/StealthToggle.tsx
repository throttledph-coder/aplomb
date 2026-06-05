import { useEffect, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function StealthToggle() {
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (window.stealth) void window.stealth.status().then(setActive)
  }, [])

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
    <Button size="sm" variant={active ? 'default' : 'outline'} onClick={() => void toggle()}>
      {active ? <EyeOff className="mr-1.5 h-3.5 w-3.5" /> : <Eye className="mr-1.5 h-3.5 w-3.5" />}
      Stealth {active ? 'ON' : 'OFF'}
    </Button>
  )
}
