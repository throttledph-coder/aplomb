import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { ApiKeyField } from '@/components/settings/ApiKeyField'
import { useAppStore } from '@/store/app-store'

export default function Onboarding() {
  const navigate = useNavigate()
  const updateSetting = useAppStore((s) => s.updateSetting)
  const [step, setStep] = useState(1)
  const [keyDraft, setKeyDraft] = useState('')

  async function finish(saveKey: boolean) {
    if (saveKey && keyDraft.trim()) await updateSetting('groq_api_key', keyDraft.trim())
    await updateSetting('onboarding_complete', 'true')
    navigate('/')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-6 py-8">
          {step === 1 ? (
            <>
              <div className="flex flex-col items-center gap-3 text-center">
                <span className="text-3xl text-primary">◆</span>
                <h1 className="text-2xl font-semibold tracking-tight">Welcome to Aplomb</h1>
                <p className="text-sm text-muted-foreground">
                  Your private interview assistant. Upload a resume, paste a job description, and get
                  personalized practice answers.
                </p>
              </div>
              <Button className="w-full" onClick={() => setStep(2)}>
                Get started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center gap-2 text-center">
                <Sparkles className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-semibold tracking-tight">Connect your AI</h2>
                <p className="text-sm text-muted-foreground">
                  Paste a free Groq API key from console.groq.com. You can also do this later in
                  Settings.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Groq API Key</Label>
                <ApiKeyField value={keyDraft} provider="groq" onChange={setKeyDraft} />
                <p className="text-xs text-muted-foreground">
                  Your resume, job description, and questions are sent to your chosen provider (Groq
                  cloud) to generate answers. Prefer fully local + private? Pick Ollama in Settings.
                  Your API key is stored encrypted on this device.
                </p>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => void finish(true)}>
                  Finish
                </Button>
                <Button variant="ghost" onClick={() => void finish(false)}>
                  Skip for now
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
