import type { Language } from './types'

const messages = {
  zh: {
    brand: '暗河牌室', tagline: '一张私密牌桌，一局真正的德州。', nickname: '昵称', nicknameHint: '例如：River', enterRoom: '进入牌室',
    createRoom: '创建私密房', joinRoom: '加入好友房', roomCode: '房间码', welcome: '晚上好', privatePlay: '仅限邀请 · 虚拟筹码',
    createHint: '立即创建 6 人牌桌，再把邀请码发给好友。', joinHint: '输入六位邀请码', preview: '房间预览', hostedBy: '房主', players: '玩家',
    enterTable: '入座', roomNotFound: '房间不存在或已关闭', back: '返回', share: '分享', copied: '已复制', addBot: '补一位机器人', startHand: '开始发牌',
    waiting: '等待开局', pot: '底池', yourTurn: '轮到你了', spectating: '观战中', fold: '弃牌', check: '过牌', call: '跟注', bet: '下注', raise: '加注', allIn: '全下',
    reconnecting: '正在重新连接…', offline: '连接已断开，正在保留座位', settings: '设置', history: '记录', analysis: '分析', sound: '音效', music: '背景音乐', reducedMotion: '减少动态效果', language: '语言',
    nextHand: '准备下一局', leave: '离开牌桌', dissolve: '解散房间', live: '实时牌桌', secure: '服务器权威结算', loading: '正在准备牌桌…', retry: '重试', raiseTo: '加注到', cancel: '取消', confirm: '确认', close: '关闭',
    practiceOnly: '仅在单人与机器人练习时开放', analysisHint: '基础局面分析：不计牌，不代替你决策。', noHistory: '本局暂无已记录动作',
    soloChallenge: '单人挑战 · 公平机器人', challengeHero: '选择一桌有性格的对手。它们会读局、会诈唬，但绝不会偷看你的底牌。', challengeBots: '挑战机器人', challengeHint: '选择难度和对手阵容，马上开局。',
    setupChallenge: '设置机器人挑战', chooseOpponents: '选择你的对手', difficulty: '难度', casual: '休闲', regular: '常规', expert: '高手', casualHint: '打法直观', regularHint: '会读位置', expertHint: '近似 GTO',
    tableSize: '牌桌人数', buyIn: '带入', headsUp: '单挑', fourPlayers: '四人桌', sixPlayers: '六人桌', opponentLineup: '自动阵容', startChallenge: '开始挑战', creatingTable: '正在准备牌桌…', fairBotNote: '所有机器人公平游戏，不读取隐藏底牌。',
    balanced: '理性哥', aggressive: '深海鱼', tight: '冷静先生', caller: '小雨', tricky: '玫瑰',
    inviteFriend: '邀请好友', lineup: '对手阵容', opponents: '位对手', botThinking: '思考中', communityCards: '公共牌', emptySeat: '空座', emptySeats: '个空座', add: '添加', remove: '移除', change: '更换', betweenHandsOnly: '只能在两手牌之间调整阵容。',
  },
  en: {
    brand: 'NOCTURNE POKER', tagline: 'One private table. One proper game.', nickname: 'Nickname', nicknameHint: 'e.g. River', enterRoom: 'Enter the room',
    createRoom: 'Create private room', joinRoom: 'Join a friend', roomCode: 'Room code', welcome: 'Good evening', privatePlay: 'Invite only · Play chips',
    createHint: 'Open a six-seat table and share the invite code.', joinHint: 'Enter the six-character invite code', preview: 'Room preview', hostedBy: 'Host', players: 'Players',
    enterTable: 'Take a seat', roomNotFound: 'This room is unavailable', back: 'Back', share: 'Share', copied: 'Copied', addBot: 'Add a bot', startHand: 'Deal cards',
    waiting: 'Waiting to deal', pot: 'Pot', yourTurn: 'Your turn', spectating: 'Watching', fold: 'Fold', check: 'Check', call: 'Call', bet: 'Bet', raise: 'Raise', allIn: 'All in',
    reconnecting: 'Reconnecting…', offline: 'Connection lost. Your seat is being held.', settings: 'Settings', history: 'History', analysis: 'Analysis', sound: 'Sound effects', music: 'Background music', reducedMotion: 'Reduce motion', language: 'Language',
    nextHand: 'Ready for next hand', leave: 'Leave table', dissolve: 'Dissolve room', live: 'Live table', secure: 'Server-authoritative play', loading: 'Preparing your table…', retry: 'Retry', raiseTo: 'Raise to', cancel: 'Cancel', confirm: 'Confirm', close: 'Close',
    practiceOnly: 'Available only in solo bot practice', analysisHint: 'Basic table analysis only. No card counting or automated decisions.', noHistory: 'No recorded action in this hand yet',
    soloChallenge: 'Solo challenge · Fair bots', challengeHero: 'Pick a table of memorable opponents. They read the game and bluff, but never see your hidden cards.', challengeBots: 'Challenge bots', challengeHint: 'Choose a difficulty and lineup, then deal in.',
    setupChallenge: 'Set up bot challenge', chooseOpponents: 'Choose your opponents', difficulty: 'Difficulty', casual: 'Casual', regular: 'Regular', expert: 'Expert', casualHint: 'Straightforward', regularHint: 'Position-aware', expertHint: 'Approx. GTO',
    tableSize: 'Table size', buyIn: 'Buy-in', headsUp: 'Heads-up', fourPlayers: 'Four players', sixPlayers: 'Six players', opponentLineup: 'Auto lineup', startChallenge: 'Start challenge', creatingTable: 'Preparing table…', fairBotNote: 'All bots play fair and never inspect hidden cards.',
    balanced: 'Rational', aggressive: 'Deep Sea', tight: 'Mr Calm', caller: 'Rain', tricky: 'Rose',
    inviteFriend: 'Invite friend', lineup: 'Opponent lineup', opponents: 'opponents', botThinking: 'Thinking', communityCards: 'Community cards', emptySeat: 'Open seat', emptySeats: 'open seats', add: 'Add', remove: 'Remove', change: 'Change', betweenHandsOnly: 'The lineup can only change between hands.',
  },
} as const

export type MessageKey = keyof typeof messages.zh
export function translate(language: Language, key: MessageKey): string {
  return messages[language][key]
}
