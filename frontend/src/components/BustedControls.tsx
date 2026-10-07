import { Eye, SignOut, Stack } from '@phosphor-icons/react'
import { formatMoney } from '../currency'
import { translate } from '../i18n'
import type { CurrencyCode, Language, Player } from '../types'

interface Props {
  language: Language
  currency?: CurrencyCode
  player: Player
  initialChips: number
  onRebuy: () => void
  onSpectate: () => void
  onWatchNext?: () => void
  onLeave: () => void
}

export function BustedControls({ language, currency, player, initialChips, onRebuy, onSpectate, onWatchNext, onLeave }: Props) {
  const spectating = player.tournament_status === 'spectating'
  const remaining = player.rebuys_remaining
  const allowance = remaining === 'unlimited'
    ? translate(language, 'rebuyUnlimitedRemaining')
    : remaining && remaining > 0
      ? translate(language, 'rebuyRemaining').replace('{count}', String(remaining))
      : translate(language, 'rebuyExhausted')
  const rebuyLabel = `${translate(language, 'rebuy')} ${formatMoney(initialChips, currency)}`

  return <section className="busted-controls" aria-label={translate(language, 'bustedOptions')}>
    <div className="busted-copy">
      <strong>{spectating ? translate(language, 'watchingNow') : translate(language, 'chipsGone')}</strong>
      <small>{allowance}</small>
    </div>
    <div className="busted-actions">
      {player.can_rebuy && <button className="gold-button rebuy-button" onClick={onRebuy} aria-label={rebuyLabel}><Stack />{rebuyLabel}</button>}
      {!spectating && <button onClick={onSpectate}><Eye />{translate(language, 'keepWatching')}</button>}
      {spectating && onWatchNext && <button onClick={onWatchNext}><Eye />{translate(language, 'watchNextHand')}</button>}
      <button onClick={onLeave}><SignOut />{translate(language, 'exitTable')}</button>
    </div>
  </section>
}
