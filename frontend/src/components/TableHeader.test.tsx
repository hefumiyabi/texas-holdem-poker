import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { RoomInfo, TableInfo } from '../types'
import { TableHeader } from './TableHeader'

describe('TableHeader', () => {
  it('keeps friend sharing and lineup controls within reach', () => {
    const onShare = vi.fn()
    const onLineup = vi.fn()
    render(<TableHeader
      language="zh"
      room={{ join_code: 'ABCDEF', title: '人格牌局', mode: 'bot_challenge', difficulty: 'intermediate' } satisfies RoomInfo}
      table={{ id: 't1', game_stage: 'waiting', community_cards: [], pot: 0, players: [] } satisfies TableInfo}
      onBack={vi.fn()} onMenu={vi.fn()} onShare={onShare} onLineup={onLineup}
    />)

    fireEvent.click(screen.getByRole('button', { name: '邀请好友' }))
    fireEvent.click(screen.getByRole('button', { name: '对手阵容' }))
    expect(onShare).toHaveBeenCalledOnce()
    expect(onLineup).toHaveBeenCalledOnce()
    expect(screen.getByText('常规')).toBeInTheDocument()
  })
})
