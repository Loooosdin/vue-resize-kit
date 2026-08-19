import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    core: 'src/core/index.ts',
    vue2: 'src/vue2/index.ts',
    vue3: 'src/vue3/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  minify: true,
  external: ['vue'],
  outExtension({ format }) {
    return { js: format === 'cjs' ? '.cjs' : '.js' }
  },
})
