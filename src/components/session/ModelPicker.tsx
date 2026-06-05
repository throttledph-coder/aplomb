import { useEffect, useState } from 'react'
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

const TRIGGER_CLASS =
  'h-7 w-auto gap-1 border-0 bg-transparent px-2 text-xs text-muted-foreground shadow-none hover:bg-accent hover:text-foreground focus:ring-0 focus:ring-offset-0'

const LENGTHS: { value: string; label: string }[] = [
  { value: 'concise', label: 'Concise' },
  { value: 'detailed', label: 'Detailed' },
  { value: 'comprehensive', label: 'Comprehensive' },
]

// Claude-Code-style inline provider + model picker for the composer bottom bar.
// Writes the same setting keys Settings uses, so the two stay in sync.
export function ModelPicker() {
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
    <div className="flex items-center gap-1">
      <Select value={answerLength} onValueChange={(v) => void updateSetting('answer_length', v)}>
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

      <Select value={provider} onValueChange={(v) => void updateSetting('ai_provider', v)}>
        <SelectTrigger className={TRIGGER_CLASS} aria-label="AI provider">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="groq">Groq</SelectItem>
          <SelectItem value="ollama">Ollama</SelectItem>
        </SelectContent>
      </Select>

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
    </div>
  )
}
