<script setup lang="ts">
import { ref } from 'vue'
import { vResize } from 'vue-resize-kit/vue3'

const width = ref(0)
const paused = ref(false)
</script>

<template>
  <div
    v-resize="{
      handler: (event) => (width = event.width),
      axis: 'width',
      threshold: 2,
      disabled: paused,
    }"
  >
    width: {{ width }}px
  </div>
</template>
