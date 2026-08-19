import { normalizeResizeOptions, observeResize } from '../core'
import type {
  NormalizedResizeOptions,
  ResizeController,
  ResizeHandler,
  ResizeOptions,
} from '../core'
import { warn } from '../core/warn'

export interface ResizeBindingObject extends ResizeOptions {
  handler: ResizeHandler
}

export type ResizeBindingValue = ResizeHandler | ResizeBindingObject

export interface DirectiveBindingLike {
  value: unknown
  oldValue?: unknown
}

export interface ResizeDirectiveHooks {
  mount(el: Element, binding: DirectiveBindingLike): void
  update(el: Element, binding: DirectiveBindingLike): void
  unmount(el: Element): void
}

interface ParsedBinding {
  handler: ResizeHandler
  options: NormalizedResizeOptions
}

interface DirectiveState extends ParsedBinding {
  controller: ResizeController
}

const states = new WeakMap<Element, DirectiveState>()

function parseBinding(value: unknown, defaults: ResizeOptions): ParsedBinding | null {
  if (typeof value === 'function') {
    return {
      handler: value as ResizeHandler,
      options: normalizeResizeOptions(defaults),
    }
  }

  if (!value || typeof value !== 'object') return null
  const binding = value as Partial<ResizeBindingObject>
  if (typeof binding.handler !== 'function') return null

  return {
    handler: binding.handler,
    options: normalizeResizeOptions({ ...defaults, ...binding }),
  }
}

function sameRuntimeOptions(a: NormalizedResizeOptions, b: NormalizedResizeOptions): boolean {
  return (
    a.immediate === b.immediate &&
    a.box === b.box &&
    a.axis === b.axis &&
    a.threshold === b.threshold &&
    a.scheduler === b.scheduler &&
    a.delay === b.delay &&
    a.once === b.once &&
    a.observerCtor === b.observerCtor
  )
}

function cleanup(el: Element): void {
  states.get(el)?.controller.stop()
  states.delete(el)
}

function setup(el: Element, parsed: ParsedBinding): void {
  const state = {} as DirectiveState
  state.handler = parsed.handler
  state.options = parsed.options
  state.controller = observeResize(el, (event) => state.handler(event), parsed.options)
  states.set(el, state)
}

/** 创建一组可映射到 Vue 2/3 生命周期名称的通用指令钩子。 */
export function createResizeDirectiveHooks(defaults: ResizeOptions = {}): ResizeDirectiveHooks {
  return {
    mount(el, binding) {
      cleanup(el)
      const parsed = parseBinding(binding.value, defaults)
      if (!parsed) {
        warn('v-resize 绑定值必须是函数，或包含 handler 函数的配置对象。')
        return
      }
      setup(el, parsed)
    },

    update(el, binding) {
      const parsed = parseBinding(binding.value, defaults)
      if (!parsed) {
        cleanup(el)
        warn('v-resize 绑定值必须是函数，或包含 handler 函数的配置对象。')
        return
      }

      const state = states.get(el)
      if (!state) {
        setup(el, parsed)
        return
      }

      // 回调通常随组件渲染产生新引用，单独更新时无需重建观察器。
      state.handler = parsed.handler
      if (!sameRuntimeOptions(state.options, parsed.options)) {
        cleanup(el)
        setup(el, parsed)
        return
      }

      if (state.options.disabled !== parsed.options.disabled) {
        if (parsed.options.disabled) state.controller.pause()
        else state.controller.resume()
      }
      state.options = parsed.options
    },

    unmount(el) {
      cleanup(el)
    },
  }
}

export function getDirectiveControllerForTest(el: Element): ResizeController | undefined {
  return states.get(el)?.controller
}
