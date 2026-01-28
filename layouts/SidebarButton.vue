<template>
  <div class="relative group" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave">
    <UButton
      :to="to"
      variant="ghost"
      justify="start"
      :icon="icon"
      :color="active ? 'primary' : 'gray'"
      :class="[
        'w-full transition-all duration-200',
        collapsed ? 'justify-center px-2' : 'px-3',
        size === 'sm' ? 'py-1 text-sm' : 'py-2',
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
      ]"
      :ui="{
        rounded: 'rounded-lg',
        padding: {
          sm: 'px-2 py-1',
          md: 'px-3 py-2'
        }
      }"
      :disabled="disabled"
    >
      <span
        v-if="!collapsed"
        class="transition-opacity duration-300 truncate"
        :class="{ 'opacity-0': collapsed }"
      >
        <slot>{{ tooltip }}</slot>
      </span>
    </UButton>
    
    <!-- Tooltip for collapsed state -->
    <div
      v-if="collapsed && showTooltip && !disabled"
      class="fixed left-[calc(4rem+0.5rem)] transform -translate-y-1/2 px-3 py-2 bg-dark-800 text-white text-sm rounded-lg shadow-lg whitespace-nowrap pointer-events-none min-w-max z-[9999]"
      :style="{
        top: `${tooltipTop}px`
      }"
    >
      {{ tooltip }}
      <div class="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-dark-800 rotate-45"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'

const props = defineProps({
  to: {
    type: [String, Object] as PropType<string | { path: string; query?: any }>,
    default: undefined
  },
  icon: {
    type: String,
    required: true
  },
  active: {
    type: Boolean,
    default: false
  },
  collapsed: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  tooltip: {
    type: String,
    default: ''
  },
  size: {
    type: String as PropType<'sm' | 'md'>,
    default: 'md'
  }
})

const showTooltip = ref(false)
const tooltipTop = ref(0)
let tooltipTimeout: NodeJS.Timeout
let currentElement: HTMLElement | null = null

const handleMouseEnter = (event: MouseEvent) => {
  if (props.collapsed && !props.disabled) {
    currentElement = event.currentTarget as HTMLElement
    const rect = currentElement.getBoundingClientRect()
    tooltipTop.value = rect.top + (rect.height / 2)
    
    tooltipTimeout = setTimeout(() => {
      showTooltip.value = true
    }, 100) // Reduced delay for better UX
  }
}

const handleMouseLeave = () => {
  if (tooltipTimeout) {
    clearTimeout(tooltipTimeout)
  }
  showTooltip.value = false
  currentElement = null
}

onUnmounted(() => {
  if (tooltipTimeout) {
    clearTimeout(tooltipTimeout)
  }
})
</script>

<style scoped>
/* Ensure the container doesn't interfere with tooltip */
.group {
  position: relative;
}
</style>