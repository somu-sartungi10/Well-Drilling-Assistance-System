import { Component, type ReactNode } from "react"
import { AlertTriangle, RotateCcw } from "lucide-react"
import { cn } from "cn"

interface State {
  error: Error | null
}

/** Keeps one broken panel from blacking out the entire prototype. */
export class ErrorBoundary extends Component<{ children: ReactNode; className?: string }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: unknown) {
    // surfaced in the UI; also visible in devtools
    console.error("STRAT panel crashed:", error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className={cn("grid h-full place-items-center p-8", this.props.className)}>
          <div className="max-w-md rounded-xl border border-destructive/40 bg-card p-6 text-center">
            <AlertTriangle className="mx-auto size-8 text-destructive" />
            <div className="mt-3 text-sm font-semibold">This panel hit a snag</div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              The rest of STRAt is still running. Reload the panel to try again.
            </p>
            <pre className="mt-3 max-h-24 overflow-auto rounded bg-secondary/60 p-2 text-left text-[10px] text-muted-foreground">
              {this.state.error.message}
            </pre>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cyan-500/15 px-4 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/25"
            >
              <RotateCcw className="size-3.5" /> Reload panel
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
