import { Link, useParams } from 'react-router-dom'
import NodeDetail from '../components/NodeDetail'
import { EmptyState } from '../components/ui'
import { useHorizon } from '../store/useHorizon'

export default function ThesisDetailScreen() {
  const { id } = useParams()
  const node = useHorizon((s) => s.nodes.find((n) => n.id === id))

  return (
    <div className="page" style={{ maxWidth: 880 }}>
      <div style={{ marginBottom: 22 }}>
        <Link to={`/beliefs?node=${id ?? ''}`} className="link-button" style={{ fontSize: 13 }}>
          ← Back to the map
        </Link>
      </div>
      {node ? (
        <NodeDetail node={node} />
      ) : (
        <EmptyState title="That node is not in this notebook">
          It may have been removed, or the link may be from a different notebook. <Link to="/beliefs">Open the map</Link>.
        </EmptyState>
      )}
    </div>
  )
}
