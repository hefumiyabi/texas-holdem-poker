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
    humanRebuys: '真人补码次数', humanRebuysHint: '仅真人玩家可补码，机器人淘汰后不会补码。', rebuyNone: '不允许', rebuyOnce: '1 次', rebuyTwice: '2 次', rebuyThree: '3 次', rebuyUnlimited: '无限',
    bustedOptions: '筹码用完后的选择', chipsGone: '筹码已用完', rebuy: '重新买入', keepWatching: '继续观看', watchNextHand: '观看下一局', exitTable: '退出牌桌', watchingNow: '正在观战', rebuyRemaining: '还可重新买入 {count} 次', rebuyUnlimitedRemaining: '可不限次数重新买入', rebuyExhausted: '重新买入次数已用完',
    balanced: '理性哥', aggressive: '深海鱼', tight: '冷静先生', caller: '小雨', tricky: '玫瑰',
    createFriendRoom: '创建好友房', createFriendHint: '先选牌桌人数与带入，再把邀请码发给好友。', setupFriendRoom: '设置好友牌桌', friendsOnly: '好友私密局', chooseTable: '选择牌桌设置', friendRoomHint: '房间创建后不会立即开局，你可以先邀请好友。', createTable: '创建牌桌', roomReady: '牌桌已创建', shareCodeHint: '把房间码或邀请链接发给好友', copyInvite: '复制邀请链接', systemShare: '系统分享', enterCreatedTable: '进入牌桌', inviteMessage: '来我的私密德州牌桌一起玩', copyFailed: '复制失败，请手动分享房间码。', shareFailed: '暂时无法分享，请复制邀请链接。', currency: '筹码币种', cny: '人民币', jpy: '日元', customAmount: '自定义金额', customBuyIn: '自定义带入', blinds: '盲注设置', smallBlind: '小盲', bigBlind: '大盲', invalidBuyIn: '带入金额必须为 100 至 10,000,000 的整数', invalidBlinds: '大盲必须高于小盲，且盲注必须为正整数', blindsBelowBuyIn: '大小盲必须低于带入金额',
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
    humanRebuys: 'Human rebuys', humanRebuysHint: 'Human players only. Eliminated bots never rebuy.', rebuyNone: 'None', rebuyOnce: '1 time', rebuyTwice: '2 times', rebuyThree: '3 times', rebuyUnlimited: 'Unlimited',
    bustedOptions: 'Out-of-chips options', chipsGone: 'You are out of chips', rebuy: 'Rebuy', keepWatching: 'Keep watching', watchNextHand: 'Watch next hand', exitTable: 'Leave table', watchingNow: 'Watching', rebuyRemaining: '{count} rebuys remaining', rebuyUnlimitedRemaining: 'Unlimited rebuys available', rebuyExhausted: 'No rebuys remaining',
    balanced: 'Rational', aggressive: 'Deep Sea', tight: 'Mr Calm', caller: 'Rain', tricky: 'Rose',
    createFriendRoom: 'Create friend room', createFriendHint: 'Choose seats and buy-in, then send friends the invite.', setupFriendRoom: 'Set up friend table', friendsOnly: 'Private friend game', chooseTable: 'Choose table settings', friendRoomHint: 'The game will not start immediately, so you can invite friends first.', createTable: 'Create table', roomReady: 'Your table is ready', shareCodeHint: 'Send friends the room code or invite link', copyInvite: 'Copy invite link', systemShare: 'Share', enterCreatedTable: 'Enter table', inviteMessage: 'Join my private hold’em table', copyFailed: 'Could not copy. Share the room code manually.', shareFailed: 'Sharing is unavailable. Copy the invite link instead.', currency: 'Chip currency', cny: 'Chinese yuan', jpy: 'Japanese yen', customAmount: 'Custom amount', customBuyIn: 'Custom buy-in', blinds: 'Blinds', smallBlind: 'Small blind', bigBlind: 'Big blind', invalidBuyIn: 'Buy-in must be a whole number from 100 to 10,000,000', invalidBlinds: 'Big blind must exceed small blind and both must be positive whole numbers', blindsBelowBuyIn: 'Both blinds must be below the buy-in',
    inviteFriend: 'Invite friend', lineup: 'Opponent lineup', opponents: 'opponents', botThinking: 'Thinking', communityCards: 'Community cards', emptySeat: 'Open seat', emptySeats: 'open seats', add: 'Add', remove: 'Remove', change: 'Change', betweenHandsOnly: 'The lineup can only change between hands.',
  },
} as const

export type MessageKey = keyof typeof messages.zh
export function translate(language: Language, key: MessageKey): string {
  return messages[language][key]
}
