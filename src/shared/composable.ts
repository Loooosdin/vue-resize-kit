import { observeResize } from '../core'
import type { ResizeController, ResizeEvent, ResizeHandler, ResizeOptions } from '../core'
import { isElement } from '../core/element'
import { warn } from '../core/warn'

export interface RefLike<T> {
  value: T
}

export type ResizeTarget = Element | RefLike<Element | null | undefined>

export interface UseResizeObserverReturn {
  width: Readonly<RefLike<number | undefined>>
  height: Readonly<RefLike<number | undefined>>
  event: Readonly<RefLike<ResizeEvent | null>>
  isActive: Readonly<RefLike<boolean>>
  isSupported: Readonly<RefLike<boolean>>
  pause(): void
  resume(): void
  stop(): void
}

export interface VueCompositionRuntime {
  ref<T>(value: T): RefLike<T>
  shallowRef<T>(value: T): RefLike<T>
  readonly<T extends RefLike<unknown>>(value: T): Readonly<T>
  watch<T>(
    source: () => T,
    callback: (value: T, oldValue: T | undefined) => void,
    options: { immediate: true; flush: 'post' },
  ): () => void
  getCurrentInstance(): unknown
  onBeforeUnmount(callback: () => void): void
}

export interface UseResizeObserver {
  (
    target: ResizeTarget,
    options?: ResizeOptions,
  ): UseResizeObserverReturn
  (
    target: ResizeTarget,
    handler: ResizeHandler,
    options?: ResizeOptions,
  ): UseResizeObserverReturn
}

function resolveTarget(target: ResizeTarget): Element | null {
  // DOM 表单元素自身也有 value 属性，因此必须优先识别 Element。
  if (isElement(target)) return target
  if (typeof target !== 'object' || target === null || !('value' in target)) {
    warn('useResizeObserver 的 target 必须是 Element 或包含 Element 的 ref。')
    return null
  }

  const value = target.value
  if (value == null) return null
  if (isElement(value)) return value

  warn('useResizeObserver 的 target ref 当前值不是 Element，已跳过观察。')
  return null
}

function resolveSupport(options: ResizeOptions): boolean {
  if (typeof options.observerCtor === 'function') return true
  return typeof (globalThis as typeof globalThis & { ResizeObserver?: unknown }).ResizeObserver === 'function'
}

function assertCompositionApi(runtime: Partial<VueCompositionRuntime>): asserts runtime is VueCompositionRuntime {
  const required = ['ref', 'shallowRef', 'readonly', 'watch', 'getCurrentInstance', 'onBeforeUnmount'] as const
  if (required.some((key) => typeof runtime[key] !== 'function')) {
    throw new Error('[vue-resize-kit] useResizeObserver 需要 Vue 2.7+ 或 Vue 3.2+。')
  }
}

/** 使用注入的 Vue 运行时创建跨 Vue 2.7 / Vue 3 的组合式 API。 */
export function createUseResizeObserver(runtimeInput: Partial<VueCompositionRuntime>): UseResizeObserver {
  return function useResizeObserver(
    target: ResizeTarget,
    handlerOrOptions?: ResizeHandler | ResizeOptions,
    maybeOptions: ResizeOptions = {},
  ): UseResizeObserverReturn {
    assertCompositionApi(runtimeInput)
    const runtime = runtimeInput
    const handler = typeof handlerOrOptions === 'function' ? handlerOrOptions : undefined
    const options = typeof handlerOrOptions === 'function' ? maybeOptions : (handlerOrOptions ?? {})

    const width = runtime.ref<number | undefined>(undefined)
    const height = runtime.ref<number | undefined>(undefined)
    const event = runtime.shallowRef<ResizeEvent | null>(null)
    const isActive = runtime.ref(false)
    const isSupported = runtime.ref(resolveSupport(options))

    let controller: ResizeController | null = null
    let currentTarget: Element | null = null
    let stopped = false
    let manuallyPaused = false

    const resetMeasurement = () => {
      width.value = undefined
      height.value = undefined
      event.value = null
    }

    const cleanupController = () => {
      controller?.stop()
      controller = null
      isActive.value = false
    }

    const attach = (element: Element | null) => {
      const targetChanged = element !== currentTarget
      cleanupController()
      currentTarget = element
      if (targetChanged) resetMeasurement()
      if (!element || stopped) return

      controller = observeResize(
        element,
        (resizeEvent) => {
          width.value = resizeEvent.width
          height.value = resizeEvent.height
          event.value = resizeEvent
          handler?.(resizeEvent)

          // once 会在 handler 返回后终止 Controller，微任务中同步响应式状态。
          if (options.once) queueMicrotask(() => (isActive.value = controller?.isActive ?? false))
        },
        options,
      )
      isSupported.value = controller.isSupported
      if (manuallyPaused) controller.pause()
      isActive.value = controller.isActive
    }

    const stopWatch = runtime.watch(() => resolveTarget(target), attach, {
      immediate: true,
      flush: 'post',
    })

    const result: UseResizeObserverReturn = {
      width: runtime.readonly(width),
      height: runtime.readonly(height),
      event: runtime.readonly(event),
      isActive: runtime.readonly(isActive),
      isSupported: runtime.readonly(isSupported),
      pause() {
        if (stopped) return
        manuallyPaused = true
        controller?.pause()
        isActive.value = false
      },
      resume() {
        if (stopped) return
        manuallyPaused = false
        if (!controller) attach(resolveTarget(target))
        else controller.resume()
        isActive.value = controller?.isActive ?? false
      },
      stop() {
        if (stopped) return
        stopped = true
        stopWatch()
        cleanupController()
      },
    }

    if (runtime.getCurrentInstance()) runtime.onBeforeUnmount(result.stop)
    return result
  }
}
