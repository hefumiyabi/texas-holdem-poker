import type { ConnectionState, RoomSnapshot } from '../types'

export interface TableState {
  snapshot: RoomSnapshot | null
  connection: ConnectionState
  error: string | null
  lastAction: string | null
}

export type TableEvent =
  | { type: 'snapshot'; snapshot: RoomSnapshot }
  | { type: 'connection'; status: ConnectionState }
  | { type: 'error'; message: string }
  | { type: 'action'; description: string }
  | { type: 'clear-error' }

export const initialTableState: TableState = { snapshot: null, connection: 'connecting', error: null, lastAction: null }

export function tableReducer(state: TableState, event: TableEvent): TableState {
  switch (event.type) {
    case 'snapshot': return { ...state, snapshot: event.snapshot, connection: 'connected', error: null }
    case 'connection': return { ...state, connection: event.status }
    case 'error': return { ...state, error: event.message }
    case 'action': return { ...state, lastAction: event.description }
    case 'clear-error': return { ...state, error: null }
  }
}

