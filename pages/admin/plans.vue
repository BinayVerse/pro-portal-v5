<template>
  <div>
    <section class="space-y-4 sm:space-y-6">
      <div class="max-w-7xl">
        <div class="mb-4 sm:mb-6">
          <h1 class="text-lg sm:text-xl lg:text-2xl font-bold text-white">My Plan</h1>
          <p class="text-xs sm:text-sm text-gray-400">View and manage your organization's subscription.</p>
        </div>

        <div class="space-y-4 sm:space-y-6">
          <div class="bg-dark-800 rounded-lg border border-dark-700 p-4 sm:p-6">
            <div v-if="loading" class="text-gray-400">Loading...</div>
            <div v-else>
              <div v-if="currentPlan && currentPlan.plan" class="bg-dark-800 rounded-lg">
                <div class="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
                  <!-- BASE PLAN -->
                  <div class="lg:col-span-2">
                    <div class="flex items-center justify-between mb-2">
                      <h3 class="text-lg font-semibold text-white flex">
                        {{ currentPlan.plan.title }}
                        <!-- <UTooltip :text="renewalInfoText" class="mt-2 ml-4"> -->
                        <!-- <UIcon
                          name="i-heroicons-information-circle"
                          :title="renewalInfoText"
                          color="red"
                          class="w-4 h-4 cursor-pointer mt-2 ml-4 text-primary-500"
                        /> -->
                        <UBadge
                          v-if="!isCurrentPlanFree && !isCurrentPlanUnlimited"
                          :color="isSubscriptionCancelled ? 'gray' : 'primary'"
                          variant="soft"
                          :title="renewalInfoText"
                          class="ml-2"
                          size="xs"
                        >
                          {{ isSubscriptionCancelled ? 'Auto-renewal off' : 'Auto-renewal on' }}
                        </UBadge>

                        <!-- </UTooltip> -->
                      </h3>
                      <!-- <span class="text-xs px-2 py-1 rounded bg-primary-600 text-white">
                        Base Plan
                      </span> -->
                    </div>

                    <p class="text-gray-400 text-sm">Started: {{ formattedPlanStart }}</p>
                    <p class="text-gray-400 text-sm mb-4">
                      Billing: {{ currentPlan.plan.duration || 'NA' }}
                    </p>

                    <p class="text-sm text-gray-300 font-semibold mb-2">What’s included</p>
                    <ul class="space-y-2">
                      <li
                        v-for="(f, idx) in deriveFeatures(currentPlan.plan)"
                        :key="idx"
                        class="flex items-start gap-2 text-gray-300"
                      >
                        <UIcon name="i-heroicons-check" class="w-4 h-4 text-primary-400 mt-1" />
                        <span>{{ f }}</span>
                      </li>
                    </ul>

                    <p
                      v-if="!isCurrentPlanUnlimited"
                      class="mt-4 text-xs"
                      :class="
                        planDaysLeft !== null && planDaysLeft > 7
                          ? 'text-green-500'
                          : 'text-red-500'
                      "
                    >
                      {{ planEndsInText }}
                    </p>
                  </div>

                  <!-- ADD-ONS -->
                  <div
                    v-if="addons.length > 0 && !isCurrentPlanUnlimited && !isCurrentPlanFree"
                    class="lg:col-span-1 border-t lg:border-t-0 lg:border-l border-dark-700 pt-4 lg:pt-0 lg:pl-4 mt-4 lg:mt-0"
                  >
                    <h4 class="text-sm font-semibold text-white mb-3">Add-Ons</h4>

                    <div v-if="addons.length" class="space-y-3">
                      <div
                        v-for="addon in addons"
                        :key="addon.subscription_id"
                        class="bg-dark-900 border border-dark-700 rounded-lg p-3"
                      >
                        <div class="flex justify-between items-start">
                          <p class="text-white text-sm font-medium">
                            {{ addon.title }}
                          </p>
                        </div>

                        <p class="text-xs text-gray-400 mt-1">
                          {{ addon.price_currency }} {{ addon.price_amount }}
                          <span class="text-gray-500">/ {{ addon.duration || 'pack' }}</span>
                        </p>

                        <p v-if="addon.quantity" class="text-xs text-gray-400 mt-1">
                          Qty: <span class="text-white">{{ addon.quantity }}</span>
                        </p>
                      </div>
                    </div>

                    <div v-else class="text-xs text-gray-500">No add-ons purchased</div>
                  </div>
                </div>
              </div>

              <div v-else class="text-gray-400">No active plan found for this organization.</div>
            </div>
          </div>

          <div
            v-if="!isCurrentPlanUnlimited && (profileStore.userProfile as any)?.source !== 'aws'"
            class="flex flex-col sm:flex-row sm:align-items-center gap-2 sm:gap-4 mt-4"
          >
            <div
              v-if="!isCurrentPlanUnlimited && (profileStore.userProfile as any)?.source !== 'aws'"
              class=""
            >
              <UButton :loading="loading" color="primary" :to="null" @click="openModal">{{
                hasActiveSubscription ? 'View Plans & Upgrade' : 'View Plans'
              }}</UButton>
            </div>
            <div
              v-if="hasActiveSubscription && (profileStore.userProfile as any)?.source !== 'aws'"
              class=""
            >
              <UButton
                color="red"
                @click="openCancelModal"
                :loading="loading"
                :disabled="isSubscriptionCancelled || isCurrentPlanFree"
                :title="
                  isCurrentPlanFree
                    ? 'Free plan cannot be cancelled'
                    : isSubscriptionCancelled
                      ? 'Subscription already cancelled'
                      : hasActiveSubscription
                        ? ''
                        : 'No active subscription to cancel'
                "
              >
                Cancel Subscription
              </UButton>
            </div>
          </div>
          <div v-else-if="!isCurrentPlanUnlimited" class="mt-4">
            <UButton color="primary" :to="null" @click="openAwsMarketplace">
              View Plans & Upgrade on AWS Marketplace
            </UButton>
          </div>

          <PlansModal
            v-model="modalOpen"
            :org-id="orgId"
            :has-active-subscription="hasActiveSubscription"
          />
          <UModal v-model="cancelModalOpen" :ui="{ width: 'sm' }">
            <div class="p-6 space-y-4">
              <h3 class="text-lg font-semibold text-white">Cancel Subscription</h3>

              <p class="text-sm text-gray-300">
                Your subscription will remain active until
                <span class="font-semibold text-white"> {{ subscriptionEndDate }} </span>. It will
                not renew after that.
              </p>

              <div class="flex justify-end gap-3 pt-4">
                <UButton variant="outline" @click="cancelModalOpen = false">
                  Keep Subscription
                </UButton>

                <UButton color="red" :loading="cancelLoading" @click="confirmCancelSubscription">
                  Cancel Subscription
                </UButton>
              </div>
            </div>
          </UModal>
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
import { useProfileStore } from '~/stores/profile/index'
import { usePaymentsStore } from '~/stores/payments'
import PlansModal from '~/components/PlansModal.vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { formatDateTime } from '~/utils'
import { deriveFeatures, isUnlimitedPlan } from '~/utils/pricingHelpers'

dayjs.extend(utc)
dayjs.extend(timezone)

const modalOpen = ref(false)
const profileStore = useProfileStore()
const paymentsStore = usePaymentsStore()
function openModal() {
  modalOpen.value = true
}

const cancelModalOpen = ref(false)
const cancelLoading = ref(false)

function openCancelModal() {
  cancelModalOpen.value = true
}

const hasActiveSubscription = computed(() => {
  return !!currentPlan.value?.plan
})

const isCurrentPlanUnlimited = computed(() => {
  return isUnlimitedPlan(currentPlan.value?.plan)
})

const isCurrentPlanFree = computed(() => {
  return currentPlan.value?.plan?.metadata?.free_plan === true
})

const addons = computed(() => {
  return currentPlan.value?.addons || []
})

const hasAddons = computed(() => addons.value.length > 0)

const subscriptionDetails = computed(() => {
  return currentPlan.value?.subscription_details || null
})

const isSubscriptionCancelled = computed(() => {
  return !!subscriptionDetails.value?.cancellation_details
})

const subscriptionEndDate = computed(() => {
  // 1️⃣ Cancelled → use cancel_at
  const cancelAt = subscriptionDetails.value?.cancellation_details?.cancel_at

  if (cancelAt) {
    return dayjs(cancelAt).format('MMMM D, YYYY')
  }

  // 2️⃣ Active → calculate from plan_start_date + duration
  const start = currentPlan.value?.plan_start_date
  const duration = currentPlan.value?.plan?.duration

  if (!start || !duration) return null

  const startDate = dayjs(start)
  if (!startDate.isValid()) return null

  const dur = String(duration).toLowerCase()

  if (dur.includes('year')) {
    return startDate.add(1, 'year').format('MMMM D, YYYY')
  }

  if (dur.includes('month')) {
    return startDate.add(1, 'month').format('MMMM D, YYYY')
  }

  return null
})

async function confirmCancelSubscription() {
  cancelLoading.value = true

  const res = await paymentsStore.cancelSubscription()

  cancelLoading.value = false

  if (res.success) {
    cancelModalOpen.value = false
    await orgStore.fetchOrgPlan(orgId) // refresh plan state
  }
}

const renewalInfoText = computed(() => {
  if (isSubscriptionCancelled.value && subscriptionEndDate.value) {
    return `This plan will not renew and will expire on ${subscriptionEndDate.value}.`
  }

  return 'This plan will auto-renew at the end of each billing cycle unless cancelled.'
})

const route = useRoute()
const auth = useAuth()
const userTimeZone = ref('UTC')
const config = useRuntimeConfig()

// Ensure admin-only access and detect timezone
onMounted(async () => {
  // Detect user's actual timezone FIRST
  userTimeZone.value = dayjs.tz.guess()

  // initialize/check auth
  await auth.checkAuth()
  if (!auth.requireAdmin()) return

  // fetch org plan via store after timezone is set
  await orgStore.fetchOrgPlan(orgId)
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

    // Treat DB value as local/absolute and don’t shift by timezone
    return dayjs(val).format('MMMM D, YYYY')
  } catch (e) {
    return String(currentPlan.value?.plan_start_date || '-')
  }
})

const openAwsMarketplace = () => {
  const link = config.public.awsMarketplaceLink
  if (!link) {
    console.error('AWS Marketplace link not configured')
    return
  }
  window.open(link, '_blank')
}

// Helper to compute days left (returns number or null)
const planDaysLeft = computed(() => {
  try {
    const plan = currentPlan.value?.plan
    const start = currentPlan.value?.plan_start_date
    // console.log('Computing days left for plan:', plan, 'start date:', start)
    if (!plan || !start) return null

    const durRaw = (plan.duration || '').toString().trim().toLowerCase()
    // console.log('Duration raw:', durRaw)
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
  console.log('Plan days left:', daysLeft)
  if (daysLeft === null) return ''
  if (daysLeft < 0) return 'Plan has ended'
  if (daysLeft === 0) return 'Plan expires today'
  return `Current plan will end in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`
})
</script>

<style scoped>
.org-role-tag {
  display: inline-block;
  background: #10b981; /* green-500 */
  color: white;
  border: 1px solid rgba(16, 185, 129, 0.2);
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 12px;
  line-height: 1;
  margin-top: 4px;
  font-weight: 600;
}

.plan-active {
  background: #10b981; /* green-500 */
  border-color: rgba(16, 185, 129, 0.25);
}

.plan-expired {
  background: #ef4444; /* red-500 */
  border-color: rgba(239, 68, 68, 0.35);
}
</style>
