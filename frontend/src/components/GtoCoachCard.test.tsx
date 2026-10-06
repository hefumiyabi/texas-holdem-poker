import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GtoCoachCard } from './GtoCoachCard'

describe('GtoCoachCard', () => {
  it('shows estimated equity, recommendation, and expandable pot odds', () => {
    render(<GtoCoachCard language="zh" analysis={{
      equity: 0.623, pot_odds: 0.2, recommended_action: 'raise',
      reason: 'value_advantage', sample_size: 1500,
    }} />)
    expect(screen.getByText('估算参考')).toBeInTheDocument()
    expect(screen.getByText('62%')).toBeInTheDocument()
    expect(screen.getByText('建议加注')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '展开 GTO 参考' }))
    expect(screen.getByText('底池赔率 20%')).toBeInTheDocument()
    expect(screen.getByText('权益明显领先，适合价值下注。')).toBeInTheDocument()
  })
})
