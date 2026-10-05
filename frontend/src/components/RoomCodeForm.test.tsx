import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RoomCodeForm } from './RoomCodeForm'

describe('RoomCodeForm', () => {
  it('normalizes a room code before joining', async () => {
    const onJoin = vi.fn()
    render(<RoomCodeForm language="zh" onJoin={onJoin} />)
    await userEvent.type(screen.getByLabelText('房间码'), 'ab cd ef')
    await userEvent.click(screen.getByRole('button', { name: '加入好友房' }))
    expect(onJoin).toHaveBeenCalledWith('ABCDEF')
  })
})
