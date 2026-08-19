import * as VueRuntime from 'vue'
import type { ResizeOptions } from '../core'
import { createUseResizeObserver } from '../shared/composable'
import type {
  RefLike,
  ResizeTarget,
  UseResizeObserverReturn,
  VueCompositionRuntime,
} from '../shared/composable'
import { createResizeDirectiveHooks } from '../shared/directive'
import type { DirectiveBindingLike, ResizeBindingObject, ResizeBindingValue } from '../shared/directive'

export interface Vue2Directive {
  inserted(el: Element, binding: DirectiveBindingLike): void
  update(el: Element, binding: DirectiveBindingLike): void
  unbind(el: Element): void
}

export interface ResizePluginOptions {
  directiveName?: string
  defaults?: ResizeOptions
}

export interface Vue2ConstructorLike {
  directive(name: string, directive: Vue2Directive): void
}

export interface Vue2Plugin {
  install(Vue: Vue2ConstructorLike): void
}

export function createResizeDirective(defaults: ResizeOptions = {}): Vue2Directive {
  const hooks = createResizeDirectiveHooks(defaults)
  return {
    inserted: hooks.mount,
    update: hooks.update,
    unbind: hooks.unmount,
  }
}

export const vResize = createResizeDirective()

export function createResizePlugin(options: ResizePluginOptions = {}): Vue2Plugin {
  const directive = createResizeDirective(options.defaults)
  return {
    install(Vue) {
      Vue.directive(options.directiveName ?? 'resize', directive)
    },
  }
}

/** Vue 2.6 可安全导入本入口，但调用该 API 需要 Vue 2.7+。 */
export const useResizeObserver = createUseResizeObserver(
  VueRuntime as unknown as Partial<VueCompositionRuntime>,
)

export type {
  DirectiveBindingLike,
  RefLike,
  ResizeBindingObject,
  ResizeBindingValue,
  ResizeTarget,
  UseResizeObserverReturn,
}
export type {
  ResizeAxis,
  ResizeBox,
  ResizeController,
  ResizeEvent,
  ResizeHandler,
  ResizeObserverConstructor,
  ResizeOptions,
  ResizeScheduler,
  ResizeSize,
} from '../core'
