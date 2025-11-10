<template>
  <div class="relative">
    <div
      class="w-full h-[70vh] bg-dark-900 rounded border border-dark-700 overflow-hidden p-4 relative"
    >
      <div ref="dropinContainer" class="w-full h-full"></div>
      <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-black/50">
        <div
          class="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"
        ></div>
      </div>
    </div>

    <div class="mt-3 flex items-center gap-3 justify-end">
      <div v-if="processing" class="text-sm text-gray-400">Processing payment...</div>
      <div v-if="error" class="text-sm text-red-400">{{ error }}</div>
    </div>

    <!-- 3DS small modal container -->
    <div v-if="show3DS" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/60" @click="on3DSOverlayClick"></div>
      <div class="bg-dark-900 border border-dark-700 rounded-lg w-[420px] max-w-[95vw] p-4 z-10">
        <div class="text-sm text-gray-300 mb-2">Card verification</div>
        <div ref="threeDSModal" class="w-full h-[60vh] overflow-hidden"></div>
        <div class="mt-3 text-right">
          <button class="btn-outline" @click="cancel3DS">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount } from 'vue'
const props = defineProps<{
  clientToken?: string | null
  amount?: number | null
  billing?: any
  planId?: string | null
}>()
const emit = defineEmits(['ready', 'error', 'completed'])

const dropinContainer = ref<HTMLElement | null>(null)
const threeDSModal = ref<HTMLElement | null>(null)
const show3DS = ref(false)
const loading = ref(true)
const processing = ref(false)
const error = ref<string | null>(null)
let instance: any = null

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (window && (window as any).braintree && (window as any).braintree.dropin) return resolve()
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Failed to load Braintree Drop-in script'))
    document.head.appendChild(s)
  })
}

import { usePaymentsStore } from '~/stores/payments'

const paymentsStore = usePaymentsStore()

import { nextTick } from 'vue'

async function init() {
  loading.value = true
  error.value = null
  try {
    let token: string | null = null
    if (props.clientToken) token = props.clientToken
    else {
      const resp = await paymentsStore.getClientToken()
      if (resp && resp.success && resp.clientToken) token = resp.clientToken
    }
    if (!token) throw new Error('Client token missing')

    await loadScript('https://js.braintreegateway.com/web/dropin/1.33.6/js/dropin.min.js')
    // Load 3D Secure library (used by Braintree for 3DS flows)
    await loadScript(
      'https://js.braintreegateway.com/web/3d-secure/1.6.0/js/three-d-secure.min.js',
    ).catch(() => {})

    const bt = (window as any).braintree
    if (!bt || !bt.dropin) throw new Error('Braintree dropin not available')

    // Ensure the container ref is present in the DOM
    await nextTick()
    if (!dropinContainer.value) throw new Error('Drop-in container not available')

    const options: any = {
      authorization: token,
      container: dropinContainer.value as any,
      card: { cardholderName: { required: false } },
      threeDSecure: {
        amount: props.amount ? String(props.amount) : '0.00',
        // Render 3DS challenge in our small modal instead of full-screen
        addFrame: (iframe: HTMLElement) => {
          try {
            if (threeDSModal.value) {
              threeDSModal.value.innerHTML = ''
              threeDSModal.value.appendChild(iframe)
              show3DS.value = true
            } else {
              // fallback: append to body
              document.body.appendChild(iframe)
            }
          } catch (e) {
            console.warn('Failed to add 3DS iframe to modal', e)
            try {
              document.body.appendChild(iframe)
            } catch (e) {}
          }
        },
        removeFrame: () => {
          try {
            if (threeDSModal.value) {
              threeDSModal.value.innerHTML = ''
            }
          } catch (e) {}
          show3DS.value = false
        },
      },
    }

    bt.dropin.create(options, (createErr: any, createdInstance: any) => {
      if (createErr) {
        console.error('braintree.create error', createErr)
        error.value = createErr?.message || String(createErr)
        emit('error', createErr)
        loading.value = false
        return
      }
      instance = createdInstance
      emit('ready')
      loading.value = false
    })
  } catch (e: any) {
    console.error('Braintree init failed', e)
    error.value = e?.message || String(e)
    emit('error', e)
    loading.value = false
  }
}

const verifiedNonce = ref<string | null>(null)
const lastPayload = ref<any | null>(null)

async function verifyPayment() {
  if (!instance) throw new Error('Drop-in instance not available')
  processing.value = true
  try {
    console.debug('Braintree.verifyPayment: requesting payment method for verification')
    const opts: any = {}
    if (props.amount) opts.threeDSecure = { amount: String(props.amount) }
    const payload = (await new Promise((resolve, reject) => {
      instance.requestPaymentMethod(opts, (err: any, result: any) => {
        if (err) return reject(err)
        resolve(result)
      })
    })) as any
    const nonce = payload && payload.nonce
    if (!nonce) throw new Error('No payment nonce returned for verification')
    verifiedNonce.value = nonce
    lastPayload.value = payload
    console.debug('Braintree.verifyPayment: got nonce', nonce, 'payload:', payload)
    emit('ready')
    return payload
  } catch (e: any) {
    console.error('Braintree verify error', e)
    error.value = e?.message || String(e)
    emit('error', e)
    throw e
  } finally {
    processing.value = false
  }
}

async function submitPayment() {
  if (!instance) throw new Error('Drop-in instance not available')
  processing.value = true
  try {
    let paymentMethodNonce: string | null = null
    // Always request a fresh payment method nonce to avoid reuse errors
    console.log('Braintree.submitPayment: requesting fresh payment method nonce')
    const payload = (await new Promise((resolve, reject) => {
      const opts: any = {}
      if (props.amount) opts.threeDSecure = { amount: String(props.amount) }
      instance.requestPaymentMethod(opts, (err: any, result: any) => {
        if (err) return reject(err)
        resolve(result)
      })
    })) as any
    paymentMethodNonce = payload && payload.nonce
    lastPayload.value = payload
    console.log('Braintree.submitPayment: got nonce', paymentMethodNonce, 'payload:', payload)

    if (!paymentMethodNonce) throw new Error('No payment nonce available')

    // send nonce to server to create transaction
    console.debug('Braintree.submitPayment: sending nonce to server', {
      amount: props.amount,
      plan_id: props.planId,
    })
    const resp = await paymentsStore.checkout({ nonce: paymentMethodNonce, amount: Number(props.amount || 0), plan_id: props.planId })
    if (!resp || !resp.success) {
      console.debug('Braintree.submitPayment: checkout failed', resp)
      throw new Error(resp?.error || 'Payment failed')
    }
    const data = resp.data
    console.debug('Braintree.submitPayment: server response', data)
    emit('completed', data)
    // Clear selected payment method so nonce cannot be reused
    try {
      if (instance && typeof instance.clearSelectedPaymentMethod === 'function') {
        instance.clearSelectedPaymentMethod()
        console.debug('Braintree: cleared selected payment method after success')
      }
    } catch (e) {
      console.warn('Failed to clear selected payment method', e)
    }

    // reset verification state
    verifiedNonce.value = null
    lastPayload.value = null
    return data
  } catch (e: any) {
    console.error('Braintree payment error', e)
    error.value = e?.message || String(e)
    emit('error', e)
    throw e
  } finally {
    processing.value = false
  }
}

function getPaymentPayload() {
  return lastPayload.value
}

onMounted(() => {
  init()
})

onBeforeUnmount(() => {
  try {
    if (instance && typeof instance.teardown === 'function') instance.teardown()
  } catch (e) {}
})

function cancel3DS() {
  try {
    show3DS.value = false
    if (threeDSModal.value) threeDSModal.value.innerHTML = ''
  } catch (e) {
    console.warn(e)
  }
}
function on3DSOverlayClick() {
  // allow user to cancel challenge overlay
  cancel3DS()
}

// expose submitPayment, verifyPayment and helpers so parent can trigger it
import { defineExpose } from 'vue'
defineExpose({ submitPayment, verifyPayment, cancel3DS, getPaymentPayload })
</script>

<style scoped>
.btn-primary {
  background: #2563eb;
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 6px;
}
/* Braintree Drop-in theming tweaks to better match app */
.braintree-dropin {
  background: transparent;
  color: #e6edf3;
}
.braintree-dropin .braintree-form__field label {
  color: #9ca3af;
}
.braintree-dropin .braintree-form__field input {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid #2d3748;
  color: #e6edf3;
}
.braintree-dropin .braintree-submit-button {
  background: #2563eb;
  color: #fff;
  border-radius: 6px;
}
.braintree-dropin .braintree-submit-button:disabled {
  opacity: 0.6;
}
</style>
