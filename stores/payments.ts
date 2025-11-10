import { handleError } from '~/utils/apiHandler'

export const usePaymentsStore = defineStore('payments', () => {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const getClientToken = async () => {
    isLoading.value = true
    error.value = null
    try {
      const res = await fetch('/api/payments/braintree/client-token')
      const text = await res.text()
      const data = text ? JSON.parse(text) : null
      if (!res.ok || !data?.success || !data.clientToken) {
        const msg = data?.error || 'Failed to fetch client token'
        throw new Error(msg)
      }
      return { success: true, clientToken: data.clientToken }
    } catch (err: any) {
      const msg = handleError(err, 'Failed to fetch client token')
      error.value = msg
      return { success: false, error: msg }
    } finally {
      isLoading.value = false
    }
  }

  const checkout = async (payload: { nonce: string; amount: number; plan_id?: string }) => {
    isLoading.value = true
    error.value = null
    try {
      const res = await fetch('/api/payments/braintree/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const text = await res.text()
      const data = text ? JSON.parse(text) : null
      if (!res.ok) {
        const msg = data?.error || 'Checkout failed'
        throw new Error(msg)
      }
      return { success: true, data }
    } catch (err: any) {
      const msg = handleError(err, 'Checkout failed')
      error.value = msg
      return { success: false, error: msg }
    } finally {
      isLoading.value = false
    }
  }

  const completeOrder = async (body: any) => {
    isLoading.value = true
    error.value = null
    try {
      const res = await fetch('/api/payments/complete-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const text = await res.text()
      const data = text ? JSON.parse(text) : null
      if (!res.ok) {
        const msg = data?.error || 'Complete order failed'
        throw new Error(msg)
      }
      return { success: true, data }
    } catch (err: any) {
      const msg = handleError(err, 'Complete order failed')
      error.value = msg
      return { success: false, error: msg }
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading: readonly(isLoading),
    error: readonly(error),
    getClientToken,
    checkout,
    completeOrder,
  }
})
