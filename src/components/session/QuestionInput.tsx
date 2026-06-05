import { useState } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface QuestionInputProps {
  disabled?: boolean
  onAsk: (question: string) => void
}

export function QuestionInput({ disabled, onAsk }: QuestionInputProps) {
  const [value, setValue] = useState('')

  function submit() {
    const text = value.trim()
    if (!text || disabled) return
    onAsk(text)
    setValue('')
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        rows={3}
        placeholder="Type the interviewer's question…"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
      />
      <div className="flex justify-end">
        <Button onClick={submit} disabled={disabled || !value.trim()}>
          <Send className="mr-2 h-4 w-4" />
          Ask
        </Button>
      </div>
    </div>
  )
}
