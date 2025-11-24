<template>
  <Transition
    enter-active-class="transition ease-out duration-200"
    enter-from-class="opacity-0 transform -translate-y-2"
    enter-to-class="opacity-100 transform translate-y-0"
    leave-active-class="transition ease-in duration-150"
    leave-from-class="opacity-100 transform translate-y-0"
    leave-to-class="opacity-0 transform -translate-y-2"
  >
    <div v-if="showNotification" class="space-y-3">
      <div
        v-for="notification in visibleNotifications"
        :key="`${notification.type}-${notification.limitKey}`"
        :class="[
          'rounded-lg border p-4 flex items-start justify-between',
          notification.type === 'warning'
            ? 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200'
            : 'bg-red-50 border-red-200 text-red-900 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200',
        ]"
      >
        <div class="flex items-start gap-3 flex-1">
          <UIcon
            :name="notification.type === 'warning' ? 'heroicons:exclamation-triangle' : 'heroicons:x-circle'"
            :class="[
              'w-5 h-5 flex-shrink-0 mt-0.5',
              notification.type === 'warning' ? 'text-amber-500' : 'text-red-500',
            ]"
          />
          <div class="flex-1">
            <h3 class="font-semibold text-sm mb-1">
              {{ notification.title }}
            </h3>
            <p class="text-xs opacity-90">
              {{ notification.message }}
            </p>
            <div class="mt-2 text-xs opacity-80">
              <span class="font-medium"
                >{{ notification.currentUsage }} / {{ notification.limit }}</span
              >
              ({{ notification.percentage }}% used)
            </div>
          </div>
        </div>

        <div class="flex gap-2 ml-4 flex-shrink-0">
          <UButton
            size="xs"
            variant="ghost"
            color="white"
            :disabled="notification.type === 'critical'"
            :title="notification.type === 'critical' ? 'Critical alerts cannot be dismissed' : 'Dismiss this alert'"
            @click="dismissNotification(notification.limitKey)"
            class="hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ notification.type === 'critical' ? 'Critical' : 'Dismiss' }}
          </UButton>
          <UButton size="xs" color="brand" @click="handleUpgradeClick">
            Upgrade
          </UButton>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Upgrade Modal -->
  <UModal
    v-model="showUpgradeModal"
    :prevent-close="false"
    class="z-50"
  >
    <div class="p-6 bg-dark-800">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold text-white">
          Upgrade Your Plan
        </h2>
        <UButton
          icon="heroicons:x-mark"
          color="gray"
          variant="ghost"
          size="sm"
          @click="showUpgradeModal = false"
        />
      </div>

      <div class="space-y-4 mb-6">
        <p class="text-gray-300 text-sm">
          You're reaching the limits of your current plan. Upgrade to get more:
        </p>
        <div class="grid grid-cols-2 gap-3">
          <div v-for="notification in visibleNotifications" :key="notification.limitKey" class="p-3 bg-dark-700 rounded-lg border border-dark-600">
            <p class="text-xs text-gray-400 font-medium mb-1">
              {{ notification.limitLabel }}
            </p>
            <p class="text-sm font-semibold text-white">
              {{ notification.limitKey === 'users' ? '500+' : notification.limitKey === 'storage' ? '500+ GB' : notification.limitKey === 'artefacts' ? '10,000+' : '1,000,000+' }}
            </p>
          </div>
        </div>
      </div>

      <div class="flex gap-3">
        <UButton
          variant="outline"
          color="gray"
          class="flex-1"
          @click="showUpgradeModal = false"
        >
          Cancel
        </UButton>
        <UButton
          color="brand"
          class="flex-1"
          :to="upgradePath"
          @click="showUpgradeModal = false"
        >
          View Plans
        </UButton>
      </div>
    </div>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useProfileStore } from '~/stores/profile'

interface UsageNotification {
  type: 'warning' | 'critical'
  limitKey: 'users' | 'requests' | 'storage' | 'artefacts'
  limitLabel: string
  title: string
  message: string
  currentUsage: string | number
  limit: string | number
  percentage: number
}

const props = withDefaults(
  defineProps<{
    thresholdPercentage?: number
    dismissible?: boolean
    autoHideDuration?: number
    mockData?: any
  }>(),
  {
    thresholdPercentage: 80,
    dismissible: true,
    autoHideDuration: 0,
    mockData: null,
  }
)

const router = useRouter()
const profileStore = useProfileStore()

const notifications = ref<UsageNotification[]>([])
const showUpgradeModal = ref(false)
const dismissedNotifications = ref<Set<string>>(new Set())

const visibleNotifications = computed(() => {
  return notifications.value.filter(
    (n) => !dismissedNotifications.value.has(n.limitKey)
  )
})

const showNotification = computed(() => {
  return visibleNotifications.value.length > 0
})

const upgradePath = computed(() => {
  return '/admin/plans'
})

const dismissNotification = (limitKey: string) => {
  // Don't allow dismissing critical notifications (at or above 100%)
  const notification = notifications.value.find(n => n.limitKey === limitKey)
  if (notification && notification.type === 'critical') {
    return
  }
  dismissedNotifications.value.add(limitKey)
}

const handleUpgradeClick = () => {
  showUpgradeModal.value = true
}

const checkUsageLimits = async () => {
  console.log('checkUsageLimits called')
  const userProfile = profileStore.userProfile
  if (!userProfile || !userProfile.plan_details) {
    console.log('No user profile or plan details:', { userProfile, planDetails: userProfile?.plan_details })
    notifications.value = []
    return
  }
  console.log('Checking limits for plan:', userProfile.plan_details)

  const planDetails = userProfile.plan_details
  const newNotifications: UsageNotification[] = []

  // Use mock data if provided (for testing), otherwise fetch from API
  let overviewData: any = { users_count: 0, request_count: 0, storage_used_gb: 0, artefacts_count: 0 }

  if (props.mockData) {
    console.log('Using mock data:', props.mockData)
    overviewData = props.mockData
  } else {
    try {
      const response = await $fetch('/api/integrations/overview', {
        method: 'GET',
      })
      overviewData = response?.data || response
      console.log('Fetched from API:', overviewData)
    } catch (error) {
      console.error('Error fetching overview data:', error)
    }
  }

  // Check Users Limit
  if (planDetails.users > 0) {
    const usersCount = overviewData?.users_count || 0
    const usagePercentage = (usersCount / planDetails.users) * 100
    console.log('Users check:', { users_count: usersCount, limit: planDetails.users, percentage: usagePercentage, threshold: props.thresholdPercentage })

    if (usagePercentage >= props.thresholdPercentage) {
      newNotifications.push({
        type: usagePercentage >= 95 ? 'critical' : 'warning',
        limitKey: 'users',
        limitLabel: 'Team Members',
        title:
          usagePercentage >= 95
            ? 'Team Members Limit Exceeded'
            : 'Approaching Team Members Limit',
        message:
          usagePercentage >= 95
            ? 'You have reached your team members limit. Upgrade to add more.'
            : `You are using ${usagePercentage.toFixed(0)}% of your team members limit.`,
        currentUsage: usersCount,
        limit: planDetails.users,
        percentage: Math.min(usagePercentage, 100),
      })
    }
  }

  // Check Request Limit (if not unlimited)
  if (
    planDetails.limit_requests > 0 &&
    !planDetails.add_ons_unlimited_requests
  ) {
    try {
      const requestsCount = overviewData?.request_count || 0
      const usagePercentage = (requestsCount / planDetails.limit_requests) * 100

      if (usagePercentage >= props.thresholdPercentage) {
        newNotifications.push({
          type: usagePercentage >= 95 ? 'critical' : 'warning',
          limitKey: 'requests',
          limitLabel: 'Query Limit',
          title:
            usagePercentage >= 95
              ? 'Query Limit Exceeded'
              : 'Approaching Query Limit',
          message:
            usagePercentage >= 95
              ? 'You have reached your query limit. Upgrade to increase your limit.'
              : `You are using ${usagePercentage.toFixed(0)}% of your query limit.`,
          currentUsage: requestsCount,
          limit: planDetails.limit_requests,
          percentage: Math.min(usagePercentage, 100),
        })
      }
    } catch (error) {
      console.error('Error fetching requests usage:', error)
    }
  }

  // Check Storage Limit
  if (planDetails.storage_limit_gb > 0) {
    try {
      const storageUsedGb = overviewData?.storage_used_gb || 0
      const usagePercentage =
        (storageUsedGb / planDetails.storage_limit_gb) * 100

      if (usagePercentage >= props.thresholdPercentage) {
        newNotifications.push({
          type: usagePercentage >= 95 ? 'critical' : 'warning',
          limitKey: 'storage',
          limitLabel: 'Storage Limit',
          title:
            usagePercentage >= 95
              ? 'Storage Limit Exceeded'
              : 'Approaching Storage Limit',
          message:
            usagePercentage >= 95
              ? 'You have reached your storage limit. Upgrade to get more storage.'
              : `You are using ${usagePercentage.toFixed(0)}% of your storage limit.`,
          currentUsage: storageUsedGb.toFixed(2),
          limit: planDetails.storage_limit_gb,
          percentage: Math.min(usagePercentage, 100),
        })
      }
    } catch (error) {
      console.error('Error fetching storage usage:', error)
    }
  }

  // Check Artefacts Limit
  if (planDetails.artefacts > 0) {
    try {
      const artefactsCount = overviewData?.artefacts_count || 0
      const usagePercentage =
        (artefactsCount / planDetails.artefacts) * 100

      if (usagePercentage >= props.thresholdPercentage) {
        newNotifications.push({
          type: usagePercentage >= 95 ? 'critical' : 'warning',
          limitKey: 'artefacts',
          limitLabel: 'Upload Limit',
          title:
            usagePercentage >= 95
              ? 'Upload Limit Exceeded'
              : 'Approaching Upload Limit',
          message:
            usagePercentage >= 95
              ? 'You have reached your upload limit. Upgrade to upload more.'
              : `You are using ${usagePercentage.toFixed(0)}% of your upload limit.`,
          currentUsage: artefactsCount,
          limit: planDetails.artefacts,
          percentage: Math.min(usagePercentage, 100),
        })
      }
    } catch (error) {
      console.error('Error fetching artefacts usage:', error)
    }
  }

  notifications.value = newNotifications.sort((a, b) => {
    // Sort by type (critical first) then by percentage (highest first)
    if (a.type !== b.type) return a.type === 'critical' ? -1 : 1
    return b.percentage - a.percentage
  })

  // Clear dismissed notifications that are no longer exceeded
  const activeNotificationKeys = new Set(notifications.value.map(n => n.limitKey))
  dismissedNotifications.value.forEach(key => {
    if (!activeNotificationKeys.has(key)) {
      dismissedNotifications.value.delete(key)
    }
  })

  console.log('Updated notifications:', notifications.value)
}

// Watch profile store for changes
watch(
  () => profileStore.userProfile,
  () => {
    dismissedNotifications.value.clear()
    checkUsageLimits()
  },
  { immediate: true }
)

// Watch for mock data changes (for testing)
watch(
  () => props.mockData,
  () => {
    console.log('Mock data changed, clearing dismissed and rechecking limits')
    dismissedNotifications.value.clear()
    checkUsageLimits()
  },
  { flush: 'post' }
)

// Auto-refresh management
let mainAutoRefreshInterval: NodeJS.Timeout | null = null
let criticalAutoRefreshInterval: NodeJS.Timeout | null = null

const startMainAutoRefresh = () => {
  if (!mainAutoRefreshInterval) {
    mainAutoRefreshInterval = setInterval(() => {
      console.log('Auto-refreshing limits (60s interval)')
      checkUsageLimits()
    }, 60000) // Every 60 seconds
  }
}

const startCriticalAutoRefresh = () => {
  if (!criticalAutoRefreshInterval) {
    criticalAutoRefreshInterval = setInterval(() => {
      console.log('Auto-refreshing due to critical notification (30s interval)')
      checkUsageLimits()
    }, 30000) // Every 30 seconds
  }
}

const stopCriticalAutoRefresh = () => {
  if (criticalAutoRefreshInterval) {
    clearInterval(criticalAutoRefreshInterval)
    criticalAutoRefreshInterval = null
  }
}

// Watch for critical notifications
watch(
  () => notifications.value.some(n => n.type === 'critical'),
  (hasCritical) => {
    if (hasCritical) {
      startCriticalAutoRefresh()
    } else {
      stopCriticalAutoRefresh()
    }
  }
)

// Optional: Auto-refresh based on page visibility
if (process.client) {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      console.log('Page became visible, rechecking limits')
      checkUsageLimits()
    }
  })
}

// Initialize on mount
onMounted(() => {
  console.log('UNotifications mounted')
  checkUsageLimits()
  startMainAutoRefresh()
})

// Expose methods for parent components
defineExpose({
  refresh: checkUsageLimits,
  dismissNotification,
})
</script>

<style scoped>
/* Custom scrollbar for better aesthetics */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.5);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.8);
}
</style>
