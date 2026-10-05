import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ConnectionBanner } from './ConnectionBanner'

describe('ConnectionBanner', () => {
  it('announces reconnecting state without covering controls', () => {
    render(<ConnectionBanner status="reconnecting" language="zh" />)
    expect(screen.getByRole('status')).toHaveTextContent('正在重新连接')
  })
})
