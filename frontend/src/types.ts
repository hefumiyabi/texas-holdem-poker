export type Language = 'zh' | 'en'
export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'offline'
export type BotDifficulty = 'beginner' | 'intermediate' | 'advanced'
export type BotPersona = 'balanced' | 'aggressive' | 'tight' | 'caller' | 'tricky'

export interface ChallengeConfig {
  difficulty: BotDifficulty
  seatCount: 2 | 4 | 6
  personas: BotPersona[]
}

export interface User {
  id: string
  nickname: string
  chips: number
}

export interface Card {
  suit: '♥' | '♦' | '♣' | '♠'
  rank: string
  value?: number
}

export interface Player {
  id: string
  nickname: string
  chips: number
  is_bot: boolean
  status: string
  current_bet: number
  total_bet: number
  is_dealer: boolean
  is_small_blind: boolean
  is_big_blind: boolean
  has_acted: boolean
  hole_cards?: Card[]
  bot_level?: BotDifficulty
  bot_persona?: BotPersona
  persona_label?: string
}

export interface RoomInfo {
  id?: string
  join_code: string
  title: string
  is_host?: boolean
  invite_url?: string
  small_blind?: number
  big_blind?: number
  max_players?: number
  initial_chips?: number
  player_count?: number
  host?: { id?: string; nickname: string } | null
  mode?: 'private' | 'bot_challenge'
  difficulty?: BotDifficulty | null
}

export interface TableInfo {
  id: string
  title?: string
  small_blind?: number
  big_blind?: number
  max_players?: number
  game_stage: string
  hand_number?: number
  community_cards: Card[]
  pot: number
  current_bet?: number
  current_player_id?: string | null
  min_bet?: number
  min_raise_to?: number
  players: Player[]
  can_start?: boolean
}

export interface RoomSnapshot {
  viewer_id: string
  room: RoomInfo
  table: TableInfo
}
