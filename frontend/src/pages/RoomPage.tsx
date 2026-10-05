import { ArrowLeft, UsersThree } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { translate } from '../i18n'
import type { Language, RoomInfo } from '../types'

export function RoomPage({ language }: { language: Language }) {
  const { code = '' } = useParams(); const navigate = useNavigate()
  const [room, setRoom] = useState<RoomInfo | null>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  useEffect(() => { api.previewRoom(code.toUpperCase()).then(({ room }) => setRoom(room)).catch((error) => setError(error.message)) }, [code])
  const join = async () => { setBusy(true); try { await api.joinRoom(code.toUpperCase()); navigate(`/table/${code.toUpperCase()}`) } catch (error) { setError(error instanceof Error ? error.message : String(error)); setBusy(false) } }
  return <main className="preview-shell"><button className="back-button" onClick={() => navigate('/')}><ArrowLeft/> {translate(language, 'back')}</button>
    <section className="preview-card">
      <p className="eyebrow">{translate(language, 'preview')}</p>
      {error ? <><h1>{translate(language, 'roomNotFound')}</h1><p className="form-error" role="alert">{error}</p></> : !room ? <h1>{translate(language, 'loading')}</h1> : <>
        <span className="invite-code">{room.join_code}</span><h1>{room.title}</h1>
        <div className="preview-meta"><span>{translate(language, 'hostedBy')}<strong>{room.host?.nickname || '—'}</strong></span><span><UsersThree/><strong>{room.player_count || 0} / {room.max_players || 6}</strong></span></div>
        <button className="primary-button" disabled={busy} onClick={join}>{busy ? '…' : translate(language, 'enterTable')}</button>
      </>}
    </section>
  </main>
}

