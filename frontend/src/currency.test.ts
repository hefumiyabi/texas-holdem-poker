import { describe, expect, it } from 'vitest'

import { formatActionDescription, formatActionError, formatMoney } from './currency'

describe('formatMoney', () => {
  it('uses the approved CNY and JPY labels with thousands separators', () => {
    expect(formatMoney(1000, 'CNY')).toBe('¥1,000')
    expect(formatMoney(200000, 'JPY')).toBe('JP¥200,000')
  })

  it('falls back safely to CNY for an absent legacy currency', () => {
    expect(formatMoney(4980, undefined)).toBe('¥4,980')
  })

  it('formats structured resolved actions without hard-coded dollars', () => {
    expect(formatActionDescription({ action: 'raise', amount: 300, target_amount: 400, currency: 'JPY' }, 'zh')).toBe('加注到 JP¥400')
    expect(formatActionDescription({ action: 'call', amount: 100, target_amount: 200, currency: 'CNY' }, 'en')).toBe('Call ¥100')
    expect(formatActionDescription({ action: 'fold', amount: 0, target_amount: 100, currency: 'JPY' }, 'zh')).toBe('弃牌')
  })

  it('formats structured minimum errors in the selected table currency', () => {
    expect(formatActionError({ message: '最小加注', action: 'raise', minimum: 400, currency: 'JPY' }, 'zh')).toBe('最小加注到 JP¥400')
    expect(formatActionError({ message: 'Minimum bet', action: 'bet', minimum: 20, currency: 'CNY' }, 'en')).toBe('Minimum bet ¥20')
    expect(formatActionError({ message: '行动失败' }, 'zh')).toBe('行动失败')
  })
})
