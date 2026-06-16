import { useNavigate } from 'react-router-dom'
import {
  RefreshCw,
  Download,
  RotateCw,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Bug,
  Mail,
  FileText,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useUpdater } from '@/hooks/useUpdater'
import { CHANGELOG } from '@/lib/changelog'

const SUPPORT_EMAIL = 'hello@aplomb.app'
const WEBSITE = 'https://aplomb.throttledph.workers.dev/'

export default function HelpAbout() {
  const navigate = useNavigate()
  const updater = useUpdater()

  function reportBug() {
    const body = encodeURIComponent(
      `\n\n---\nAplomb ${__APP_VERSION__}\nPlatform: ${navigator.userAgent}`,
    )
    const subject = encodeURIComponent(`Aplomb bug report (v${__APP_VERSION__})`)
    void window.app?.openExternal(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`)
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Help &amp; About</h1>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About Aplomb</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Version</span>
            <span className="font-medium">Aplomb {__APP_VERSION__}</span>
          </div>
          <p className="text-muted-foreground">
            Aplomb helps you prepare for interviews and track your job search — tailored practice
            answers from your resume and the job description, coaching feedback, an application
            tracker with a calendar, and a private live assistant.
          </p>
          <p className="text-xs text-muted-foreground">
            Your resume, job descriptions, and answers stay on this device or go only to your own AI
            provider. We store just your account email, profile, and subscription status.
          </p>
        </CardContent>
      </Card>

      {/* Updates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Updates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {import.meta.env.DEV ? (
            <p className="text-xs text-muted-foreground">
              Auto-update runs in the installed app, not in development.
            </p>
          ) : (
            <>
              {updater.status === 'downloading' && (
                <div className="space-y-1.5">
                  <Progress value={updater.percent} />
                  <p className="text-xs text-muted-foreground">
                    Downloading update… {updater.percent}%
                  </p>
                </div>
              )}
              {updater.status === 'available' && (
                <p className="text-xs text-muted-foreground">Version {updater.version} is available.</p>
              )}
              {updater.status === 'not-available' && (
                <p className="text-xs text-muted-foreground">You're on the latest version.</p>
              )}
              {updater.status === 'error' && <p className="text-xs text-destructive">{updater.error}</p>}

              <div className="flex flex-wrap gap-2">
                {updater.status === 'downloaded' ? (
                  <Button size="sm" onClick={() => void updater.install()}>
                    <RotateCw className="mr-2 h-4 w-4" /> Restart &amp; install
                  </Button>
                ) : updater.status === 'available' ? (
                  <Button size="sm" onClick={() => void updater.download()}>
                    <Download className="mr-2 h-4 w-4" /> Download update
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={updater.status === 'checking' || updater.status === 'downloading'}
                    onClick={() => void updater.check()}
                  >
                    {updater.status === 'checking' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : updater.status === 'not-available' ? (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Check for updates
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* What's new */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">What's new</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {CHANGELOG.slice(0, 8).map((entry) => (
            <div key={entry.version} className="space-y-1.5">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold">v{entry.version}</span>
                <span className="text-xs text-muted-foreground">{entry.date}</span>
              </div>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {entry.items.map((it, i) => (
                  <li key={i}>{it}</li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Help */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Help</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void window.app?.openExternal(WEBSITE)}>
            <ExternalLink className="mr-2 h-4 w-4" /> Docs &amp; FAQ
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void window.app?.openExternal(`mailto:${SUPPORT_EMAIL}`)}
          >
            <Mail className="mr-2 h-4 w-4" /> Contact support
          </Button>
          <Button variant="outline" size="sm" onClick={reportBug}>
            <Bug className="mr-2 h-4 w-4" /> Report a bug
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void window.app?.openLogs()}>
            <FileText className="mr-2 h-4 w-4" /> Open logs folder
          </Button>
        </CardContent>
      </Card>

      {/* Legal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Legal</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/legal/terms')}>
            Terms
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/legal/privacy')}>
            Privacy
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/legal/refund')}>
            Refund
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
