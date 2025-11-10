<template>
  <div>
    <div class="mb-4">
      <label class="text-sm text-gray-400">Step: {{ step }} / 4</label>
    </div>

    <!-- Step 1: Your selected plan -->
    <div v-if="step === 1">
      <p class="text-gray-300 mb-4">Your selected plan</p>
      <div class="border rounded p-4 bg-dark-900">
        <h3 class="text-white font-semibold text-lg">
          {{ selected?.name || selected?.title || 'No plan selected' }}
          <span v-if="(selected?.period || selected?._raw?.interval || selected?.interval)" class="text-sm text-gray-400 ml-2">- {{ formatPeriod(selected?.period || selected?._raw?.interval || selected?.interval) }}</span>
        </h3>
        <p class="text-gray-400 mt-1">
          {{ selected?._raw?.description || selected?.description || '' }}
        </p>
        <p class="text-gray-200 font-bold mt-3">
          {{
            fmtPrice(
              selected?.price || selected?.price_amount,
              selected?.currency || selected?.price_currency,
            )
          }}
        </p>
        <div v-if="selected" class="mt-4">
          <p class="text-sm text-gray-300 font-semibold mb-2">What's included</p>
          <ul class="space-y-2">
            <li
              v-for="(f, idx) in deriveFeatures(
                selected?.price ? selected : selected?._raw || selected,
              )"
              :key="idx"
              class="flex items-start gap-2 text-gray-300"
            >
              <UIcon name="i-heroicons-check" class="w-4 h-4 text-primary-400 mt-1" />
              <span>{{ f }}</span>
            </li>
          </ul>
        </div>
        <div class="mt-4">
          <button class="btn-outline mr-2" @click="emitChangePlan">Change Plan</button>
        </div>
      </div>
    </div>

    <!-- Step 2: Billing Details -->
    <div v-if="step === 2">
      <p class="text-gray-300 mb-4">Billing Details</p>
      <div class="space-y-3">
        <div>
          <label class="text-sm text-gray-400">Name</label>
          <input v-model="billing.name" class="mt-1 w-full input" />
        </div>
        <div>
          <label class="text-sm text-gray-400">Email</label>
          <input v-model="billing.email" class="mt-1 w-full input" />
        </div>
        <div>
          <label class="text-sm text-gray-400">Phone</label>
          <input v-model="billing.phone" class="mt-1 w-full input" />
        </div>
        <div>
          <label class="text-sm text-gray-400">Tax ID (Optional)</label>
          <input
            v-model="billing.taxId"
            class="mt-1 w-full input"
            placeholder="VAT / GST / Tax ID"
          />
        </div>
      </div>
      <div class="mt-4">
        <p class="text-gray-300">
          Selected Plan: <span class="text-white font-medium">{{ selected?.name }}<span v-if="(selected?.period || selected?._raw?.interval || selected?.interval)"> - {{ formatPeriod(selected?.period || selected?._raw?.interval || selected?.interval) }}</span></span>
        </p>
        <p class="text-gray-300">
          Price:
          <span class="text-white font-medium">{{
            fmtPrice(
              selected?.price || selected?.price_amount,
              selected?.currency || selected?.price_currency,
            )
          }}</span>
        </p>
      </div>
    </div>

    <!-- Step 3: Billing Address -->
    <div v-if="step === 3">
      <p class="text-gray-300 mb-4">Billing Address</p>
      <div class="space-y-3">
        <div>
          <label class="text-sm text-gray-400">Address line 1</label>
          <input v-model="billing.address.line1" class="mt-1 w-full input" />
        </div>
        <div>
          <label class="text-sm text-gray-400">Address line 2</label>
          <input v-model="billing.address.line2" class="mt-1 w-full input" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label class="text-sm text-gray-400">City</label>
            <input v-model="billing.address.city" class="mt-1 w-full input" />
          </div>
          <div>
            <label class="text-sm text-gray-400">State</label>
            <input v-model="billing.address.state" class="mt-1 w-full input" />
          </div>
          <div>
            <label class="text-sm text-gray-400">ZIP / Postal</label>
            <input v-model="billing.address.zip" class="mt-1 w-full input" />
          </div>
        </div>
        <div>
          <label class="text-sm text-gray-400">Country</label>
          <input v-model="billing.address.country" class="mt-1 w-full input" />
        </div>
      </div>
      <div v-if="lastError" class="mt-3 text-sm text-red-400">{{ lastError }}</div>
    </div>

    <!-- Step 4: Payment -->
    <div v-if="step === 4">
      <p class="text-gray-300 mb-4">Complete payment below</p>
      <div v-if="checkoutLoading" class="flex items-center justify-center py-6">
        <div
          class="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"
        ></div>
      </div>
      <div v-else>
        <div v-if="braintreeAmount !== null" class="w-full h-[70vh]">
          <BraintreeDropin
            ref="braintreeRef"
            :client-token="braintreeClientToken"
            :amount="braintreeAmount"
            :billing="billing"
            :plan-id="cbPlanId"
            @error="onDropinError"
            @ready="onDropinReady"
            @completed="(res) => { console.debug('Braintree payment completed', res) }"
          />
        </div>
        <div v-else class="text-gray-400">Initializing payment...</div>
      </div>
    </div>

    <div class="flex items-center justify-between mt-6">
      <div>
        <button v-if="step > 1" class="btn-outline mr-3" @click="prevStep">Back</button>
      </div>
      <div class="flex items-center">
        <button
          v-if="step < 4"
          :class="['btn-primary', { 'btn-disabled': !canProceed } ]"
          :disabled="!canProceed"
          @click="nextStep"
          :title="!canProceed ? 'Please fill address line 1, city and country to proceed.' : ''"
        >
          Next
        </button>
        <button
          v-if="step === 4 && !verified"
          class="btn-primary ml-4"
          :disabled="checkoutLoading || !braintreeClientToken || !braintreeAmount || verifying"
          @click="onPay"
        >
          Verify
        </button>
        <button
          v-if="step === 4 && verified"
          class="btn-primary ml-4"
          :disabled="checkoutLoading || !braintreeClientToken || !braintreeAmount"
          @click="openSummary"
        >
          Pay
        </button>
        <button
          v-else-if="step >= 4"
          class="btn-primary ml-4"
          :disabled="checkoutLoading || !priceId"
          @click="focusDropin"
        >
          Open Payment
        </button>
      </div>
    </div>

    <!-- Summary / confirmation modal -->
    <div v-if="showSummary" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50"></div>
      <div class="bg-dark-900 border border-dark-700 rounded-lg w-[640px] max-w-[95vw] p-6 z-10">
        <h3 class="text-lg font-semibold text-white">Order summary</h3>
        <div class="mt-4 space-y-4">
          <div class="p-4 bg-dark-800 border border-dark-700 rounded">
            <div class="text-sm text-gray-400">Plan Details:</div>
            <div class="text-white font-semibold">{{ selected?.name }} - {{ formatPeriod(selected?.period || selected?._raw?.interval || selected?.interval) }}</div>
            <div class="text-white text-2xl font-bold">{{ fmtPrice(selected?.price || selected?.price_amount, selected?.currency || selected?.price_currency) }}</div>
          </div>
          <div class="p-4 bg-dark-800 border border-dark-700 rounded">
            <div class="text-sm text-gray-400">Address Details:</div>
            <div class="text-white">{{ billing.address.line1 }} {{ billing.address.line2 }}</div>
            <div class="text-white">{{ billing.address.city }} {{ billing.address.zip }}</div>
            <div class="text-white">{{ billing.address.country }}</div>
          </div>
          <div class="p-4 bg-dark-800 border border-dark-700 rounded">
            <div class="text-sm text-gray-400">Card Details:</div>
            <div class="text-white" v-if="paymentPayload">Name on the card: {{ paymentPayload?.details?.cardholderName || billing.name }}</div>
            <div class="text-white" v-if="paymentPayload">Card: ************{{ paymentPayload?.details?.lastFour || (paymentPayload?.description || '').split('ending in ').pop() }}</div>
            <div class="text-white">Expiry: {{ paymentPayload?.details?.expirationMonth || '' }}/{{ paymentPayload?.details?.expirationYear || '' }}</div>
          </div>
        </div>
        <div class="mt-6 flex justify-end gap-3">
          <button class="btn-outline" :disabled="checkoutLoading" @click="showSummary = false">Cancel</button>
          <button class="btn-primary" :disabled="checkoutLoading" @click="confirmPayment">
            <template v-if="checkoutLoading">
              <span class="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin inline-block mr-2"></span>
              Processing...
            </template>
            <template v-else>Complete order</template>
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Generic message modal -->
  <div v-if="showMessage" class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="absolute inset-0 bg-black/50" @click="showMessage = false"></div>
    <div class="bg-dark-900 border border-dark-700 rounded-lg w-[480px] max-w-[95vw] p-6 z-10">
      <div class="flex items-start gap-4">
        <UIcon :name="messageIcon" class="w-6 h-6 text-primary-400 mt-1" />
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-white">{{ messageTitle }}</h3>
          <p class="text-gray-300 mt-2">{{ messageText }}</p>
          <p v-if="messageDetails" class="text-gray-400 mt-2 text-sm">{{ messageDetails }}</p>
        </div>
      </div>
      <div class="mt-6 flex justify-end">
        <button class="btn-primary" @click="showMessage = false">OK</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useAuthStore } from '~/stores/auth/index'
import { usePricingStore } from '~/stores/pricing'
import BraintreeDropin from '~/components/BraintreeDropin.vue'
import { ref as vueRef } from 'vue'
import { useRuntimeConfig } from '#app'
import { deriveFeatures } from '~/utils/pricingHelpers'
import { usePaymentsStore } from '~/stores/payments'

const payments = usePaymentsStore()

const props = defineProps<{ orgId?: string; selectedPlan?: any }>()
const emit = defineEmits(['change-plan', 'order-success'])

const auth = useAuth()
const authStore = useAuthStore()
const pricing = usePricingStore()
const config = useRuntimeConfig()
const siteKey = config.public?.chargebeePublishableKey

const step = ref(1)
const selected = ref<any | null>(null)
const billing = ref({
  name: '',
  email: '',
  phone: '',
  taxId: '',
  address: { line1: '', line2: '', city: '', state: '', zip: '', country: '' },
})
const checkoutLoading = ref(false)
const priceId = ref<string | null>(null)
const lastError = ref<string | null>(null)
const braintreeClientToken = ref<string | null>(null)
const braintreeAmount = ref<number | null>(null)
const braintreeRef = vueRef<any | null>(null)
const verifying = ref(false)
const verified = ref(false)
const showSummary = ref(false)
const paymentPayload = ref<any | null>(null)
const showMessage = ref(false)
const messageTitle = ref('')
const messageText = ref('')
const messageDetails = ref<string | null>(null)
const messageType = ref<'info'|'success'|'error'|'warning'>('info')

function showAlert(title: string, text: string, details: string | null = null, type: 'info'|'success'|'error'|'warning' = 'info') {
  messageTitle.value = title
  messageText.value = text
  messageDetails.value = details
  messageType.value = type
  showMessage.value = true
}

const messageIcon = computed(() => {
  const t = messageType.value
  if (t === 'success') return 'heroicons:check-circle'
  if (t === 'error') return 'heroicons:exclamation-triangle'
  if (t === 'warning') return 'heroicons:exclamation-triangle'
  return 'heroicons:information-circle'
})

const cbPlanId = computed(() => {
  if (!selected.value) return null
  const raw = selected.value._raw || selected.value.raw || selected.value
  return raw?.chargebee_plan_id || raw?.price_id || raw?.priceId || selected.value?.chargebee_plan_id || selected.value?.price_id || selected.value?.priceId || selected.value?.id || null
})

const plans = computed(() => pricing.plans)

function formatPeriod(p: any) {
  const s = (p && String(p) || '').toString().toLowerCase()
  if (!s) return ''
  if (s === 'year' || s === 'yearly') return 'Yearly'
  if (s === 'month' || s === 'monthly') return 'Monthly'
  return String(p).charAt(0).toUpperCase() + String(p).slice(1)
}

onMounted(async () => {
  // Prefill billing from auth profile if available
  await auth.checkAuth()
  billing.value.name = authStore.user?.name || auth.user?.name || ''
  billing.value.email = authStore.user?.email || auth.user?.email || ''
  billing.value.phone = authStore.user?.contact_number || auth.user?.contact_number || ''

  // If a selectedPlan prop is provided, pre-select it (do NOT auto-advance; show summary on step 1)
  if (props.selectedPlan) {
    selected.value = props.selectedPlan
    // keep step at 1 so user sees the selected plan summary before proceeding
  }
})

async function createHostedPage() {
  // Ensure we have a selected plan. Try prop or pricing store as fallback.
  if (!selected.value) {
    if (props.selectedPlan) selected.value = props.selectedPlan
    else {
      // try to match any known plan from pricing store (first match)
      const maybe = plans.value && plans.value.length ? plans.value[0] : null
      if (maybe) selected.value = maybe
    }
  }

  if (!selected.value) {
    showAlert('No plan selected', 'Please choose a plan before proceeding.', null, 'warning')
    return false
  }

  checkoutLoading.value = true
  try {
    // For native Drop-in we do not create a hosted page. Instead extract the price id from selected plan
    const raw = selected.value?._raw || selected.value.raw || selected.value
    const candidate =
      raw?.chargebee_plan_id || raw?.price_id || raw?.priceId || raw?.id || selected.value?.id
    console.debug('createHostedPage selected raw:', raw, 'candidate price id:', candidate)
    if (!candidate) throw new Error('No price id available for selected plan')
    priceId.value = String(candidate)
    // determine amount from selected plan price if available
    const amt = Number((selected.value && (selected.value.price || selected.value.price_amount)) || 0)
    braintreeAmount.value = isFinite(amt) && amt > 0 ? amt : null

    // prefer cbPlanId for logging
    console.debug('createHostedPage resolved cbPlanId:', cbPlanId.value)

    // fetch client token for Braintree via payments store
    try {
      const resp = await payments.getClientToken()
      if (resp && resp.success && resp.clientToken) braintreeClientToken.value = resp.clientToken
      else {
        console.warn('Failed to fetch braintree client token', resp)
        braintreeClientToken.value = null
      }
    } catch (e) {
      console.warn('Failed to load braintree client token', e)
      braintreeClientToken.value = null
    }

    // advance to payment step (step 4)
    step.value = 4
    lastError.value = null
    return true
  } catch (err: any) {
    const msg = err?.message || 'Failed to initialize checkout'
    console.warn('createHostedPage error', err)
    lastError.value = msg
    showAlert('Checkout initialization failed', msg, null, 'error')
    return false
  } finally {
    checkoutLoading.value = false
  }
}

function selectPlan(p: any) {
  selected.value = p
  // open wizard at billing step
  step.value = 2
}

function onDropinError(err: any) {
  console.warn('Chargebee dropin error', err)
  lastError.value = err?.message || (err && err.error && err.error.message) || 'Payment initialization failed'
}

function onDropinReady() {
  console.debug('Chargebee drop-in ready')
}

function emitChangePlan() {
  emit('change-plan')
}

function prevStep() {
  if (step.value > 1) step.value--
}
async function nextStep() {
  if (step.value === 1) {
    // Plans -> go to billing details
    step.value = 2
    return
  }
  if (step.value === 2) {
    // Billing details -> go to billing address
    step.value = 3
    return
  }
  if (step.value === 3) {
    // Billing address -> initialize drop-in and go to payment (step 4)
    const ok = await createHostedPage()
    if (!ok) {
      // failed to init dropin; keep on step 3 and show error
      return
    }
    return
  }
}

async function onPay() {
  // Trigger verification to get payment payload/nonce and run 3DS
  if (!braintreeRef.value || typeof braintreeRef.value.verifyPayment !== 'function') {
    const msg = 'Payment component not ready for verification'
    console.warn(msg)
    lastError.value = msg
    return
  }
  try {
    verifying.value = true
    const payload = await braintreeRef.value.verifyPayment()
    console.debug('verification payload', payload)
    paymentPayload.value = payload
    verified.value = true
  } catch (e: any) {
    console.warn('verification error', e)
    lastError.value = e?.message || String(e)
    verified.value = false
  } finally {
    verifying.value = false
  }
}

function openSummary() {
  // require verified payload
  if (!paymentPayload.value) {
    lastError.value = 'No payment verified yet. Please verify card first.'
    return
  }
  showSummary.value = true
}

async function confirmPayment() {
  if (!braintreeRef.value || typeof braintreeRef.value.submitPayment !== 'function') {
    lastError.value = 'Payment component not ready'
    return
  }
  try {
    // keep modal open and show loading state
    checkoutLoading.value = true
    const res = await braintreeRef.value.submitPayment()
    console.debug('Braintree payment completed', res)
    // call complete-order API to persist order
    try {
      const body = {
        transaction: res?.data || res,
        plan_id: cbPlanId.value,
        billing: billing.value,
        org_id: props.orgId || authStore.user?.org_id || auth.user?.org_id || null,
      }
      const resp = await payments.completeOrder(body)
      console.debug('complete-order response', resp)
    } catch (e) {
      console.warn('complete-order failed', e)
    }
    // only close modal after success
    showSummary.value = false
    // emit event so parent modals can adjust visibility
    emit('order-success', { title: 'Payment complete', message: 'Subscription should appear in Chargebee shortly.' })
    showAlert('Payment complete', 'Subscription should appear in Chargebee shortly.', null, 'success')
  } catch (e: any) {
    console.warn('submitPayment error', e)
    lastError.value = e?.message || String(e)
  } finally {
    checkoutLoading.value = false
  }
}

const canProceed = computed(() => {
  if (step.value === 1) return !!selected.value
  if (step.value === 2) return !!billing.value.name && !!billing.value.email
  if (step.value === 3)
    return (
      !!billing.value.address.line1 &&
      !!billing.value.address.city &&
      !!billing.value.address.country
    )
  return true
})

function focusDropin() {
  // scroll to dropin container if present
  const el = document.querySelector('[data-chargebee-dropin]') as HTMLElement | null
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // try to focus first interactive element inside
    const input = el.querySelector('input, button, iframe') as HTMLElement | null
    if (input) input.focus()
  }
}

function fmtPrice(v: any, currency = 'USD') {
  if (!v && v !== 0) return 'Contact Sales'
  const n = Number(v)
  if (!isFinite(n) || n === 0) return 'Contact Sales'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n)
}

async function confirmCheckout() {
  if (!selected.value) return
  checkoutLoading.value = true
  try {
    // Switch to native Drop-in flow instead of hosted page
    const ok = await createHostedPage()
    if (!ok) throw new Error('Failed to initialize native payment flow')
    // advance to payment (createHostedPage handles setting step)
  } catch (err: any) {
    showAlert('Checkout failed', err?.message || 'Checkout failed', null, 'error')
  } finally {
    checkoutLoading.value = false
  }
}
</script>

<style scoped>
.input {
  background: transparent;
  border: 1px solid #2d3748;
  padding: 0.5rem 0.75rem;
  color: #e6edf3;
  border-radius: 6px;
}
.btn-primary {
  background-color: #2563eb;
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 6px;
}
.btn-outline {
  background: transparent;
  color: #e6edf3;
  border: 1px solid #374151;
  padding: 0.5rem 1rem;
  border-radius: 6px;
}
.card {
  background: #0f1724;
  border: 1px solid #1f2937;
  border-radius: 8px;
}
.btn-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-primary[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn-outline[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
