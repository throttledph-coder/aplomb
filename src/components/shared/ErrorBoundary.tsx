import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Render error:', error, info.componentStack)
    window.app?.logError('react', `${error.stack ?? error.message}\n${info.componentStack ?? ''}`)
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <Card className="border-destructive/40">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-base font-medium">Something went wrong.</p>
            <p className="max-w-md text-sm text-muted-foreground">{this.state.error.message}</p>
            <Button onClick={() => location.reload()}>Reload</Button>
          </CardContent>
        </Card>
      )
    }
    return this.props.children
  }
}
