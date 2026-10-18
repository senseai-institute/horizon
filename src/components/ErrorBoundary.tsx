import { Component, type ReactNode } from 'react'
import { OS_STORAGE_KEY } from '../store/useOS'
import { STORAGE_KEY } from '../store/useHorizon'

interface State { error: Error | null }

/**
 * The last line. If anything throws during render — most likely saved state
 * from an older build — this shows what happened and offers a way out, rather
 * than a blank page.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }
  static getDerivedStateFromError(error: Error): State {
    return { error }
  }
  render() {
    if (!this.state.error) return this.props.children
    const startOver = () => {
      try {
        localStorage.removeItem(OS_STORAGE_KEY)
        localStorage.removeItem(STORAGE_KEY)
      } catch { /* storage may be unavailable */ }
      location.hash = '#/onboarding'
      location.reload()
    }
    return (
      <div className="page" style={{ maxWidth: 560, margin: '80px auto', padding: '0 20px' }}>
        <div className="stack stack-md">
          <span className="label">Horizon stopped</span>
          <h1 style={{ fontSize: 28 }}>Something in the saved data did not fit this build.</h1>
          <p className="prose" style={{ margin: 0 }}>Reloading usually fixes it. If it does not, start over: the sample comes back and your saved data is cleared from this browser. Export first from System if you want to keep it and it still opens.</p>
          <pre className="mono meta" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{this.state.error.message}</pre>
          <div className="row row-wrap" style={{ gap: 8 }}>
            <button type="button" className="btn btn-primary" onClick={() => location.reload()}>Reload</button>
            <button type="button" className="btn" onClick={startOver}>Start over</button>
          </div>
        </div>
      </div>
    )
  }
}
