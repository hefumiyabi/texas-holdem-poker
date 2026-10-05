import { describe, expect, it } from 'vitest'
import { loadPreferences } from './preferences'

describe('preferences', () => {
  it('defaults music off and respects reduced motion', () => {
    const preferences = loadPreferences({ getItem: () => null }, true)
    expect(preferences.musicEnabled).toBe(false)
    expect(preferences.soundEnabled).toBe(true)
    expect(preferences.reducedMotion).toBe(true)
    expect(preferences.language).toBe('zh')
  })
})
