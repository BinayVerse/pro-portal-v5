<template>
  <div v-if="isMounted">
    <apexchart type="bar" height="400" :options="chartOptions" :series="series" :key="chartKey" />
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { getColorsForLabels, orderLabels } from '@/utils/chartColors'

const isMounted = ref(false)

onMounted(() => {
  isMounted.value = true
})

const props = defineProps({
  chartData: {
    type: Array,
    required: true,
    default: () => [],
  },
})

// Track disabled series
const disabledSeries = ref(new Set())

// Force re-render key when data changes
const chartKey = ref(0)

// X-axis categories (user names)
const categories = computed(() => props.chartData.map((item) => item.name))
const defaultChannels = ['teams', 'whatsapp', 'slack', 'admin']

// Dynamic app keys (all except "name")
const rawAppKeys = computed(() => {
  if (!props.chartData.length) return defaultChannels
  // Include all default channels, even if missing in data
  const keysInData = Object.keys(props.chartData[0]).filter((k) => k !== 'name')
  return Array.from(new Set([...defaultChannels, ...keysInData]))
})

// Order keys according to canonical APP_ORDER
const appKeys = computed(() => orderLabels(rawAppKeys.value))

// Get colors with opacity for disabled series
const getSeriesColors = () => {
  const baseColors = getColorsForLabels(appKeys.value)
  return appKeys.value.map((key, index) => {
    const color = baseColors[index]
    return disabledSeries.value.has(key) ? color + '40' : color // 40 = 25% opacity (hex)
  })
}

// Series for ApexCharts (use ordered keys)
const series = computed(() => {
  return appKeys.value.map((app) => ({
    name: app,
    data: props.chartData.map((item) => Number(item[app]) || 0),
  }))
})

// Handle legend click
const handleLegendClick = (seriesName) => {
  if (disabledSeries.value.has(seriesName)) {
    disabledSeries.value.delete(seriesName)
  } else {
    disabledSeries.value.add(seriesName)
  }
  // Force chart update by incrementing key
  chartKey.value++
}

// Chart options
const chartOptions = computed(() => ({
  chart: {
    type: 'bar',
    stacked: true,
    toolbar: { show: false },
    foreColor: '#ccc',
    animations: {
      enabled: true,
      easing: 'easeinout',
      speed: 800,
      animateGradually: { enabled: true, delay: 150 },
      dynamicAnimation: { enabled: true, speed: 350 },
    },
    events: {
      legendClick: function(chartContext, seriesIndex, config) {
        // Get the series name from the index
        const seriesName = appKeys.value[seriesIndex]
        handleLegendClick(seriesName)
        return false // Prevent default behavior
      }
    }
  },
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: '60%',
      borderRadius: 0,
      borderRadiusApplication: 'end',
      dataLabels: { position: 'top' },
    },
  },
  dataLabels: {
    enabled: false,
    style: { fontSize: '10px', colors: ['#fff'] },
    offsetY: -20,
    formatter: (val) => (val > 0 ? val.toLocaleString() : ''),
  },
  xaxis: {
    categories: categories.value,
    labels: {
      rotate: -45,
      style: { fontSize: '12px' },
      formatter: function (val) {
        const maxLength = 20 // max characters to show
        if (val.length > maxLength) {
          return val.substring(0, maxLength) + '...' // trim and add ellipsis
        }
        return val
      },
    },
    axisBorder: { show: true, color: '#78909C' },
    axisTicks: { show: true, color: '#78909C' },
  },
  yaxis: {
    tooltip: {
        enabled: false
      },
    title: { text: 'Total Tokens' },
    labels: {
      formatter: (val) => val.toLocaleString(),
    },
  },
  legend: {
    show: true,
    showForSingleSeries: true, // always show legend
    position: 'top',
    horizontalAlign: 'center',
    fontSize: '14px',
    markers: { 
      width: 12, 
      height: 12, 
      radius: 6,
      // Use custom colors that reflect disabled state
      fillColors: getSeriesColors()
    },
    itemMargin: { horizontal: 10, vertical: 5 },
    formatter: (seriesName) => seriesName.charAt(0).toUpperCase() + seriesName.slice(1),
    onItemClick: {
      toggleDataSeries: false // Disable default toggle behavior
    }
  },
  fill: { 
    opacity: 1,
    colors: getSeriesColors()
  },
  colors: getSeriesColors(),
  tooltip: {
    theme: 'dark',
    shared: true,
    intersect: false,
    custom: function ({ series, dataPointIndex, w }) {
      const category = w.globals.labels[dataPointIndex]
      const colors = w.globals.colors // This will now include opacity for disabled series

      let rows = w.globals.seriesNames
        .map((name, i) => {
          const val = series[i][dataPointIndex]
          const color = colors[i]
          if (val === 0) return ''
          const displayName = name.charAt(0).toUpperCase() + name.slice(1)
          return `
          <div style="display:flex;align-items:center;justify-content:space-between;
                      padding:2px 0;border-bottom:1px solid rgba(255,255,255,0.1);">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="background:${color};
                           width:10px;height:10px;border-radius:50%;display:inline-block;"></span>
              <span>${displayName}:</span>
            </div>
            <div style="font-weight:600;">${val}</div>
          </div>`
        })
        .join('')

      const total = series.reduce((sum, s) => sum + (s[dataPointIndex] || 0), 0)
      const totalRow = `
        <div style="margin-top:6px;padding-top:4px;
                    display:flex;justify-content:space-between;
                    border-top:1px solid rgba(255,255,255,0.2);">
          <span><strong>Total</strong></span>
          <span><strong>${total}</strong></span>
        </div>`

      return `
        <div style="padding:8px 12px;min-width:160px;">
          <div style="font-weight:bold;margin-bottom:6px;
                      border-bottom:1px solid rgba(255,255,255,0.2);
                      padding-bottom:4px;">
            ${category}
          </div>
          ${rows}
          ${totalRow}
        </div>`
    },
  },
  grid: {
    borderColor: '#424242',
    strokeDashArray: 4,
    yaxis: { lines: { show: true } },
  },
  responsive: [
    {
      breakpoint: 1000,
      options: {
        plotOptions: { bar: { columnWidth: '70%' } },
        dataLabels: { enabled: false },
      },
    },
  ],
}))

// Reset disabled state when data changes
watch(
  () => props.chartData,
  () => {
    disabledSeries.value.clear()
    chartKey.value++
  },
  { deep: true },
)

// Watch for appKeys changes
watch(appKeys, () => {
  disabledSeries.value.clear()
  chartKey.value++
})
</script>