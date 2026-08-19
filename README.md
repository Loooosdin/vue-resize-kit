# vue-resize-kit

一个轻量、类型友好的元素尺寸监听工具包，提供纯 DOM Core API、Vue 2/3 指令以及 Vue 2.7+/Vue 3 的组合式 API。

## 特性

- Vue 2.6+ 与 Vue 3.2+ 指令支持，不依赖 `vue-demi`
- `content-box`、`border-box`、`device-pixel-content-box`
- 首次通知、轴向过滤、变化阈值、once、动态启停
- sync、requestAnimationFrame、debounce、throttle 调度
- SSR 安全，支持注入 ResizeObserver polyfill
- ESM、CommonJS 和完整 TypeScript 类型
- 零运行时依赖，Vue 不会打包进产物

## 安装

```bash
# pnpm
pnpm add vue-resize-kit

# npm
npm install vue-resize-kit

# yarn
yarn add vue-resize-kit
```

库不内置 `ResizeObserver` polyfill。现代浏览器可直接使用，旧运行环境请通过 `observerCtor` 注入兼容实现。

## Core API

```ts
import { observeResize } from 'vue-resize-kit/core'

const controller = observeResize(
  document.querySelector('.panel')!,
  ({ width, height, previousSize, isInitial }) => {
    console.log({ width, height, previousSize, isInitial })
  },
  {
    box: 'border-box',
    scheduler: 'animation-frame',
    threshold: 1,
  },
)

controller.pause()
controller.resume()
controller.stop()
```

`stop()` 是终态；调用后不能恢复。`pause()` 后可通过 `resume()` 重新观察，并重新应用首次通知策略。

## Vue 2

Vue 2.6+ 可以使用指令和 Core API。`useResizeObserver` 需要 Vue 2.7+。

```ts
import Vue from 'vue'
import { createResizePlugin } from 'vue-resize-kit/vue2'

Vue.use(
  createResizePlugin({
    defaults: { scheduler: 'animation-frame' },
  }),
)
```

局部注册：

```ts
import { vResize } from 'vue-resize-kit/vue2'

export default {
  directives: { resize: vResize },
}
```

```vue
<div v-resize="handleResize" />
```

## Vue 3

```ts
import { createApp } from 'vue'
import { createResizePlugin } from 'vue-resize-kit/vue3'
import App from './App.vue'

createApp(App).use(createResizePlugin()).mount('#app')
```

在 `<script setup>` 中可直接局部使用：

```vue
<script setup lang="ts">
import { vResize } from 'vue-resize-kit/vue3'

function onResize(event) {
  console.log(event.width, event.height)
}
</script>

<template>
  <div v-resize="onResize" />
</template>
```

请将指令绑定到真实 DOM 元素。Vue 3 多根组件无法可靠地决定指令应落到哪个根节点，因此不建议直接绑定到组件。

## 高级指令配置

```vue
<div
  v-resize="{
    handler: onResize,
    box: 'border-box',
    axis: 'width',
    threshold: 2,
    scheduler: 'debounce',
    delay: 150,
    immediate: false,
    disabled: paused,
  }"
/>
```

配置和 handler 可以随组件更新。只改变 handler 不会重建原生 Observer；改变 box 或调度配置时会安全取消旧任务并重新观察。

## Composition API

适用于 Vue 2.7+ 和 Vue 3.2+：

```ts
import { ref } from 'vue'
import { useResizeObserver } from 'vue-resize-kit/vue3'

const panelRef = ref<HTMLElement | null>(null)
const { width, height, event, isActive, pause, resume, stop } = useResizeObserver(
  panelRef,
  (resizeEvent) => console.log(resizeEvent),
  { box: 'border-box' },
)
```

当目标 ref 从空值变为元素、切换元素或清空时，Composable 会自动切换并清理观察关系。

## 配置项

| 配置 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `immediate` | `boolean` | `true` | 开始或恢复观察后，是否把元素当前尺寸作为首次事件交付；关闭时，首次通知只用于建立比较基线。 |
| `disabled` | `boolean` | `false` | 是否以暂停状态创建 Controller；Vue 指令中可以响应式切换，Core API 中可使用 `resume()` 开始观察。 |
| `box` | `ResizeBox` | `content-box` | 指定监听内容盒、边框盒或设备像素内容盒；同时决定事件中归一化尺寸的数据来源。 |
| `axis` | `width \| height \| both` | `both` | 指定哪些物理尺寸参与变化过滤；不会删除事件中的其他尺寸字段。 |
| `threshold` | `number` | `0` | 相对上一次已交付尺寸需要达到的最小像素差；小变化会累计，不会移动比较基线。 |
| `scheduler` | `sync \| animation-frame \| debounce \| throttle` | `animation-frame` | 控制事件交付时机；可同步交付、合并到下一帧、等待变化停止或按固定频率限流。 |
| `delay` | `number` | `100` | debounce/throttle 的时间窗口，单位毫秒；其他调度方式忽略该值。 |
| `once` | `boolean` | `false` | 第一次实际交付回调后自动执行 `stop()`；如果 `immediate=true`，首次尺寸事件也计入。 |
| `observerCtor` | `ResizeObserverConstructor` | 当前环境的原生实现 | 注入兼容原生构造器契约的 polyfill；适用于旧浏览器、测试环境或受控运行时。 |

### `immediate`

`immediate` 控制每次开始观察时如何处理 ResizeObserver 的首次通知：

- `true`：首次通知正常交付，事件的 `isInitial` 为 `true`，适合用当前尺寸初始化图表或布局。
- `false`：不调用业务 handler，只记录当前尺寸作为后续 `axis` 和 `threshold` 的比较基线。
- Controller 执行 `pause()` 后再 `resume()`，会开始一个新的观察周期并重新应用该规则。

如果现有组件已经在 `mounted` 中完成初始化，通常可以设置 `immediate: false`，避免重复执行一次 resize。

### `disabled`

`disabled: true` 会创建一个受支持但未激活的 Controller，此时 `isSupported` 仍反映浏览器能力，`isActive` 为 `false`。

- Core API：调用 `resume()` 后开始观察。
- Vue 指令：配置中的 `disabled` 可绑定响应式状态，`false → true` 会暂停并取消待执行任务，`true → false` 会恢复观察。
- Composable：除初始配置外，也可以使用返回的 `pause()` 和 `resume()` 控制。

`stop()` 与暂停不同，它是终态；停止后的 Controller 不能再次恢复。

### `box`

可选值与原生 `ResizeObserver.observe()` 一致：

| 值 | 监听范围 | 常见用途 |
| --- | --- | --- |
| `content-box` | 仅内容区域，不包含 padding、border | 图表画布、文本内容区域，兼容性最好 |
| `border-box` | 内容、padding 和 border 组成的边框盒 | 面板、卡片、可拖拽容器的实际占位尺寸 |
| `device-pixel-content-box` | 以设备像素表示的内容区域 | 高清 Canvas、像素级绘制；需要浏览器支持 |

事件中的 `width/height` 会根据所选 box 和 CSS 书写模式归一化为物理尺寸，`inlineSize/blockSize` 保留原生逻辑尺寸。若注入的旧 polyfill 不接受 `observe(target, { box })`，库会回退到默认观察模式并在开发环境提示。

### `axis` 与 `threshold`

这两个配置共同决定一次原生尺寸通知是否交付给业务 handler：

- `axis: width`：只比较宽度，高度变化不会触发业务回调。
- `axis: height`：只比较高度，宽度变化不会触发业务回调。
- `axis: both`：宽度或高度任一维度达到阈值即可触发，不要求两个维度同时变化。
- `threshold: 0`：任意非零变化都会触发；重复的相同尺寸不会触发。
- `threshold: 10`：所选维度相对上一次已交付尺寸至少变化 10px 才触发。

未达到阈值的通知不会更新比较基线，因此连续多次 2px 的小变化可以累计到阈值后触发。首次事件在 `immediate: true` 时不受阈值限制。

```ts
observeResize(element, handler, {
  axis: 'width',
  threshold: 10,
})
```

### `scheduler` 与 `delay`

| 调度方式 | 交付行为 | 推荐场景 |
| --- | --- | --- |
| `sync` | 在 ResizeObserver 回调中立即交付，每次有效通知都执行 | 轻量状态同步、测试或必须立即读取结果的场景 |
| `animation-frame` | 合并同一渲染周期的通知，在下一帧只交付最后一次 | ECharts、Canvas、DOM 重绘，默认推荐 |
| `debounce` | 每次变化都重新计时，连续 `delay` 毫秒没有新变化后交付最后一次 | 布局稳定后执行昂贵计算 |
| `throttle` | 时间窗口开始时立即交付一次，窗口内保留最后一次并在末尾补充交付 | 拖拽、分栏调整等需要持续反馈的场景 |

`delay` 只对 debounce 和 throttle 生效，必须是大于或等于 0 的有限数值。负数、`NaN` 或无限值会回退到默认的 `100ms`。

### `once`

`once` 根据“实际交付次数”判断，而不是根据浏览器产生的原始通知次数：

- 被 `axis` 或 `threshold` 过滤的通知不计入。
- 被 debounce/rAF 合并的通知只计为一次。
- `immediate: true` 时，首次尺寸事件交付后立即停止。
- `immediate: false` 时，首次通知只建立基线，直到后续变化真正交付才停止。

停止时会断开 Observer，并取消尚未执行的 animation frame 或定时器。

### `observerCtor`

传入值必须能够按照原生方式实例化，并至少实现 `observe()`、`disconnect()` 及回调通知契约：

```ts
import ResizeObserverPolyfill from 'resize-observer-polyfill'

observeResize(element, handler, {
  observerCtor: ResizeObserverPolyfill,
})
```

如果没有提供该配置且当前环境不存在原生 `ResizeObserver`，库不会抛出异常：返回的 Controller 中 `isSupported` 和 `isActive` 均为 `false`，开发环境会给出提示。

### 配置更新规则

- Core API 和 Composable 的 options 在创建时读取；需要更换 box、调度或过滤规则时，应停止旧 Controller 并重新创建。
- Vue 指令配置可以随组件渲染动态变化。只改变 handler 会复用现有 Observer，切换 `disabled` 会暂停或恢复，其他运行参数变化会安全重建观察关系。
- 配置重建、暂停和卸载都会取消尚未交付的 rAF、debounce 或 throttle 任务，避免旧回调在组件卸载后执行。

## ResizeEvent

```ts
interface ResizeEvent {
  target: Element
  width: number
  height: number
  inlineSize: number
  blockSize: number
  previousSize: ResizeSize | null
  contentRect: DOMRectReadOnly
  entry: ResizeObserverEntry
  box: ResizeBox
  isInitial: boolean
}
```

`previousSize` 始终是上一次已经交付给业务回调的尺寸。`width/height` 是所选 box 归一化后的物理尺寸，`inlineSize/blockSize` 保留 CSS 书写模式对应的逻辑尺寸。

## SSR 与 polyfill

模块导入阶段不会访问 `window` 或 `document`。没有原生 ResizeObserver 时，Controller 的 `isSupported` 为 `false`，并在开发环境给出警告。

```ts
import ResizeObserverPolyfill from 'resize-observer-polyfill'
import { observeResize } from 'vue-resize-kit/core'

observeResize(element, handler, {
  observerCtor: ResizeObserverPolyfill,
})
```

polyfill 仅为示例，不是本项目依赖。

## 性能建议

- 图表重绘优先使用默认的 `animation-frame`。
- 输入、拖拽等高频场景可以使用 throttle；布局稳定后计算可使用 debounce。
- 使用 `axis` 和 `threshold` 排除业务不关心的细小变化。
- 回调内避免同步反复修改被观察元素尺寸，以防形成 ResizeObserver 循环。

## 开发

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm test:browser
pnpm build
pnpm size
```

发布前才需要运行构建和体积检查。

## License

[MIT](./LICENSE)
