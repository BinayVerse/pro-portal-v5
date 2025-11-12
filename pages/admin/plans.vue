<template>
  <div>
    <section class="space-y-6">
      <div class="max-w-7xl">
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-white">My Plan</h1>
          <p class="text-gray-400 text-sm">View and manage your organization's subscription.</p>
        </div>

        <div class="space-y-6">
          <div class="bg-dark-800 rounded-lg border border-dark-700 p-6">
            <div v-if="loading" class="text-gray-400">Loading...</div>
            <div v-else>
              <div v-if="currentPlan && currentPlan.plan">
                <p class="text-white font-medium">
                  {{ currentPlan.plan.title || currentPlan.plan.name }}
                </p>
                <p class="text-gray-400">Started: {{ formattedPlanStart }}</p>
                <p class="text-gray-400">
                  Interval: {{ currentPlan.plan.duration || currentPlan.plan.interval || '-' }}
                </p>

                <div class="mt-4 text-sm text-gray-300">
                  <p class="font-semibold mb-2">What's included:</p>
                  <ul class="space-y-2">
                    <li
                      v-for="(f, idx) in deriveFeatures(currentPlan.plan)"
                      :key="idx"
                      class="flex items-start gap-2"
                    >
                      <UIcon name="i-heroicons-check" class="w-4 h-4 text-primary-400 mt-1" />
                      <span>{{ f }}</span>
                    </li>
                  </ul>
                </div>

                <div class="mt-2">
                  <p
                    :class="[
                      'text-xs',
                      planDaysLeft !== null && planDaysLeft > 7 ? 'text-green-500' : 'text-red-500',
                    ]"
                  >
                    {{ planEndsInText }}
                  </p>
                </div>
              </div>
              <div v-else class="text-gray-400">No active plan found for this organization.</div>
            </div>
          </div>

          <div class="mt-4">
            <UButton color="primary" :to="null" @click="openModal"
              >Upgrade Now By Comparing Other Plans</UButton
            >
          </div>

          <PlansModal v-model="modalOpen" :org-id="orgId" />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'My Plan - provento.ai' })

definePageMeta({ layout: 'admin', middleware: 'auth' })

import { onMounted, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '~/composables/useAuth'
import { useOrganizationStore } from '~/stores/organization/index'
import PlansModal from '~/components/PlansModal.vue'
import dayjs from 'dayjs'
import { formatDateTime } from '~/utils'
import { deriveFeatures } from '~/utils/pricingHelpers'

const modalOpen = ref(false)
function openModal() {
  modalOpen.value = true
}

const route = useRoute()
const auth = useAuth()

// Ensure admin-only access
onMounted(async () => {
  // initialize/check auth
  await auth.checkAuth()
  if (!auth.requireAdmin()) return
})

const orgIdFromQuery = (route.query?.org || route.query?.org_id) as string | undefined
const orgId = orgIdFromQuery || auth.user?.org_id || ''

const orgStore = useOrganizationStore()

const loading = computed(() => orgStore.loading)
const currentPlan = computed(() => orgStore.currentPlan)

// Format start date for UI
const formattedPlanStart = computed(() => {
  try {
    const val = currentPlan.value?.plan_start_date
    if (!val) return '-'
    return formatDateTime(val, undefined, 'DD/MM/YYYY hh:mm A')
  } catch (e) {
    return String(currentPlan.value?.plan_start_date || '-')
  }
})

// Helper to compute days left (returns number or null)
const planDaysLeft = computed(() => {
  try {
    const plan = currentPlan.value?.plan
    const start = currentPlan.value?.plan_start_date
    if (!plan || !start) return null

    const durRaw = (plan.duration || '').toString().trim().toLowerCase()
    let amount = 1
    let unit: dayjs.ManipulateType = 'month'

    const m = durRaw.match(/(\d+)\s*(year|yr|month|mo|day|d)/)
    if (m) {
      amount = Number(m[1]) || 1
      const u = m[2]
      if (u.includes('year') || u.includes('yr')) unit = 'year'
      else if (u.includes('month') || u.includes('mo')) unit = 'month'
      else if (u.includes('day') || u.includes('d')) unit = 'day'
    } else {
      if (durRaw.includes('year')) unit = 'year'
      else if (durRaw.includes('month')) unit = 'month'
      else if (durRaw.includes('day')) unit = 'day'
      amount = 1
    }

    const startDate = dayjs(start)
    if (!startDate.isValid()) return null
    const endDate = startDate.add(amount, unit)
    const daysLeft = endDate.diff(dayjs(), 'day')
    return Number.isFinite(daysLeft) ? daysLeft : null
  } catch (e) {
    return null
  }
})

const planEndsInText = computed(() => {
  const daysLeft = planDaysLeft.value
  if (daysLeft === null) return ''
  if (daysLeft <= 0) return 'Plan has ended'
  return `Current plan will end in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`
})

onMounted(async () => {
  // fetch org plan via store
  await orgStore.fetchOrgPlan(orgId)
})
</script>
