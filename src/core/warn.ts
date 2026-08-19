/** 避免生产环境中的运行时警告，同时不在模块加载时依赖 Node process。 */
export function warn(message: string): void {
  const runtime = globalThis as typeof globalThis & {
    process?: { env?: { NODE_ENV?: string } }
  }

  if (runtime.process?.env?.NODE_ENV !== 'production') {
    console.warn(`[vue-resize-kit] ${message}`)
  }
}
