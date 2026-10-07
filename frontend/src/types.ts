export type Language = 'zh' | 'en'
export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'offline'
export type BotDifficulty = 'beginner' | 'intermediate' | 'advanced'
export type BotPersona = 'balanced' | 'aggressive' | 'tight' | 'caller' | 'tricky'
export type CurrencyCode = 'CNY' | 'JPY'
export type RebuyLimit = 0 | 1 | 2 | 3 | 'unlimited'

export interface ChallengeConfig {
  difficulty: BotDifficulty
  seatCount: 2 | 4 | 6
  initialChips: 1000 | 5000 | 10000
  personas: BotPersona[]
  rebuyLimit: RebuyLimit
}

export interface FriendRoomConfig {
  seatCount: 2 | 4 | 6
  currency: CurrencyCode
  initialChips: number
  smallBlind: number
  bigBlind: number
  rebuyLimit: RebuyLimit
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
  connected?: boolean
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
  rebuy_limit?: RebuyLimit
  rebuys_used?: number
  rebuys_remaining?: number | 'unlimited'
  can_rebuy?: boolean
  tournament_status?: 'active' | 'busted' | 'spectating' | 'eliminated'
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
  currency?: CurrencyCode
  rebuy_limit?: RebuyLimit
}

export interface TableInfo {
  id: string
  title?: string
  small_blind?: number
  big_blind?: number
  max_players?: number
  game_stage: string
  hand_number?: number
  blind_level?: number
  hands_until_blind_increase?: number
  blind_seconds_remaining?: number
  next_small_blind?: number
  next_big_blind?: number
  tournament_paused?: boolean
  community_cards: Card[]
  pot: number
  current_bet?: number
  current_player_id?: string | null
  turn_token?: string | null
  action_revision?: number
  min_bet?: number
  min_raise_to?: number
  players: Player[]
  can_start?: boolean
}

export interface Advice {
  equity: number
  pot_odds: number
  recommended_action: 'fold' | 'check' | 'call' | 'raise'
  reason: string
  sample_size: number
}

export interface HandResultWinner {
  player_id?: string
  nickname: string
  amount: number
  chips: number
}

export interface ShowdownPlayer {
  player_id?: string
  nickname: string
  is_bot: boolean
  hole_cards: Card[]
  hand_description: string
  hand_name: string
  rank: number
  result: string
  winnings: number
  returned: number
  final_chips: number
}

export interface PlayerHandResult {
  player_id: string
  nickname: string
  is_bot: boolean
  invested: number
  payout: number
  net: number
  starting_chips: number
  final_chips: number
  revealed: boolean
  hole_cards?: Card[]
  hand_name?: string
  hand_description?: string
}

export interface HandResult {
  is_showdown: boolean
  win_reason: string
  pot: number
  community_cards: Card[]
  winners: HandResultWinner[]
  showdown_players: ShowdownPlayer[]
  player_results: PlayerHandResult[]
  pots: { amount: number; winners: string[] }[]
}

export interface RoomSnapshot {
  viewer_id: string
  room: RoomInfo
  table: TableInfo
  analysis?: Advice
  last_hand_result?: HandResult
  thinking_until?: number
}
