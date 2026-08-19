<script setup lang="ts">
import { ref } from 'vue'
import { useResizeObserver } from 'vue-resize-kit/vue3'

const panelRef = ref<HTMLElement | null>(null)
const { width, height, pause, resume } = useResizeObserver(panelRef, {
  box: 'border-box',
})
</script>

<template>
  <div ref="panelRef">
    {{ width ?? 0 }} × {{ height ?? 0 }}
    <button @click="pause">暂停</button>
    <button @click="resume">恢复</button>
  </div>
</template>
