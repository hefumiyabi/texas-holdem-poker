import { io } from 'socket.io-client'

export function createPokerSocket() {
  return io({ autoConnect: false, transports: ['websocket', 'polling'], withCredentials: true, reconnectionDelay: 600, reconnectionDelayMax: 3000 })
}

