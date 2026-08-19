// @vitest-environment node

import { describe, expect, it } from 'vitest'

describe('SSR 模块导入', () => {
  it('没有 DOM 全局对象时可安全导入全部入口', async () => {
    const modules = await Promise.all([
      import('../src/core'),
      import('../src/vue2'),
      import('../src/vue3'),
    ])

    expect(modules).toHaveLength(3)
    expect(typeof modules[0].observeResize).toBe('function')
    expect(typeof modules[1].createResizeDirective).toBe('function')
    expect(typeof modules[2].createResizeDirective).toBe('function')
  })
})
