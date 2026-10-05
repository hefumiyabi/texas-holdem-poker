import { WifiSlash } from '@phosphor-icons/react'
import { translate } from '../i18n'
import type { ConnectionState, Language } from '../types'

export function ConnectionBanner({ status, language }: { status: ConnectionState; language: Language }) {
  if (status === 'connected' || status === 'connecting') return null
  return <div className={`connection-banner ${status}`} role="status"><WifiSlash /> {translate(language, status === 'offline' ? 'offline' : 'reconnecting')}</div>
}

