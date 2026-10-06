import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '../api'
import { HomePage } from '../pages/HomePage'
import type { RoomInfo } from '../types'
import { FriendRoomSetup } from './FriendRoomSetup'

vi.mock('../api', () => ({
  api: { createRoom: vi.fn(), createFriendRoom: vi.fn() },
}))

const createdRoom: RoomInfo = {
  join_code: 'RIV234',
  title: '好友之夜',
  invite_url: 'https://example.test/room/RIV234',
  max_players: 4,
  initial_chips: 5000,
}

describe('FriendRoomSetup', () => {
  beforeEach(() => {
    vi.mocked(api.createFriendRoom).mockReset()
  })

  it('opens from its own home action with six-player and 1,000 defaults', async () => {
    render(<MemoryRouter><HomePage user={{ id: 'u1', nickname: 'River', chips: 1000 }} language="zh" onError={vi.fn()} /></MemoryRouter>)

    await userEvent.click(screen.getByRole('button', { name: '创建好友房' }))

    expect(screen.getByRole('dialog', { name: '设置好友牌桌' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '六人桌' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '带入 1,000' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('traps keyboard focus, closes with Escape, and restores the launcher', async () => {
    render(<MemoryRouter><HomePage user={{ id: 'u1', nickname: 'River', chips: 1000 }} language="zh" onError={vi.fn()} /></MemoryRouter>)
    const launcher = screen.getByRole('button', { name: '创建好友房' })
    await userEvent.click(launcher)

    const close = screen.getByRole('button', { name: '关闭' })
    expect(close).toHaveFocus()
    await userEvent.tab({ shift: true })
    expect(screen.getByRole('button', { name: '创建牌桌' })).toHaveFocus()
    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('dialog', { name: '设置好友牌桌' })).not.toBeInTheDocument()
    expect(launcher).toHaveFocus()
  })

  it('submits selected presets once while creation is pending', async () => {
    let resolveCreate: ((room: RoomInfo) => void) | undefined
    const onCreate = vi.fn(() => new Promise<RoomInfo>((resolve) => { resolveCreate = resolve }))
    render(<FriendRoomSetup language="zh" onClose={vi.fn()} onCreate={onCreate} onEnter={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: '四人桌' }))
    await userEvent.click(screen.getByRole('button', { name: '带入 5,000' }))
    const createButton = screen.getByRole('button', { name: '创建牌桌' })
    await userEvent.dblClick(createButton)

    expect(onCreate).toHaveBeenCalledTimes(1)
    expect(onCreate).toHaveBeenCalledWith({ seatCount: 4, initialChips: 5000 })
    expect(createButton).toBeDisabled()
    resolveCreate?.(createdRoom)
  })

  it('shows creation errors inline and allows retry', async () => {
    const onCreate = vi.fn().mockRejectedValue(new Error('暂时无法创建牌桌'))
    render(<FriendRoomSetup language="zh" onClose={vi.fn()} onCreate={onCreate} onEnter={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: '创建牌桌' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('暂时无法创建牌桌')
    expect(screen.getByRole('button', { name: '创建牌桌' })).toBeEnabled()
  })

  it('shows the code and waits for the explicit enter action', async () => {
    const onEnter = vi.fn()
    render(<FriendRoomSetup language="zh" onClose={vi.fn()} onCreate={vi.fn().mockResolvedValue(createdRoom)} onEnter={onEnter} />)

    await userEvent.click(screen.getByRole('button', { name: '创建牌桌' }))

    expect(await screen.findByText('RIV234')).toBeInTheDocument()
    expect(onEnter).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: '进入牌桌' }))
    expect(onEnter).toHaveBeenCalledWith(createdRoom)
  })

  it('copies and shares the invite, ignoring a cancelled system share', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    const share = vi.fn().mockRejectedValue(Object.assign(new Error('cancelled'), { name: 'AbortError' }))
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    Object.defineProperty(navigator, 'share', { configurable: true, value: share })
    render(<FriendRoomSetup language="zh" onClose={vi.fn()} onCreate={vi.fn().mockResolvedValue(createdRoom)} onEnter={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: '创建牌桌' }))

    await userEvent.click(await screen.findByRole('button', { name: '复制邀请链接' }))
    await userEvent.click(screen.getByRole('button', { name: '系统分享' }))

    expect(writeText).toHaveBeenCalledWith(createdRoom.invite_url)
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: createdRoom.invite_url }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
