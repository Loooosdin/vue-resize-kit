<template>
  <section class="panel" v-resize="handleResize">
    {{ width }} × {{ height }}
  </section>
</template>

<script>
import { vResize } from 'vue-resize-kit/vue2'

export default {
  directives: { resize: vResize },
  data() {
    return { width: 0, height: 0 }
  },
  methods: {
    handleResize({ width, height }) {
      this.width = width
      this.height = height
    },
  },
}
</script>
