import { useEffect, useState } from 'react'
import { SlidersHorizontal, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverClose,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppStore } from '@/store/app-store'

// Curated Groq chat models (current + stable). The active value is always
// included even if not in this list.
const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'gemma2-9b-it',
]

const LENGTHS: { value: string; label: string }[] = [
  { value: 'concise', label: 'Concise' },
  { value: 'detailed', label: 'Detailed' },
  { value: 'comprehensive', label: 'Comprehensive' },
]

const TRIGGER_CLASS = 'h-8 w-full text-xs'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
        {label}
      </p>
      {children}
    </div>
  )
}

// Single quiet ⚙ popover holding the live-tunable generation settings (answer
// length, provider, model) — keeps the composer bar clean of dropdown jargon.
// Writes the same setting keys Settings uses, so the two stay in sync.
export function ModelPicker({ onHelp }: { onHelp?: () => void }) {
  const settings = useAppStore((s) => s.settings)
  const updateSetting = useAppStore((s) => s.updateSetting)

  const provider = settings.ai_provider ?? 'groq'
  const ollamaBaseUrl = settings.ollama_base_url ?? 'http://localhost:11434'
  const [ollamaModels, setOllamaModels] = useState<string[]>([])

  useEffect(() => {
    if (provider !== 'ollama' || !window.ai) return
    void window.ai.listOllamaModels(ollamaBaseUrl).then(setOllamaModels)
  }, [provider, ollamaBaseUrl])

  const groqModel = settings.ai_model ?? GROQ_MODELS[0]
  const groqOptions = GROQ_MODELS.includes(groqModel) ? GROQ_MODELS : [groqModel, ...GROQ_MODELS]
  const ollamaModel = settings.ollama_model ?? ''
  const ollamaOptions =
    ollamaModel && !ollamaModels.includes(ollamaModel)
      ? [ollamaModel, ...ollamaModels]
      : ollamaModels

  const answerLength = settings.answer_length ?? 'detailed'

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Answer & model settings"
          aria-label="Answer and model settings"
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-3 p-3">
        <Field label="Answer length">
          <Select
            value={answerLength}
            onValueChange={(v) => void updateSetting('answer_length', v)}
          >
            <SelectTrigger className={TRIGGER_CLASS} aria-label="Answer length">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LENGTHS.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Provider">
          <Select value={provider} onValueChange={(v) => void updateSetting('ai_provider', v)}>
            <SelectTrigger className={TRIGGER_CLASS} aria-label="AI provider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="groq">Groq</SelectItem>
              <SelectItem value="ollama">Ollama</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label="Model">
          {provider === 'ollama' ? (
            <Select
              value={ollamaModel}
              onValueChange={(v) => void updateSetting('ollama_model', v)}
            >
              <SelectTrigger className={TRIGGER_CLASS} aria-label="AI model">
                <SelectValue placeholder="model" />
              </SelectTrigger>
              <SelectContent>
                {ollamaOptions.length === 0 ? (
                  <SelectItem value="__none" disabled>
                    No local models
                  </SelectItem>
                ) : (
                  ollamaOptions.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          ) : (
            <Select value={groqModel} onValueChange={(v) => void updateSetting('ai_model', v)}>
              <SelectTrigger className={TRIGGER_CLASS} aria-label="AI model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {groqOptions.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>

        {onHelp && (
          <PopoverClose asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground"
              onClick={onHelp}
            >
              <HelpCircle className="mr-1.5 h-3.5 w-3.5" /> How auto-listen works
            </Button>
          </PopoverClose>
        )}
      </PopoverContent>
    </Popover>
  )
}
