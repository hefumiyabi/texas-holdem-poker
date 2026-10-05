import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { GuestGate } from './GuestGate'

describe('GuestGate', () => {
  it('submits a trimmed nickname', async () => {
    const onContinue = vi.fn().mockResolvedValue(undefined)
    render(<GuestGate language="zh" onContinue={onContinue} />)

    await userEvent.type(screen.getByLabelText('昵称'), '  River  ')
    await userEvent.click(screen.getByRole('button', { name: '进入牌室' }))

    expect(onContinue).toHaveBeenCalledWith('River')
  })
})
