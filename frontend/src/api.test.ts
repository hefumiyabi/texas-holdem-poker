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

    await api.createFriendRoom({ seatCount: 4, currency: 'JPY', initialChips: 200000, smallBlind: 500, bigBlind: 1000, rebuyLimit: 'unlimited' })

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
        rebuy_limit: 'unlimited',
      }),
    })
  })

  it('serializes the human rebuy allowance for a bot challenge', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ success: true, room: { join_code: 'BOT234', title: '人格牌局' } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await api.createRoom({
      difficulty: 'advanced',
      seatCount: 2,
      initialChips: 1000,
      personas: ['aggressive'],
      rebuyLimit: 2,
    })

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      mode: 'bot_challenge',
      difficulty: 'advanced',
      seat_count: 2,
      initial_chips: 1000,
      personas: ['aggressive'],
      rebuy_limit: 2,
    })
  })
})
