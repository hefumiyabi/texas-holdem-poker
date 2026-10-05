import type { Language } from './types'

export interface Preferences {
  language: Language
  soundEnabled: boolean
  musicEnabled: boolean
  reducedMotion: boolean
}

type StorageLike = Pick<Storage, 'getItem'>

export function loadPreferences(storage: StorageLike, systemReducedMotion = false): Preferences {
  try {
    const saved = storage.getItem('poker-preferences')
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<Preferences>
      return {
        language: parsed.language === 'en' ? 'en' : 'zh',
        soundEnabled: parsed.soundEnabled !== false,
        musicEnabled: parsed.musicEnabled === true,
        reducedMotion: parsed.reducedMotion ?? systemReducedMotion,
      }
    }
  } catch { /* ignore damaged local preferences */ }
  return { language: 'zh', soundEnabled: true, musicEnabled: false, reducedMotion: systemReducedMotion }
}

export function savePreferences(storage: Pick<Storage, 'setItem'>, preferences: Preferences) {
  storage.setItem('poker-preferences', JSON.stringify(preferences))
}

