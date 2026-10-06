import type { CurrencyCode, Language } from './types'

export interface ResolvedActionPayload {
  action: string
  amount: number
  target_amount?: number
  currency?: CurrencyCode
}

export interface ActionErrorPayload {
  message?: string
  action?: string
  minimum?: number
  currency?: CurrencyCode
}

export function formatMoney(value: number, currency?: CurrencyCode): string {
  const symbol = currency === 'JPY' ? 'JP¥' : '¥'
  return `${symbol}${Math.trunc(value).toLocaleString('en-US')}`
}

export function formatActionDescription(payload: ResolvedActionPayload, language: Language): string {
  const labels = language === 'zh'
    ? { fold: '弃牌', check: '过牌', call: '跟注', bet: '下注', raise: '加注到', all_in: '全下' }
    : { fold: 'Fold', check: 'Check', call: 'Call', bet: 'Bet', raise: 'Raise to', all_in: 'All in' }
  const label = labels[payload.action as keyof typeof labels] || payload.action
  if (payload.action === 'fold' || payload.action === 'check') return label
  const amount = payload.action === 'bet' || payload.action === 'raise'
    ? payload.target_amount ?? payload.amount
    : payload.amount
  return `${label} ${formatMoney(amount, payload.currency)}`
}

export function formatActionError(payload: ActionErrorPayload, language: Language): string {
  if (typeof payload.minimum !== 'number') return payload.message || 'Error'
  const isBet = payload.action === 'bet'
  const label = language === 'zh'
    ? (isBet ? '最小下注' : '最小加注到')
    : (isBet ? 'Minimum bet' : 'Minimum raise to')
  return `${label} ${formatMoney(payload.minimum, payload.currency)}`
}
