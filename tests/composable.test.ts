import { nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useResizeObserver } from '../src/vue3'
import { createEntry, MockResizeObserver, mockObserverCtor } from './helpers/mockResizeObserver'

describe('useResizeObserver', () => {
  it('跟随目标 ref 切换元素并更新响应式尺寸', async () => {
    MockResizeObserver.reset()
    const first = document.createElement('div')
    const second = document.createElement('div')
    const target = ref<Element | null>(null)
    const handler = vi.fn()
    const result = useResizeObserver(target, handler, {
      observerCtor: mockObserverCtor,
      scheduler: 'sync',
    })

    target.value = first
    await nextTick()
    MockResizeObserver.instances[0]!.emit(createEntry(first, 100, 60))
    expect(result.width.value).toBe(100)
    expect(result.height.value).toBe(60)
    expect(handler).toHaveBeenCalledOnce()

    target.value = second
    await nextTick()
    expect(MockResizeObserver.instances[0]!.disconnected).toBe(true)
    MockResizeObserver.instances[1]!.emit(createEntry(second, 240, 120))
    expect(result.width.value).toBe(240)

    result.stop()
    expect(result.isActive.value).toBe(false)
  })

  it('支持手动暂停和恢复', async () => {
    MockResizeObserver.reset()
    const target = ref<Element | null>(document.createElement('div'))
    const result = useResizeObserver(target, {
      observerCtor: mockObserverCtor,
      scheduler: 'sync',
    })
    await nextTick()

    result.pause()
    expect(result.isActive.value).toBe(false)
    result.resume()
    expect(result.isActive.value).toBe(true)
    expect(MockResizeObserver.instances).toHaveLength(2)
    result.stop()
  })

  it.each(['input', 'select', 'textarea', 'progress'] as const)(
    '直接监听 %s 元素时不会误判为 ref',
    async (tagName) => {
      MockResizeObserver.reset()
      const target = document.createElement(tagName)
      const result = useResizeObserver(target, {
        observerCtor: mockObserverCtor,
        scheduler: 'sync',
      })
      await nextTick()

      expect(MockResizeObserver.instances).toHaveLength(1)
      expect(MockResizeObserver.instances[0]!.observed.has(target)).toBe(true)
      result.stop()
    },
  )

  it('在 Vue ref 目标切换时清空旧尺寸并保持支持状态', async () => {
    MockResizeObserver.reset()
    const first = document.createElement('div')
    const second = document.createElement('div')
    const target = ref<Element | null>(null)
    const result = useResizeObserver(target, {
      observerCtor: mockObserverCtor,
      scheduler: 'sync',
    })

    expect(result.isSupported.value).toBe(true)
    target.value = first
    await nextTick()
    MockResizeObserver.instances[0]!.emit(createEntry(first, 100, 60))
    expect(result.width.value).toBe(100)

    target.value = second
    await nextTick()
    expect(result.width.value).toBeUndefined()
    expect(result.height.value).toBeUndefined()
    expect(result.event.value).toBeNull()
    expect(result.isSupported.value).toBe(true)

    target.value = null
    await nextTick()
    expect(MockResizeObserver.instances[1]!.disconnected).toBe(true)
    expect(result.isActive.value).toBe(false)
    expect(result.isSupported.value).toBe(true)
    result.stop()
  })

  it('直接接受结构化 RefLike 的初始元素', async () => {
    MockResizeObserver.reset()
    const element = document.createElement('div')
    const result = useResizeObserver({ value: element }, {
      observerCtor: mockObserverCtor,
      scheduler: 'sync',
    })
    await nextTick()

    expect(MockResizeObserver.instances[0]!.observed.has(element)).toBe(true)
    result.stop()
  })
})
