import { useState } from 'react'
import { useToast } from '../../components/Toast'
import { Field } from '../../components/ui'
import { OS_STORAGE_KEY, useOS } from '../../store/useOS'
import { STORAGE_KEY, useHorizon } from '../../store/useHorizon'

/**
 * Where the OS runs, and who owns the data. Everything is in this browser
 * until you point it at a runtime you run yourself. Export gives you the lot
 * as one JSON file.
 */
export default function SystemScreen() {
  const runtimeUrl = useOS((s) => s.runtimeUrl)
  const useRuntime = useOS((s) => s.useRuntime)
  const lastError = useOS((s) => s.lastError)
  const setRuntime = useOS((s) => s.setRuntime)
  const toast = useToast()
  const [url, setUrl] = useState(runtimeUrl)
  const [checking, setChecking] = useState(false)
  const [reach, setReach] = useState<string | null>(null)

  const check = async () => {
    setChecking(true)
    setReach(null)
    try {
      const r = await fetch(`${url.replace(/\/$/, '')}/healthz`)
      setReach(r.ok ? 'Reachable.' : `Replied ${r.status}.`)
    } catch (e) {
      setReach(`Not reachable: ${(e as Error).message}`)
    } finally {
      setChecking(false)
    }
  }

  const exportAll = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      notebook: JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null'),
      os: JSON.parse(localStorage.getItem(OS_STORAGE_KEY) ?? 'null'),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `horizon-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    toast({ text: 'Exported. That file is the whole of your Horizon.' })
  }

  const importAll = (file: File) => {
    file.text().then((txt) => {
      try {
        const data = JSON.parse(txt)
        if (data.notebook) localStorage.setItem(STORAGE_KEY, JSON.stringify(data.notebook))
        if (data.os) localStorage.setItem(OS_STORAGE_KEY, JSON.stringify(data.os))
        window.location.reload()
      } catch {
        toast({ text: 'That file did not look like a Horizon export.' })
      }
    })
  }

  const nb = useHorizon.getState()
  const os = useOS.getState()
  const attention = useOS((s) => s.attention)
  const setAttention = useOS((s) => s.setAttention)

  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <div className="page-head">
        <div className="page-head-text">
          <h1>System</h1>
          <p className="lede">
            Where Horizon runs and who owns it. Right now: this browser, and you. Point it at a runtime in your own
            data centre when there is one.
          </p>
        </div>
      </div>

      <section className="card stack stack-md" style={{ marginBottom: 24 }}>
        <h3>Runtime</h3>
        <p className="prose-sm" style={{ margin: 0 }}>
          The runtime holds the model and the tools so the browser never has to. <code className="mono">runtime/</code>{' '}
          in the repository is a reference one. Until it is reachable, chats use the local provider, which reads
          intent from what you type and answers from templates.
        </p>
        <Field label="Runtime URL">
          <input className="input mono" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://mac-mini.local:8787" />
        </Field>
        <div className="row row-wrap" style={{ gap: 8 }}>
          <button type="button" className="btn" onClick={check} disabled={checking}>
            {checking ? 'Checking…' : 'Check'}
          </button>
          <button type="button" className={`btn${useRuntime ? ' btn-primary' : ''}`} onClick={() => setRuntime(url, !useRuntime)}>
            {useRuntime ? 'Using runtime — switch to local' : 'Use runtime'}
          </button>
          {reach && <span className="meta">{reach}</span>}
        </div>
        {lastError && (
          <p className="meta" style={{ margin: 0, color: 'var(--contradict)' }}>
            Last error: {lastError}
          </p>
        )}
        <p className="meta" style={{ margin: 0 }}>
          Provider in use: <strong style={{ fontWeight: 500 }}>{useRuntime ? `runtime at ${runtimeUrl}` : 'local, offline'}</strong>.
        </p>
      </section>

      <section className="card stack stack-md" style={{ marginBottom: 24 }}>
        <h3>Attention</h3>
        <p className="prose-sm" style={{ margin: 0 }}>
          The rules that keep this from becoming a slot machine. No infinite feed, no unread badges, an end to the day.
          The aim is to open it once in the morning, work from it, and leave it.
        </p>
        <div className="grid-2">
          <Field label="Digest items a day">
            <input className="input num" type="number" min={1} max={20} value={attention.digestPerDay} onChange={(e) => setAttention({ digestPerDay: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })} />
          </Field>
          <Field label="The Desk closes at (empty for never)">
            <input className="input mono" type="time" value={attention.closeAt} onChange={(e) => setAttention({ closeAt: e.target.value })} />
          </Field>
        </div>
        <label className="row" style={{ gap: 8, fontSize: 14 }}>
          <input type="checkbox" checked={attention.noCounts} onChange={(e) => setAttention({ noCounts: e.target.checked })} />
          <span>No unread counts anywhere — only the inbox score, which goes down by doing.</span>
        </label>
      </section>

      <section className="card stack stack-md" style={{ marginBottom: 24 }}>
        <h3>Your data</h3>
        <div className="row row-wrap" style={{ gap: 28 }}>
          <span className="meta">
            <span className="num" style={{ color: 'var(--ink)' }}>{nb.goals.length}</span> goals
          </span>
          <span className="meta">
            <span className="num" style={{ color: 'var(--ink)' }}>{nb.nodes.length}</span> beliefs and companies
          </span>
          <span className="meta">
            <span className="num" style={{ color: 'var(--ink)' }}>{nb.evidence.length}</span> passages
          </span>
          <span className="meta">
            <span className="num" style={{ color: 'var(--ink)' }}>{os.threads.reduce((a, t) => a + t.messages.length, 0)}</span> chat messages
          </span>
          <span className="meta">
            <span className="num" style={{ color: 'var(--ink)' }}>{os.downloads.length}</span> downloads
          </span>
          <span className="meta">
            <span className="num" style={{ color: 'var(--ink)' }}>{nb.journal.length}</span> journal entries
          </span>
        </div>
        <p className="prose-sm" style={{ margin: 0 }}>
          All of it lives in this browser's storage under two keys. Nothing is sent anywhere unless you point a chat
          at a runtime, and then only that chat's messages and the context the agent needs go.
        </p>
        <div className="row row-wrap" style={{ gap: 8 }}>
          <button type="button" className="btn btn-primary" onClick={exportAll}>
            Export everything
          </button>
          <label className="btn" style={{ cursor: 'pointer' }}>
            Import a file
            <input type="file" accept="application/json" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && importAll(e.target.files[0])} />
          </label>
        </div>
      </section>

      <section className="card stack stack-sm">
        <h3>The hardware plan</h3>
        <p className="prose-sm" style={{ margin: 0 }}>
          This frontend is built to run on any screen. The intended home is a small machine in the office running the
          runtime, a heart-rate monitor over Bluetooth, and whatever you work at — desk, treadmill, notebook. The
          runtime is the only piece that needs to be always on.
        </p>
      </section>
    </div>
  )
}
