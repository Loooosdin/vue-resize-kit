import { observeResize } from '../../../src/core'

declare global {
  interface Window {
    resizeEvents: Array<{ width: number; height: number }>
    stopResizeObserver: () => void
  }
}

const target = document.querySelector('#target')!
window.resizeEvents = []

const controller = observeResize(
  target,
  ({ width, height }) => window.resizeEvents.push({ width, height }),
  { scheduler: 'sync' },
)

window.stopResizeObserver = () => controller.stop()
