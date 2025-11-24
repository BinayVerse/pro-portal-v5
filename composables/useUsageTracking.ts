import { ref, computed } from 'vue'

export interface UsageData {
  users_count: number
  request_count: number
  storage_used_gb: number
  artefacts_count: number
}

export interface UsageResponse {
  statusCode: number
  status: string
  message: string
  data: UsageData
}

export const useUsageTracking = () => {
  const usageData = ref<UsageData>({
    users_count: 0,
    request_count: 0,
    storage_used_gb: 0,
    artefacts_count: 0,
  })
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastFetchTime = ref<number | null>(null)
  const cacheTimeout = 60000 // 60 seconds cache

  const isCached = computed(() => {
    if (!lastFetchTime.value) return false
    return Date.now() - lastFetchTime.value < cacheTimeout
  })

  const fetchUsageData = async (forceRefresh = false): Promise<UsageData> => {
    // Return cached data if available and not forced refresh
    if (isCached.value && !forceRefresh) {
      return usageData.value
    }

    loading.value = true
    error.value = null

    try {
      const response = await $fetch<UsageResponse>(
        '/api/integrations/overview',
        {
          method: 'GET',
        }
      )

      if (response.status === 'success' && response.data) {
        usageData.value = {
          users_count: response.data.users_count ?? 0,
          request_count: response.data.request_count ?? 0,
          storage_used_gb: response.data.storage_used_gb ?? 0,
          artefacts_count: response.data.artefacts_count ?? 0,
        }
        lastFetchTime.value = Date.now()
      } else {
        throw new Error(response.message || 'Failed to fetch usage data')
      }

      return usageData.value
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch usage data'
      error.value = message
      console.error('Error fetching usage data:', err)
      // Return last known data on error
      return usageData.value
    } finally {
      loading.value = false
    }
  }

  const fetchActivityData = async (
    forceRefresh = false
  ): Promise<{ request_count: number }> => {
    loading.value = true
    error.value = null

    try {
      const response = await $fetch<{
        statusCode: number
        status: string
        data: { request_count: number }
      }>('/api/integrations/activity', {
        method: 'GET',
      })

      if (response.status === 'success' && response.data) {
        const requestCount = response.data.request_count ?? 0
        usageData.value.request_count = requestCount
        lastFetchTime.value = Date.now()
        return { request_count: requestCount }
      } else {
        throw new Error('Failed to fetch activity data')
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch activity data'
      error.value = message
      console.error('Error fetching activity data:', err)
      return { request_count: usageData.value.request_count }
    } finally {
      loading.value = false
    }
  }

  const getUsagePercentage = (
    currentUsage: number,
    limit: number
  ): number => {
    if (limit <= 0) return 0
    return Math.min((currentUsage / limit) * 100, 100)
  }

  const isNearLimit = (
    currentUsage: number,
    limit: number,
    threshold: number = 80
  ): boolean => {
    return getUsagePercentage(currentUsage, limit) >= threshold
  }

  const isExceeded = (currentUsage: number, limit: number): boolean => {
    return limit > 0 && currentUsage > limit
  }

  const clearCache = () => {
    lastFetchTime.value = null
  }

  return {
    usageData,
    loading,
    error,
    isCached,
    fetchUsageData,
    fetchActivityData,
    getUsagePercentage,
    isNearLimit,
    isExceeded,
    clearCache,
  }
}
