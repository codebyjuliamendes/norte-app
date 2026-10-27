import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// canvas-confetti needs a real <canvas>; it is purely decorative.
vi.mock('canvas-confetti', () => ({ default: vi.fn() }))

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

window.confirm = () => true
window.HTMLElement.prototype.scrollIntoView = () => {}
