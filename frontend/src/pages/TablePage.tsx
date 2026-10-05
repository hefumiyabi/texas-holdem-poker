import { ArrowLeft, ChartDonut, Copy, GearSix, ListBullets, Plus, ShareNetwork, Spade, UserPlus } from '@phosphor-icons/react'
import { useEffect, useMemo, useReducer, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Socket } from 'socket.io-client'
import { ActionRail } from '../components/ActionRail'
import { ConnectionBanner } from '../components/ConnectionBanner'
import { InfoDrawer } from '../components/InfoDrawer'
import { PlayerSeat } from '../components/PlayerSeat'
import { PlayingCard } from '../components/PlayingCard'
import { SettingsDrawer } from '../components/SettingsDrawer'
import { translate } from '../i18n'
import type { Preferences } from '../preferences'
import { createPokerSocket } from '../socket'
import { initialTableState, tableReducer } from '../state/tableReducer'
import type { RoomSnapshot } from '../types'

const seatPositions = [
  { left: '50%', top: '82%' }, { left: '13%', top: '67%' }, { left: '8%', top: '30%' },
  { left: '30%', top: '10%' }, { left: '70%', top: '10%' }, { left: '92%', top: '30%' },
  { left: '87%', top: '67%' }, { left: '70%', top: '84%' }, { left: '30%', top: '84%' },
]

export function TablePage({ preferences, onPreferences }: { preferences: Preferences; onPreferences: (preferences: Preferences) => void }) {
  const language = preferences.language; const { code = '' } = useParams(); const navigate = useNavigate()
  const [state, dispatch] = useReducer(tableReducer, initialTableState); const [settings, setSettings] = useState(false); const [panel, setPanel] = useState<'analysis' | 'history' | null>(null); const [copied, setCopied] = useState(false); const [socket, setSocket] = useState<Socket | null>(null)
  useEffect(() => {
    const connection = createPokerSocket(); setSocket(connection)
    const snapshot = (payload: RoomSnapshot) => dispatch({ type: 'snapshot', snapshot: payload })
    connection.on('connect', () => { dispatch({ type: 'connection', status: 'connected' }); connection.emit('room:join', { join_code: code.toUpperCase() }) })
    connection.on('disconnect', () => dispatch({ type: 'connection', status: 'reconnecting' }))
    connection.io.on('reconnect_attempt', () => dispatch({ type: 'connection', status: 'reconnecting' }))
    for (const event of ['room:snapshot', 'hand:started', 'turn:changed', 'hand:completed']) connection.on(event, snapshot)
    connection.on('action:resolved', (payload: { description?: string }) => dispatch({ type: 'action', description: payload.description || '' }))
    connection.on('error', (payload: { message?: string }) => dispatch({ type: 'error', message: payload.message || 'Error' }))
    connection.on('room:left', () => navigate('/')); connection.on('room:dissolved', () => navigate('/'))
    connection.connect()
    return () => { connection.removeAllListeners(); connection.disconnect() }
  }, [code, navigate])
  const snapshot = state.snapshot; const table = snapshot?.table; const viewer = snapshot ? table?.players.find((player) => player.id === snapshot.viewer_id) : undefined
  const ordered = useMemo(() => {
    if (!table || !snapshot) return []
    const selfIndex = table.players.findIndex((player) => player.id === snapshot.viewer_id)
    return selfIndex < 0 ? table.players : [...table.players.slice(selfIndex), ...table.players.slice(0, selfIndex)]
  }, [table, snapshot])
  const act = (action: string, amount = 0) => socket?.emit('player:act', { action, amount })
  const share = async () => { const url = snapshot?.room.invite_url || window.location.origin + `/room/${code.toUpperCase()}`; try { if (navigator.share) await navigator.share({ title: snapshot?.room.title, url }); else await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 1600) } catch { /* user cancelled */ } }
  if (!table || !snapshot || !viewer) return <main className="table-shell loading-table"><Spade weight="fill"/><p>{state.error || translate(language, 'loading')}</p><button onClick={() => navigate('/')}>{translate(language, 'back')}</button></main>
  const isTurn = table.current_player_id === snapshot.viewer_id
  const botPractice = table.players.filter((player) => !player.is_bot).length === 1
  const panelLines = panel === 'analysis'
    ? [translate(language, 'analysisHint'), `${translate(language, 'pot')}: ${table.pot.toLocaleString()}`, `${translate(language, 'players')}: ${table.players.length}`, table.game_stage.replace('_', ' ').toUpperCase()]
    : [state.lastAction || translate(language, 'noHistory'), `#${table.hand_number || 0} · ${table.game_stage.replace('_', ' ').toUpperCase()}`]
  return <main className={`table-shell ${preferences.reducedMotion ? 'reduce-motion' : ''}`}>
    <ConnectionBanner status={state.connection} language={language}/>
    <header className="table-topbar">
      <button className="plain-icon" onClick={() => { socket?.emit('room:leave'); navigate('/') }} aria-label={translate(language, 'leave')}><ArrowLeft/></button>
      <div className="room-identity"><small>{translate(language, 'live')} · #{table.hand_number || 0}</small><strong>{snapshot.room.title}</strong></div>
      <button className="code-pill" onClick={share}>{copied ? translate(language, 'copied') : snapshot.room.join_code}<Copy/></button>
    </header>
    <section className="poker-stage">
      <div className="ambient-ring" aria-hidden="true"/>
      <div className="poker-table" aria-label="Poker table">
        <div className="felt-grain" aria-hidden="true"/>
        <div className="table-center">
          <span className="pot-label">{translate(language, 'pot')}</span><strong className="pot-value"><i/>{table.pot.toLocaleString()}</strong>
          <div className="community-cards">{Array.from({ length: 5 }, (_, index) => table.community_cards[index] ? <PlayingCard key={index} card={table.community_cards[index]}/> : <span className="empty-card" key={index}/>)}</div>
          <small>{table.game_stage === 'waiting' ? translate(language, 'waiting') : table.game_stage.replace('_', ' ').toUpperCase()}</small>
        </div>
      </div>
      <div className="seats-layer">{ordered.map((player, index) => <PlayerSeat key={player.id} player={player} self={player.id === snapshot.viewer_id} active={player.id === table.current_player_id} style={seatPositions[index]}/>)}</div>
      <div className="hero-hand" aria-label="Your hand"><div>{viewer.hole_cards?.length ? viewer.hole_cards.map((card, index) => <PlayingCard key={index} card={card}/>) : <><PlayingCard hidden/><PlayingCard hidden/></>}</div></div>
      {state.lastAction && <div className="action-toast">{state.lastAction}</div>}
      {state.error && <button className="error-toast" onClick={() => dispatch({ type: 'clear-error' })}>{state.error}</button>}
    </section>
    {table.game_stage === 'waiting' ? <div className="host-controls">
      {snapshot.room.is_host && <><button onClick={() => socket?.emit('bot:add', { level: 'beginner' })}><UserPlus/>{translate(language, 'addBot')}</button><button className="gold-button" disabled={!table.can_start} onClick={() => socket?.emit('hand:start')}><Spade weight="fill"/>{translate(language, 'startHand')}</button></>}
      {!snapshot.room.is_host && <p>{translate(language, 'waiting')}</p>}
    </div> : table.game_stage === 'finished' ? <div className="host-controls"><button className="gold-button" onClick={() => socket?.emit('round:vote')}><Spade/>{translate(language, 'nextHand')}</button></div> : <ActionRail language={language} table={table} player={viewer} enabled={isTurn} onAct={act}/>} 
    <nav className="table-tools" aria-label="Table tools"><button disabled={!botPractice} title={!botPractice ? translate(language, 'practiceOnly') : undefined} onClick={() => setPanel('analysis')}><ChartDonut/><span>{translate(language, 'analysis')}</span></button><button onClick={() => setPanel('history')}><ListBullets/><span>{translate(language, 'history')}</span></button><button onClick={share}><ShareNetwork/><span>{translate(language, 'share')}</span></button><button onClick={() => setSettings(true)}><GearSix/><span>{translate(language, 'settings')}</span></button></nav>
    {panel && <InfoDrawer title={translate(language, panel)} lines={panelLines} closeLabel={translate(language, 'close')} onClose={() => setPanel(null)}/>}
    {settings && <SettingsDrawer preferences={preferences} onChange={onPreferences} onClose={() => setSettings(false)}/>} 
  </main>
}
