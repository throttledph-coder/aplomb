import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { RefreshCw, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { ApiKeyField } from '@/components/settings/ApiKeyField'
import { useAppStore } from '@/store/app-store'
import { LANGUAGES } from '@/lib/i18n/languages'

const PROVIDERS = [
  { value: 'groq', label: 'Groq API', note: 'Recommended — free + fast', enabled: true },
  { value: 'ollama', label: 'Ollama', note: 'Local — private, needs GPU', enabled: true },
  { value: 'openai', label: 'OpenAI', note: 'Coming soon', enabled: false },
  { value: 'anthropic', label: 'Anthropic Claude', note: 'Coming soon', enabled: false },
]

const LENGTHS = [
  { value: 'concise', label: 'Concise (2-3 sentences)' },
  { value: 'detailed', label: 'Detailed (~1-2 min speech)' },
  { value: 'comprehensive', label: 'Comprehensive (everything)' },
]

export default function Settings() {
  const settings = useAppStore((s) => s.settings)
  const updateSetting = useAppStore((s) => s.updateSetting)
  const plan = useAppStore((s) => s.plan)

  const provider = settings.ai_provider ?? 'groq'
  const [keyDraft, setKeyDraft] = useState(settings.groq_api_key ?? '')
  const [ollamaModels, setOllamaModels] = useState<string[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const ollamaBaseUrl = settings.ollama_base_url ?? 'http://localhost:11434'
  const isPro = plan === 'premium'

  async function loadOllamaModels() {
    if (!window.ai) return
    setLoadingModels(true)
    try {
      const models = await window.ai.listOllamaModels(ollamaBaseUrl)
      setOllamaModels(models)
      if (models.length === 0) toast.error('No Ollama models found. Is Ollama running?')
    } finally {
      setLoadingModels(false)
    }
  }

  useEffect(() => {
    if (provider === 'ollama') void loadOllamaModels()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider])

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI Provider</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            With Groq, your resume + job description + additional info are sent to Groq's cloud to
            generate answers. Choose Ollama below for fully local, private processing (nothing leaves
            your device).
          </p>
          {PROVIDERS.map((p) => (
            <button
              key={p.value}
              type="button"
              disabled={!p.enabled}
              onClick={() => void updateSetting('ai_provider', p.value)}
              className={cn(
                'flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors',
                provider === p.value ? 'border-primary bg-accent' : 'hover:bg-accent/40',
                !p.enabled && 'cursor-not-allowed opacity-50',
              )}
            >
              <span className="font-medium">{p.label}</span>
              <span className="text-xs text-muted-foreground">{p.note}</span>
            </button>
          ))}

          <Separator className="my-3" />

          {provider === 'ollama' ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Ollama runs locally — fully free + private, no API key. Install models with
                <code className="mx-1">ollama pull llama3.1</code>.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="ollama_url">Ollama URL</Label>
                <Input
                  id="ollama_url"
                  value={ollamaBaseUrl}
                  onChange={(e) => void updateSetting('ollama_base_url', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Model</Label>
                <div className="flex gap-2">
                  <Select
                    value={settings.ollama_model ?? ''}
                    onValueChange={(v) => void updateSetting('ollama_model', v)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a local model" />
                    </SelectTrigger>
                    <SelectContent>
                      {ollamaModels.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => void loadOllamaModels()} disabled={loadingModels}>
                    {loadingModels ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const r = await window.ai.testConnection({ provider: 'ollama', baseUrl: ollamaBaseUrl })
                      r.ok ? toast.success('Ollama connected.') : toast.error(r.error ?? 'Failed.')
                    }}
                  >
                    Test
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>Groq API Key</Label>
                <ApiKeyField
                  value={keyDraft}
                  provider="groq"
                  onChange={setKeyDraft}
                  onSave={(v) => {
                    void updateSetting('groq_api_key', v)
                    toast.success('API key saved.')
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Get a free key at console.groq.com. Stored encrypted on this device.
                </p>
              </div>

              <div className="space-y-1.5 pt-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={settings.ai_model ?? ''}
                  onChange={(e) => void updateSetting('ai_model', e.target.value)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Answer Length</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {LENGTHS.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => void updateSetting('answer_length', l.value)}
              className={cn(
                'flex w-full items-center rounded-md border px-3 py-2 text-left text-sm transition-colors',
                (settings.answer_length ?? 'detailed') === l.value
                  ? 'border-primary bg-accent'
                  : 'hover:bg-accent/40',
              )}
            >
              {l.label}
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Language</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Language for transcription and generated answers. Auto-detect matches the interviewer's
            language; pick one to force it (e.g. for a non-English interview).
          </p>
          <Select
            value={settings.interview_language ?? 'auto'}
            onValueChange={(v) => void updateSetting('interview_language', v)}
          >
            <SelectTrigger className="w-full" aria-label="Interview language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <Label htmlFor="dark">Dark mode</Label>
          <Switch
            id="dark"
            checked={(settings.theme ?? 'dark') !== 'light'}
            onCheckedChange={(checked) => void updateSetting('theme', checked ? 'dark' : 'light')}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Live &amp; stealth</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              These apply during live sessions and the Focus overlay (Pro features).
            </p>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Overlay opacity</Label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {Math.round((Number(settings.overlay_opacity ?? '0.92') || 0.92) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={1}
              step={0.05}
              value={Number(settings.overlay_opacity ?? '0.92') || 0.92}
              onChange={(e) => void updateSetting('overlay_opacity', e.target.value)}
              className="w-full accent-primary"
              aria-label="Overlay opacity"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="aot">Overlay always on top</Label>
            <Switch
              id="aot"
              checked={(settings.overlay_always_on_top ?? 'true') !== 'false'}
              onCheckedChange={(v) => void updateSetting('overlay_always_on_top', v ? 'true' : 'false')}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="autoanswer">Auto-answer detected questions</Label>
            <Switch
              id="autoanswer"
              checked={settings.auto_answer === 'true'}
              onCheckedChange={(v) => void updateSetting('auto_answer', v ? 'true' : 'false')}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <Label>Answer text size</Label>
            <Select
              value={(settings.answer_text_size as string) || 'lg'}
              onValueChange={(v) => void updateSetting('answer_text_size', v)}
            >
              <SelectTrigger className="h-8 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="base">Base</SelectItem>
                <SelectItem value="lg">Large</SelectItem>
                <SelectItem value="xl">Extra large</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 border-t pt-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Keyboard shortcuts</p>
            <p>Ctrl+Shift+S — toggle stealth</p>
            <p>Ctrl+Shift+H — show/hide the Focus overlay</p>
            <p>Esc — leave the overlay</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <Label htmlFor="reminders">Interview reminders</Label>
            <p className="text-xs text-muted-foreground">
              Native reminders before scheduled interviews (silenced during stealth).
            </p>
          </div>
          <Switch
            id="reminders"
            checked={(settings.reminders_enabled ?? 'true') !== 'false'}
            onCheckedChange={(v) => void updateSetting('reminders_enabled', v ? 'true' : 'false')}
          />
        </CardContent>
      </Card>

      {/* Developer — dev server only; statically stripped from packaged builds so
          the public app can't flip itself to Premium and bypass the subscription. */}
      {import.meta.env.DEV && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Developer</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <Label htmlFor="premium">Enable Premium (testing)</Label>
              <p className="text-xs text-muted-foreground">
                Unlocks auto-listen, stealth, and tray for testing. Not real billing.
              </p>
            </div>
            <Switch
              id="premium"
              checked={(settings.plan ?? 'free') === 'premium'}
              onCheckedChange={(checked) => void updateSetting('plan', checked ? 'premium' : 'free')}
            />
          </CardContent>
        </Card>
      )}

      <p className="px-1 text-xs text-muted-foreground">
        Data export, import, and account controls have moved to{' '}
        <span className="font-medium text-foreground">Account → Privacy &amp; data</span>.
      </p>
    </div>
  )
}
