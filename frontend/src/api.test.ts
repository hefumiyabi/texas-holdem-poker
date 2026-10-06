import { afterEach, describe, expect, it, vi } from 'vitest'

import { api } from './api'

describe('friend room api', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates a private room with the selected seats and buy-in', async () => {
    const room = {
      join_code: 'ABC234',
      title: '好友之夜',
      max_players: 4,
      initial_chips: 5000,
    }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ success: true, room }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await api.createFriendRoom({ seatCount: 4, initialChips: 5000 })

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/rooms', {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify({
        title: '好友之夜',
        max_players: 4,
        initial_chips: 5000,
      }),
    })
  })
})
