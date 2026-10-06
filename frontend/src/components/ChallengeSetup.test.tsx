import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api'
import { HomePage } from '../pages/HomePage'
import { ChallengeSetup } from './ChallengeSetup'

vi.mock('../api', () => ({
  api: { createRoom: vi.fn(), createFriendRoom: vi.fn() },
}))

describe('ChallengeSetup', () => {
  beforeEach(() => vi.mocked(api.createRoom).mockReset())

  it('opens from the primary home action with accessible defaults', async () => {
    render(<MemoryRouter><HomePage user={{ id: 'u1', nickname: 'River', chips: 1000 }} language="zh" onError={vi.fn()} /></MemoryRouter>)

    await userEvent.click(screen.getByRole('button', { name: '挑战机器人' }))

    expect(screen.getByRole('dialog', { name: '设置机器人挑战' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '常规' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '六人桌' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '开始挑战' })).toBeEnabled()
  })

  it('submits the selected difficulty, table size, buy-in, and automatic persona lineup', async () => {
    const onStart = vi.fn().mockResolvedValue(undefined)
    render(<ChallengeSetup language="zh" onClose={vi.fn()} onStart={onStart} />)

    await userEvent.click(screen.getByRole('button', { name: '高手' }))
    await userEvent.click(screen.getByRole('button', { name: '四人桌' }))
    await userEvent.click(screen.getByRole('button', { name: '带入 5,000' }))
    await userEvent.click(screen.getByRole('button', { name: '开始挑战' }))

    expect(onStart).toHaveBeenCalledWith({
      difficulty: 'advanced',
      seatCount: 4,
      initialChips: 5000,
      personas: ['aggressive', 'tight', 'caller'],
    })
  })

  it('shows an error and restores the start button after a failed request', async () => {
    const onStart = vi.fn().mockRejectedValue(new Error('暂时无法创建牌桌'))
    render(<ChallengeSetup language="zh" onClose={vi.fn()} onStart={onStart} />)

    await userEvent.click(screen.getByRole('button', { name: '开始挑战' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('暂时无法创建牌桌')
    expect(screen.getByRole('button', { name: '开始挑战' })).toBeEnabled()
  })

  it('navigates directly to the table after challenge creation', async () => {
    vi.mocked(api.createRoom).mockResolvedValue({
      success: true,
      room: { join_code: 'ABCDEF', title: '人格牌局' },
    })
    render(<MemoryRouter initialEntries={['/']}><Routes>
      <Route path="/" element={<HomePage user={{ id: 'u1', nickname: 'River', chips: 1000 }} language="zh" onError={vi.fn()} />} />
      <Route path="/table/:code" element={<p>牌桌已打开</p>} />
    </Routes></MemoryRouter>)

    await userEvent.click(screen.getByRole('button', { name: '挑战机器人' }))
    await userEvent.click(screen.getByRole('button', { name: '开始挑战' }))

    expect(await screen.findByText('牌桌已打开')).toBeInTheDocument()
    expect(api.createRoom).toHaveBeenCalledWith({
      difficulty: 'intermediate',
      seatCount: 6,
      initialChips: 1000,
      personas: ['aggressive', 'tight', 'caller', 'tricky', 'balanced'],
    })
  })
})
