<template>
  <teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50"></div>
      <div class="relative mx-auto" style="width:70%; max-width:90vw; min-width:320px;">
        <div class="bg-dark-900 border border-dark-700 rounded-lg overflow-hidden shadow-xl">
          <div class="flex items-center justify-between p-4 border-b border-dark-700">
            <h3 class="text-lg font-semibold text-white">{{ selectedPlan ? 'Checkout' : 'Compare Plans' }}</h3>
            <div class="flex items-center gap-3">
              <template v-if="!pricing.isLoading">
                <div v-if="!selectedPlan" class="text-sm text-gray-400">Billing</div>
                <div v-if="!selectedPlan" class="inline-flex rounded-md border overflow-hidden">
                  <button class="px-3 py-1" :class="period==='month' ? 'bg-primary-600 text-white' : 'text-gray-300'" @click="period='month'">Monthly</button>
                  <button class="px-3 py-1" :class="period==='year' ? 'bg-primary-600 text-white' : 'text-gray-300'" @click="period='year'">Yearly</button>
                </div>
                <!-- when in checkout, do not show period next to Close -->
              </template>
              <template v-else>
                <div v-if="!selectedPlan" class="flex items-center">
                  <div class="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mr-3" aria-hidden="true"></div>
                  <div class="text-gray-400 text-sm">Loading plans...</div>
                </div>
                <!-- when a plan is selected, hide loading indicator in header -->
              </template>

              <button class="btn-outline" @click="close">Close</button>
            </div>
          </div>

          <div class="p-6 max-h-[70vh] overflow-y-auto">
            <div v-if="!selectedPlan">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div v-for="plan in plansGrouped" :key="plan.name" class="card relative flex flex-col justify-between h-full">
                  <div v-if="plan.popular" class="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span class="bg-primary-500 text-white px-4 py-1 rounded-full text-sm font-medium">Most Popular</span>
                  </div>

                  <div class="text-center mb-4">
                    <h3 class="text-2xl font-bold text-white mb-2">{{ plan.name }}</h3>
                    <p class="text-gray-400 mb-4">{{ plan.description || '' }}</p>

                    <div class="mb-4">
                      <template v-if="(plan.options[period] || plan.options.month || plan.options.year)?.contact_sales || Number((plan.options[period] || plan.options.month || plan.options.year)?.price) === 0">
                        <div class="text-4xl font-bold text-white">Contact Sales</div>
                      </template>
                      <template v-else>
                        <div class="text-4xl font-bold text-white">{{ fmtPrice(getOptionPrice(plan), getOptionCurrency(plan)) }}</div>
                        <span v-if="!( (plan.options[period] || plan.options.month || plan.options.year)?.contact_sales || Number((plan.options[period] || plan.options.month || plan.options.year)?.price) === 0)" class="text-gray-400">/{{ period === 'year' ? 'Yearly' : 'Monthly' }}</span>
                      </template>

                      <div class="flex justify-center mt-4 mb-6">
                        <button class="btn-primary px-8 py-3" @click.prevent="select(plan)">Get Started</button>
                      </div>
                    </div>
                  </div>

                  <ul class="space-y-3 px-6 pb-6 flex-grow">
                    <li v-for="feature in deriveFeatures(plan.options[period] || plan.options.month || plan.options.year)" :key="feature" class="flex items-start">
                      <UIcon name="i-heroicons-check" class="w-5 h-5 text-primary-400 mt-0.5 mr-3 flex-shrink-0" />
                      <span class="text-gray-300">{{ feature }}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div v-else>
              <div v-if="!showOnlySuccess" class="mb-4">
                <h4 class="text-white font-semibold">Checkout</h4>
                <p class="text-gray-400 text-sm">Proceed to complete purchase for <strong class="text-white">{{ selectedPlan.name || selectedPlan.title }}</strong> - <span class="text-white">{{ formatPeriod(selectedPlan.period || period) }}</span></p>
              </div>

              <div v-if="showOnlySuccess" class="p-6">
                <div class="text-center">
                  <UIcon name="heroicons:check-circle" class="w-12 h-12 text-green-400 mx-auto mb-4" />
                  <h3 class="text-xl font-semibold text-white">{{ successTitle }}</h3>
                  <p class="text-gray-300 mt-2">{{ successMessage }}</p>
                  <div class="mt-6">
                    <button class="btn-primary" @click="closeSuccess">OK</button>
                  </div>
                </div>
              </div>

              <div v-if="!showOnlySuccess">
                <CheckoutWizard :org-id="orgId" :selectedPlan="selectedPlan" @change-plan="onChangePlan" @order-success="onOrderSuccess" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePricingStore } from '~/stores/pricing'
import CheckoutWizard from '~/components/CheckoutWizard.vue'

const props = defineProps<{ modelValue: boolean; orgId?: string }>()
const emit = defineEmits(['update:modelValue'])

const visible = ref(!!props.modelValue)
watch(() => props.modelValue, (v) => (visible.value = !!v))
watch(visible, (v) => emit('update:modelValue', v))

const orgId = props.orgId

const pricing = usePricingStore()
const period = ref<'month'|'year'>('month')

onMounted(async () => {
  try { await pricing.fetchPlans() } catch {}
})

const plans = computed(() => pricing.plans)

function formatPeriod(p: any) {
  const s = (p && String(p) || '').toString().toLowerCase()
  if (!s) return ''
  if (s === 'year' || s === 'yearly') return 'Yearly'
  if (s === 'month' || s === 'monthly') return 'Monthly'
  // fallback: capitalize first letter
  return String(p).charAt(0).toUpperCase() + String(p).slice(1)
}

// Group plans by name and collect month/year options (normalize shape like pages/pricing.vue)
const plansGrouped = computed(() => {
  const map = new Map()
  plans.value.forEach((p: any) => {
    const key = p.name || p.title || 'Unnamed'
    if (!map.has(key)) {
      map.set(key, {
        name: key,
        description: p.description || '',
        options: {},
        features: Array.isArray(p.features) ? p.features : (p._raw?.features || []),
        popular: !!p.popular || !!p.recommended,
      })
    }
    const entry = map.get(key)
    const interval = (p.interval || p.period || 'month').toString().toLowerCase()
    const slotKey = interval === 'year' ? 'year' : 'month'
    entry.options[slotKey] = {
      id: p.id,
      price: p.price,
      currency: p.currency,
      users: p.users ?? p._raw?.users ?? 0,
      limit_requests: p.limit_requests ?? p._raw?.limit_requests ?? 0,
      storage_limit_gb: p.storage_limit_gb ?? p._raw?.storage_limit_gb ?? null,
      artefacts: p.artefacts ?? p._raw?.artefacts ?? p._raw?.metadata?.artefacts ?? null,
      features: Array.isArray(p.features) ? p.features : p._raw?.features || [],
      contact_sales: !!p.contact_sales,
      support_level: p.support_level || p._raw?.support_level || p._raw?.metadata?.support_level || null,
      createdAt: p.createdAt || p._raw?.created_at || null,
      recommended: !!p.popular || !!p.recommended,
      raw: p._raw || p,
    }
    // merge features if missing
    if ((!entry.features || entry.features.length === 0) && p._raw?.features) entry.features = Array.isArray(p._raw.features) ? p._raw.features : []
    if (p.popular || p.recommended) entry.popular = true
  })
  return Array.from(map.values())
})

const selectedPlan = ref<any | null>(null)
const showOnlySuccess = ref(false)
const successTitle = ref('')
const successMessage = ref('')

function select(planGroup: any) {
  // select the option matching current period if present, else fallback
  const opt = planGroup.options[period.value] || planGroup.options.month || planGroup.options.year
  selectedPlan.value = opt ? { ...opt, name: planGroup.name, features: planGroup.features, period: period.value } : null
}

function close() {
  visible.value = false
}

// reset selected plan when modal opens
watch(visible, (v) => {
  if (v) {
    selectedPlan.value = null
    showOnlySuccess.value = false
    successTitle.value = ''
    successMessage.value = ''
    period.value = 'month'
  }
})

function onChangePlan() {
  // Reset selected plan so modal returns to plan selection grid
  selectedPlan.value = null
}

function onOrderSuccess(payload: any) {
  // Display only the success dialog and hide checkout
  showOnlySuccess.value = true
  successTitle.value = payload?.title || 'Success'
  successMessage.value = payload?.message || ''
}

function closeSuccess() {
  // close the whole modal after user acknowledges
  showOnlySuccess.value = false
  visible.value = false
}

function getOptionPrice(planGroup: any){
  const opt = planGroup.options[period.value] || planGroup.options.month || planGroup.options.year
  return opt ? (opt.price || opt.price_amount || 0) : 0
}
function getOptionCurrency(planGroup: any){
  const opt = planGroup.options[period.value] || planGroup.options.month || planGroup.options.year
  return opt ? (opt.currency || opt.price_currency || 'USD') : 'USD'
}

import { fmtPrice, deriveFeatures } from '~/utils/pricingHelpers'
</script>

<style scoped>
.btn-primary{background:#2563eb;color:#fff;padding:.5rem 1rem;border-radius:6px}
.btn-outline{background:transparent;color:#e6edf3;border:1px solid #374151;padding:.5rem .75rem;border-radius:6px}
</style>
