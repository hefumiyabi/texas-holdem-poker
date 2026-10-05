import type { Language } from './types'

const messages = {
  zh: {
    brand: '暗河牌室', tagline: '一张私密牌桌，一局真正的德州。', nickname: '昵称', nicknameHint: '例如：River', enterRoom: '进入牌室',
    createRoom: '创建私密房', joinRoom: '加入好友房', roomCode: '房间码', welcome: '晚上好', privatePlay: '仅限邀请 · 虚拟筹码',
    createHint: '立即创建 6 人牌桌，再把邀请码发给好友。', joinHint: '输入六位邀请码', preview: '房间预览', hostedBy: '房主', players: '玩家',
    enterTable: '入座', roomNotFound: '房间不存在或已关闭', back: '返回', share: '分享', copied: '已复制', addBot: '补一位机器人', startHand: '开始发牌',
    waiting: '等待开局', pot: '底池', yourTurn: '轮到你了', spectating: '观战中', fold: '弃牌', check: '过牌', call: '跟注', bet: '下注', raise: '加注', allIn: '全下',
    reconnecting: '正在重新连接…', offline: '连接已断开，正在保留座位', settings: '设置', history: '记录', analysis: '分析', sound: '音效', music: '背景音乐', reducedMotion: '减少动态效果', language: '语言',
    nextHand: '准备下一局', leave: '离开牌桌', dissolve: '解散房间', live: '实时牌桌', secure: '服务器权威结算', loading: '正在准备牌桌…', retry: '重试', raiseTo: '加注到', cancel: '取消', confirm: '确认',
  },
  en: {
    brand: 'NOCTURNE POKER', tagline: 'One private table. One proper game.', nickname: 'Nickname', nicknameHint: 'e.g. River', enterRoom: 'Enter the room',
    createRoom: 'Create private room', joinRoom: 'Join a friend', roomCode: 'Room code', welcome: 'Good evening', privatePlay: 'Invite only · Play chips',
    createHint: 'Open a six-seat table and share the invite code.', joinHint: 'Enter the six-character invite code', preview: 'Room preview', hostedBy: 'Host', players: 'Players',
    enterTable: 'Take a seat', roomNotFound: 'This room is unavailable', back: 'Back', share: 'Share', copied: 'Copied', addBot: 'Add a bot', startHand: 'Deal cards',
    waiting: 'Waiting to deal', pot: 'Pot', yourTurn: 'Your turn', spectating: 'Watching', fold: 'Fold', check: 'Check', call: 'Call', bet: 'Bet', raise: 'Raise', allIn: 'All in',
    reconnecting: 'Reconnecting…', offline: 'Connection lost. Your seat is being held.', settings: 'Settings', history: 'History', analysis: 'Analysis', sound: 'Sound effects', music: 'Background music', reducedMotion: 'Reduce motion', language: 'Language',
    nextHand: 'Ready for next hand', leave: 'Leave table', dissolve: 'Dissolve room', live: 'Live table', secure: 'Server-authoritative play', loading: 'Preparing your table…', retry: 'Retry', raiseTo: 'Raise to', cancel: 'Cancel', confirm: 'Confirm',
  },
} as const

export type MessageKey = keyof typeof messages.zh
export function translate(language: Language, key: MessageKey): string {
  return messages[language][key]
}

