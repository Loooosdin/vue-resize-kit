import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { normalizeResizeOptions, observeResize } from '../src/core'
import { createEntry, MockResizeObserver, mockObserverCtor } from './helpers/mockResizeObserver'

describe('observeResize', () => {
  let target: HTMLDivElement

  beforeEach(() => {
    target = document.createElement('div')
    MockResizeObserver.reset()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('默认交付首次尺寸并提供结构化事件', () => {
    const handler = vi.fn()
    const controller = observeResize(target, handler, {
      observerCtor: mockObserverCtor,
      scheduler: 'sync',
    })

    MockResizeObserver.instances[0]!.emit(createEntry(target, 120, 80))

    expect(controller.isActive).toBe(true)
    expect(controller.isSupported).toBe(true)
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        target,
        width: 120,
        height: 80,
        previousSize: null,
        isInitial: true,
      }),
    )
  })

  it('immediate=false 时以首次通知作为过滤基线', () => {
    const handler = vi.fn()
    observeResize(target, handler, {
      observerCtor: mockObserverCtor,
      scheduler: 'sync',
      immediate: false,
      threshold: 10,
    })
    const observer = MockResizeObserver.instances[0]!

    observer.emit(createEntry(target, 100, 100))
    observer.emit(createEntry(target, 105, 100))
    observer.emit(createEntry(target, 110, 100))

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0]![0]).toEqual(expect.objectContaining({ width: 110, isInitial: false }))
  })

  it('按指定轴和阈值累计过滤变化', () => {
    const handler = vi.fn()
    observeResize(target, handler, {
      observerCtor: mockObserverCtor,
      scheduler: 'sync',
      axis: 'width',
      threshold: 5,
    })
    const observer = MockResizeObserver.instances[0]!

    observer.emit(createEntry(target, 100, 100))
    observer.emit(createEntry(target, 100, 120))
    observer.emit(createEntry(target, 104, 120))
    observer.emit(createEntry(target, 105, 120))

    expect(handler).toHaveBeenCalledTimes(2)
    expect(handler.mock.calls[1]![0].previousSize).toEqual(
      expect.objectContaining({ width: 100, height: 100 }),
    )
  })

  it('animation-frame 与 debounce 只交付周期内最后一次事件', () => {
    vi.useFakeTimers()
    const rafHandler = vi.fn()
    observeResize(target, rafHandler, {
      observerCtor: mockObserverCtor,
      scheduler: 'animation-frame',
    })
    const rafObserver = MockResizeObserver.instances[0]!
    rafObserver.emit(createEntry(target, 100, 100))
    rafObserver.emit(createEntry(target, 130, 100))
    vi.advanceTimersByTime(16)
    expect(rafHandler).toHaveBeenCalledTimes(1)
    expect(rafHandler.mock.calls[0]![0].width).toBe(130)

    const debounceHandler = vi.fn()
    observeResize(target, debounceHandler, {
      observerCtor: mockObserverCtor,
      scheduler: 'debounce',
      delay: 50,
    })
    const debounceObserver = MockResizeObserver.instances[1]!
    debounceObserver.emit(createEntry(target, 100, 100))
    vi.advanceTimersByTime(25)
    debounceObserver.emit(createEntry(target, 150, 100))
    vi.advanceTimersByTime(50)
    expect(debounceHandler).toHaveBeenCalledTimes(1)
    expect(debounceHandler.mock.calls[0]![0].width).toBe(150)
  })

  it('throttle 采用首尾交付', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000)
    const handler = vi.fn()
    observeResize(target, handler, {
      observerCtor: mockObserverCtor,
      scheduler: 'throttle',
      delay: 100,
    })
    const observer = MockResizeObserver.instances[0]!

    observer.emit(createEntry(target, 100, 100))
    vi.advanceTimersByTime(25)
    observer.emit(createEntry(target, 120, 100))
    observer.emit(createEntry(target, 140, 100))
    vi.advanceTimersByTime(75)

    expect(handler).toHaveBeenCalledTimes(2)
    expect(handler.mock.calls[1]![0].width).toBe(140)
  })

  it('pause、resume、stop 会清理资源且 stop 不可恢复', () => {
    const handler = vi.fn()
    const controller = observeResize(target, handler, {
      observerCtor: mockObserverCtor,
      scheduler: 'sync',
    })
    const first = MockResizeObserver.instances[0]!

    controller.pause()
    expect(first.disconnected).toBe(true)
    expect(controller.isActive).toBe(false)

    controller.resume()
    expect(MockResizeObserver.instances).toHaveLength(2)
    expect(controller.isActive).toBe(true)

    controller.stop()
    controller.resume()
    expect(controller.isActive).toBe(false)
    expect(MockResizeObserver.instances).toHaveLength(2)
  })

  it('once 在第一次实际交付后停止', () => {
    const handler = vi.fn()
    const controller = observeResize(target, handler, {
      observerCtor: mockObserverCtor,
      scheduler: 'sync',
      once: true,
    })
    const observer = MockResizeObserver.instances[0]!

    observer.emit(createEntry(target, 100, 100))
    observer.emit(createEntry(target, 200, 100))

    expect(handler).toHaveBeenCalledTimes(1)
    expect(controller.isActive).toBe(false)
  })

  it('暂停时取消尚未交付的调度任务', () => {
    vi.useFakeTimers()
    const handler = vi.fn()
    const controller = observeResize(target, handler, {
      observerCtor: mockObserverCtor,
      scheduler: 'debounce',
      delay: 50,
    })

    MockResizeObserver.instances[0]!.emit(createEntry(target, 100, 100))
    controller.pause()
    vi.advanceTimersByTime(100)

    expect(handler).not.toHaveBeenCalled()
  })

  it('按书写模式将逻辑 box 尺寸映射为物理宽高', () => {
    target.style.writingMode = 'vertical-rl'
    const handler = vi.fn()
    observeResize(target, handler, {
      observerCtor: mockObserverCtor,
      scheduler: 'sync',
      box: 'border-box',
    })

    MockResizeObserver.instances[0]!.emit(createEntry(target, 120, 80, 'border-box'))
    expect(handler.mock.calls[0]![0]).toEqual(
      expect.objectContaining({ width: 80, height: 120, inlineSize: 120, blockSize: 80 }),
    )
  })

  it('缺少 ResizeObserver 时返回不可用的空控制器', () => {
    vi.stubGlobal('ResizeObserver', undefined)
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const controller = observeResize(target, vi.fn())

    expect(controller.isSupported).toBe(false)
    expect(controller.isActive).toBe(false)
    expect(() => controller.resume()).not.toThrow()
    expect(warning).toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('规范化非法数值配置', () => {
    expect(normalizeResizeOptions({ threshold: -1, delay: Number.NaN })).toEqual(
      expect.objectContaining({ threshold: 0, delay: 100 }),
    )
  })
})
