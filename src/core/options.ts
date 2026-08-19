import type {
  NormalizedResizeOptions,
  ResizeAxis,
  ResizeBox,
  ResizeOptions,
  ResizeScheduler,
} from './types'
import { warn } from './warn'

const RESIZE_BOXES: readonly ResizeBox[] = [
  'content-box',
  'border-box',
  'device-pixel-content-box',
]
const RESIZE_AXES: readonly ResizeAxis[] = ['width', 'height', 'both']
const RESIZE_SCHEDULERS: readonly ResizeScheduler[] = [
  'sync',
  'animation-frame',
  'debounce',
  'throttle',
]

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

function normalizeBoolean(value: unknown, fallback: boolean, name: string): boolean {
  if (value === undefined) return fallback
  if (typeof value === 'boolean') return value
  warn(`配置项 ${name} 必须是 boolean，已回退到默认值。`)
  return fallback
}

function normalizeEnum<T extends string>(
  value: unknown,
  values: readonly T[],
  fallback: T,
  name: string,
): T {
  if (value === undefined) return fallback
  if (typeof value === 'string' && values.includes(value as T)) return value as T
  warn(`配置项 ${name} 的值无效，已回退到默认值。`)
  return fallback
}

/** 将宽松的用户配置转换为可直接执行的稳定配置。 */
export function normalizeResizeOptions(options: ResizeOptions = {}): NormalizedResizeOptions {
  const normalized: NormalizedResizeOptions = {
    immediate: normalizeBoolean(options.immediate, DEFAULT_RESIZE_OPTIONS.immediate, 'immediate'),
    disabled: normalizeBoolean(options.disabled, DEFAULT_RESIZE_OPTIONS.disabled, 'disabled'),
    box: normalizeEnum(options.box, RESIZE_BOXES, DEFAULT_RESIZE_OPTIONS.box, 'box'),
    axis: normalizeEnum(options.axis, RESIZE_AXES, DEFAULT_RESIZE_OPTIONS.axis, 'axis'),
    threshold: normalizeNonNegativeNumber(options.threshold, DEFAULT_RESIZE_OPTIONS.threshold),
    scheduler: normalizeEnum(
      options.scheduler,
      RESIZE_SCHEDULERS,
      DEFAULT_RESIZE_OPTIONS.scheduler,
      'scheduler',
    ),
    delay: normalizeNonNegativeNumber(options.delay, DEFAULT_RESIZE_OPTIONS.delay),
    once: normalizeBoolean(options.once, DEFAULT_RESIZE_OPTIONS.once, 'once'),
  }

  if (options.observerCtor !== undefined) {
    if (typeof options.observerCtor === 'function') normalized.observerCtor = options.observerCtor
    else warn('配置项 observerCtor 必须是构造函数，已忽略该值。')
  }
  return normalized
}
