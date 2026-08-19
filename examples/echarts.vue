<script setup lang="ts">
import * as echarts from 'echarts'
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { vResize } from 'vue-resize-kit/vue3'

const chartElement = ref<HTMLElement | null>(null)
let chart: echarts.ECharts | null = null

onMounted(async () => {
  await nextTick()
  if (chartElement.value) chart = echarts.init(chartElement.value)
})

onBeforeUnmount(() => {
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div v-resize="() => chart?.resize()" class="chart-wrapper">
    <div ref="chartElement" class="chart" />
  </div>
</template>

<style scoped>
.chart-wrapper,
.chart {
  width: 100%;
  height: 100%;
}
</style>
