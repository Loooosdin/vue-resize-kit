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
})
