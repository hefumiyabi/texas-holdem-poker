import { useState } from 'react'
import type { Advice, Language } from '../types'

const copy = {
  zh: {
    title: '估算参考', expand: '展开 GTO 参考', collapse: '收起 GTO 参考', potOdds: '底池赔率',
    action: { fold: '建议弃牌', check: '建议过牌', call: '建议跟注', raise: '建议加注' },
    reason: {
      value_advantage: '权益明显领先，适合价值下注。', free_card: '无需投入筹码，可以免费看下一张牌。',
      price_too_high: '跟注价格高于当前胜率，建议控制损失。', priced_to_continue: '当前胜率足以支持继续游戏。',
    },
  },
  en: {
    title: 'Estimate', expand: 'Expand GTO reference', collapse: 'Collapse GTO reference', potOdds: 'Pot odds',
    action: { fold: 'Fold suggested', check: 'Check suggested', call: 'Call suggested', raise: 'Raise suggested' },
    reason: {
      value_advantage: 'Your equity leads clearly; consider betting for value.', free_card: 'Take the free card without investing more chips.',
      price_too_high: 'The calling price exceeds your estimated equity.', priced_to_continue: 'Your equity supports continuing at this price.',
    },
  },
} as const

export function GtoCoachCard({ language, analysis }: { language: Language; analysis: Advice }) {
  const [expanded, setExpanded] = useState(false)
  const text = copy[language]
  const action = text.action[analysis.recommended_action]
  const reason = text.reason[analysis.reason as keyof typeof text.reason] || analysis.reason
  return <aside className={`gto-coach ${expanded ? 'expanded' : ''}`} aria-live="polite">
    <button className="gto-toggle" onClick={() => setExpanded((value) => !value)} aria-label={expanded ? text.collapse : text.expand}>
      <span><small>{text.title}</small><strong>{Math.round(analysis.equity * 100)}%</strong></span>
      <b>{action}</b>
    </button>
    {expanded && <div className="coach-details">
      <strong>{text.potOdds} {Math.round(analysis.pot_odds * 100)}%</strong>
      <p>{reason}</p>
    </div>}
  </aside>
}
