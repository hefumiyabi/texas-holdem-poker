import { describe, expect, it } from 'vitest'
import { translate } from './i18n'

describe('translate', () => {
  it('defaults to Chinese and supports English core copy', () => {
    expect(translate('zh', 'createRoom')).toBe('创建私密房')
    expect(translate('en', 'createRoom')).toBe('Create private room')
  })
})
