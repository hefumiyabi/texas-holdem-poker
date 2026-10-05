import { useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { api } from './api'
import { GuestGate } from './components/GuestGate'
import { HomePage } from './pages/HomePage'
import { RoomPage } from './pages/RoomPage'
import { TablePage } from './pages/TablePage'
import { loadPreferences, savePreferences, type Preferences } from './preferences'
import type { User } from './types'

export default function App() {
  const [user, setUser] = useState<User | null>(null); const [checked, setChecked] = useState(false); const [error, setError] = useState<string | null>(null)
  const [preferences, setPreferences] = useState<Preferences>(() => loadPreferences(localStorage, window.matchMedia('(prefers-reduced-motion: reduce)').matches))
  useEffect(() => { api.me().then(({ player }) => setUser(player)).catch(() => undefined).finally(() => setChecked(true)) }, [])
  const updatePreferences = (next: Preferences) => { setPreferences(next); savePreferences(localStorage, next) }
  if (!checked) return <div className="boot-screen" aria-label="Loading">♠</div>
  if (!user) return <GuestGate language={preferences.language} error={error} onContinue={async (nickname) => { setError(null); try { const { player } = await api.createGuest(nickname); setUser(player) } catch (error) { setError(error instanceof Error ? error.message : String(error)) } }}/>
  return <BrowserRouter><Routes>
    <Route path="/" element={<HomePage user={user} language={preferences.language} onError={setError}/>} />
    <Route path="/room/:code" element={<RoomPage language={preferences.language}/>} />
    <Route path="/table/:code" element={<TablePage preferences={preferences} onPreferences={updatePreferences}/>} />
    <Route path="*" element={<HomePage user={user} language={preferences.language} onError={setError}/>} />
  </Routes></BrowserRouter>
}

