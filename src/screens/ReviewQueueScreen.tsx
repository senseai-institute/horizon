import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../components/Toast'
import { Delta, EmptyState, formatDate, relativeTime } from '../components/ui'
import type { ChainLink, ReviewItem, ReviewKind, ReviewStatus } from '../lib/types'
import { useHorizon } from '../store/useHorizon'

const KIND_LABEL: Record<ReviewKind, string> = {
  trim: 'Trim',
  add: 'Add',
  flag: 'Flag',
  rebalance: 'Rebalance',
  'review-thesis': 'Re-read',
}

export default function ReviewQueueScreen() {
  const items = useHorizon((s) => s.reviewItems)
  const [tab, setTab] = useState<ReviewStatus>('pending')

  const counts = {
    pending: items.filter((i) => i.status === 'pending').length,
    approved: items.filter((i) => i.status === 'approved').length,
    rejected: items.filter((i) => i.status === 'rejected').length,
  }
  const rows = items
    .filter((i) => i.status === tab)
    .sort((a, b) => (b.decidedAt ?? b.createdAt).localeCompare(a.decidedAt ?? a.createdAt))

  return (
    <div className="page" style={{ maxWidth: 960 }}>
      <div className="page-head">
        <div className="page-head-text">
          <h1>Review queue</h1>
          <p className="lede">
            Everything waiting on you. Each item shows what changed, what it would do about it, and the chain
            of reasoning that produced it. Nothing moves without you, and in this build approving an item ends
            at "queued".
          </p>
        </div>
      </div>

      <div className="segmented" style={{ marginBottom: 24 }}>
        {(['pending', 'approved', 'rejected'] as ReviewStatus[]).map((t) => (
          <button key={t} type="button" aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t === 'pending' ? 'Waiting' : t === 'approved' ? 'Approved' : 'Rejected'}{' '}
            <span className="num" style={{ opacity: 0.55 }}>
              {counts[t]}
            </span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState title={tab === 'pending' ? 'Nothing is waiting on you' : `Nothing ${tab} yet`}>
          {tab === 'pending' ? (
            <>
              Re-mark a passage as contradicting on the <Link to="/map">map</Link> and watch confidence fall
              through the branch above it. If it takes a pillar past a sleeve's exit rule, an item appears
              here.
            </>
          ) : (
            'Decisions you make will be kept here, and in the journal.'
          )}
        </EmptyState>
      ) : (
        <div className="stack stack-md">
          {rows.map((item) => (
            <ReviewCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

function ReviewCard({ item }: { item: ReviewItem }) {
  const decide = useHorizon((s) => s.decideReview)
  const toast = useToast()
  const [showChain, setShowChain] = useState(item.status === 'pending')

  return (
    <article className="card stack stack-md">
      <div className="row row-between row-wrap" style={{ gap: 12, alignItems: 'flex-start' }}>
        <div className="stack stack-xs" style={{ minWidth: 0 }}>
          <div className="row row-wrap" style={{ gap: 8 }}>
            <span className="chip chip-accent">{KIND_LABEL[item.kind]}</span>
            {item.status !== 'pending' && (
              <span className="chip">
                {item.status === 'approved' ? 'Approved — queued' : 'Rejected'} ·{' '}
                {item.decidedAt ? relativeTime(item.decidedAt) : ''}
              </span>
            )}
            <span className="meta">Raised {formatDate(item.createdAt)}</span>
          </div>
          <h3 style={{ maxWidth: '30ch' }}>{item.title}</h3>
        </div>
        {item.status === 'pending' && (
          <div className="row" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                decide(item.id, 'approved')
                toast({ text: 'Approved — queued. Nothing is sent anywhere in this build.' })
              }}
            >
              Approve
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                decide(item.id, 'rejected')
                toast({ text: 'Rejected. The reasoning stays in the journal.' })
              }}
            >
              Reject
            </button>
          </div>
        )}
      </div>

      <div className="grid-2">
        <div className="stack stack-xs">
          <span className="label">What changed</span>
          <p className="prose-sm" style={{ margin: 0 }}>
            {item.summary}
          </p>
        </div>
        <div className="stack stack-xs">
          <span className="label">What it would do</span>
          <p className="prose-sm" style={{ margin: 0 }}>
            {item.proposal}
          </p>
        </div>
      </div>

      <div className="stack stack-sm" style={{ borderTop: '1px solid var(--rule)', paddingTop: 14 }}>
        <button
          type="button"
          className="link-button"
          style={{ fontSize: 13, alignSelf: 'flex-start' }}
          onClick={() => setShowChain((v) => !v)}
        >
          {showChain ? 'Hide the reasoning' : `Show the reasoning (${item.chain.length} steps)`}
        </button>
        {showChain && (
          <ol className="chain">
            {item.chain.map((link, i) => (
              <ChainRow key={i} link={link} />
            ))}
          </ol>
        )}
      </div>
    </article>
  )
}

function ChainRow({ link }: { link: ChainLink }) {
  const cls = link.kind === 'evidence' ? 'is-evidence' : link.kind === 'rule' || link.kind === 'sleeve' ? 'is-rule' : ''
  const body = (
    <>
      <div className="row row-wrap" style={{ gap: 8, alignItems: 'baseline' }}>
        <span style={{ fontSize: 14, fontWeight: 500 }}>{link.label}</span>
        {link.delta !== undefined && Math.abs(link.delta) >= 0.05 && <Delta value={link.delta} />}
      </div>
      <p className="meta" style={{ margin: '2px 0 0', maxWidth: '64ch' }}>
        {link.detail}
      </p>
    </>
  )
  return (
    <li className={cls}>
      {link.nodeId ? (
        <Link to={`/thesis/${link.nodeId}`} style={{ color: 'inherit', textDecoration: 'none' }}>
          {body}
        </Link>
      ) : link.evidenceId ? (
        <Link to={`/evidence/${link.evidenceId}`} style={{ color: 'inherit', textDecoration: 'none' }}>
          {body}
        </Link>
      ) : (
        body
      )}
    </li>
  )
}
