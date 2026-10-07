import { io } from 'socket.io-client'

export const TABLE_HEARTBEAT_MS = 5 * 60 * 1000

export function createPokerSocket() {
  return io({ autoConnect: false, transports: ['websocket', 'polling'], withCredentials: true, reconnectionDelay: 600, reconnectionDelayMax: 3000 })
}
