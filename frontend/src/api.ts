import type { ChallengeConfig, RoomInfo, User } from './types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  const body = response.status === 204 ? null : await response.json()
  if (!response.ok) throw new Error(body?.message || `Request failed (${response.status})`)
  return body as T
}

export const api = {
  me: () => request<{ success: true; player: User }>('/api/v1/me'),
  createGuest: (nickname: string) => request<{ success: true; player: User }>('/api/v1/guest-sessions', { method: 'POST', body: JSON.stringify({ nickname }) }),
  logout: () => request<null>('/api/v1/guest-sessions/current', { method: 'DELETE' }),
  createRoom: (config?: ChallengeConfig) => request<{ success: true; room: RoomInfo }>('/api/v1/rooms', {
    method: 'POST',
    body: JSON.stringify(config ? {
      mode: 'bot_challenge',
      difficulty: config.difficulty,
      seat_count: config.seatCount,
      personas: config.personas,
    } : { title: '好友之夜', max_players: 6 }),
  }),
  previewRoom: (code: string) => request<{ success: true; room: RoomInfo }>(`/api/v1/rooms/${encodeURIComponent(code)}`),
  joinRoom: (code: string) => request<{ success: true; room: RoomInfo; player: User }>(`/api/v1/rooms/${encodeURIComponent(code)}/join`, { method: 'POST', body: '{}' }),
}
