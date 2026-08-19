import { normalizeResizeOptions } from './options'
import { isElement } from './element'
import { extractResizeSize } from './size'
import type {
  NormalizedResizeOptions,
  ResizeController,
  ResizeEvent,
  ResizeHandler,
  ResizeObserverConstructor,
  ResizeOptions,
  ResizeSize,
} from './types'
import { warn } from './warn'

type TimerId = ReturnType<typeof setTimeout>

interface AnimationFrameRuntime {
  requestAnimationFrame?: (callback: FrameRequestCallback) => number
  cancelAnimationFrame?: (handle: number) => void
  ResizeObserver?: ResizeObserverConstructor
}

function resolveObserverConstructor(options: NormalizedResizeOptions): ResizeObserverConstructor | undefined {
  if (options.observerCtor) return options.observerCtor
  return (globalThis as typeof globalThis & AnimationFrameRuntime).ResizeObserver
}

function cloneSize(size: ResizeSize): ResizeSize {
  return {
    width: size.width,
    height: size.height,
    inlineSize: size.inlineSize,
    blockSize: size.blockSize,
  }
}

function reachesThreshold(
  previous: ResizeSize,
  current: ResizeSize,
  options: NormalizedResizeOptions,
): boolean {
  const widthChanged = Math.abs(current.width - previous.width) > 0
  const heightChanged = Math.abs(current.height - previous.height) > 0
  const widthReached = widthChanged && Math.abs(current.width - previous.width) >= options.threshold
  const heightReached = heightChanged && Math.abs(current.height - previous.height) >= options.threshold

  if (options.axis === 'width') return widthReached
  if (options.axis === 'height') return heightReached
  return widthReached || heightReached
}

/** 创建一个只观察单个 DOM 元素的尺寸控制器。 */
export function observeResize(
  target: Element,
  handler: ResizeHandler,
  userOptions: ResizeOptions = {},
): ResizeController {
  if (!isElement(target)) {
    throw new TypeError('[vue-resize-kit] observeResize 的 target 必须是 DOM Element。')
  }
  if (typeof handler !== 'function') {
    throw new TypeError('[vue-resize-kit] observeResize 的 handler 必须是函数。')
  }

  const options = normalizeResizeOptions(userOptions)
  const ObserverCtor = resolveObserverConstructor(options)
  const supported = typeof ObserverCtor === 'function'

  let observer: ResizeObserver | null = null
  let active = false
  let stopped = false
  let awaitingInitialDelivery = true
  let comparisonSize: ResizeSize | null = null
  let lastDeliveredSize: ResizeSize | null = null
  let pendingEvent: ResizeEvent | null = null
  let animationFrameId: number | null = null
  let timerId: TimerId | null = null
  let lastThrottleTime = 0
  let observedBox = options.box

  function cancelPending(): void {
    const runtime = globalThis as typeof globalThis & AnimationFrameRuntime
    if (animationFrameId !== null) {
      if (runtime.cancelAnimationFrame) runtime.cancelAnimationFrame(animationFrameId)
      else clearTimeout(animationFrameId)
      animationFrameId = null
    }
    if (timerId !== null) {
      clearTimeout(timerId)
      timerId = null
    }
    pendingEvent = null
  }

  function stopObserver(): void {
    observer?.disconnect()
    observer = null
    active = false
    cancelPending()
  }

  function deliver(event: ResizeEvent): void {
    if (!active || stopped) return

    event.previousSize = lastDeliveredSize ? cloneSize(lastDeliveredSize) : null
    lastDeliveredSize = cloneSize(event)
    comparisonSize = cloneSize(event)
    awaitingInitialDelivery = false

    try {
      handler(event)
    } finally {
      if (options.once) controller.stop()
    }
  }

  function schedule(event: ResizeEvent): void {
    pendingEvent = event

    if (options.scheduler === 'sync') {
      pendingEvent = null
      deliver(event)
      return
    }

    if (options.scheduler === 'animation-frame') {
      const runtime = globalThis as typeof globalThis & AnimationFrameRuntime
      if (animationFrameId !== null) {
        if (runtime.cancelAnimationFrame) runtime.cancelAnimationFrame(animationFrameId)
        else clearTimeout(animationFrameId)
      }

      const run = () => {
        animationFrameId = null
        const latest = pendingEvent
        pendingEvent = null
        if (latest) deliver(latest)
      }
      animationFrameId = runtime.requestAnimationFrame
        ? runtime.requestAnimationFrame(run)
        : (setTimeout(run, 16) as unknown as number)
      return
    }

    if (options.scheduler === 'debounce') {
      if (timerId !== null) clearTimeout(timerId)
      timerId = setTimeout(() => {
        timerId = null
        const latest = pendingEvent
        pendingEvent = null
        if (latest) deliver(latest)
      }, options.delay)
      return
    }

    const now = Date.now()
    const elapsed = now - lastThrottleTime
    if (lastThrottleTime === 0 || elapsed >= options.delay) {
      lastThrottleTime = now
      pendingEvent = null
      deliver(event)
      return
    }

    if (timerId !== null) clearTimeout(timerId)
    timerId = setTimeout(() => {
      timerId = null
      lastThrottleTime = Date.now()
      const latest = pendingEvent
      pendingEvent = null
      if (latest) deliver(latest)
    }, options.delay - elapsed)
  }

  function handleEntries(entries: ResizeObserverEntry[]): void {
    const entry = entries.find((item) => item.target === target)
    if (!entry || !active || stopped) return

    const extracted = extractResizeSize(entry, observedBox)
    const { box, ...size } = extracted
    if (awaitingInitialDelivery && !options.immediate) {
      comparisonSize = cloneSize(size)
      awaitingInitialDelivery = false
      return
    }

    if (!awaitingInitialDelivery && comparisonSize && !reachesThreshold(comparisonSize, size, options)) {
      // 最新尺寸已回到过滤范围内时，之前排队的尺寸已经失效。
      if (pendingEvent) cancelPending()
      return
    }

    schedule({
      ...size,
      target,
      // previousSize 在真正交付时写入，确保它始终对应上一次已交付事件。
      previousSize: null,
      contentRect: entry.contentRect,
      entry,
      requestedBox: options.box,
      box,
      isInitial: awaitingInitialDelivery,
    })
  }

  function startObserver(): void {
    if (!supported || stopped || active) return

    awaitingInitialDelivery = true
    comparisonSize = null
    lastThrottleTime = 0
    observedBox = options.box
    observer = new ObserverCtor!(handleEntries)

    try {
      observer.observe(target, { box: options.box })
    } catch {
      // 某些旧 polyfill 不接受 observe options，退化为 content-box 监听。
      observedBox = 'content-box'
      observer.observe(target)
      warn(`当前 ResizeObserver 实现不支持 box="${options.box}"，已回退到默认观察模式。`)
    }
    active = true
  }

  const controller: ResizeController = {
    get isActive() {
      return active
    },
    get isSupported() {
      return supported
    },
    pause() {
      if (stopped) return
      stopObserver()
    },
    resume() {
      startObserver()
    },
    stop() {
      if (stopped) return
      stopped = true
      stopObserver()
    },
  }

  if (!supported) {
    warn('当前环境不支持 ResizeObserver；可通过 observerCtor 注入 polyfill。')
  } else if (!options.disabled) {
    startObserver()
  }

  return controller
}
