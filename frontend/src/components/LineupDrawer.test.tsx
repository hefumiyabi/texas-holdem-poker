import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Player } from '../types'
import { LineupDrawer } from './LineupDrawer'

describe('LineupDrawer', () => {
  it('lets the host fill an empty seat with a specific persona or invite a friend', () => {
    const onAdd = vi.fn()
    const onShare = vi.fn()
    const human = { id: 'me', nickname: 'River', is_bot: false, chips: 2000, current_bet: 0 } as Player
    render(<LineupDrawer language="zh" players={[human]} maxPlayers={2} difficulty="intermediate" host waiting onClose={vi.fn()} onAdd={onAdd} onRemove={vi.fn()} onReplace={vi.fn()} onShare={onShare} />)

    fireEvent.click(screen.getByRole('button', { name: '添加理性哥' }))
    fireEvent.click(screen.getByRole('button', { name: '邀请好友' }))
    expect(onAdd).toHaveBeenCalledWith('balanced')
    expect(onShare).toHaveBeenCalledOnce()
  })
})
