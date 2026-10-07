import { Plus, Spade } from '@phosphor-icons/react'
import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Socket } from 'socket.io-client'
import { ActionRail } from '../components/ActionRail'
import { BustedControls } from '../components/BustedControls'
import { ConnectionBanner } from '../components/ConnectionBanner'
import { GtoCoachCard } from '../components/GtoCoachCard'
import { HandResultCard } from '../components/HandResultCard'
import { HeroStack } from '../components/HeroStack'
import { LineupDrawer } from '../components/LineupDrawer'
import { PlayerSeat } from '../components/PlayerSeat'
import { PokerBoard } from '../components/PokerBoard'
import { SettingsDrawer } from '../components/SettingsDrawer'
import { TableHeader } from '../components/TableHeader'
import { formatActionDescription, formatActionError } from '../currency'
import { translate } from '../i18n'
import type { Preferences } from '../preferences'
import { createPokerSocket, TABLE_HEARTBEAT_MS } from '../socket'
import { initialTableState, tableReducer } from '../state/tableReducer'
import type { ActionErrorPayload, ResolvedActionPayload } from '../currency'
import type { BotPersona, RoomSnapshot } from '../types'

export function getSeatPositions(maxPlayers: number) {
  if (maxPlayers <= 2) return [{ left: '50%', top: '83%' }, { left: '50%', top: '9%' }]
  if (maxPlayers <= 4) return [
    { left: '50%', top: '83%' }, { left: '11%', top: '48%' },
    { left: '50%', top: '9%' }, { left: '89%', top: '48%' },
  ]
  if (maxPlayers <= 6) return [
    { left: '50%', top: '83%' }, { left: '12%', top: '64%' }, { left: '15%', top: '25%' },
    { left: '50%', top: '9%' }, { left: '85%', top: '25%' }, { left: '88%', top: '64%' },
  ]
  return [
    { left: '50%', top: '84%' }, { left: '25%', top: '78%' }, { left: '8%', top: '60%' },
    { left: '8%', top: '31%' }, { left: '29%', top: '10%' }, { left: '71%', top: '10%' },
    { left: '92%', top: '31%' }, { left: '92%', top: '60%' }, { left: '75%', top: '78%' },
  ].slice(0, maxPlayers)
}

export function TablePage({ preferences, onPreferences }: { preferences: Preferences; onPreferences: (preferences: Preferences) => void }) {
  const language = preferences.language; const { code = '' } = useParams(); const navigate = useNavigate()
  const [state, dispatch] = useReducer(tableReducer, initialTableState); const [settings, setSettings] = useState(false); const [lineup, setLineup] = useState(false); const [betSizing, setBetSizing] = useState(false); const [copied, setCopied] = useState(false); const [socket, setSocket] = useState<Socket | null>(null)
  const actionTimer = useRef<number | null>(null)
  useEffect(() => {
    const connection = createPokerSocket(); setSocket(connection)
    const snapshot = (payload: RoomSnapshot) => dispatch({ type: 'snapshot', snapshot: payload })
    connection.on('connect', () => { dispatch({ type: 'connection', status: 'connected' }); connection.emit('room:join', { join_code: code.toUpperCase() }) })
    connection.on('disconnect', () => dispatch({ type: 'connection', status: 'reconnecting' }))
    connection.io.on('reconnect_attempt', () => dispatch({ type: 'connection', status: 'reconnecting' }))
    for (const event of ['room:snapshot', 'hand:started', 'turn:changed', 'hand:completed']) connection.on(event, snapshot)
    connection.on('action:resolved', (payload: ResolvedActionPayload) => {
      if (actionTimer.current !== null) window.clearTimeout(actionTimer.current)
      dispatch({ type: 'action', description: formatActionDescription(payload, language) })
      actionTimer.current = window.setTimeout(() => dispatch({ type: 'clear-action' }), 1200)
    })
    connection.on('error', (payload: ActionErrorPayload) => dispatch({ type: 'error', message: formatActionError(payload, language) }))
    connection.on('room:left', () => navigate('/')); connection.on('room:dissolved', () => navigate('/'))
    connection.connect()
    const heartbeat = window.setInterval(() => connection.connected && connection.emit('room:heartbeat'), TABLE_HEARTBEAT_MS)
    return () => { window.clearInterval(heartbeat); if (actionTimer.current !== null) window.clearTimeout(actionTimer.current); connection.removeAllListeners(); connection.disconnect() }
  }, [code, language, navigate])
  const snapshot = state.snapshot; const table = snapshot?.table; const viewer = snapshot ? table?.players.find((player) => player.id === snapshot.viewer_id) : undefined
  const ordered = useMemo(() => {
    if (!table || !snapshot) return []
    const selfIndex = table.players.findIndex((player) => player.id === snapshot.viewer_id)
    return selfIndex < 0 ? table.players : [...table.players.slice(selfIndex), ...table.players.slice(0, selfIndex)]
  }, [table, snapshot])
  const act = (action: string, amount = 0) => socket?.emit('player:act', { action, amount, turn_token: table?.turn_token })
  const share = async () => { const url = snapshot?.room.invite_url || window.location.origin + `/room/${code.toUpperCase()}`; try { if (navigator.share) await navigator.share({ title: snapshot?.room.title, url }); else await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 1600) } catch { /* user cancelled */ } }
  if (!table || !snapshot || !viewer) return <main className="table-shell loading-table"><Spade weight="fill"/><p>{state.error || translate(language, 'loading')}</p><button onClick={() => navigate('/')}>{translate(language, 'back')}</button></main>
  const isTurn = table.current_player_id === snapshot.viewer_id
  const leave = () => { socket?.emit('room:leave'); navigate('/') }
  const level = snapshot.room.difficulty || 'intermediate'
  const maxPlayers = table.max_players || snapshot.room.max_players || Math.max(2, table.players.length)
  const seatPositions = getSeatPositions(maxPlayers)
  const currency = snapshot.room.currency || 'CNY'
  const betweenHands = table.game_stage === 'waiting' || table.game_stage === 'finished'
  const addBot = (persona: BotPersona) => socket?.emit('bot:add', { level, persona })
  const removeBot = (playerId: string) => socket?.emit('bot:remove', { player_id: playerId })
  const replaceBot = (playerId: string, persona: BotPersona) => socket?.emit('bot:replace', { player_id: playerId, level, persona })
  return <main className={`table-shell ${preferences.reducedMotion ? 'reduce-motion' : ''} ${betSizing ? 'sizing-open' : ''}`}>
    <ConnectionBanner status={state.connection} language={language}/>
    <TableHeader language={language} room={snapshot.room} table={table} copied={copied} onBack={leave} onMenu={() => setSettings(true)} onShare={share} onLineup={() => setLineup(true)} />
    <section className="poker-stage">
      <div className="ambient-ring" aria-hidden="true"/>
      <PokerBoard language={language} table={table} currency={currency} />
      <div className="seats-layer">
        {ordered.map((player, index) => <PlayerSeat key={player.id} language={language} currency={currency} player={player} self={player.id === snapshot.viewer_id} active={player.id === table.current_player_id} thinkingUntil={player.id === table.current_player_id ? snapshot.thinking_until : undefined} style={seatPositions[index]}/>) }
        {betweenHands && snapshot.room.is_host && Array.from({ length: Math.max(0, maxPlayers - ordered.length) }, (_, index) => <button key={`empty-${index}`} className="empty-table-seat" style={seatPositions[ordered.length + index]} onClick={() => setLineup(true)} aria-label={translate(language, 'emptySeat')}><Plus /></button>)}
      </div>
      <HeroStack player={viewer} currency={currency} />
      {state.lastAction && <div className="action-toast">{state.lastAction}</div>}
      {state.error && <button className="error-toast" onClick={() => dispatch({ type: 'clear-error' })}>{state.error}</button>}
      {snapshot.analysis && <GtoCoachCard language={language} analysis={snapshot.analysis}/>}
      {snapshot.last_hand_result && table.game_stage === 'finished' && <HandResultCard language={language} currency={currency} result={snapshot.last_hand_result} viewerId={snapshot.viewer_id}/>}
    </section>
    {viewer.chips <= 0 && betweenHands ? <BustedControls language={language} currency={currency} player={viewer} initialChips={snapshot.room.initial_chips || 1000} onRebuy={() => socket?.emit('player:rebuy')} onSpectate={() => socket?.emit('player:spectate')} onLeave={leave}/>
      : table.game_stage === 'waiting' ? <div className="host-controls">
      {snapshot.room.is_host && <><button onClick={() => setLineup(true)}><Plus/>{translate(language, 'lineup')}</button><button className="gold-button" disabled={!table.can_start} onClick={() => socket?.emit('hand:start')}><Spade weight="fill"/>{translate(language, 'startHand')}</button></>}
      {!snapshot.room.is_host && <p>{translate(language, 'waiting')}</p>}
    </div> : table.game_stage === 'finished'
      ? <div className="host-controls"><button className="gold-button" onClick={() => socket?.emit('round:vote')}><Spade/>{translate(language, 'nextHand')}</button></div>
      : <ActionRail language={language} currency={currency} table={table} player={viewer} enabled={isTurn} onAct={act} onSizingChange={setBetSizing}/>
    }
    {lineup && <LineupDrawer language={language} players={table.players} maxPlayers={maxPlayers} difficulty={level} host={Boolean(snapshot.room.is_host)} waiting={betweenHands} onClose={() => setLineup(false)} onAdd={addBot} onRemove={removeBot} onReplace={replaceBot} onShare={share} />}
    {settings && <SettingsDrawer preferences={preferences} onChange={onPreferences} onClose={() => setSettings(false)}/>} 
  </main>
}
