import type { ResizeBox, ResizeObserverConstructor } from '../../src/core'

export class MockResizeObserver {
  static instances: MockResizeObserver[] = []
  static rejectObserveOptions = false

  readonly callback: ResizeObserverCallback
  observed = new Map<Element, ResizeObserverOptions | undefined>()
  disconnected = false

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    MockResizeObserver.instances.push(this)
  }

  observe(target: Element, options?: ResizeObserverOptions): void {
    if (options && MockResizeObserver.rejectObserveOptions) {
      throw new TypeError('observe options are not supported')
    }
    this.observed.set(target, options)
    this.disconnected = false
  }

  unobserve(target: Element): void {
    this.observed.delete(target)
  }

  disconnect(): void {
    this.observed.clear()
    this.disconnected = true
  }

  emit(entry: ResizeObserverEntry): void {
    this.callback([entry], this as unknown as ResizeObserver)
  }

  static reset(): void {
    MockResizeObserver.instances = []
    MockResizeObserver.rejectObserveOptions = false
  }
}

export const mockObserverCtor = MockResizeObserver as unknown as ResizeObserverConstructor

function createBoxSize(inlineSize: number, blockSize: number): ResizeObserverSize {
  return { inlineSize, blockSize }
}

export function createEntry(
  target: Element,
  width: number,
  height: number,
  box: ResizeBox = 'content-box',
): ResizeObserverEntry {
  const contentSize = createBoxSize(width, height)
  const borderSize = createBoxSize(width, height)
  const deviceSize = createBoxSize(width, height)

  return {
    target,
    contentRect: new DOMRectReadOnly(0, 0, width, height),
    contentBoxSize: box === 'content-box' ? [contentSize] : [createBoxSize(width, height)],
    borderBoxSize: box === 'border-box' ? [borderSize] : [createBoxSize(width, height)],
    devicePixelContentBoxSize:
      box === 'device-pixel-content-box' ? [deviceSize] : [createBoxSize(width, height)],
  }
}
