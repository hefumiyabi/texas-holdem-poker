import { Robot, Sparkle, UsersThree, X } from '@phosphor-icons/react'
import { useState } from 'react'
import { translate } from '../i18n'
import type { BotDifficulty, BotPersona, ChallengeConfig, Language, RebuyLimit } from '../types'

const difficulties: BotDifficulty[] = ['beginner', 'intermediate', 'advanced']
const seatCounts = [2, 4, 6] as const
const buyIns = [1000, 5000, 10000] as const
const defaultPersonas: BotPersona[] = ['aggressive', 'tight', 'caller', 'tricky', 'balanced']
const rebuyLimits: RebuyLimit[] = [0, 1, 2, 3, 'unlimited']

export function ChallengeSetup({ language, onClose, onStart }: {
  language: Language
  onClose: () => void
  onStart: (config: ChallengeConfig) => Promise<void>
}) {
  const [difficulty, setDifficulty] = useState<BotDifficulty>('intermediate')
  const [seatCount, setSeatCount] = useState<2 | 4 | 6>(6)
  const [initialChips, setInitialChips] = useState<1000 | 5000 | 10000>(1000)
  const [rebuyLimit, setRebuyLimit] = useState<RebuyLimit>(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const personas = defaultPersonas.slice(0, seatCount - 1)
  const submit = async () => {
    if (busy) return
    setBusy(true); setError('')
    try { await onStart({ difficulty, seatCount, initialChips, personas, rebuyLimit }) }
    catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); setBusy(false) }
  }
  const difficultyLabel = (value: BotDifficulty) => translate(language, value === 'beginner' ? 'casual' : value === 'intermediate' ? 'regular' : 'expert')
  const seatLabel = (value: 2 | 4 | 6) => translate(language, value === 2 ? 'headsUp' : value === 4 ? 'fourPlayers' : 'sixPlayers')
  const rebuyLabel = (value: RebuyLimit) => translate(language, value === 0 ? 'rebuyNone' : value === 1 ? 'rebuyOnce' : value === 2 ? 'rebuyTwice' : value === 3 ? 'rebuyThree' : 'rebuyUnlimited')
  return <div className="challenge-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="challenge-sheet" role="dialog" aria-modal="true" aria-label={translate(language, 'setupChallenge')}>
      <div className="sheet-grabber" aria-hidden="true" />
      <header><div><span><Sparkle weight="fill" /> {translate(language, 'soloChallenge')}</span><h2>{translate(language, 'chooseOpponents')}</h2></div><button className="sheet-close" onClick={onClose} aria-label={translate(language, 'close')}><X /></button></header>
      <fieldset><legend>{translate(language, 'difficulty')}</legend><div className="choice-grid difficulty-grid">{difficulties.map((value) => <button key={value} aria-label={difficultyLabel(value)} aria-pressed={difficulty === value} onClick={() => setDifficulty(value)}><strong>{difficultyLabel(value)}</strong><small>{translate(language, value === 'beginner' ? 'casualHint' : value === 'intermediate' ? 'regularHint' : 'expertHint')}</small></button>)}</div></fieldset>
      <fieldset><legend>{translate(language, 'tableSize')}</legend><div className="choice-grid seat-grid">{seatCounts.map((value) => <button key={value} aria-pressed={seatCount === value} onClick={() => setSeatCount(value)}><UsersThree /><span>{seatLabel(value)}</span></button>)}</div></fieldset>
      <fieldset><legend>{translate(language, 'buyIn')}</legend><div className="choice-grid buyin-grid">{buyIns.map((value) => <button key={value} aria-label={`${translate(language, 'buyIn')} ${value.toLocaleString()}`} aria-pressed={initialChips === value} onClick={() => setInitialChips(value)}>{value.toLocaleString()}</button>)}</div></fieldset>
      <fieldset><legend>{translate(language, 'humanRebuys')}</legend><div className="choice-grid rebuy-grid">{rebuyLimits.map((value) => <button key={value} aria-pressed={rebuyLimit === value} onClick={() => setRebuyLimit(value)}>{rebuyLabel(value)}</button>)}</div><small className="field-hint">{translate(language, 'humanRebuysHint')}</small></fieldset>
      <div className="lineup-preview"><span><Robot weight="fill" />{translate(language, 'opponentLineup')}</span><div>{personas.map((persona) => <b key={persona}>{translate(language, persona)}</b>)}</div></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="start-challenge" disabled={busy} onClick={submit}>{busy ? translate(language, 'creatingTable') : translate(language, 'startChallenge')}</button>
      <p className="fair-play-note">{translate(language, 'fairBotNote')}</p>
    </section>
  </div>
}
