import type { NormalizedResizeOptions, ResizeOptions } from './types'

export const DEFAULT_RESIZE_OPTIONS: Readonly<NormalizedResizeOptions> = Object.freeze({
  immediate: true,
  disabled: false,
  box: 'content-box',
  axis: 'both',
  threshold: 0,
  scheduler: 'animation-frame',
  delay: 100,
  once: false,
})

function normalizeNonNegativeNumber(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback
}

/** 将宽松的用户配置转换为可直接执行的稳定配置。 */
export function normalizeResizeOptions(options: ResizeOptions = {}): NormalizedResizeOptions {
  const normalized: NormalizedResizeOptions = {
    immediate: options.immediate ?? DEFAULT_RESIZE_OPTIONS.immediate,
    disabled: options.disabled ?? DEFAULT_RESIZE_OPTIONS.disabled,
    box: options.box ?? DEFAULT_RESIZE_OPTIONS.box,
    axis: options.axis ?? DEFAULT_RESIZE_OPTIONS.axis,
    threshold: normalizeNonNegativeNumber(options.threshold, DEFAULT_RESIZE_OPTIONS.threshold),
    scheduler: options.scheduler ?? DEFAULT_RESIZE_OPTIONS.scheduler,
    delay: normalizeNonNegativeNumber(options.delay, DEFAULT_RESIZE_OPTIONS.delay),
    once: options.once ?? DEFAULT_RESIZE_OPTIONS.once,
  }

  if (options.observerCtor) normalized.observerCtor = options.observerCtor
  return normalized
}
