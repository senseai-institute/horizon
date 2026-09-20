import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import MapCanvas from '../graph/MapCanvas'
import { confidenceColor, KIND_LABEL } from '../lib/color'
import type { GraphNode } from '../lib/types'
import { useGraph } from '../store/derived'
import { useHorizon } from '../store/useHorizon'
import NodeDetail from '../components/NodeDetail'
import { IconClose, IconPin, IconSearchCompanies } from '../components/icons'
import { ConfidenceBar, Drawer, KindDot } from '../components/ui'

const EXPANDED_KEY = 'horizon.map.expanded.v1'

function loadExpanded(fallback: string[]): Set<string> {
  try {
    const raw = localStorage.getItem(EXPANDED_KEY)
    if (raw) return new Set(JSON.parse(raw) as string[])
  } catch {
    /* a private window, or blocked storage — fall back to the default view */
  }
  return new Set(fallback)
}

export default function ThesisMapScreen() {
  const nodes = useHorizon((s) => s.nodes)
  const edges = useHorizon((s) => s.edges)
  const unpinAll = useHorizon((s) => s.unpinAll)
  const layout = useHorizon((s) => s.layout)
  const { confidence } = useGraph()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const defaultExpanded = useMemo(
    () => nodes.filter((n) => n.kind === 'pillar' || n.kind === 'thesis').map((n) => n.id),
    [nodes],
  )
  const [expanded, setExpanded] = useState<Set<string>>(() => loadExpanded(defaultExpanded))
  useEffect(() => {
    try {
      localStorage.setItem(EXPANDED_KEY, JSON.stringify([...expanded]))
    } catch {
      /* storage unavailable; the map still works, it just will not remember */
    }
  }, [expanded])

  const selectedNodeId = params.get('node')
  const selectedEdgeId = params.get('edge')
  const setSelectedNode = (id: string | null) => {
    const next = new URLSearchParams(params)
    if (id) next.set('node', id)
    else next.delete('node')
    next.delete('edge')
    setParams(next, { replace: true })
  }
  const setSelectedEdge = (id: string | null) => {
    const next = new URLSearchParams(params)
    if (id) next.set('edge', id)
    else next.delete('edge')
    next.delete('node')
    setParams(next, { replace: true })
  }

  const [query, setQuery] = useState('')
  const [focusRequest, setFocusRequest] = useState<{ id: string; at: number } | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  /* Pulse whatever just moved, so propagation is visible on the map itself. */
  const prevConfidence = useRef<Record<string, number> | null>(null)
  const [pulse, setPulse] = useState<string[]>([])
  useEffect(() => {
    const prev = prevConfidence.current
    prevConfidence.current = confidence
    if (!prev) return
    const moved = Object.keys(confidence).filter((id) => Math.abs((confidence[id] ?? 0) - (prev[id] ?? 0)) > 0.2)
    if (!moved.length) return
    setPulse(moved)
    const t = setTimeout(() => setPulse([]), 3400)
    return () => clearTimeout(t)
  }, [confidence])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return nodes
      .filter(
        (n) =>
          !n.archived &&
          (n.label.toLowerCase().includes(q) ||
            n.ticker?.toLowerCase().includes(q) ||
            n.claim?.toLowerCase().includes(q) ||
            n.businessDescription?.toLowerCase().includes(q)),
      )
      .sort((a, b) => rank(a) - rank(b))
      .slice(0, 10)
  }, [nodes, query])

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const hasChildren = edges.some((e) => e.to === id)
      if (!hasChildren) return prev
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  /** Reveals a node by expanding every ancestor above it, then centres on it. */
  const revealNode = (id: string) => {
    const next = new Set(expanded)
    const parentsOf = (nid: string) => edges.filter((e) => e.from === nid).map((e) => e.to)
    let frontier = parentsOf(id)
    const seen = new Set<string>()
    while (frontier.length) {
      const nextFrontier: string[] = []
      for (const p of frontier) {
        if (seen.has(p)) continue
        seen.add(p)
        next.add(p)
        nextFrontier.push(...parentsOf(p))
      }
      frontier = nextFrontier
    }
    setExpanded(next)
    setSelectedNode(id)
    setQuery('')
    setTimeout(() => setFocusRequest({ id, at: Date.now() }), 260)
  }

  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : undefined
  const selectedEdge = selectedEdgeId ? edges.find((e) => e.id === selectedEdgeId) : undefined
  const pinnedCount = Object.values(layout).filter((p) => p.fx != null).length

  return (
    <div className="fill">
      <div className="banner">
        <span>
          Your worldview as a map: {nodes.filter((n) => n.kind === 'pillar' && !n.archived).length} pillars,{' '}
          {nodes.filter((n) => n.kind === 'thesis' && !n.archived).length} theses,{' '}
          {nodes.filter((n) => n.kind === 'company' && !n.archived).length} companies. Confidence is computed from
          evidence. Click a node to open it and reveal what hangs underneath.
        </span>
      </div>

      <div className="map-wrap">
        <MapCanvas
          nodes={nodes}
          edges={edges}
          confidence={confidence}
          expanded={expanded}
          onToggleExpand={toggleExpand}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNode}
          selectedEdgeId={selectedEdgeId}
          onSelectEdge={setSelectedEdge}
          focusRequest={focusRequest}
          pulseNodeIds={pulse}
        />

        <div className="map-toolbar">
          <div className="map-panel" style={{ position: 'relative', width: 'min(340px, 46vw)', padding: 0 }}>
            <div className="row" style={{ gap: 8, padding: '6px 10px' }}>
              <span style={{ color: 'var(--ink-4)', display: 'grid' }}>
                <IconSearchCompanies />
              </span>
              <input
                ref={searchRef}
                className="input"
                style={{ border: 0, background: 'transparent', padding: '2px 0', fontSize: 14 }}
                placeholder="Jump to any node —  press /"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && results[0]) revealNode(results[0].id)
                  if (e.key === 'Escape') setQuery('')
                }}
              />
              {query && (
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setQuery('')} aria-label="Clear">
                  <IconClose />
                </button>
              )}
            </div>
            {results.length > 0 && (
              <div className="search-results">
                {results.map((n, i) => (
                  <button key={n.id} type="button" className={`search-result${i === 0 ? ' is-active' : ''}`} onClick={() => revealNode(n.id)}>
                    <KindDot kind={n.kind} />
                    <span className="truncate" style={{ flex: 1 }}>
                      {n.label}
                      {n.ticker && <span className="num meta"> · {n.ticker}</span>}
                    </span>
                    <span className="num meta" style={{ color: confidenceColor(confidence[n.id] ?? 50) }}>
                      {(confidence[n.id] ?? 50).toFixed(0)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="map-panel row" style={{ gap: 6 }}>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setExpanded(new Set(nodes.filter((n) => edges.some((e) => e.to === n.id)).map((n) => n.id)))}
            >
              Expand everything
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setExpanded(new Set(nodes.filter((n) => n.kind === 'pillar').map((n) => n.id)))}
            >
              Back to pillars
            </button>
            {pinnedCount > 0 && (
              <button type="button" className="btn btn-sm btn-ghost" onClick={unpinAll} title="Let the layout settle on its own again">
                <IconPin /> Release {pinnedCount}
              </button>
            )}
          </div>
        </div>

        <div className="map-legend map-panel stack stack-xs" style={{ padding: '10px 12px', width: 196 }}>
          <span className="label">Confidence</span>
          <div
            style={{
              height: 4,
              borderRadius: 2,
              background: `linear-gradient(90deg, ${confidenceColor(5)}, ${confidenceColor(40)}, ${confidenceColor(
                60,
              )}, ${confidenceColor(95)})`,
            }}
          />
          <div className="row row-between">
            <span className="meta num">0</span>
            <span className="meta">computed, never typed</span>
            <span className="meta num">100</span>
          </div>
          <div className="row row-wrap" style={{ gap: 10, paddingTop: 6 }}>
            {(['pillar', 'thesis', 'category', 'company'] as GraphNode['kind'][]).map((k) => (
              <span key={k} className="row meta" style={{ gap: 5 }}>
                <KindDot kind={k} />
                {KIND_LABEL[k]}
              </span>
            ))}
          </div>
        </div>
      </div>

      {selectedEdge && (
        <Drawer onClose={() => setSelectedEdge(null)}>
          <div className="drawer-head">
            <div className="stack stack-xs" style={{ flex: 1 }}>
              <span className="label">Why these are linked</span>
              <h3>
                {nodes.find((n) => n.id === selectedEdge.from)?.label}
                <span className="muted"> → </span>
                {nodes.find((n) => n.id === selectedEdge.to)?.label}
              </h3>
            </div>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSelectedEdge(null)} aria-label="Close">
              <IconClose />
            </button>
          </div>
          <div className="drawer-body stack stack-md">
            <p className="prose">{selectedEdge.rationale}</p>
            <div className="card-quiet stack stack-sm">
              <div className="row row-between">
                <span className="label">Weight on the parent</span>
                <span className="num">{selectedEdge.weight.toFixed(2)}</span>
              </div>
              <ConfidenceBar value={selectedEdge.weight * 100} width="100%" />
              <p className="meta" style={{ margin: 0 }}>
                How much of the parent's inherited confidence this child accounts for, relative to its
                siblings. Change it on either node's page.
              </p>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button type="button" className="btn" onClick={() => revealNode(selectedEdge.from)}>
                Open {nodes.find((n) => n.id === selectedEdge.from)?.label}
              </button>
              <button type="button" className="btn" onClick={() => revealNode(selectedEdge.to)}>
                Open {nodes.find((n) => n.id === selectedEdge.to)?.label}
              </button>
            </div>
          </div>
        </Drawer>
      )}

      {selectedNode && (
        <Drawer onClose={() => setSelectedNode(null)} labelledBy="drawer-title">
          <div className="drawer-head">
            <div className="stack stack-xs" style={{ flex: 1, minWidth: 0 }}>
              <span className="label" id="drawer-title">
                {KIND_LABEL[selectedNode.kind]}
              </span>
              <Link
                to={`/beliefs/${selectedNode.id}`}
                className="truncate"
                style={{ fontFamily: 'var(--serif)', fontSize: 19, color: 'var(--ink)', textDecoration: 'none' }}
              >
                {selectedNode.label}
              </Link>
            </div>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => navigate(`/beliefs/${selectedNode.id}`)}
              title="Open the full page"
            >
              Full page
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSelectedNode(null)} aria-label="Close">
              <IconClose />
            </button>
          </div>
          <div className="drawer-body">
            <NodeDetail node={selectedNode} compact />
          </div>
        </Drawer>
      )}
    </div>
  )
}

function rank(n: GraphNode) {
  return n.kind === 'pillar' ? 0 : n.kind === 'thesis' ? 1 : n.kind === 'category' ? 2 : 3
}
