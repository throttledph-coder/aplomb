import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Download, Trash2, RefreshCw, Loader2, Upload } from 'lucide-react'
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
import { parseExport } from '@/lib/backup'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { ApiKeyField } from '@/components/settings/ApiKeyField'
import { useAppStore } from '@/store/app-store'

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
  const loadSettings = useAppStore((s) => s.loadSettings)
  const plan = useAppStore((s) => s.plan)
  const subscriptionActive = useAppStore((s) => s.subscriptionActive)
  const navigate = useNavigate()

  const provider = settings.ai_provider ?? 'groq'
  const [keyDraft, setKeyDraft] = useState(settings.groq_api_key ?? '')
  const [clearing, setClearing] = useState(false)
  const [showClear, setShowClear] = useState(false)
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

  async function exportData() {
    if (!window.db) return
    const resumes = await window.db.resume.list()
    const sessions = await window.db.session.list()
    const qaBySession: Record<number, unknown> = {}
    for (const s of sessions) qaBySession[s.id] = await window.db.qa.list(s.id)
    const payload = {
      exported_at: new Date().toISOString(),
      settings: await window.db.settings.getAll(),
      resumes,
      sessions,
      qa: qaBySession,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `aplomb-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Data exported.')
  }

  async function importData(file: File) {
    if (!window.db) return
    let parsed
    try {
      parsed = parseExport(await file.text())
    } catch (err) {
      toast.error(`Import failed: ${(err as Error).message}`)
      return
    }
    // Recreate with fresh ids, remapping foreign keys.
    const resumeIdMap = new Map<number, number>()
    for (const r of parsed.resumes) {
      const created = await window.db.resume.create({
        name: r.name,
        file_name: r.file_name,
        raw_text: r.raw_text,
        parsed_data: r.parsed_data,
        is_default: r.is_default,
      })
      resumeIdMap.set(r.id, created.id)
    }
    let sessionCount = 0
    for (const s of parsed.sessions) {
      const newResumeId = resumeIdMap.get(s.resume_id)
      if (newResumeId === undefined) continue
      const created = await window.db.session.create({
        resume_id: newResumeId,
        session_name: s.session_name,
        company: s.company,
        job_title: s.job_title,
        interview_type: s.interview_type,
        job_description: s.job_description,
        parsed_jd: s.parsed_jd,
        additional_info: s.additional_info,
      })
      sessionCount++
      for (const qa of parsed.qa[String(s.id)] ?? []) {
        await window.db.qa.create({
          session_id: created.id,
          question: qa.question,
          answer: qa.answer,
          question_source: qa.question_source,
          sequence_order: qa.sequence_order,
        })
      }
    }
    toast.success(`Imported ${resumeIdMap.size} resumes, ${sessionCount} sessions.`)
  }

  async function clearData() {
    if (!window.db) return
    setClearing(true)
    try {
      for (const s of await window.db.session.list()) await window.db.session.delete(s.id)
      for (const r of await window.db.resume.list()) await window.db.resume.delete(r.id)
      await loadSettings()
      toast.success('All resumes and sessions cleared.')
    } finally {
      setClearing(false)
      setShowClear(false)
    }
  }

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
          <CardTitle className="text-base">Aplomb Pro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Prep features are free forever. Pro unlocks live <strong>auto-listen</strong> +{' '}
            <strong>stealth mode</strong> during the interview.
          </p>
          {isPro ? (
            <div className="flex items-center justify-between rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
              <span className="flex items-center gap-2">
                <Badge>Pro</Badge>
                {subscriptionActive ? 'Subscription active' : 'Pro unlocked'}
              </span>
              <Button variant="outline" size="sm" onClick={() => navigate('/account')}>
                Manage in Account
              </Button>
            </div>
          ) : (
            <Button onClick={() => navigate('/account')}>Upgrade to Pro</Button>
          )}
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button variant="outline" onClick={() => void exportData()}>
            <Download className="mr-2 h-4 w-4" />
            Export all data
          </Button>
          <label>
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void importData(f)
                e.target.value = ''
              }}
            />
            <Button variant="outline" asChild>
              <span>
                <Upload className="mr-2 h-4 w-4" />
                Import data
              </span>
            </Button>
          </label>
          <Button variant="ghost" onClick={() => setShowClear(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Clear all data
          </Button>
          <Button variant="ghost" onClick={() => void window.app?.openLogs()}>
            Open logs folder
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showClear} onOpenChange={setShowClear}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear all data?</DialogTitle>
            <DialogDescription>
              Permanently deletes all resumes and sessions (with their Q&amp;A and reports). Your
              settings and API key are kept. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowClear(false)} disabled={clearing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void clearData()} disabled={clearing}>
              {clearing ? 'Clearing…' : 'Clear everything'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
