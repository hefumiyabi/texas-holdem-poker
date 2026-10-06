import { describe, expect, it } from 'vitest'

import { formatMoney } from './currency'

describe('formatMoney', () => {
  it('uses the approved CNY and JPY labels with thousands separators', () => {
    expect(formatMoney(1000, 'CNY')).toBe('¥1,000')
    expect(formatMoney(200000, 'JPY')).toBe('JP¥200,000')
  })

  it('falls back safely to CNY for an absent legacy currency', () => {
    expect(formatMoney(4980, undefined)).toBe('¥4,980')
  })
})
