import { useState, type FormEvent } from 'react'
import { ArrowRight } from '@phosphor-icons/react'
import { translate } from '../i18n'
import type { Language } from '../types'

export function RoomCodeForm({ language, onJoin }: { language: Language; onJoin: (code: string) => void }) {
  const [code, setCode] = useState('')
  const clean = code.replace(/[^a-zA-Z2-9]/g, '').toUpperCase().slice(0, 6)
  const submit = (event: FormEvent) => { event.preventDefault(); if (clean.length === 6) onJoin(clean) }
  return <form className="room-code-form" onSubmit={submit}>
    <label htmlFor="room-code">{translate(language, 'roomCode')}</label>
    <div className="code-input-row">
      <input id="room-code" inputMode="text" autoCapitalize="characters" autoComplete="off" maxLength={8} placeholder="A7K9Q2" value={code} onChange={(event) => setCode(event.target.value)} />
      <button className="icon-button" disabled={clean.length !== 6} aria-label={translate(language, 'joinRoom')}><ArrowRight /></button>
    </div>
  </form>
}
