import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { InfoDrawer } from './InfoDrawer'

describe('InfoDrawer', () => {
  it('shows accessible panel content and can close', () => {
    const onClose = vi.fn()
    render(<InfoDrawer title="手牌记录" lines={['翻牌前 · 底池 30']} onClose={onClose}/>)

    expect(screen.getByRole('dialog', { name: '手牌记录' })).toBeInTheDocument()
    expect(screen.getByText('翻牌前 · 底池 30')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
