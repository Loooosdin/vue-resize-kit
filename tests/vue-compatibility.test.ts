import * as VueRuntime from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useResizeObserver as useVue2ResizeObserver, vResize as vue2Resize } from '../src/vue2'
import { useResizeObserver as useVue3ResizeObserver, vResize as vue3Resize } from '../src/vue3'
import { MockResizeObserver, mockObserverCtor } from './helpers/mockResizeObserver'

type RuntimeRecord = Record<string, any>

function getRuntime(): RuntimeRecord {
  return VueRuntime as unknown as RuntimeRecord
}

function getVersion(runtime: RuntimeRecord): string {
  return (runtime.version ?? runtime.default?.version ?? '') as string
}

describe('Vue 真实运行时兼容性', () => {
  beforeEach(() => {
    MockResizeObserver.reset()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('真实挂载和卸载指令时会创建并清理 Observer', () => {
    const runtime = getRuntime()
    const version = getVersion(runtime)
    const host = document.createElement('div')
    document.body.append(host)
    const bindingValue = {
      handler: vi.fn(),
      observerCtor: mockObserverCtor,
      scheduler: 'sync' as const,
    }

    if (version.startsWith('2.')) {
      const Vue = (runtime.default ?? runtime) as any
      const directiveName = 'resize-compat-test'
      Vue.directive(directiveName, vue2Resize)
      const vm = new Vue({
        render(createElement: any) {
          return createElement('div', {
            directives: [{ name: directiveName, value: bindingValue }],
          })
        },
      })
      vm.$mount(host)
      expect(MockResizeObserver.instances).toHaveLength(1)
      vm.$destroy()
    } else {
      const app = runtime.createApp({
        render() {
          return runtime.withDirectives(runtime.h('div'), [[vue3Resize, bindingValue]])
        },
      })
      app.mount(host)
      expect(MockResizeObserver.instances).toHaveLength(1)
      app.unmount()
    }

    expect(MockResizeObserver.instances[0]!.disconnected).toBe(true)
  })

  it('Composable 在支持的 Vue 版本卸载时自动清理', () => {
    const runtime = getRuntime()
    const version = getVersion(runtime)
    const target = document.createElement('div')
    const host = document.createElement('div')
    document.body.append(host)

    if (version.startsWith('2.6.')) {
      expect(() =>
        useVue2ResizeObserver(target, {
          observerCtor: mockObserverCtor,
          scheduler: 'sync',
        }),
      ).toThrow('Vue 2.7+')
      return
    }

    if (version.startsWith('2.')) {
      const Vue = (runtime.default ?? runtime) as any
      const vm = new Vue({
        setup() {
          useVue2ResizeObserver(target, {
            observerCtor: mockObserverCtor,
            scheduler: 'sync',
          })
          return {}
        },
        render(createElement: any) {
          return createElement('div')
        },
      })
      vm.$mount(host)
      expect(MockResizeObserver.instances).toHaveLength(1)
      vm.$destroy()
    } else {
      const app = runtime.createApp({
        setup() {
          useVue3ResizeObserver(target, {
            observerCtor: mockObserverCtor,
            scheduler: 'sync',
          })
          return () => runtime.h('div')
        },
      })
      app.mount(host)
      expect(MockResizeObserver.instances).toHaveLength(1)
      app.unmount()
    }

    expect(MockResizeObserver.instances[0]!.disconnected).toBe(true)
  })
})
