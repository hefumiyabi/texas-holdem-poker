import { describe, expect, it } from 'vitest'
import { initialTableState, tableReducer } from './tableReducer'

describe('tableReducer', () => {
  it('replaces the authoritative snapshot and clears reconnect state', () => {
    const snapshot = {
      viewer_id: 'p1',
      room: { id: 'r1', join_code: 'ABCDEF', title: 'Friends', is_host: true },
      table: { id: 'r1', game_stage: 'waiting', players: [], community_cards: [], pot: 0 },
    }

    const state = tableReducer({ ...initialTableState, connection: 'reconnecting' }, { type: 'snapshot', snapshot })

    expect(state.snapshot).toEqual(snapshot)
    expect(state.connection).toBe('connected')
    expect(state.error).toBeNull()
  })

  it('keeps the latest server error visible', () => {
    const state = tableReducer(initialTableState, { type: 'error', message: '不是您的回合' })
    expect(state.error).toBe('不是您的回合')
  })

  it('clears transient action copy explicitly and when a hand completes', () => {
    const withAction = tableReducer(initialTableState, { type: 'action', description: '跟注 20' })
    expect(tableReducer(withAction, { type: 'clear-action' }).lastAction).toBeNull()

    const finished = {
      viewer_id: 'p1',
      room: { id: 'r1', join_code: 'ABCDEF', title: 'Friends', is_host: true },
      table: { id: 'r1', game_stage: 'finished', players: [], community_cards: [], pot: 0 },
    }
    expect(tableReducer(withAction, { type: 'snapshot', snapshot: finished }).lastAction).toBeNull()
  })
})
