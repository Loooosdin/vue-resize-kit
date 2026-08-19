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

export interface Vue3Directive {
  mounted(el: Element, binding: DirectiveBindingLike): void
  updated(el: Element, binding: DirectiveBindingLike): void
  unmounted(el: Element): void
}

export interface ResizePluginOptions {
  directiveName?: string
  defaults?: ResizeOptions
}

export interface Vue3AppLike {
  directive(name: string, directive: Vue3Directive): unknown
}

export interface Vue3Plugin {
  install(app: Vue3AppLike): void
}

export function createResizeDirective(defaults: ResizeOptions = {}): Vue3Directive {
  const hooks = createResizeDirectiveHooks(defaults)
  return {
    mounted: hooks.mount,
    updated: hooks.update,
    unmounted: hooks.unmount,
  }
}

export const vResize = createResizeDirective()

export function createResizePlugin(options: ResizePluginOptions = {}): Vue3Plugin {
  const directive = createResizeDirective(options.defaults)
  return {
    install(app) {
      app.directive(options.directiveName ?? 'resize', directive)
    },
  }
}

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
