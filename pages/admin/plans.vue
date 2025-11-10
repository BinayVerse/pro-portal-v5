<template>
  <div>
    <section class="pt-6 px-4">
      <div class="max-w-7xl">
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-white">My Plan</h1>
          <p class="text-gray-400 text-sm">View and manage your organization's subscription.</p>
        </div>

        <div class="space-y-6">
          <div class="bg-dark-800 rounded-lg border border-dark-700 p-6">
            <h2 class="text-lg font-semibold text-white mb-2">My Plan</h2>
            <div v-if="loading" class="text-gray-400">Loading...</div>
            <div v-else>
              <div v-if="currentPlan && currentPlan.plan">
                <p class="text-white font-medium">{{ currentPlan.plan.title || currentPlan.plan.name }}</p>
                <p class="text-gray-400">Started: {{ currentPlan.plan_start_date || '-' }}</p>
                <p class="text-gray-400">Interval: {{ currentPlan.plan.duration || currentPlan.plan.interval || '-' }}</p>

                <div class="mt-4 text-sm text-gray-300">
                  <p class="font-semibold mb-2">What's included:</p>
                  <ul class="space-y-2">
                    <li v-for="(f, idx) in deriveFeatures(currentPlan.plan)" :key="idx" class="flex items-start gap-2">
                      <UIcon name="i-heroicons-check" class="w-4 h-4 text-primary-400 mt-1" />
                      <span>{{ f }}</span>
                    </li>
                  </ul>
                </div>

                <p class="text-xs text-red-500 mt-4">Free plan will end in 210 days</p>

              </div>
              <div v-else class="text-gray-400">No active plan found for this organization.</div>
            </div>
          </div>

          <div class="mt-4">
            <UButton color="primary" :to="null" @click="openModal">Upgrade Now By Comparing Other Plans</UButton>
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

const modalOpen = ref(false)
function openModal(){ modalOpen.value = true }

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

import { deriveFeatures } from '~/utils/pricingHelpers'

onMounted(async () => {
  // fetch org plan via store
  await orgStore.fetchOrgPlan(orgId)
})
</script>
