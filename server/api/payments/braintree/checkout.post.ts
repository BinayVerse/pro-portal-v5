import { defineEventHandler, readBody } from 'h3' // uses chargebee-typescript wrapper
import { createSubscription } from '~/server/utlis/chargebee'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // 🧩 Braintree credentials
  const merchantId = config.braintreeMerchantId || process.env.BRAINTREE_MERCHANT_ID
  const publicKey = config.braintreePublicKey || process.env.BRAINTREE_PUBLIC_KEY
  const privateKey = config.braintreePrivateKey || process.env.BRAINTREE_PRIVATE_KEY
  const envName = config.braintreeEnvironment || process.env.BRAINTREE_ENVIRONMENT || 'sandbox'

  if (!merchantId || !publicKey || !privateKey) {
    return { success: false, error: 'Braintree not configured on server (missing keys)' }
  }

  const body = await readBody(event)
  const { nonce, amount, plan_id, name, email, phone } = body || {}

  if (!nonce) return { success: false, error: 'Missing payment nonce' }
  if (!amount) return { success: false, error: 'Missing amount' }

  try {
    // ✅ Setup Braintree
    const braintree = await import('braintree')
    const env =
      envName === 'production' ? braintree.Environment.Production : braintree.Environment.Sandbox

    const gateway = new braintree.BraintreeGateway({
      environment: env,
      merchantId,
      publicKey,
      privateKey,
    })

    const saleRequest = {
      amount: String(amount),
      paymentMethodNonce: nonce,
      options: { submitForSettlement: true, storeInVaultOnSuccess: true },
      customer: {
        firstName: (name || '').split(' ')[0] || null,
        lastName: (name || '').split(' ').slice(1).join(' ') || null,
        email: email || null,
      },
    }

    // 💳 Create Braintree Transaction
    const result = await gateway.transaction.sale(saleRequest)
    if (!result?.success) {
      console.warn('Braintree transaction failed', result)
      return { success: false, error: result?.message || 'Transaction failed', data: result }
    }

    // console.log('Braintree transaction succeeded:', result.transaction)

    // ⚡ After successful Braintree payment — sync to Chargebee
    try {
      const site = config.chargebeeSite
      const apiKey = config.chargebeeApiKey

      if (!site || !apiKey) {
        console.warn('Chargebee configuration missing — skipping Chargebee sync')
        return { success: true, data: result }
      }

      console.log(`Chargebee integration active for site: ${site}`)

      // ✅ Step 1: Create Customer in Chargebee (via API v2)
      const customerResp = await fetch(`https://${site}.chargebee.com/api/v2/customers`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email: email || '',
          first_name: name?.split(' ')[0] || '',
          last_name: name?.split(' ').slice(1).join(' ') || '',
          phone: phone || '',
        }).toString(),
      })

      const customerData = await customerResp.json()
      const cbCustomerId =
        customerData?.customer?.id || customerData?.id || null

      if (!customerResp.ok || !cbCustomerId) {
        console.warn('Chargebee customer creation failed:', customerData)
        return { success: true, data: result } // still success for payment
      }

      console.log('✅ Chargebee customer created:', cbCustomerId)

      // ✅ Step 2: Create Subscription via chargebee-typescript
      if (plan_id && cbCustomerId) {
        // Expect plan_id to be the Chargebee price id (text). Use it directly.
        const cbPlanId = plan_id ? String(plan_id) : null

        if (cbPlanId) {
          // Build subscription object matching server/utlis/chargebee.createSubscription(subscription, customerId)
          // Extract vaulted payment method token from Braintree transaction (storeInVaultOnSuccess=true)

          const vaultedToken =
            result?.transaction?.creditCard?.token ||
            result?.transaction?.paymentMethodToken ||
            null

          const subscriptionObj: any = {
            itemPriceId: cbPlanId,
            amount: Math.round(Number(amount) * 100), // in cents
          }

          // Always pass the original Braintree nonce so Chargebee can create a temporary payment source
          if (nonce) {
            subscriptionObj.gwToken = nonce
            console.log(`💳 Using Braintree nonce for Chargebee gwToken: ${nonce}`)
          }

          if (vaultedToken) {
            subscriptionObj.vaultToken = vaultedToken
            console.log(`✅ Using vaulted token for Chargebee: ${vaultedToken}`)
          } else {
            console.warn('⚠️ No vaulted token found — continuing with gwToken only')
          }

          console.log(`Creating Chargebee subscription for customer ${cbCustomerId} with item ${cbPlanId} and vaultedToken:${vaultedToken ? 'present' + vaultedToken : 'missing'} gwToken:${nonce ? 'present' : 'missing'}`)
          console.log(`Creating Chargebee subscription for customer ${cbCustomerId} with payload ${JSON.stringify(subscriptionObj)}`)

          const cbResp = await createSubscription(subscriptionObj, cbCustomerId)

          if (cbResp && cbResp.status === 'Success') {
            console.log('✅ Chargebee subscription created successfully:', cbResp.subscription)
          } else {
            console.warn('⚠️ Chargebee subscription failed:', cbResp)
          }
        } else {
          console.warn('Missing Chargebee plan ID, skipping subscription creation')
        }
      }
    } catch (err) {
      console.warn('Chargebee post-payment integration failed:', err)
    }

    return { success: true, data: result }
  } catch (err: any) {
    console.error('Braintree checkout error:', err)
    return { success: false, error: err?.message || 'Payment processing failed' }
  }
})
