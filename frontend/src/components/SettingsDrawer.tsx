import { Globe, MusicNotes, SpeakerHigh, WaveSine, X } from '@phosphor-icons/react'
import { translate } from '../i18n'
import type { Preferences } from '../preferences'

export function SettingsDrawer({ preferences, onChange, onClose }: { preferences: Preferences; onChange: (preferences: Preferences) => void; onClose: () => void }) {
  const t = (key: Parameters<typeof translate>[1]) => translate(preferences.language, key)
  const toggle = (key: keyof Preferences) => onChange({ ...preferences, [key]: !preferences[key] })
  return <div className="drawer-backdrop" onClick={onClose}>
    <section className="settings-drawer" role="dialog" aria-label={t('settings')} onClick={(event) => event.stopPropagation()}>
      <div className="drawer-header"><h2>{t('settings')}</h2><button className="plain-icon" onClick={onClose} aria-label={t('cancel')}><X /></button></div>
      <button className="setting-row" onClick={() => toggle('soundEnabled')}><SpeakerHigh/><span>{t('sound')}</span><i className={preferences.soundEnabled ? 'on' : ''}/></button>
      <button className="setting-row" onClick={() => toggle('musicEnabled')}><MusicNotes/><span>{t('music')}</span><i className={preferences.musicEnabled ? 'on' : ''}/></button>
      <button className="setting-row" onClick={() => toggle('reducedMotion')}><WaveSine/><span>{t('reducedMotion')}</span><i className={preferences.reducedMotion ? 'on' : ''}/></button>
      <button className="setting-row" onClick={() => onChange({ ...preferences, language: preferences.language === 'zh' ? 'en' : 'zh' })}><Globe/><span>{t('language')}</span><b>{preferences.language === 'zh' ? '中文' : 'English'}</b></button>
    </section>
  </div>
}

