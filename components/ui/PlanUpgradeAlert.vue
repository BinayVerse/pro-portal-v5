<template>
  <div v-if="exceedances.length > 0" class="space-y-3">
    <div
      v-for="item in exceedances"
      :key="item.limitKey"
      :class="[
        'rounded-lg border p-4 flex items-start justify-between',
        item.type === 'warning'
          ? 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200'
          : 'bg-red-50 border-red-200 text-red-900 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200',
      ]"
    >
      <div class="flex items-start gap-3 flex-1">
        <UIcon
          :name="item.type === 'warning' ? 'heroicons:exclamation-triangle' : 'heroicons:x-circle'"
          :class="[
            'w-5 h-5 flex-shrink-0 mt-0.5',
            item.type === 'warning' ? 'text-amber-500' : 'text-red-500',
          ]"
        />
        <div class="flex-1">
          <h3 class="font-semibold text-sm mb-1">
            {{ item.title }}
          </h3>
          <p class="text-xs opacity-90">
            {{ item.message }}
          </p>
          <div class="mt-2 text-xs opacity-80">
            <span class="font-medium"
              >{{ item.current }} / {{ item.limit }}</span
            >
            ({{ item.percentage }}% used)
          </div>
        </div>
      </div>

      <div class="flex gap-2 ml-4 flex-shrink-0">
        <UButton
          size="xs"
          variant="ghost"
          color="white"
          :disabled="item.type === 'critical'"
          :title="item.type === 'critical' ? 'Critical alerts cannot be dismissed' : 'Dismiss this alert'"
          @click="dismissAlert(item.limitKey)"
          class="hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {{ item.type === 'critical' ? 'Critical' : 'Dismiss' }}
        </UButton>
        <UButton size="xs" color="brand" to="/admin/plans" class="whitespace-nowrap">
          Upgrade
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useProfileStore } from '~/stores/profile'

interface Exceedance {
  type: 'warning' | 'critical'
  limitKey: string
  title: string
  message: string
  current: string | number
  limit: string | number
  percentage: number
}

interface Props {
  thresholdPercentage?: number
  dismissible?: boolean
  autoRefreshInterval?: number
}

const props = withDefaults(defineProps<Props>(), {
  thresholdPercentage: 80,
  dismissible: true,
  autoRefreshInterval: 60000,
})

const profileStore = useProfileStore()
const dismissed = ref<Set<string>>(new Set())
const exceedances = ref<Exceedance[]>([])
let refreshInterval: NodeJS.Timeout | null = null

const dismissAlert = (limitKey: string) => {
  const item = exceedances.value.find(e => e.limitKey === limitKey)
  if (item && item.type === 'critical') {
    return
  }
  dismissed.value.add(limitKey)
}

const checkLimits = async () => {
  const profile = profileStore.userProfile
  if (!profile?.plan_details) {
    exceedances.value = []
    return
  }

  const plan = profile.plan_details
  const newExceedances: Exceedance[] = []

  // Fetch current usage data
  let usageData = {
    users_count: 0,
    request_count: 0,
    storage_used_gb: 0,
    artefacts_count: 0,
  }

  try {
    const response = await $fetch('/api/integrations/overview', {
      method: 'GET',
    })
    usageData = response?.data || response
  } catch (error) {
    console.error('Error fetching usage data:', error)
  }

  // Check Users Limit
  if (plan.users > 0) {
    const count = usageData.users_count || 0
    const percentage = (count / plan.users) * 100

    if (percentage >= props.thresholdPercentage) {
      newExceedances.push({
        type: percentage >= 100 ? 'critical' : 'warning',
        limitKey: 'users',
        title: percentage >= 100 ? 'Team Members Limit Exceeded' : 'Approaching Team Members Limit',
        message:
          percentage >= 100
            ? 'You have reached your team members limit. Upgrade to add more.'
            : `You are using ${percentage.toFixed(0)}% of your team members limit.`,
        current: count,
        limit: plan.users,
        percentage: Math.min(percentage, 100),
      })
    }
  }

  // Check Request Limit
  if (plan.limit_requests > 0 && !plan.add_ons_unlimited_requests) {
    const count = usageData.request_count || 0
    const percentage = (count / plan.limit_requests) * 100

    if (percentage >= props.thresholdPercentage) {
      newExceedances.push({
        type: percentage >= 100 ? 'critical' : 'warning',
        limitKey: 'requests',
        title: percentage >= 100 ? 'Query Limit Exceeded' : 'Approaching Query Limit',
        message:
          percentage >= 100
            ? 'You have reached your query limit. Upgrade to increase your limit.'
            : `You are using ${percentage.toFixed(0)}% of your query limit.`,
        current: count,
        limit: plan.limit_requests,
        percentage: Math.min(percentage, 100),
      })
    }
  }

  // Check Storage Limit
  if (plan.storage_limit_gb > 0) {
    const used = usageData.storage_used_gb || 0
    const percentage = (used / plan.storage_limit_gb) * 100

    if (percentage >= props.thresholdPercentage) {
      newExceedances.push({
        type: percentage >= 100 ? 'critical' : 'warning',
        limitKey: 'storage',
        title: percentage >= 100 ? 'Storage Limit Exceeded' : 'Approaching Storage Limit',
        message:
          percentage >= 100
            ? 'You have reached your storage limit. Upgrade to get more storage.'
            : `You are using ${percentage.toFixed(0)}% of your storage limit.`,
        current: used.toFixed(2),
        limit: plan.storage_limit_gb,
        percentage: Math.min(percentage, 100),
      })
    }
  }

  // Check Artefacts Limit
  if (plan.artefacts > 0) {
    const count = usageData.artefacts_count || 0
    const percentage = (count / plan.artefacts) * 100

    if (percentage >= props.thresholdPercentage) {
      newExceedances.push({
        type: percentage >= 100 ? 'critical' : 'warning',
        limitKey: 'artefacts',
        title: percentage >= 100 ? 'Upload Limit Exceeded' : 'Approaching Upload Limit',
        message:
          percentage >= 100
            ? 'You have reached your upload limit. Upgrade to upload more.'
            : `You are using ${percentage.toFixed(0)}% of your upload limit.`,
        current: count,
        limit: plan.artefacts,
        percentage: Math.min(percentage, 100),
      })
    }
  }

  // Sort by type (critical first) then by percentage
  newExceedances.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'critical' ? -1 : 1
    return b.percentage - a.percentage
  })

  // Remove dismissed items that are no longer exceeded
  const activeKeys = new Set(newExceedances.map(e => e.limitKey))
  dismissed.value.forEach(key => {
    if (!activeKeys.has(key)) {
      dismissed.value.delete(key)
    }
  })

  exceedances.value = newExceedances.filter(e => !dismissed.value.has(e.limitKey))
}

// Watch profile changes
watch(
  () => profileStore.userProfile,
  () => {
    dismissed.value.clear()
    checkLimits()
  },
  { immediate: true }
)

// Auto-refresh
onMounted(() => {
  checkLimits()

  if (props.autoRefreshInterval > 0) {
    refreshInterval = setInterval(() => {
      checkLimits()
    }, props.autoRefreshInterval)
  }
})

// Expose refresh method
defineExpose({
  refresh: checkLimits,
})
</script>

<style scoped></style>
