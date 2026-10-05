import { ArrowUpRight, Plus, Spade } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { RoomCodeForm } from '../components/RoomCodeForm'
import { translate } from '../i18n'
import type { Language, User } from '../types'

export function HomePage({ user, language, onError }: { user: User; language: Language; onError: (message: string) => void }) {
  const navigate = useNavigate()
  const create = async () => { try { const { room } = await api.createRoom(); navigate(`/table/${room.join_code}`) } catch (error) { onError(error instanceof Error ? error.message : String(error)) } }
  return <main className="home-shell">
    <header className="home-header"><div className="brand-mark"><Spade weight="fill"/><span>{translate(language, 'brand')}</span></div><div className="mini-avatar">{Array.from(user.nickname)[0]?.toUpperCase()}</div></header>
    <section className="home-hero"><p className="eyebrow">{translate(language, 'privatePlay')}</p><h1>{translate(language, 'welcome')}<br/><em>{user.nickname}</em></h1><p>{language === 'zh' ? '没有大厅、没有喇叭的商城。只有你和朋友的牌桌。' : 'No noisy lobby. No store. Just your table and your friends.'}</p></section>
    <section className="room-grid">
      <button className="create-room-card" onClick={create}><span className="round-icon"><Plus/></span><div><small>01 — HOST</small><h2>{translate(language, 'createRoom')}</h2><p>{translate(language, 'createHint')}</p></div><ArrowUpRight className="corner-arrow"/></button>
      <article className="join-room-card"><span className="step-index">02 — JOIN</span><h2>{translate(language, 'joinRoom')}</h2><p>{translate(language, 'joinHint')}</p><RoomCodeForm language={language} onJoin={(code) => navigate(`/room/${code}`)} /></article>
    </section>
    <footer className="home-footer"><span>● {translate(language, 'live')}</span><span>{translate(language, 'secure')}</span></footer>
  </main>
}

