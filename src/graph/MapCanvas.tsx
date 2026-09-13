import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { confidenceColor, KIND_LABEL } from '../lib/color'
import type { GraphEdge, GraphNode } from '../lib/types'
import { useHorizon } from '../store/useHorizon'
import {
  createSimulation,
  hiddenChildCount,
  labelSpacing,
  NODE_RADIUS,
  visibleNodeIds,
  type MapSimulation,
  type SimLink,
  type SimNode,
} from './layout'

export interface MapCanvasHandle {
  focusNode: (id: string) => void
}

interface Props {
  nodes: GraphNode[]
  edges: GraphEdge[]
  confidence: Record<string, number>
  expanded: Set<string>
  onToggleExpand: (id: string) => void
  selectedNodeId: string | null
  onSelectNode: (id: string | null) => void
  selectedEdgeId: string | null
  onSelectEdge: (id: string | null) => void
  focusRequest: { id: string; at: number } | null
  /** Nodes to glow briefly — used to show propagation after an evidence change. */
  pulseNodeIds: string[]
}

interface Transform {
  k: number
  x: number
  y: number
}

const MIN_K = 0.22
const MAX_K = 2.6

export default function MapCanvas({
  nodes,
  edges,
  confidence,
  expanded,
  onToggleExpand,
  selectedNodeId,
  onSelectNode,
  selectedEdgeId,
  onSelectEdge,
  focusRequest,
  pulseNodeIds,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ w: 1000, h: 700 })
  const [transform, setTransform] = useState<Transform>({ k: 0.78, x: 500, y: 400 })
  const [, setFrame] = useState(0)
  const [panning, setPanning] = useState(false)

  const storedLayout = useHorizon((s) => s.layout)
  const setNodePosition = useHorizon((s) => s.setNodePosition)

  const visible = useMemo(() => visibleNodeIds(nodes, edges, expanded), [nodes, edges, expanded])
  const visibleNodes = useMemo(() => nodes.filter((n) => visible.has(n.id)), [nodes, visible])
  const visibleEdges = useMemo(
    () => edges.filter((e) => visible.has(e.from) && visible.has(e.to)),
    [edges, visible],
  )
  const signature = useMemo(
    () => `${visibleNodes.map((n) => n.id).join(',')}|${visibleEdges.map((e) => e.id).join(',')}`,
    [visibleNodes, visibleEdges],
  )

  const simRef = useRef<MapSimulation | null>(null)
  /** Auto-fitting stops the moment the reader touches the canvas. */
  const userMovedView = useRef(false)
  const autoFitUntil = useRef(0)
  const nodeMapRef = useRef<Map<string, SimNode>>(new Map())
  const linksRef = useRef<SimLink[]>([])
  const didInitialFit = useRef(false)

  /* ---------- container size ---------- */
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      setSize({ w: Math.max(320, r.width), h: Math.max(320, r.height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /**
   * Each pillar gets its own column, and everything beneath it is pulled gently
   * toward that column. Nodes that hang off two pillars land between them,
   * which is the honest picture.
   */
  const branchX = useMemo(() => {
    const pillars = nodes.filter((n) => n.kind === 'pillar' && !n.archived)
    const slot = new Map<string, number>()
    const gap = 420
    pillars.forEach((p, i) => slot.set(p.id, (i - (pillars.length - 1) / 2) * gap))
    const parentsOf = new Map<string, string[]>()
    for (const e of edges) {
      if (!parentsOf.has(e.from)) parentsOf.set(e.from, [])
      parentsOf.get(e.from)!.push(e.to)
    }
    const resolved = new Map<string, number | undefined>(slot)
    const resolve = (id: string, depth = 0): number | undefined => {
      if (resolved.has(id)) return resolved.get(id)
      if (depth > 8) return undefined
      const parents = parentsOf.get(id) ?? []
      const values = parents.map((p) => resolve(p, depth + 1)).filter((v): v is number => v !== undefined)
      const value = values.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined
      resolved.set(id, value)
      return value
    }
    for (const n of nodes) resolve(n.id)
    return (id: string) => resolved.get(id)
  }, [nodes, edges])

  /* ---------- simulation ---------- */
  useEffect(() => {
    const kindOf = (id: string) => nodes.find((n) => n.id === id)?.kind ?? 'company'
    const simNodes: SimNode[] = visibleNodes.map((n) => {
      const prev = nodeMapRef.current.get(n.id)
      const saved = storedLayout[n.id]
      const base =
        prev ??
        (saved
          ? { x: saved.x, y: saved.y, fx: saved.fx ?? undefined, fy: saved.fy ?? undefined }
          : {
              x: (Math.random() - 0.5) * 360,
              y: (n.kind === 'pillar' ? -300 : n.kind === 'thesis' ? -90 : n.kind === 'category' ? 110 : 300) +
                (Math.random() - 0.5) * 60,
            })
      return {
        id: n.id,
        kind: n.kind,
        radius: NODE_RADIUS[n.kind],
        spacing: labelSpacing(n.kind, n.kind === 'company' ? n.ticker ?? n.label : n.label),
        x: base.x,
        y: base.y,
        vx: prev?.vx ?? 0,
        vy: prev?.vy ?? 0,
        fx: prev?.fx ?? base.fx,
        fy: prev?.fy ?? base.fy,
      }
    })
    const map = new Map(simNodes.map((n) => [n.id, n]))
    nodeMapRef.current = map
    const links: SimLink[] = visibleEdges.map((e) => ({
      id: e.id,
      source: e.from,
      target: e.to,
      weight: e.weight,
    }))
    linksRef.current = links

    simRef.current?.stop()
    const sim = createSimulation(simNodes, links, kindOf, branchX)
    sim.on('tick', () => setFrame((f) => f + 1))
    sim.on('end', () => {
      for (const n of simNodes) {
        setNodePosition(n.id, { x: n.x ?? 0, y: n.y ?? 0, fx: n.fx ?? null, fy: n.fy ?? null })
      }
      // Frame the settled layout, unless the reader has moved the view themselves.
      if (!userMovedView.current) {
        fitRef.current()
        didInitialFit.current = true
      }
    })
    sim.alpha(0.9).restart()
    simRef.current = sim
    if (!userMovedView.current) autoFitUntil.current = Date.now() + 3200
    return () => {
      sim.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  /* ---------- fit on first paint ---------- */
  const fitToView = useCallback(
    (padding = 130) => {
      const ns = [...nodeMapRef.current.values()]
      if (!ns.length) return
      const xs = ns.map((n) => n.x ?? 0)
      const ys = ns.map((n) => n.y ?? 0)
      const minX = Math.min(...xs) - padding
      const maxX = Math.max(...xs) + padding
      const minY = Math.min(...ys) - padding
      const maxY = Math.max(...ys) + padding
      // Leave room at the top for the floating toolbar.
      const inset = size.w < 720 ? 96 : 64
      const availH = Math.max(160, size.h - inset)
      const k = Math.max(MIN_K, Math.min(1.1, Math.min(size.w / (maxX - minX), availH / (maxY - minY))))
      setTransform({
        k,
        x: size.w / 2 - ((minX + maxX) / 2) * k,
        y: inset + availH / 2 - ((minY + maxY) / 2) * k,
      })
    },
    [size.w, size.h],
  )

  /** Kept in a ref so the simulation's end handler always calls the current one. */
  const fitRef = useRef(fitToView)
  useEffect(() => {
    fitRef.current = fitToView
  }, [fitToView])

  /* Keep the whole map in view while it settles, then leave it alone. */
  useEffect(() => {
    const t = setInterval(() => {
      if (userMovedView.current || Date.now() > autoFitUntil.current) return
      fitRef.current()
      didInitialFit.current = true
    }, 220)
    return () => clearInterval(t)
  }, [])

  /* ---------- focus a node (from search) ---------- */
  useEffect(() => {
    if (!focusRequest) return
    const n = nodeMapRef.current.get(focusRequest.id)
    if (!n) return
    const k = Math.max(0.85, transform.k)
    setTransform({ k, x: size.w / 2 - (n.x ?? 0) * k, y: size.h / 2 - (n.y ?? 0) * k })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest])

  /* ---------- zoom ---------- */
  const zoomAt = useCallback((factor: number, cx: number, cy: number) => {
    setTransform((t) => {
      const k = Math.max(MIN_K, Math.min(MAX_K, t.k * factor))
      const ratio = k / t.k
      return { k, x: cx - (cx - t.x) * ratio, y: cy - (cy - t.y) * ratio }
    })
  }, [])

  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      userMovedView.current = true
      const r = el.getBoundingClientRect()
      zoomAt(Math.exp(-e.deltaY * 0.0016), e.clientX - r.left, e.clientY - r.top)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  /* ---------- pan and node dragging ---------- */
  const gesture = useRef<
    | { type: 'pan'; startX: number; startY: number; origin: Transform }
    | { type: 'node'; id: string; moved: number; pointerId: number }
    | null
  >(null)

  const toWorld = useCallback(
    (clientX: number, clientY: number) => {
      const r = svgRef.current!.getBoundingClientRect()
      return {
        x: (clientX - r.left - transform.x) / transform.k,
        y: (clientY - r.top - transform.y) / transform.k,
      }
    },
    [transform],
  )

  const onBackgroundPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    userMovedView.current = true
    gesture.current = { type: 'pan', startX: e.clientX, startY: e.clientY, origin: transform }
    setPanning(true)
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }

  const onNodePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation()
    if (e.button !== 0) return
    gesture.current = { type: 'node', id, moved: 0, pointerId: e.pointerId }
    const n = nodeMapRef.current.get(id)
    if (n) {
      const w = toWorld(e.clientX, e.clientY)
      n.fx = w.x
      n.fy = w.y
    }
    simRef.current?.alphaTarget(0.22).restart()
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current
    if (!g) return
    if (g.type === 'pan') {
      setTransform({ k: g.origin.k, x: g.origin.x + (e.clientX - g.startX), y: g.origin.y + (e.clientY - g.startY) })
      return
    }
    const n = nodeMapRef.current.get(g.id)
    if (!n) return
    const w = toWorld(e.clientX, e.clientY)
    g.moved += Math.abs(w.x - (n.fx ?? w.x)) + Math.abs(w.y - (n.fy ?? w.y))
    n.fx = w.x
    n.fy = w.y
    simRef.current?.alphaTarget(0.22).restart()
  }

  const onPointerUp = () => {
    const g = gesture.current
    gesture.current = null
    setPanning(false)
    if (!g) return
    if (g.type === 'node') {
      simRef.current?.alphaTarget(0)
      const n = nodeMapRef.current.get(g.id)
      if (n) {
        if (g.moved < 6) {
          // A tap, not a drag: release the pin and treat it as a click.
          n.fx = undefined
          n.fy = undefined
          setNodePosition(g.id, { x: n.x ?? 0, y: n.y ?? 0, fx: null, fy: null })
          onSelectEdge(null)
          if (selectedNodeId === g.id) onToggleExpand(g.id)
          else {
            onSelectNode(g.id)
            onToggleExpand(g.id)
          }
        } else {
          // Dropped somewhere deliberate: keep it there.
          setNodePosition(g.id, { x: n.x ?? 0, y: n.y ?? 0, fx: n.fx ?? null, fy: n.fy ?? null })
        }
      }
    }
  }

  /* ---------- derived render data ---------- */
  const neighbourIds = useMemo(() => {
    if (!selectedNodeId) return null
    const set = new Set<string>([selectedNodeId])
    for (const e of visibleEdges) {
      if (e.from === selectedNodeId) set.add(e.to)
      if (e.to === selectedNodeId) set.add(e.from)
    }
    return set
  }, [selectedNodeId, visibleEdges])

  const pulse = useMemo(() => new Set(pulseNodeIds), [pulseNodeIds])

  return (
    <div className="map-wrap" ref={wrapRef}>
      <svg
        ref={svgRef}
        className={`map-svg${panning ? ' is-panning' : ''}`}
        viewBox={`0 0 ${size.w} ${size.h}`}
        onPointerDown={onBackgroundPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="application"
        aria-label="Thesis map"
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.7" fill="#e7e3d9" />
          </pattern>
        </defs>
        <rect width={size.w} height={size.h} fill="url(#grid)" opacity="0.8" />

        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
          {/* edges */}
          <g>
            {visibleEdges.map((e) => {
              const a = nodeMapRef.current.get(e.from)
              const b = nodeMapRef.current.get(e.to)
              if (!a || !b) return null
              const x1 = a.x ?? 0
              const y1 = a.y ?? 0
              const x2 = b.x ?? 0
              const y2 = b.y ?? 0
              const mx = (x1 + x2) / 2
              const my = (y1 + y2) / 2 - Math.abs(x2 - x1) * 0.08
              const d = `M${x1},${y1} Q${mx},${my} ${x2},${y2}`
              const related = !neighbourIds || (neighbourIds.has(e.from) && neighbourIds.has(e.to))
              const isSelected = selectedEdgeId === e.id
              return (
                <g key={e.id}>
                  <path
                    className={`edge${isSelected ? ' hot' : related ? '' : ' dim'}`}
                    d={d}
                    strokeWidth={(isSelected ? 2.4 : 0.7 + e.weight * 1.9) / 1}
                    strokeOpacity={related ? 1 : 0.5}
                  />
                  <path
                    className="edge-hit"
                    d={d}
                    onPointerDown={(ev) => {
                      ev.stopPropagation()
                      onSelectNode(null)
                      onSelectEdge(e.id)
                    }}
                  >
                    <title>{e.rationale}</title>
                  </path>
                </g>
              )
            })}
          </g>

          {/* nodes */}
          <g>
            {visibleNodes.map((n) => {
              const s = nodeMapRef.current.get(n.id)
              if (!s) return null
              const x = s.x ?? 0
              const y = s.y ?? 0
              const c = confidence[n.id] ?? 50
              const color = confidenceColor(c)
              const r = NODE_RADIUS[n.kind]
              const hidden = hiddenChildCount(n.id, nodes, edges, visible)
              const isSelected = selectedNodeId === n.id
              const dim = neighbourIds ? !neighbourIds.has(n.id) : false
              const pinned = s.fx != null
              return (
                <g
                  key={n.id}
                  transform={`translate(${x},${y})`}
                  opacity={dim ? 0.36 : 1}
                  style={{ transition: 'opacity 180ms ease' }}
                >
                  {pulse.has(n.id) && (
                    <circle r={r + 12} fill="none" stroke={color} strokeWidth={1.2} opacity={0.5}>
                      <animate attributeName="r" from={r + 2} to={r + 22} dur="1.6s" repeatCount="2" />
                      <animate attributeName="opacity" from="0.55" to="0" dur="1.6s" repeatCount="2" />
                    </circle>
                  )}
                  {isSelected && <circle r={r + 7} fill="none" stroke="var(--accent)" strokeWidth={1.2} />}
                  {n.kind === 'pillar' && <circle r={r + 4} fill="none" stroke={color} strokeOpacity={0.28} />}
                  <circle
                    className="node-hit"
                    r={r}
                    fill={`color-mix(in srgb, ${color} 24%, white)`}
                    stroke={color}
                    strokeWidth={n.kind === 'pillar' ? 2 : 1.4}
                    onPointerDown={(e) => onNodePointerDown(e, n.id)}
                    tabIndex={0}
                    role="button"
                    aria-label={`${n.label}, ${KIND_LABEL[n.kind]}, confidence ${c.toFixed(0)}${
                      hidden ? `, ${hidden} hidden underneath` : ''
                    }`}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' && e.key !== ' ') return
                      e.preventDefault()
                      onSelectEdge(null)
                      onSelectNode(n.id)
                      onToggleExpand(n.id)
                    }}
                  />
                  {n.kind === 'pillar' && (
                    <text
                      className="node-label"
                      textAnchor="middle"
                      y={4}
                      style={{ fontFamily: 'var(--mono)', fontSize: 13, fill: color, stroke: 'none' }}
                    >
                      {c.toFixed(0)}
                    </text>
                  )}
                  {pinned && <circle r={2} cy={-r - 6} fill="var(--ink-4)" />}
                  <text className={`node-label ${n.kind}`} textAnchor="middle" y={r + 15}>
                    {(n.kind === 'company' ? [n.ticker ?? n.label] : wrapLabel(n.label, n.kind === 'pillar' ? 20 : 22)).map(
                      (line, i) => (
                        <tspan key={i} x={0} dy={i === 0 ? 0 : n.kind === 'pillar' ? 17 : 13}>
                          {line}
                        </tspan>
                      ),
                    )}
                  </text>
                  {n.kind !== 'pillar' && n.kind !== 'company' && (
                    <text
                      className="node-label sub"
                      textAnchor="middle"
                      y={r + 15 + 13 * wrapLabel(n.label, 22).length}
                    >
                      {c.toFixed(0)}
                    </text>
                  )}
                  {hidden > 0 && (
                    <g transform={`translate(${r * 0.72},${r * 0.72})`} pointerEvents="none">
                      <circle r={7.5} fill="var(--paper)" stroke="var(--rule-strong)" />
                      <text
                        textAnchor="middle"
                        y={2.8}
                        style={{ fontFamily: 'var(--mono)', fontSize: 8.5, fill: 'var(--ink-3)' }}
                      >
                        {hidden}
                      </text>
                    </g>
                  )}
                </g>
              )
            })}
          </g>
        </g>
      </svg>

      <div className="map-zoom">
        <button type="button" aria-label="Zoom in" onClick={() => zoomAt(1.25, size.w / 2, size.h / 2)}>
          +
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => zoomAt(0.8, size.w / 2, size.h / 2)}>
          −
        </button>
        <button
          type="button"
          aria-label="Fit the whole map"
          title="Fit"
          onClick={() => {
            userMovedView.current = false
            autoFitUntil.current = Date.now() + 900
            fitToView()
          }}
        >
          ⤢
        </button>
      </div>
    </div>
  )
}

/** Breaks a label onto at most two lines, on word boundaries. */
function wrapLabel(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text]
  const words = text.split(' ')
  const lines: string[] = ['']
  for (const w of words) {
    const candidate = lines[lines.length - 1] ? `${lines[lines.length - 1]} ${w}` : w
    if (candidate.length <= maxChars || !lines[lines.length - 1]) lines[lines.length - 1] = candidate
    else if (lines.length < 2) lines.push(w)
    else {
      lines[1] = `${lines[1]}…`
      break
    }
  }
  return lines
}

