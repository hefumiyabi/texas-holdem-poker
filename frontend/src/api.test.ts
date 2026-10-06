import { afterEach, describe, expect, it, vi } from 'vitest'

import { api } from './api'

describe('friend room api', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates a private room with its currency, buy-in, and blinds', async () => {
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

    await api.createFriendRoom({ seatCount: 4, currency: 'JPY', initialChips: 200000, smallBlind: 500, bigBlind: 1000 })

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/rooms', {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify({
        title: '好友之夜',
        max_players: 4,
        currency: 'JPY',
        initial_chips: 200000,
        small_blind: 500,
        big_blind: 1000,
      }),
    })
  })
})
