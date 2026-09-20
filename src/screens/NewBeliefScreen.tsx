import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { confidenceColor } from '../lib/color'
import { beliefToLabel, useHorizon } from '../store/useHorizon'
import { ConfidenceBar, Field } from '../components/ui'

type Step = 'belief' | 'mechanism' | 'horizon' | 'falsifiers' | 'claim' | 'done'

interface Turn {
  from: 'horizon' | 'user'
  text: string
}

const EXAMPLES = [
  'Local services are moving online',
  'The power grid is badly underbuilt',
  'People will keep paying for things they used to do themselves',
  'Software is turning into a metered utility',
]

const HORIZONS = [2, 5, 10, 20]

export default function NewBeliefScreen() {
  const navigate = useNavigate()
  const addBelief = useHorizon((s) => s.addBelief)

  const [step, setStep] = useState<Step>('belief')
  const [turns, setTurns] = useState<Turn[]>([
    {
      from: 'horizon',
      text: 'Start anywhere. Tell me something you think is true about the world — it does not have to be about a company, and it does not have to be tidy yet.',
    },
  ])
  const [belief, setBelief] = useState('')
  const [mechanism, setMechanism] = useState('')
  const [horizonYears, setHorizonYears] = useState(10)
  const [falsifiers, setFalsifiers] = useState(['', '', ''])
  const [claim, setClaim] = useState('')
  const [created, setCreated] = useState<{ pillarId: string; thesisId: string } | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turns, step])

  const say = (from: Turn['from'], text: string) => setTurns((t) => [...t, { from, text }])

  const composedClaim = useMemo(
    () =>
      [
        belief.trim().replace(/\.$/, ''),
        mechanism.trim() ? `For this to work out, ${lowerFirst(mechanism.trim().replace(/\.$/, ''))}` : '',
        `I expect it to resolve over roughly ${horizonYears} years.`,
      ]
        .filter(Boolean)
        .join('. ')
        .replace(/\.\./g, '.'),
    [belief, mechanism, horizonYears],
  )

  const submitBelief = () => {
    if (!belief.trim()) return
    say('user', belief.trim())
    say(
      'horizon',
      'Good. That is a belief about how the world is changing, which is the right altitude to start from. Now the harder half: what would actually have to be true for it to work out?',
    )
    setStep('mechanism')
  }

  const submitMechanism = () => {
    if (!mechanism.trim()) return
    say('user', mechanism.trim())
    say(
      'horizon',
      'Now the time horizon. A belief without one cannot be checked — two years and ten years are different claims even when the sentence is identical.',
    )
    setStep('horizon')
  }

  const submitHorizon = (years: number) => {
    setHorizonYears(years)
    say('user', `About ${years} years.`)
    say(
      'horizon',
      'Last question, and it is the one that matters most. What would make you decide you were wrong? Write the things that would actually change your mind — not the things you are confident will never happen.',
    )
    setStep('falsifiers')
  }

  const submitFalsifiers = () => {
    const written = falsifiers.filter((f) => f.trim())
    if (written.length === 0) return
    say('user', written.map((f) => `• ${f.trim()}`).join('\n'))
    say(
      'horizon',
      'That is a thesis. Here is what I have written down — edit it until it says what you actually mean, then I will put it on your map.',
    )
    setClaim(composedClaim)
    setStep('claim')
  }

  const finish = () => {
    const result = addBelief({
      belief: belief.trim(),
      claim: claim.trim() || composedClaim,
      horizonYears,
      falsifiers: falsifiers.filter((f) => f.trim()),
    })
    setCreated(result)
    say('horizon', 'Written down. It is the broadest thing you have told me, so it goes on the map as a pillar — everything else will hang off it.')
    setStep('done')
  }

  return (
    <div className="page page-narrow" style={{ maxWidth: 720 }}>
      <div className="page-head">
        <div className="page-head-text">
          <h1>A new belief</h1>
          <p className="lede">
            A written claim has three parts: what you think, over what period, and what would prove you wrong.
            This takes about two minutes.
          </p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/beliefs')}>
          Back to the map
        </button>
      </div>

      <div className="convo">
        {turns.map((t, i) => (
          <div key={i} className={`turn from-${t.from}`}>
            <div className="turn-avatar">{t.from === 'horizon' ? 'H' : 'You'.slice(0, 1)}</div>
            <div className="turn-body" style={{ whiteSpace: 'pre-line' }}>
              {t.text}
            </div>
          </div>
        ))}

        {step === 'belief' && (
          <div className="stack stack-sm">
            <textarea
              className="textarea"
              autoFocus
              placeholder="I think…"
              value={belief}
              onChange={(e) => setBelief(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitBelief()
              }}
            />
            <div className="row row-wrap" style={{ gap: 6 }}>
              {EXAMPLES.map((ex) => (
                <button key={ex} type="button" className="chip" style={{ cursor: 'pointer', border: 0 }} onClick={() => setBelief(ex)}>
                  {ex}
                </button>
              ))}
            </div>
            <div className="row row-between">
              <button type="button" className="btn btn-primary" disabled={!belief.trim()} onClick={submitBelief}>
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 'mechanism' && (
          <div className="stack stack-sm">
            <textarea
              className="textarea"
              autoFocus
              placeholder="For this to work out…"
              value={mechanism}
              onChange={(e) => setMechanism(e.target.value)}
            />
            <button type="button" className="btn btn-primary" disabled={!mechanism.trim()} onClick={submitMechanism}>
              Continue
            </button>
          </div>
        )}

        {step === 'horizon' && (
          <div className="row row-wrap" style={{ gap: 8 }}>
            {HORIZONS.map((y) => (
              <button key={y} type="button" className="btn" onClick={() => submitHorizon(y)}>
                {y} years
              </button>
            ))}
          </div>
        )}

        {step === 'falsifiers' && (
          <div className="stack stack-sm">
            {falsifiers.map((f, i) => (
              <input
                key={i}
                className="input"
                autoFocus={i === 0}
                placeholder={
                  i === 0
                    ? 'I would be wrong if…'
                    : i === 1
                      ? 'Another thing that would change my mind…'
                      : 'One more (optional)'
                }
                value={f}
                onChange={(e) => setFalsifiers(falsifiers.map((x, j) => (j === i ? e.target.value : x)))}
              />
            ))}
            <button
              type="button"
              className="btn btn-primary"
              disabled={!falsifiers.some((f) => f.trim())}
              onClick={submitFalsifiers}
            >
              Continue
            </button>
          </div>
        )}

        {step === 'claim' && (
          <div className="stack stack-md">
            <Field label="The written claim">
              <textarea
                className="textarea"
                style={{ minHeight: 150 }}
                value={claim}
                onChange={(e) => setClaim(e.target.value)}
              />
            </Field>
            <div className="card-quiet stack stack-xs">
              <span className="label">Falsifiers on file</span>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {falsifiers
                  .filter((f) => f.trim())
                  .map((f, i) => (
                    <li key={i} className="prose-sm" style={{ fontSize: 15 }}>
                      {f}
                    </li>
                  ))}
              </ul>
              <span className="meta">Horizon: {horizonYears} years.</span>
            </div>
            <button type="button" className="btn btn-primary" onClick={finish}>
              Put it on my map
            </button>
          </div>
        )}

        {step === 'done' && created && (
          <div className="stack stack-md">
            <div
              className="card first-node"
              style={{ display: 'flex', gap: 18, alignItems: 'center', padding: '22px 24px' }}
            >
              <svg width="88" height="88" viewBox="-44 -44 88 88" aria-hidden="true">
                <circle r="31" fill="none" stroke={confidenceColor(55)} strokeOpacity="0.28" />
                <circle r="27" fill={`color-mix(in srgb, ${confidenceColor(55)} 16%, white)`} stroke={confidenceColor(55)} strokeWidth="2" />
                <text
                  textAnchor="middle"
                  y="5"
                  style={{ fontFamily: 'var(--mono)', fontSize: 13, fill: confidenceColor(55) }}
                >
                  55
                </text>
              </svg>
              <div className="stack stack-xs" style={{ minWidth: 0 }}>
                <span className="label">Your first pillar</span>
                <h3>{beliefToLabel(belief)}</h3>
                <ConfidenceBar value={55} width={160} />
                <p className="meta" style={{ margin: 0, maxWidth: '46ch' }}>
                  It sits at your stated prior because nothing is attached to it yet. A placeholder thesis has
                  been hung underneath it for you to sharpen. Find some companies for that thesis and attach a
                  filing — then the number starts being computed rather than asserted.
                </p>
              </div>
            </div>
            <div className="row row-wrap" style={{ gap: 8 }}>
              <button type="button" className="btn btn-primary" onClick={() => navigate(`/beliefs?node=${created.pillarId}`)}>
                Open it on the map
              </button>
              <button type="button" className="btn" onClick={() => navigate(`/beliefs/${created.pillarId}`)}>
                Open the full page
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => navigate('/beliefs/discovery')}>
                Find companies for it
              </button>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>
    </div>
  )
}

function lowerFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1)
}
