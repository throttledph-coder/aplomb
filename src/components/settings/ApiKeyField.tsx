import { useState } from 'react'
import { Eye, EyeOff, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ApiKeyFieldProps {
  value: string
  provider?: string
  onChange: (value: string) => void
  onSave?: (value: string) => void
}

export function ApiKeyField({ value, provider = 'groq', onChange, onSave }: ApiKeyFieldProps) {
  const [show, setShow] = useState(false)
  const [testing, setTesting] = useState(false)
  const [ok, setOk] = useState(false)

  async function test() {
    if (!value.trim()) {
      toast.error('Enter a key first.')
      return
    }
    if (!window.ai) {
      toast.error('Testing only works in the desktop app.')
      return
    }
    setTesting(true)
    setOk(false)
    try {
      const result = await window.ai.testConnection({ provider, apiKey: value.trim() })
      if (result.ok) {
        setOk(true)
        toast.success('Connection successful.')
      } else {
        toast.error(result.error ?? 'Connection failed.')
      }
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Input
          type={show ? 'text' : 'password'}
          placeholder="gsk_…"
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setOk(false)
          }}
          className="pr-9"
        />
        <button
          type="button"
          aria-label={show ? 'Hide API key' : 'Show API key'}
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <Button variant="outline" onClick={() => void test()} disabled={testing}>
        {testing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : ok ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          'Test'
        )}
      </Button>
      {onSave && (
        <Button onClick={() => onSave(value.trim())}>Save</Button>
      )}
    </div>
  )
}
