import { Link } from 'react-router-dom'
import { useOS } from '../store/useOS'

/** One quiet line at the top of the work surface. Never more than that. */
export default function NudgeBar() {
  const all = useOS((s) => s.nudges)
  const focus = useOS((s) => s.focus)
  const { dismissNudge, logWalk, startSession } = useOS.getState()
  const n = all.find((x) => !x.dismissed)
  if (!n || (focus && n.kind !== 'body')) return null
  const act = () => {
    if (n.action?.run === 'walk') logWalk()
    else if (n.action?.run === 'focus') startSession()
    dismissNudge(n.id)
  }
  return (
    <div className={`nudge nudge-${n.kind}`} role="status">
      <span className="nudge-dot" aria-hidden="true" />
      <span style={{ flex: 1 }}>{n.text}</span>
      {n.action && (n.action.to && !n.action.run ? (
        <Link to={n.action.to} className="link-button" style={{ fontSize: 13 }} onClick={() => dismissNudge(n.id)}>
          {n.action.label}
        </Link>
      ) : (
        <button type="button" className="link-button" style={{ fontSize: 13 }} onClick={act}>
          {n.action.label}
        </button>
      ))}
      <button type="button" className="btn btn-sm btn-ghost" onClick={() => dismissNudge(n.id)} aria-label="Dismiss">
        ×
      </button>
    </div>
  )
}
