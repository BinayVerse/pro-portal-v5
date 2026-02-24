<!-- /components/charts/DepartmentBarChart.vue -->
<template>
  <div class="w-full h-full flex items-center justify-center relative">
    <!-- Loading -->
    <template v-if="loading">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </template>

    <!-- Chart -->
    <template v-else-if="hasData">
      <div ref="chartRef" class="w-full h-full"></div>
    </template>

    <!-- No Data -->
    <template v-else>
      <p class="text-gray-400 text-sm">No department data available</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted, computed } from 'vue';
import { getColorsForLabels } from '@/utils/chartColors'

const props = defineProps({
  chartData: {
    type: Object,
    required: true,
    default: () => ({
      departments: [],
      userCounts: [],
      artifactCounts: []
    })
  },
  loading: {
    type: Boolean,
    default: false
  }
});

const chartRef = ref<HTMLElement | null>(null);
let chart: any = null;

// Track disabled series
const disabledSeries = ref<Set<string>>(new Set());

const hasData = computed(() => {
  return (
    props.chartData?.departments?.length > 0 &&
    (
      props.chartData.userCounts.some((v: number) => v > 0) ||
      props.chartData.artifactCounts.some((v: number) => v > 0)
    )
  )
})

// Calculate max value for proper scaling
const maxValue = computed(() => {
  const allValues = [...props.chartData.userCounts, ...props.chartData.artifactCounts];
  return Math.max(...allValues, 0);
});

// Get current series data with opacity based on disabled state
const getSeriesData = () => {
  const seriesNames = ['Users', 'Artifacts'];
  
  return [
    {
      name: 'Users',
      data: props.chartData.userCounts,
      color: getColorsForLabels(seriesNames)[0],
      // Add opacity if disabled
      fillColor: disabledSeries.value.has('Users') 
        ? getColorsForLabels(seriesNames)[0] + '40' // 40 = 25% opacity (hex)
        : getColorsForLabels(seriesNames)[0]
    },
    {
      name: 'Artifacts',
      data: props.chartData.artifactCounts,
      color: getColorsForLabels(seriesNames)[1],
      fillColor: disabledSeries.value.has('Artifacts') 
        ? getColorsForLabels(seriesNames)[1] + '40' // 40 = 25% opacity (hex)
        : getColorsForLabels(seriesNames)[1]
    }
  ];
};

// Handle legend click
const handleLegendClick = (seriesName: string) => {
  if (disabledSeries.value.has(seriesName)) {
    disabledSeries.value.delete(seriesName);
  } else {
    disabledSeries.value.add(seriesName);
  }
  
  // Update chart with new colors
  if (chart) {
    const seriesData = getSeriesData();
    
    // Update series colors
    chart.updateOptions({
      colors: seriesData.map(s => s.fillColor),
      // Also update the legend marker colors
      legend: {
        markers: {
          fillColors: seriesData.map(s => s.fillColor)
        }
      }
    });
  }
};

const initChart = async () => {
  if (!chartRef.value) return;

  if (!hasData.value) {
    if (chart) {
      chart.destroy();
      chart = null;
    }
    return;
  }
  
  const ApexCharts = (await import('apexcharts')).default;
  
  const seriesNames = ['Users', 'Artifacts'];
  const seriesData = getSeriesData();

  const options = {
    chart: {
      type: 'bar',
      height: '100%',
      stacked: false,
      toolbar: { show: false },
      background: 'transparent',
      foreColor: '#9CA3AF',
      parentHeightOffset: false,
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800,
        animateGradually: { enabled: true, delay: 150 },
        dynamicAnimation: { enabled: true, speed: 350 },
      },
      events: {
        legendClick: function(chartContext: any, seriesIndex: any, config: any) {
          // Get the series name from the index
          const seriesName = seriesNames[seriesIndex];
          handleLegendClick(seriesName);
          return false; // Prevent default behavior
        }
      }
    },

    series: [
      {
        name: 'Users',
        data: props.chartData.userCounts,
      },
      {
        name: 'Artifacts',
        data: props.chartData.artifactCounts,
      }
    ],

    // Use colors with opacity for disabled series
    colors: seriesData.map(s => s.fillColor),

    stroke: {
      show: true,
      width: 2,
      colors: ['transparent']
    },

    grid: {
      borderColor: '#374151',
      strokeDashArray: 4,
      padding: {
        top: 10,
        right: 20,
        left: 10,
        bottom: 10
      },
      yaxis: { lines: { show: true } },
    },

    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '55%',
        borderRadius: 3,
        borderRadiusApplication: 'end',
        borderRadiusWhenStacked: 'last',
      },
    },

    dataLabels: {
      enabled: false,
    },

    xaxis: {
      categories: props.chartData.departments,
      labels: {
        style: {
          fontSize: '12px',
          colors: '#9CA3AF',
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
        },
        rotate: -45,
        formatter: function (val: string) {
          const maxLength = 20;
          if (val.length > maxLength) {
            return val.substring(0, maxLength) + '...';
          }
          return val;
        },
      },
      axisBorder: { show: true, color: '#374151' },
      axisTicks: { show: true, color: '#374151' },
    },

    yaxis: {
      // Fix for native tooltip on y-axis labels
      tooltip: {
        enabled: false
      },
      labels: {
        style: {
          colors: '#9CA3AF',
          fontSize: '12px',
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
        },
        // Fix for hover effect on y-axis labels
        onItemHover: {
          highlightDataSeries: false
        },
        formatter: (val: number) => {
          return val >= 1000 ? (val / 1000).toFixed(1) + 'K' : val.toString();
        }
      },
    },

    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'center',
      fontSize: '13px',
      labels: {
        colors: '#E5E7EB'
      },
      markers: {
        width: 12,
        height: 12,
        radius: 6,
        // Use custom colors that reflect disabled state
        fillColors: seriesData.map(s => s.fillColor)
      },
      itemMargin: {
        horizontal: 15,
        vertical: 5
      },
      formatter: (seriesName: string) => {
        return seriesName.charAt(0).toUpperCase() + seriesName.slice(1);
      },
      // Disable default toggle behavior
      onItemClick: {
        toggleDataSeries: false
      }
    },

    tooltip: {
      theme: 'dark',
      shared: true,
      intersect: false,
      style: {
        fontSize: '14px',
        fontWeight: 600,
        color: '#FFFFFF'
      },
      y: {
        formatter: (val: number) => {
          const percentage = maxValue.value > 0 
            ? ((val / maxValue.value) * 100).toFixed(1)
            : '0.0';
          return `${val.toLocaleString()} (${percentage}%)`;
        }
      },
      // Custom tooltip - EXACTLY as in original code
      custom: function({ series, dataPointIndex, w }: any) {
        const category = w.globals.labels[dataPointIndex];
        const userValue = series[0][dataPointIndex];
        const artifactValue = series[1][dataPointIndex];
        
        return `
          <div style="padding:8px 12px;min-width:160px;">
            <div style="font-weight:bold;margin-bottom:6px;
                        border-bottom:1px solid rgba(255,255,255,0.2);
                        padding-bottom:4px;">
              ${category}
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;
                        padding:2px 0;">
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="background:${w.globals.colors[0]};
                           width:10px;height:10px;border-radius:50%;display:inline-block;"></span>
                <span>Users:</span>
              </div>
              <div style="font-weight:600;">${userValue.toLocaleString()}</div>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;
                        padding:2px 0;">
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="background:${w.globals.colors[1]};
                           width:10px;height:10px;border-radius:50%;display:inline-block;"></span>
                <span>Artifacts:</span>
              </div>
              <div style="font-weight:600;">${artifactValue.toLocaleString()}</div>
            </div>
          </div>
        `;
      }
    },

    responsive: [
      {
        breakpoint: 1000,
        options: {
          plotOptions: { bar: { barHeight: '65%' } },
          dataLabels: { enabled: false },
          legend: {
            position: 'bottom',
            offsetY: 5
          }
        },
      },
      {
        breakpoint: 480,
        options: {
          xaxis: {
            labels: {
              rotate: -90,
              style: { fontSize: '10px' }
            }
          }
        }
      }
    ],
  }

  if (chart) {
    chart.destroy();
  }

  chart = new ApexCharts(chartRef.value, options);
  await chart.render();
};

// Initialize chart when mounted
onMounted(async () => {
  await nextTick();
  initChart();
});

// Watch for data changes
watch(
  () => [props.chartData, props.loading],
  async () => {
    if (props.loading) return
    await nextTick()
    // Reset disabled state when data changes
    disabledSeries.value.clear();
    initChart()
  },
  { deep: true, immediate: true }
)

// Watch for container resize
watch(
  () => chartRef.value?.clientHeight,
  () => {
    if (chart) {
      chart.updateOptions({
        chart: { height: '100%' }
      });
    }
  }
)

// Cleanup
onUnmounted(() => {
  if (chart) {
    chart.destroy();
  }
});
</script>

<style>
/* Fix for any native tooltips */
.apexcharts-yaxistooltip {
  display: none !important;
}
</style>