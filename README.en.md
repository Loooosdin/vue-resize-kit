# vue-resize-kit

A lightweight, typed ResizeObserver toolkit for Vue 2 and Vue 3. It ships a framework-agnostic core, directives for Vue 2.6+/Vue 3.2+, and a composable for Vue 2.7+/Vue 3.2+.

## Install

```bash
# pnpm
pnpm add vue-resize-kit

# npm
npm install vue-resize-kit

# yarn
yarn add vue-resize-kit
```

## Directive

```ts
// Vue 3
import { createResizePlugin } from 'vue-resize-kit/vue3'
app.use(createResizePlugin())

// Vue 2
import { createResizePlugin } from 'vue-resize-kit/vue2'
Vue.use(createResizePlugin())
```

```vue
<div v-resize="onResize" />
```

## Core

```ts
import { observeResize } from 'vue-resize-kit/core'

const controller = observeResize(element, ({ width, height }) => {
  console.log(width, height)
})

controller.stop()
```

See [README.md](./README.md) for the complete Chinese documentation.

## License

MIT
