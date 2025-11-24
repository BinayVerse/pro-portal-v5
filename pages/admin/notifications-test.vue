<template>
  <div class="min-h-screen bg-dark-900">
    <!-- UNotifications at the top -->
    <div class="sticky top-0 z-40 bg-dark-900/95 backdrop-blur-sm border-b border-dark-700 p-4">
      <div class="max-w-7xl mx-auto">
        <UNotifications
          ref="notificationsRef"
          :threshold-percentage="80"
          :dismissible="true"
          :mock-data="mockApiResponse"
        />
      </div>
    </div>

    <!-- Main content -->
    <div class="max-w-7xl mx-auto p-4 space-y-6">
      <div class="bg-dark-800 rounded-lg p-6 border border-dark-700">
        <h1 class="text-3xl font-bold text-white mb-2">
          Notifications Test & Trigger Page
        </h1>
        <p class="text-gray-400 mb-6">
          Use the trigger points below to simulate usage scenarios and see alerts in action
        </p>

        <!-- User Info -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div class="bg-dark-700 rounded-lg p-4 border border-dark-600">
            <h3 class="text-sm font-semibold text-gray-300 mb-3">User Profile</h3>
            <div class="space-y-2 text-sm">
              <p><span class="text-gray-400">Name:</span> <span class="text-white">{{ profileStore.userProfile?.name }}</span></p>
              <p><span class="text-gray-400">Email:</span> <span class="text-white">{{ profileStore.userProfile?.email }}</span></p>
              <p><span class="text-gray-400">Company:</span> <span class="text-white">{{ profileStore.userProfile?.company }}</span></p>
              <p><span class="text-gray-400">Plan:</span> <span class="text-white">{{ profileStore.userProfile?.plan_name }}</span></p>
            </div>
          </div>

          <div class="bg-dark-700 rounded-lg p-4 border border-dark-600">
            <h3 class="text-sm font-semibold text-gray-300 mb-3">Plan Limits</h3>
            <div class="space-y-2 text-sm">
              <p><span class="text-gray-400">Team Members:</span> <span class="text-brand-400">{{ planDetails?.users || 'N/A' }}</span></p>
              <p><span class="text-gray-400">Query Limit:</span> <span class="text-brand-400">{{ planDetails?.limit_requests || 'N/A' }}</span></p>
              <p><span class="text-gray-400">Storage (GB):</span> <span class="text-brand-400">{{ planDetails?.storage_limit_gb || 'N/A' }}</span></p>
              <p><span class="text-gray-400">Artefacts:</span> <span class="text-brand-400">{{ planDetails?.artefacts || 'N/A' }}</span></p>
            </div>
          </div>
        </div>

        <!-- Alert Trigger Points -->
        <div class="space-y-6">
          <!-- Team Members Triggers -->
          <div class="bg-dark-700 rounded-lg p-4 border border-dark-600">
            <h3 class="text-base font-semibold text-white mb-4">🔔 Team Members Limit Triggers</h3>
            <div class="space-y-3">
              <p class="text-xs text-gray-400">
                Current Limit: <span class="text-brand-400 font-semibold">{{ planDetails?.users }}</span> members
              </p>
              <div class="flex flex-wrap gap-2">
                <UButton
                  size="sm"
                  color="amber"
                  variant="outline"
                  @click="triggerTeamMembersWarning"
                >
                  ⚠️ Show 80% Warning ({{ Math.round(planDetails?.users * 0.8) }} users)
                </UButton>
                <UButton
                  size="sm"
                  color="red"
                  variant="outline"
                  @click="triggerTeamMembersCritical"
                >
                  🚨 Show 95% Critical ({{ Math.round(planDetails?.users * 0.95) }} users)
                </UButton>
              </div>
            </div>
          </div>

          <!-- Query/Request Triggers -->
          <div class="bg-dark-700 rounded-lg p-4 border border-dark-600">
            <h3 class="text-base font-semibold text-white mb-4">🔔 Query Limit Triggers</h3>
            <div class="space-y-3">
              <p class="text-xs text-gray-400">
                Current Limit: <span class="text-brand-400 font-semibold">{{ planDetails?.limit_requests }}</span> queries
              </p>
              <div class="flex flex-wrap gap-2">
                <UButton
                  size="sm"
                  color="amber"
                  variant="outline"
                  @click="triggerQueryWarning"
                >
                  ⚠️ Show 80% Warning ({{ Math.round(planDetails?.limit_requests * 0.8) }} queries)
                </UButton>
                <UButton
                  size="sm"
                  color="red"
                  variant="outline"
                  @click="triggerQueryCritical"
                >
                  🚨 Show 95% Critical ({{ Math.round(planDetails?.limit_requests * 0.95) }} queries)
                </UButton>
              </div>
            </div>
          </div>

          <!-- Storage Triggers -->
          <div class="bg-dark-700 rounded-lg p-4 border border-dark-600">
            <h3 class="text-base font-semibold text-white mb-4">🔔 Storage Limit Triggers</h3>
            <div class="space-y-3">
              <p class="text-xs text-gray-400">
                Current Limit: <span class="text-brand-400 font-semibold">{{ planDetails?.storage_limit_gb }} GB</span>
              </p>
              <div class="flex flex-wrap gap-2">
                <UButton
                  size="sm"
                  color="amber"
                  variant="outline"
                  @click="triggerStorageWarning"
                >
                  ⚠️ Show 80% Warning ({{ (planDetails?.storage_limit_gb * 0.8).toFixed(1) }} GB)
                </UButton>
                <UButton
                  size="sm"
                  color="red"
                  variant="outline"
                  @click="triggerStorageCritical"
                >
                  🚨 Show 95% Critical ({{ (planDetails?.storage_limit_gb * 0.95).toFixed(1) }} GB)
                </UButton>
              </div>
            </div>
          </div>

          <!-- Artefacts Triggers -->
          <div class="bg-dark-700 rounded-lg p-4 border border-dark-600">
            <h3 class="text-base font-semibold text-white mb-4">🔔 Artefacts Upload Limit Triggers</h3>
            <div class="space-y-3">
              <p class="text-xs text-gray-400">
                Current Limit: <span class="text-brand-400 font-semibold">{{ planDetails?.artefacts }}</span> artefacts
              </p>
              <div class="flex flex-wrap gap-2">
                <UButton
                  size="sm"
                  color="amber"
                  variant="outline"
                  @click="triggerArtefactsWarning"
                >
                  ⚠️ Show 80% Warning ({{ Math.round(planDetails?.artefacts * 0.8) }} artefacts)
                </UButton>
                <UButton
                  size="sm"
                  color="red"
                  variant="outline"
                  @click="triggerArtefactsCritical"
                >
                  🚨 Show 95% Critical ({{ Math.round(planDetails?.artefacts * 0.95) }} artefacts)
                </UButton>
              </div>
            </div>
          </div>

          <!-- Reset Triggers -->
          <div class="bg-dark-700 rounded-lg p-4 border border-dark-600">
            <h3 class="text-base font-semibold text-white mb-4">🔄 Control Actions</h3>
            <div class="flex flex-wrap gap-2">
              <UButton
                size="sm"
                color="brand"
                @click="resetAllTriggers"
              >
                Reset All Alerts
              </UButton>
              <UButton
                size="sm"
                color="brand"
                variant="outline"
                @click="triggerAllWarnings"
              >
                Trigger All Warnings (80%)
              </UButton>
              <UButton
                size="sm"
                color="red"
                variant="outline"
                @click="triggerAllCritical"
              >
                Trigger All Critical (95%)
              </UButton>
            </div>
          </div>
        </div>

        <!-- Component Info -->
        <div class="mt-8 pt-8 border-t border-dark-600">
          <h2 class="text-lg font-semibold text-white mb-4">ℹ️ How It Works</h2>
          <div class="bg-dark-700 rounded-lg p-4 space-y-3 text-sm text-gray-300">
            <p>
              Click the trigger buttons above to simulate different usage scenarios. Each button will trigger the corresponding alert:
            </p>
            <ul class="list-disc list-inside space-y-1 text-gray-400">
              <li><strong>⚠️ 80% Warning</strong> - Shows amber warning banner with usage details</li>
              <li><strong>🚨 95% Critical</strong> - Shows red critical alert with urgent message</li>
              <li><strong>Dismiss</strong> - Click to hide the notification</li>
              <li><strong>Upgrade</strong> - Click to open upgrade modal with plan options</li>
            </ul>
            <p class="text-gray-500 text-xs mt-3">
              The alerts are simulated by temporarily modifying the API responses. In production, real usage data from your integrations will trigger these alerts automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProfileStore } from '~/stores/profile'
import { useRouter } from 'vue-router'

const router = useRouter() as any
const profileStore = useProfileStore()
const notificationsRef = ref()

const planDetails = computed(() => {
  return profileStore.userProfile?.plan_details
})

// Mock API responses for testing
const mockApiResponse = ref<any>(null)

const triggerTeamMembersWarning = async () => {
  if (!planDetails.value) {
    console.error('Plan details not loaded yet')
    return
  }
  const limit = planDetails.value.users || 50
  console.log('Triggering team members warning:', { limit })
  mockApiResponse.value = {
    users_count: Math.round(limit * 0.82),
    request_count: 0,
    storage_used_gb: 0,
    artefacts_count: 0,
  }
  // Wait a bit for reactivity to update
  await new Promise(resolve => setTimeout(resolve, 50))
}

const triggerTeamMembersCritical = async () => {
  if (!planDetails.value) {
    console.error('Plan details not loaded yet')
    return
  }
  const limit = planDetails.value.users || 50
  console.log('Triggering team members critical:', { limit })
  mockApiResponse.value = {
    users_count: Math.round(limit * 0.96),
    request_count: 0,
    storage_used_gb: 0,
    artefacts_count: 0,
  }
  await new Promise(resolve => setTimeout(resolve, 50))
}

const triggerQueryWarning = async () => {
  if (!planDetails.value) {
    console.error('Plan details not loaded yet')
    return
  }
  const limit = planDetails.value.limit_requests || 100000
  console.log('Triggering query warning:', { limit })
  mockApiResponse.value = {
    users_count: 0,
    request_count: Math.round(limit * 0.82),
    storage_used_gb: 0,
    artefacts_count: 0,
  }
  await new Promise(resolve => setTimeout(resolve, 50))
}

const triggerQueryCritical = async () => {
  if (!planDetails.value) {
    console.error('Plan details not loaded yet')
    return
  }
  const limit = planDetails.value.limit_requests || 100000
  console.log('Triggering query critical:', { limit })
  mockApiResponse.value = {
    users_count: 0,
    request_count: Math.round(limit * 0.96),
    storage_used_gb: 0,
    artefacts_count: 0,
  }
  await new Promise(resolve => setTimeout(resolve, 50))
}

const triggerStorageWarning = async () => {
  if (!planDetails.value) {
    console.error('Plan details not loaded yet')
    return
  }
  const limit = planDetails.value.storage_limit_gb || 50
  console.log('Triggering storage warning:', { limit })
  mockApiResponse.value = {
    users_count: 0,
    request_count: 0,
    storage_used_gb: Math.round(limit * 0.82 * 100) / 100,
    artefacts_count: 0,
  }
  await new Promise(resolve => setTimeout(resolve, 50))
}

const triggerStorageCritical = async () => {
  if (!planDetails.value) {
    console.error('Plan details not loaded yet')
    return
  }
  const limit = planDetails.value.storage_limit_gb || 50
  console.log('Triggering storage critical:', { limit })
  mockApiResponse.value = {
    users_count: 0,
    request_count: 0,
    storage_used_gb: Math.round(limit * 0.96 * 100) / 100,
    artefacts_count: 0,
  }
  await new Promise(resolve => setTimeout(resolve, 50))
}

const triggerArtefactsWarning = async () => {
  if (!planDetails.value) {
    console.error('Plan details not loaded yet')
    return
  }
  const limit = planDetails.value.artefacts || 1000
  console.log('Triggering artefacts warning:', { limit })
  mockApiResponse.value = {
    users_count: 0,
    request_count: 0,
    storage_used_gb: 0,
    artefacts_count: Math.round(limit * 0.82),
  }
  await new Promise(resolve => setTimeout(resolve, 50))
}

const triggerArtefactsCritical = async () => {
  if (!planDetails.value) {
    console.error('Plan details not loaded yet')
    return
  }
  const limit = planDetails.value.artefacts || 1000
  console.log('Triggering artefacts critical:', { limit })
  mockApiResponse.value = {
    users_count: 0,
    request_count: 0,
    storage_used_gb: 0,
    artefacts_count: Math.round(limit * 0.96),
  }
  await new Promise(resolve => setTimeout(resolve, 50))
}

const triggerAllWarnings = async () => {
  if (!planDetails.value) {
    console.error('Plan details not loaded yet')
    return
  }
  const users = planDetails.value.users || 50
  const requests = planDetails.value.limit_requests || 100000
  const storage = planDetails.value.storage_limit_gb || 50
  const artefacts = planDetails.value.artefacts || 1000

  console.log('Triggering all warnings')
  mockApiResponse.value = {
    users_count: Math.round(users * 0.82),
    request_count: Math.round(requests * 0.82),
    storage_used_gb: Math.round(storage * 0.82 * 100) / 100,
    artefacts_count: Math.round(artefacts * 0.82),
  }
  await new Promise(resolve => setTimeout(resolve, 50))
}

const triggerAllCritical = async () => {
  if (!planDetails.value) {
    console.error('Plan details not loaded yet')
    return
  }
  const users = planDetails.value.users || 50
  const requests = planDetails.value.limit_requests || 100000
  const storage = planDetails.value.storage_limit_gb || 50
  const artefacts = planDetails.value.artefacts || 1000

  console.log('Triggering all critical')
  mockApiResponse.value = {
    users_count: Math.round(users * 0.96),
    request_count: Math.round(requests * 0.96),
    storage_used_gb: Math.round(storage * 0.96 * 100) / 100,
    artefacts_count: Math.round(artefacts * 0.96),
  }
  await new Promise(resolve => setTimeout(resolve, 50))
}

const resetAllTriggers = async () => {
  mockApiResponse.value = null
  await new Promise(resolve => setTimeout(resolve, 50))
}

const goToPlan = () => {
  router.push('/admin/plans')
}

const goToProfile = () => {
  router.push('/admin/profile')
}
</script>
