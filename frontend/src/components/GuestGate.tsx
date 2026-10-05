import { useState, type FormEvent } from 'react'
import { Spade, ShieldCheck } from '@phosphor-icons/react'
import { translate } from '../i18n'
import type { Language } from '../types'

export function GuestGate({ language, onContinue, error }: { language: Language; onContinue: (nickname: string) => Promise<void>; error?: string | null }) {
  const [nickname, setNickname] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const clean = nickname.trim()
    if (!clean || busy) return
    setBusy(true)
    try { await onContinue(clean) } finally { setBusy(false) }
  }
  return <main className="gate-shell">
    <div className="atmosphere" aria-hidden="true" />
    <section className="gate-card">
      <div className="brand-mark"><Spade weight="fill" /><span>{translate(language, 'brand')}</span></div>
      <p className="eyebrow"><ShieldCheck weight="fill" /> {translate(language, 'privatePlay')}</p>
      <h1>{language === 'zh' ? '把好友叫上，' : 'Bring your people.'}<br/><em>{language === 'zh' ? '牌桌已经准备好。' : 'The table is ready.'}</em></h1>
      <p className="lede">{translate(language, 'tagline')}</p>
      <form onSubmit={submit} className="gate-form">
        <label htmlFor="nickname">{translate(language, 'nickname')}</label>
        <input id="nickname" maxLength={20} autoComplete="nickname" placeholder={translate(language, 'nicknameHint')} value={nickname} onChange={(event) => setNickname(event.target.value)} />
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-button" disabled={!nickname.trim() || busy}>{busy ? '…' : translate(language, 'enterRoom')}</button>
      </form>
      <p className="fine-print">18+ · {language === 'zh' ? '仅供娱乐，不涉及真实货币' : 'Entertainment only. No real money.'}</p>
    </section>
  </main>
}

