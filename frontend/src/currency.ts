import type { CurrencyCode } from './types'

export function formatMoney(value: number, currency?: CurrencyCode): string {
  const symbol = currency === 'JPY' ? 'JP¥' : '¥'
  return `${symbol}${Math.trunc(value).toLocaleString('en-US')}`
}
