import { ArrowUpRight, Robot, Spade, UsersThree } from '@phosphor-icons/react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { RoomCodeForm } from '../components/RoomCodeForm'
import { ChallengeSetup } from '../components/ChallengeSetup'
import { FriendRoomSetup } from '../components/FriendRoomSetup'
import { translate } from '../i18n'
import type { ChallengeConfig, FriendRoomConfig, Language, User } from '../types'

export function HomePage({ user, language, onError }: { user: User; language: Language; onError: (message: string) => void }) {
  const navigate = useNavigate()
  const [setupOpen, setSetupOpen] = useState(false)
  const [friendSetupOpen, setFriendSetupOpen] = useState(false)
  const create = async (config: ChallengeConfig) => { try { const { room } = await api.createRoom(config); navigate(`/table/${room.join_code}`) } catch (error) { const message = error instanceof Error ? error.message : String(error); onError(message); throw error } }
  const createFriendRoom = async (config: FriendRoomConfig) => { try { const { room } = await api.createFriendRoom(config); return room } catch (error) { const message = error instanceof Error ? error.message : String(error); onError(message); throw error } }
  return <main className="home-shell">
    <header className="home-header"><div className="brand-mark"><Spade weight="fill"/><span>{translate(language, 'brand')}</span></div><div className="mini-avatar">{Array.from(user.nickname)[0]?.toUpperCase()}</div></header>
    <section className="home-hero"><p className="eyebrow">{translate(language, 'soloChallenge')}</p><h1>{translate(language, 'welcome')}<br/><em>{user.nickname}</em></h1><p>{translate(language, 'challengeHero')}</p></section>
    <section className="room-grid">
      <button className="create-room-card" aria-label={translate(language, 'challengeBots')} onClick={() => setSetupOpen(true)}><span className="round-icon"><Robot weight="fill"/></span><div><small>01 — CHALLENGE</small><h2>{translate(language, 'challengeBots')}</h2><p>{translate(language, 'challengeHint')}</p></div><ArrowUpRight className="corner-arrow"/></button>
      <button className="create-room-card friend-room-card" aria-label={translate(language, 'createFriendRoom')} onClick={() => setFriendSetupOpen(true)}><span className="round-icon"><UsersThree weight="fill"/></span><div><small>02 — HOST</small><h2>{translate(language, 'createFriendRoom')}</h2><p>{translate(language, 'createFriendHint')}</p></div><ArrowUpRight className="corner-arrow"/></button>
      <article className="join-room-card"><span className="step-index">03 — JOIN</span><h2>{translate(language, 'joinRoom')}</h2><p>{translate(language, 'joinHint')}</p><RoomCodeForm language={language} onJoin={(code) => navigate(`/room/${code}`)} /></article>
    </section>
    <footer className="home-footer"><span>● {translate(language, 'live')}</span><span>{translate(language, 'secure')}</span></footer>
    {setupOpen && <ChallengeSetup language={language} onClose={() => setSetupOpen(false)} onStart={create} />}
    {friendSetupOpen && <FriendRoomSetup language={language} onClose={() => setFriendSetupOpen(false)} onCreate={createFriendRoom} onEnter={(room) => navigate(`/table/${room.join_code}`)} />}
  </main>
}
