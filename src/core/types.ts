/** ResizeObserver 原生支持的盒模型。 */
export type ResizeBox = 'content-box' | 'border-box' | 'device-pixel-content-box'

/** 用于过滤尺寸变化的物理轴。 */
export type ResizeAxis = 'width' | 'height' | 'both'

/** 回调投递策略。 */
export type ResizeScheduler = 'sync' | 'animation-frame' | 'debounce' | 'throttle'

export interface ResizeSize {
  width: number
  height: number
  inlineSize: number
  blockSize: number
}

export interface ResizeEvent extends ResizeSize {
  target: Element
  previousSize: ResizeSize | null
  contentRect: DOMRectReadOnly
  entry: ResizeObserverEntry
  box: ResizeBox
  isInitial: boolean
}

export type ResizeHandler = (event: ResizeEvent) => void

/** 允许第三方 polyfill 实现原生 ResizeObserver 构造器契约。 */
export interface ResizeObserverConstructor {
  new (callback: ResizeObserverCallback): ResizeObserver
}

export interface ResizeOptions {
  immediate?: boolean
  disabled?: boolean
  box?: ResizeBox
  axis?: ResizeAxis
  threshold?: number
  scheduler?: ResizeScheduler
  delay?: number
  once?: boolean
  observerCtor?: ResizeObserverConstructor
}

export interface NormalizedResizeOptions {
  immediate: boolean
  disabled: boolean
  box: ResizeBox
  axis: ResizeAxis
  threshold: number
  scheduler: ResizeScheduler
  delay: number
  once: boolean
  observerCtor?: ResizeObserverConstructor
}

export interface ResizeController {
  readonly isActive: boolean
  readonly isSupported: boolean
  pause(): void
  resume(): void
  stop(): void
}
