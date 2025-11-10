<template>
  <div>
    <section class="pt-16 pb-24 px-4 sm:px-6 lg:px-8">
      <div class="max-w-7xl mx-auto">
        <div class="text-center mb-16">
          <h1 class="text-4xl sm:text-5xl font-bold text-white mb-6">
            Simple, Transparent
            <span class="text-primary-400">Pricing</span>
          </h1>
          <p class="text-xl text-gray-300 max-w-3xl mx-auto">
            Find the plan that’s right for you, with round-the-clock support.
          </p>
        </div>

        <!-- Pricing Grid -->
    <div class="flex justify-center mb-10">
      <template v-if="!isLoading">
        <div class="inline-flex rounded-md bg-dark-800 p-0.5">
          <button
            @click="selectedPeriod = 'month'"
            :class="
              selectedPeriod === 'month'
                ? 'px-3 py-1 bg-primary-600 text-white rounded'
                : 'px-3 py-1 text-gray-300 rounded'
            "
          >
            Monthly
          </button>
          <button
            @click="selectedPeriod = 'year'"
            :class="
              selectedPeriod === 'year'
                ? 'px-3 py-1 bg-primary-600 text-white rounded'
                : 'px-3 py-1 text-gray-300 rounded'
            "
          >
            Yearly
          </button>
        </div>
      </template>
      <template v-else>
        <div class="flex items-center justify-center py-4">
          <div class="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
        </div>
      </template>
    </div>

    <template v-if="!isLoading">
      <div class="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        <div
          v-for="(group, idx) in groupedPlans"
          :key="group.name + idx"
          class="card relative flex flex-col justify-between h-full"
          :class="group.popular ? 'ring-2 ring-primary-500' : ''"
        >
          <div v-if="group.popular" class="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <span class="bg-primary-500 text-white px-4 py-1 rounded-full text-sm font-medium"
              >Most Popular</span
            >
          </div>

          <div class="text-center mb-4">
            <h3 class="text-2xl font-bold text-white mb-2">{{ group.name }}</h3>
            <p class="text-gray-400 mb-4">{{ group.description || '' }}</p>

            <div class="mb-4">
              <span class="text-4xl font-bold text-white">
                <template v-if="getOption(group)?.price === 0 || getOption(group)?.contact_sales">
                  Contact Sales
                </template>
                <template v-else>
                  {{ fmtPrice(getOption(group)?.price, getOption(group)?.currency) }}
                </template>
              </span>
              <span
                v-if="
                  getOption(group) &&
                  !(getOption(group).contact_sales || Number(getOption(group).price) === 0)
                "
                class="text-gray-400"
                >/{{ getSelectedKey(group) === 'year' ? 'year' : 'month' }}</span
              >

              <div class="flex justify-center mt-4 mb-6">
                <button
                  @click.prevent="handleGetStarted(group)"
                  :disabled="checkoutLoading[getOption(group)?.id]"
                  class="btn-primary px-8 py-3 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <template v-if="checkoutLoading[getOption(group)?.id]">Processing...</template>
                  <template v-else>{{
                    getOption(group)?.contact_sales ? 'Contact Sales' : 'Get Started'
                  }}</template>
                </button>
              </div>
            </div>
          </div>

          <ul class="space-y-3 px-6 pb-6 flex-grow">
            <li
              v-for="feature in deriveFeatures(getOption(group))"
              :key="feature"
              class="flex items-start"
            >
              <UIcon
                name="i-heroicons-check"
                class="w-5 h-5 text-primary-400 mt-0.5 mr-3 flex-shrink-0"
              />
              <span class="text-gray-300">{{ feature }}</span>
            </li>
          </ul>
        </div>
      </div>
    </template>
    <template v-else>
      <div class="flex items-center justify-center py-16">
        <div class="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
      </div>
    </template>

        <!-- FAQ Section -->
        <div class="mt-24">
          <h2 class="text-3xl font-bold text-white text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div class="max-w-3xl mx-auto space-y-6">
            <div v-for="faq in faqs" :key="faq.id" class="card">
              <h3 class="text-lg font-semibold text-white mb-2">{{ faq.question }}</h3>
              <p class="text-gray-300">{{ faq.answer }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Pricing - provento.ai' })
definePageMeta({ layout: 'main' })

import { onMounted, computed, ref, reactive, watch } from 'vue'
import { usePricingStore } from '~/stores/pricing'
import { useAuth } from '~/composables/useAuth'
import { useRoute } from 'vue-router'
import { useNotification } from '~/composables/useNotification'
import { useProfileStore } from '~/stores/profile/index'
import { useAuthStore } from '~/stores/auth/index'

const pricing = usePricingStore()
const auth = useAuth()
const authStore = useAuthStore()
const profileStore = useProfileStore()
const route = useRoute()
const { showError, showSuccess } = useNotification()

onMounted(() => {
  pricing.fetchPlans()
})

const rawPlans = computed(() => pricing.plans)
const isLoading = computed(() => pricing.isLoading)
const error = computed(() => pricing.error)

// Checkout/loading state
const checkoutLoading = reactive<Record<string, boolean>>({})

async function handleGetStarted(group: any) {
  const opt = getOption(group)
  if (!opt) return

  // Contact sales flow
  if (opt.contact_sales) {
    return navigateTo('/book-meeting')
  }

  // Try to determine orgId from query/profile/auth
  try {
    await auth.checkAuth()
  } catch (e) {}

  const orgFromQuery = (route.query?.org || route.query?.org_id) as string | undefined
  const orgId = orgFromQuery || auth.user?.org_id || (profileStore.userProfile as any)?.org_id || ''

  // If not authenticated, send user to login and redirect back to org plans page after login
  if (!authStore.isAuthenticated) {
    const redirectPath = `/admin/plans${orgId ? `?org=${encodeURIComponent(orgId)}` : ''}`
    return navigateTo({ path: '/login', query: { redirect: redirectPath } })
  }

  // Authenticated -> go straight to organization plans page
  const target = `/admin/plans${orgId ? `?org=${encodeURIComponent(orgId)}` : ''}`
  return navigateTo(target)
}

// Group plans by name and collect monthly/yearly options
const groupedPlans = computed(() => {
  const map = new Map<string, any>()
  rawPlans.value.forEach((p: any) => {
    const key = p.name || p.title || 'Unnamed'
    if (!map.has(key)) {
      map.set(key, {
        name: key,
        options: {},
        popular: !!p.popular,
        product_family: p.product_family || null,
      })
    }
    const entry = map.get(key)
    const interval = (p.interval || p.period || 'month').toString().toLowerCase()
    entry.options[interval === 'year' ? 'year' : 'month'] = {
      id: p.id,
      price: p.price,
      currency: p.currency,
      users: p.users ?? p._raw?.users ?? 0,
      limit_requests: p.limit_requests ?? p._raw?.limit_requests ?? 0,
      storage_limit_gb: p.storage_limit_gb ?? p._raw?.storage_limit_gb ?? null,
      artefacts: p.artefacts ?? p._raw?.artefacts ?? p._raw?.metadata?.artefacts ?? null,
      features: Array.isArray(p.features) ? p.features : p._raw?.features || [],
      contact_sales: !!p.contact_sales,
      support_level:
        p.support_level || p._raw?.support_level || p._raw?.metadata?.support_level || null,
      createdAt: p.createdAt || p._raw?.created_at || null,
      recommended: !!p.popular || !!p.recommended,
      raw: p._raw || p,
    }
    if (p.popular || p.recommended) entry.popular = true
  })
  return Array.from(map.values())
})

// Global selected period (one toggle controls all cards)
const selectedPeriod = ref<'month' | 'year'>('month')

// Initialize selectedPeriod based on available plan intervals
watch(
  rawPlans,
  (r) => {
    if (!r || r.length === 0) return
    const hasMonth = r.some(
      (p: any) => (p.interval || p.period || 'month').toString().toLowerCase() === 'month',
    )
    selectedPeriod.value = hasMonth ? 'month' : 'year'
  },
  { immediate: true },
)

function getOption(group: any) {
  const key = selectedPeriod.value
  return group.options[key] || group.options.month || group.options.year || null
}

function getSelectedKey(group: any) {
  const key = selectedPeriod.value
  if (group.options[key]) return key
  if (group.options.month) return 'month'
  if (group.options.year) return 'year'
  return key
}

import { fmtPrice, deriveFeatures } from '~/utils/pricingHelpers'

const faqs = [
  {
    id: 1,
    question: 'Can I change my plan anytime?',
    answer:
      'Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.',
  },
  {
    id: 2,
    question: 'How do I get started?',
    answer:
      'Simply choose your plan and click "Get Started" to begin using our platform immediately.',
  },
  {
    id: 3,
    question: 'What file formats are supported?',
    answer: 'We support PDF, Word, Excel, PowerPoint, CSV, and many other common artefact formats.',
  },
  {
    id: 4,
    question: 'Is my data secure?',
    answer: 'Absolutely. We use enterprise-grade encryption and are SOC 2 and GDPR compliant.',
  },
]
</script>
