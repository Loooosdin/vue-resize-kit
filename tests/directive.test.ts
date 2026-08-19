import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createResizePlugin as createVue2Plugin, vResize as vue2Resize } from '../src/vue2'
import { createResizePlugin as createVue3Plugin, vResize as vue3Resize } from '../src/vue3'
import { createEntry, MockResizeObserver, mockObserverCtor } from './helpers/mockResizeObserver'

describe('Vue directives', () => {
  let target: HTMLDivElement

  beforeEach(() => {
    target = document.createElement('div')
    MockResizeObserver.reset()
  })

  it('Vue 2 映射 inserted/update/unbind 生命周期', () => {
    const firstHandler = vi.fn()
    const secondHandler = vi.fn()
    const firstBinding = {
      value: { handler: firstHandler, observerCtor: mockObserverCtor, scheduler: 'sync' as const },
    }

    vue2Resize.inserted(target, firstBinding)
    expect(MockResizeObserver.instances).toHaveLength(1)
    vue2Resize.update(target, {
      value: { handler: secondHandler, observerCtor: mockObserverCtor, scheduler: 'sync' as const },
    })
    expect(MockResizeObserver.instances).toHaveLength(1)

    MockResizeObserver.instances[0]!.emit(createEntry(target, 120, 80))
    expect(firstHandler).not.toHaveBeenCalled()
    expect(secondHandler).toHaveBeenCalledOnce()

    vue2Resize.unbind(target)
    expect(MockResizeObserver.instances[0]!.disconnected).toBe(true)
  })

  it('Vue 3 在配置变化时重建，在 disabled 变化时暂停恢复', () => {
    const handler = vi.fn()
    vue3Resize.mounted(target, {
      value: { handler, observerCtor: mockObserverCtor, scheduler: 'sync', disabled: true },
    })
    expect(MockResizeObserver.instances).toHaveLength(0)

    vue3Resize.updated(target, {
      value: { handler, observerCtor: mockObserverCtor, scheduler: 'sync', disabled: false },
    })
    expect(MockResizeObserver.instances).toHaveLength(1)

    vue3Resize.updated(target, {
      value: { handler, observerCtor: mockObserverCtor, scheduler: 'sync', box: 'border-box' },
    })
    expect(MockResizeObserver.instances).toHaveLength(2)
    expect(MockResizeObserver.instances[0]!.disconnected).toBe(true)
  })

  it('插件支持自定义全局指令名称', () => {
    const vue2Directive = vi.fn()
    const vue3Directive = vi.fn()
    createVue2Plugin({ directiveName: 'observe-size' }).install({ directive: vue2Directive })
    createVue3Plugin({ directiveName: 'observe-size' }).install({ directive: vue3Directive })

    expect(vue2Directive).toHaveBeenCalledWith('observe-size', expect.any(Object))
    expect(vue3Directive).toHaveBeenCalledWith('observe-size', expect.any(Object))
  })

  it('绑定值失效时立即清理现有观察器', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vue3Resize.mounted(target, {
      value: { handler: vi.fn(), observerCtor: mockObserverCtor, scheduler: 'sync' },
    })
    vue3Resize.updated(target, { value: null })

    expect(MockResizeObserver.instances[0]!.disconnected).toBe(true)
    expect(warning).toHaveBeenCalled()
    warning.mockRestore()
  })
})
