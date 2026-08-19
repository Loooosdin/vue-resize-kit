import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { observeResize } from '../src/core'
import { normalizeResizeOptions } from '../src/core/options'
import type { ResizeEvent, ResizeHandler, ResizeOptions } from '../src/core'
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
        requestedBox: 'content-box',
        box: 'content-box',
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

  it('previousSize 只保留上一次交付的尺寸字段', () => {
    const events: ResizeEvent[] = []
    observeResize(target, (event) => events.push(event), {
      observerCtor: mockObserverCtor,
      scheduler: 'sync',
    })
    const observer = MockResizeObserver.instances[0]!

    observer.emit(createEntry(target, 100, 60))
    observer.emit(createEntry(target, 120, 70))
    observer.emit(createEntry(target, 140, 80))

    expect(events[2]!.previousSize).toEqual({
      width: 120,
      height: 70,
      inlineSize: 120,
      blockSize: 70,
    })
    expect(Object.keys(events[2]!.previousSize!).sort()).toEqual(
      ['width', 'height', 'inlineSize', 'blockSize'].sort(),
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

  it('尺寸回到过滤范围时取消已经失效的调度事件', () => {
    vi.useFakeTimers()

    const rafHandler = vi.fn()
    observeResize(target, rafHandler, {
      observerCtor: mockObserverCtor,
      scheduler: 'animation-frame',
      threshold: 10,
    })
    const rafObserver = MockResizeObserver.instances[0]!
    rafObserver.emit(createEntry(target, 100, 100))
    vi.advanceTimersByTime(16)
    rafObserver.emit(createEntry(target, 120, 100))
    rafObserver.emit(createEntry(target, 100, 100))
    vi.advanceTimersByTime(16)
    expect(rafHandler).toHaveBeenCalledTimes(1)

    const debounceTarget = document.createElement('div')
    const debounceHandler = vi.fn()
    observeResize(debounceTarget, debounceHandler, {
      observerCtor: mockObserverCtor,
      scheduler: 'debounce',
      delay: 50,
      threshold: 10,
    })
    const debounceObserver = MockResizeObserver.instances[1]!
    debounceObserver.emit(createEntry(debounceTarget, 100, 100))
    vi.advanceTimersByTime(50)
    debounceObserver.emit(createEntry(debounceTarget, 120, 100))
    debounceObserver.emit(createEntry(debounceTarget, 105, 100))
    vi.advanceTimersByTime(50)
    expect(debounceHandler).toHaveBeenCalledTimes(1)

    const throttleTarget = document.createElement('div')
    const throttleHandler = vi.fn()
    observeResize(throttleTarget, throttleHandler, {
      observerCtor: mockObserverCtor,
      scheduler: 'throttle',
      delay: 100,
      threshold: 10,
    })
    const throttleObserver = MockResizeObserver.instances[2]!
    throttleObserver.emit(createEntry(throttleTarget, 100, 100))
    vi.advanceTimersByTime(25)
    throttleObserver.emit(createEntry(throttleTarget, 120, 100))
    throttleObserver.emit(createEntry(throttleTarget, 100, 100))
    vi.advanceTimersByTime(75)
    expect(throttleHandler).toHaveBeenCalledTimes(1)
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

  it('缺少请求 box 数据时报告 content-box 降级并保持逻辑尺寸正确', () => {
    target.style.writingMode = 'vertical-rl'
    const handler = vi.fn()
    observeResize(target, handler, {
      observerCtor: mockObserverCtor,
      scheduler: 'sync',
      box: 'border-box',
    })
    const entry = {
      ...createEntry(target, 120, 80, 'border-box'),
      borderBoxSize: [],
    } satisfies ResizeObserverEntry

    MockResizeObserver.instances[0]!.emit(entry)
    expect(handler.mock.calls[0]![0]).toEqual(
      expect.objectContaining({
        requestedBox: 'border-box',
        box: 'content-box',
        width: 120,
        height: 80,
        inlineSize: 80,
        blockSize: 120,
      }),
    )
  })

  it('Observer 不接受 options 时明确回退到 content-box', () => {
    MockResizeObserver.rejectObserveOptions = true
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const handler = vi.fn()
    observeResize(target, handler, {
      observerCtor: mockObserverCtor,
      scheduler: 'sync',
      box: 'device-pixel-content-box',
    })

    const observer = MockResizeObserver.instances[0]!
    observer.emit(createEntry(target, 100, 50))
    expect(observer.observed.get(target)).toBeUndefined()
    expect(handler.mock.calls[0]![0]).toEqual(
      expect.objectContaining({
        requestedBox: 'device-pixel-content-box',
        box: 'content-box',
        width: 100,
        height: 50,
      }),
    )
    expect(warning).toHaveBeenCalled()
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

  it('规范化非法枚举和布尔配置', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const options = normalizeResizeOptions({
      box: 'padding-box',
      axis: 'inline',
      scheduler: 'typo',
      immediate: 'yes',
      once: 1,
    } as unknown as ResizeOptions)

    expect(options).toEqual(
      expect.objectContaining({
        box: 'content-box',
        axis: 'both',
        scheduler: 'animation-frame',
        immediate: true,
        once: false,
      }),
    )
    expect(warning).toHaveBeenCalledTimes(5)
  })

  it('对非法 target 和 handler 同步抛出 TypeError', () => {
    expect(() => observeResize('not-an-element' as unknown as Element, vi.fn())).toThrow(TypeError)
    expect(() => observeResize(target, null as unknown as ResizeHandler)).toThrow(TypeError)
  })
})
