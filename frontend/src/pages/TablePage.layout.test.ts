import { describe, expect, it } from 'vitest'
import { getSeatPositions } from './TablePage'
import '../styles.css'

describe('getSeatPositions', () => {
  it.each([2, 4, 6, 9])('provides a unique coordinate for every seat in a %i-player table', (count) => {
    const positions = getSeatPositions(count)
    expect(positions).toHaveLength(count)
    expect(new Set(positions.map((position) => `${position.left}:${position.top}`)).size).toBe(count)
  })
})

describe('short landscape table layout', () => {
  it('reserves clear mobile and short-landscape lanes for the hero chips and cards', () => {
    const css = Array.from(document.styleSheets)
      .flatMap((sheet) => Array.from(sheet.cssRules))
      .map((rule) => rule.cssText)
      .join('\n')
      .replace(/\s+/g, '')

    expect(css).toContain('@media(min-width:701px)and(max-height:760px)')
    expect(css).toContain('.hero-stack{bottom:80px;}')
    expect(css).toContain('.player-seat.self{transform:translate(-50%,-160%);}')
    expect(css).toContain('.player-seat.self{transform:translate(-50%,-200%);}')
    expect(css).toContain('@media(max-width:700px)')
    expect(css).toContain('.hero-stack{bottom:46px;}')
    expect(css).toContain('.player-seat.self{transform:translate(-50%,-140%);}')
  })
})

describe('busted action readability', () => {
  it('uses an opaque high-contrast treatment for the rebuy button', () => {
    const rules = Array.from(document.styleSheets)
      .flatMap((sheet) => Array.from(sheet.cssRules))
    const rule = rules.find((candidate) =>
      'selectorText' in candidate && candidate.selectorText === '.busted-actions .rebuy-button'
    ) as CSSStyleRule | undefined

    expect(rule).toBeDefined()
    expect(rule?.style.fontSize).toBe('14px')
    expect(rule?.style.fontWeight).toBe('800')
    expect(rule?.style.color).toBe('rgb(23, 17, 8)')
    expect(rule?.style.background).toBe('rgb(240, 207, 122)')
    expect(rule?.style.opacity).toBe('1')
    expect(rule?.style.textShadow).toBe('none')
  })
})
