import { useMemo, useState } from 'react'
import { formatMoney } from '../currency'
import { getBetPresets, getLegalActions, type PokerAction } from '../game/actions'
import { translate } from '../i18n'
import type { CurrencyCode, Language, Player, TableInfo } from '../types'

export function ActionRail({ language, table, player, currency, enabled, onAct, onSizingChange }: { language: Language; table: TableInfo; player: Player; currency?: CurrencyCode; enabled: boolean; onAct: (action: PokerAction, amount?: number) => void; onSizingChange?: (open: boolean) => void }) {
  const actions = getLegalActions({ currentBet: table.current_bet || 0, playerBet: player.current_bet, chips: player.chips })
  const [sizing, setSizing] = useState(false)
  const min = actions.includes('raise') ? (table.min_raise_to || table.current_bet || 1) : (table.min_bet || 1)
  const max = player.current_bet + player.chips
  const [amountInput, setAmountInput] = useState(String(min))
  const numericInput = Number(amountInput)
  const amount = Math.max(Math.min(Number.isFinite(numericInput) ? Math.round(numericInput) : min, max), Math.min(min, max))
  const presets = useMemo(() => getBetPresets({
    pot: table.pot,
    currentBet: table.current_bet || 0,
    playerBet: player.current_bet,
    min,
    max,
    bigBlind: table.big_blind || table.min_bet || 1,
  }), [table.pot, table.current_bet, table.big_blind, table.min_bet, player.current_bet, min, max])
  const label = (action: PokerAction) => translate(language, action === 'all_in' ? 'allIn' : action)
  const setSizingMode = (open: boolean) => { setSizing(open); onSizingChange?.(open) }
  const trigger = (action: PokerAction) => {
    if (!enabled) return
    if (action === 'bet' || action === 'raise') { setAmountInput(String(min)); setSizingMode(true) }
    else onAct(action)
  }
  const presetLabel = (id: string) => language === 'zh'
    ? ({ 'half-pot': '½池', 'three-quarter-pot': '¾池', pot: '满池', '3x': '3×', '4x': '4×', '6x': '6×', 'all-in': '全下' } as Record<string, string>)[id]
    : ({ 'half-pot': '½ pot', 'three-quarter-pot': '¾ pot', pot: 'Pot', '3x': '3×', '4x': '4×', '6x': '6×', 'all-in': 'All in' } as Record<string, string>)[id]
  return <>
    {sizing && <div className="bet-sheet" role="dialog" aria-label={translate(language, actions.includes('raise') ? 'raiseTo' : 'bet')}>
      <div className="sheet-handle" />
      <div className="bet-heading"><span>{translate(language, actions.includes('raise') ? 'raiseTo' : 'bet')}</span><strong>{formatMoney(amount, currency)}</strong></div>
      <div className="preset-row">{presets.map((preset) => <button key={preset.id} disabled={!enabled} aria-label={`${presetLabel(preset.id)} ${formatMoney(preset.amount, currency)}`} onClick={() => setAmountInput(String(preset.amount))}><span>{presetLabel(preset.id)}</span><strong>{formatMoney(preset.amount, currency)}</strong></button>)}</div>
      <label className="custom-bet-input"><span>{translate(language, 'customAmount')}</span><input aria-label={translate(language, 'customAmount')} disabled={!enabled} type="number" inputMode="numeric" min={Math.min(min, max)} max={max} step="1" value={amountInput} onChange={(event) => setAmountInput(event.target.value)} /></label>
      <div className="sheet-actions"><button onClick={() => setSizingMode(false)}>{translate(language, 'cancel')}</button><button disabled={!enabled} className="gold-button bet-confirm-button" onClick={() => { if (!enabled) return; onAct(actions.includes('raise') ? 'raise' : 'bet', amount); setSizingMode(false) }}><span>{translate(language, 'confirm')}</span><strong className="confirm-amount">{formatMoney(amount, currency)}</strong></button></div>
    </div>}
    {!sizing && <div className="action-rail" aria-label="Poker actions">
      <div className="turn-copy"><span className={enabled ? 'pulse-dot' : ''}/><strong>{enabled ? translate(language, 'yourTurn') : translate(language, 'spectating')}</strong></div>
      <div className="action-buttons">{actions.map((action) => <button key={action} disabled={!enabled} className={action === 'bet' || action === 'raise' ? 'gold-button' : action === 'all_in' ? 'all-in-button' : ''} onClick={() => trigger(action)}><span>{label(action)}</span>{action === 'call' && <small>{formatMoney(Math.min(player.chips, Math.max(0, (table.current_bet || 0) - player.current_bet)), currency)}</small>}</button>)}</div>
    </div>}
  </>
}
