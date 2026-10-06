import { useMemo, useState } from 'react'
import { getBetPresets, getLegalActions, type PokerAction } from '../game/actions'
import { translate } from '../i18n'
import type { Language, Player, TableInfo } from '../types'

export function ActionRail({ language, table, player, enabled, onAct, onSizingChange }: { language: Language; table: TableInfo; player: Player; enabled: boolean; onAct: (action: PokerAction, amount?: number) => void; onSizingChange?: (open: boolean) => void }) {
  const actions = getLegalActions({ currentBet: table.current_bet || 0, playerBet: player.current_bet, chips: player.chips })
  const [sizing, setSizing] = useState(false)
  const min = actions.includes('raise') ? (table.min_raise_to || table.current_bet || 1) : (table.min_bet || 1)
  const max = player.current_bet + player.chips
  const [amount, setAmount] = useState(min)
  const presets = useMemo(() => getBetPresets({ pot: table.pot, min, max }), [table.pot, min, max])
  const label = (action: PokerAction) => translate(language, action === 'all_in' ? 'allIn' : action)
  const setSizingMode = (open: boolean) => { setSizing(open); onSizingChange?.(open) }
  const trigger = (action: PokerAction) => {
    if (action === 'bet' || action === 'raise') { setAmount(min); setSizingMode(true) }
    else onAct(action)
  }
  return <>
    {sizing && <div className="bet-sheet" role="dialog" aria-label={translate(language, actions.includes('raise') ? 'raiseTo' : 'bet')}>
      <div className="sheet-handle" />
      <div className="bet-heading"><span>{translate(language, actions.includes('raise') ? 'raiseTo' : 'bet')}</span><strong>{amount.toLocaleString()}</strong></div>
      <input aria-label={translate(language, 'raiseTo')} type="range" min={Math.min(min, max)} max={max} step={Math.max(1, table.big_blind || 1)} value={Math.min(amount, max)} onChange={(event) => setAmount(Number(event.target.value))} />
      <div className="preset-row">{presets.map((preset, index) => <button key={preset.label} onClick={() => setAmount(preset.amount)}>{language === 'zh' ? ['½池', '¾池', '满池', '全下'][index] : ['½ pot', '¾ pot', 'Pot', 'All in'][index]}</button>)}</div>
      <div className="sheet-actions"><button onClick={() => setSizingMode(false)}>{translate(language, 'cancel')}</button><button className="gold-button bet-confirm-button" onClick={() => { onAct(actions.includes('raise') ? 'raise' : 'bet', amount); setSizingMode(false) }}><span>{translate(language, 'confirm')}</span><strong className="confirm-amount">{amount.toLocaleString()}</strong></button></div>
    </div>}
    {!sizing && <div className="action-rail" aria-label="Poker actions">
      <div className="turn-copy"><span className={enabled ? 'pulse-dot' : ''}/><strong>{enabled ? translate(language, 'yourTurn') : translate(language, 'spectating')}</strong></div>
      <div className="action-buttons">{actions.map((action) => <button key={action} disabled={!enabled} className={action === 'bet' || action === 'raise' ? 'gold-button' : action === 'all_in' ? 'all-in-button' : ''} onClick={() => trigger(action)}><span>{label(action)}</span>{action === 'call' && <small>{Math.min(player.chips, Math.max(0, (table.current_bet || 0) - player.current_bet)).toLocaleString()}</small>}</button>)}</div>
    </div>}
  </>
}
