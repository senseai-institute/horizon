import { useState } from 'react'
import type { Stance } from '../lib/types'
import { useHorizon } from '../store/useHorizon'
import { useToast } from './Toast'
import { Field, StanceToggle } from './ui'

const FORMS = ['10-K', '10-Q', '8-K', 'S-1', 'DEF 14A', '20-F', 'Transcript', 'Other']

/**
 * Attaching a passage by hand. In this build the text is pasted in — there is
 * no document fetching — but everything downstream of it is real: the stance
 * and weight feed straight into the confidence calculation.
 */
export default function AddEvidenceForm({
  targetId,
  defaultCompany,
  defaultTicker,
  onDone,
}: {
  targetId: string
  defaultCompany?: string
  defaultTicker?: string
  onDone?: () => void
}) {
  const addEvidence = useHorizon((s) => s.addEvidence)
  const toast = useToast()
  const [stance, setStance] = useState<Stance>('supports')
  const [strength, setStrength] = useState(3)
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState(defaultCompany ?? '')
  const [form, setForm] = useState('10-K')
  const [section, setSection] = useState('Item 1A — Risk Factors')
  const [filedAt, setFiledAt] = useState(new Date().toISOString().slice(0, 10))
  const [excerpt, setExcerpt] = useState('')
  const [highlight, setHighlight] = useState('')
  const [note, setNote] = useState('')

  const highlightValid = !highlight || excerpt.includes(highlight)
  const canSubmit = title.trim() && company.trim() && excerpt.trim().length > 20 && highlightValid

  const submit = () => {
    if (!canSubmit) return
    addEvidence({
      targetId,
      stance,
      strength,
      title: title.trim(),
      excerpt: excerpt.trim(),
      highlight: highlight.trim(),
      note: note.trim() || undefined,
      source: {
        company: company.trim(),
        form,
        section: section.trim(),
        filedAt,
        url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${encodeURIComponent(
          defaultTicker ?? company.trim(),
        )}&type=${encodeURIComponent(form)}&dateb=&owner=include&count=40`,
      },
    })
    toast({
      text:
        stance === 'contradicts'
          ? 'Attached as contradicting. Confidence has fallen through every belief above it.'
          : 'Attached as supporting. Confidence has been recomputed up the branch.',
      to: '/review',
      actionLabel: 'Open review queue',
    })
    onDone?.()
  }

  return (
    <div className="card stack stack-md" style={{ background: 'var(--paper-sunken)' }}>
      <div className="row row-between row-wrap" style={{ gap: 12 }}>
        <h4>Attach a passage</h4>
        <StanceToggle stance={stance} onChange={setStance} />
      </div>

      <p className="meta" style={{ margin: 0, maxWidth: '62ch' }}>
        Paste the passage itself, then mark the phrase that does the work. Evidence that argues against you
        counts exactly as much as evidence that agrees with you — that is the point.
      </p>

      <Field label="What does this passage say, in your words?">
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Lead times remain extended into next year"
        />
      </Field>

      <div className="grid-3">
        <Field label="Filer">
          <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Hubbell Incorporated" />
        </Field>
        <Field label="Form">
          <select className="select" value={form} onChange={(e) => setForm(e.target.value)}>
            {FORMS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </Field>
        <Field label="Filed">
          <input className="input" type="date" value={filedAt} onChange={(e) => setFiledAt(e.target.value)} />
        </Field>
      </div>

      <Field label="Section">
        <input className="input" value={section} onChange={(e) => setSection(e.target.value)} />
      </Field>

      <Field label="The passage">
        <textarea
          className="textarea"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Paste the text from the filing."
        />
      </Field>

      <Field
        label="The phrase that matters"
        hint={
          highlightValid
            ? 'Must appear in the passage above. It gets marked when the passage is shown.'
            : 'That phrase does not appear in the passage above.'
        }
      >
        <input
          className="input"
          value={highlight}
          onChange={(e) => setHighlight(e.target.value)}
          style={highlightValid ? undefined : { borderColor: 'var(--contradict)' }}
        />
      </Field>

      <Field label="Your note (optional)">
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why this changes, or does not change, your reading" />
      </Field>

      <div className="row row-between row-wrap" style={{ gap: 10 }}>
        <div className="row" style={{ gap: 10 }}>
          <span className="label">Weight</span>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={strength}
            onChange={(e) => setStrength(Number(e.target.value))}
            style={{ width: 110 }}
            aria-label="Weight, 1 to 5"
          />
          <span className="num meta">{strength} of 5</span>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {onDone && (
            <button type="button" className="btn btn-ghost" onClick={onDone}>
              Cancel
            </button>
          )}
          <button type="button" className="btn btn-primary" disabled={!canSubmit} onClick={submit}>
            Attach passage
          </button>
        </div>
      </div>
    </div>
  )
}
