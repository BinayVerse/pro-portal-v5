import { ChargeBee } from 'chargebee-typescript'

const runtimeConfig = useRuntimeConfig()

// ✅ Configure Chargebee
const chargebee = new ChargeBee()
chargebee.configure({
  site: runtimeConfig.chargebeeSite ?? '',
  api_key: runtimeConfig.chargebeeApiKey ?? '',
  product_catalog_version: runtimeConfig.chargebeeProductCatalogVersion ?? '2.0',
})

// =============================
// 🚀 Product Catalog (Items, Prices, Families)
// =============================

export async function createProductFamily(id: string, name: string, description: string) {
  try {
    const result = await chargebee.item_family.create({ id, name, description }).request()
    return { status: 'Success', statusCode: 200, data: result.item_family }
  } catch (error: any) {
    return handleError(error)
  }
}

export async function createItem(itemId: string, itemFamilyId: string, name: string, description: string) {
  try {
    const result = await chargebee.item.create({
      id: itemId,
      item_family_id: itemFamilyId,
      name,
      description,
      type: 'plan',
      enabled_in_portal: true,
    }).request()
    return { status: 'Success', statusCode: 200, data: result.item }
  } catch (error: any) {
    return handleError(error)
  }
}

export async function createItemPrice(
  priceId: string,
  itemId: string,
  name: string,
  price: number,
  currencyCode: string,
  period: number,
  periodUnit: 'month' | 'year'
) {
  try {
    const result = await chargebee.item_price.create({
      id: priceId,
      item_id: itemId,
      name,
      price,
      currency_code: currencyCode,
      period,
      period_unit: periodUnit,
    }).request()
    return { status: 'Success', statusCode: 200, data: result.item_price }
  } catch (error: any) {
    return handleError(error)
  }
}

// =============================
// 🚀 Subscription Management (v2)
// =============================

export async function createSubscription(
  params: {
    customer?: { id?: string; email?: string; first_name?: string; last_name?: string }
    itemPriceId?: string
    quantity?: number
    trialEnd?: number
    subscription_items?: { item_price_id: string; quantity: number; unit_price?: number }[]
    amount?: number // amount in cents
    gwToken?: string
    vaultToken?: string
  },
  customerId?: string
) {
  try {
    const payload: any = {
      customer: params.customer || (customerId ? { id: customerId } : undefined),
    }

    // Build subscription items, prefer explicit subscription_items
    if (params.subscription_items) {
      payload.subscription_items = params.subscription_items.map((it) => ({ ...it }))
    } else if (params.itemPriceId) {
      const item: any = { item_price_id: params.itemPriceId, quantity: params.quantity || 1 }
      if (typeof params.amount === 'number') {
        // Chargebee expects unit_price in cents
        item.unit_price = Math.round(params.amount)
      }
      payload.subscription_items = [item]
    }

    if (params.trialEnd) payload.trial_end = params.trialEnd

    // If a gateway token (e.g. Braintree nonce) is provided, try to create a temporary payment source
    // and attach it to the subscription using payment_source_id
    if (params.gwToken) {
      let psPayload: any = null
      try {
        const runtimeConfig = useRuntimeConfig()
        // Attempt to create a payment source using the temporary token
        // Note: SDK method name may vary; using payment_source.create_using_temp_token if available
        if ((chargebee as any).payment_source && typeof (chargebee as any).payment_source.create_using_temp_token === 'function') {
          psPayload = {
            tmp_token: params.gwToken,
            // prefer chargebeeGatewayKey (configured in nuxt.config) but allow legacy names
            gateway_account_id: runtimeConfig.chargebeeGatewayKey || undefined,
            customer_id: payload.customer?.id,
            type: 'card'
          }
          try { console.log('Chargebee: creating payment source with payload (no type):', JSON.stringify(psPayload)) } catch (e) { }

          // First attempt: without explicit type — Chargebee may infer type from gateway_account_id/tmp_token
          try {
            const psResp = await (chargebee as any).payment_source.create_using_temp_token(psPayload).request()
            const paymentSourceId = psResp?.payment_source?.id || psResp?.id || undefined
            try { console.log('💳 Full payment source response (temp_token):', JSON.stringify(psResp, null, 2)) } catch (e) { }
            try { console.log('✅ Payment source created (temp_token):', psResp?.payment_source) } catch (e) { }
            if (paymentSourceId) {
              payload.payment_source_id = paymentSourceId
              // Try to set as preferred payment source for the customer to ensure it's used for billing
              try {
                const custId = payload.customer?.id
                if (custId && (chargebee as any).customer && typeof (chargebee as any).customer.update === 'function') {
                  await (chargebee as any).customer.update(custId, { preferred_payment_source_id: paymentSourceId }).request()
                  try { console.log('Set preferred_payment_source_id on customer', custId, paymentSourceId) } catch (e) { }

                  // Retrieve customer to confirm payment sources
                  try {
                    const customerResp = await (chargebee as any).customer.retrieve(custId).request()
                    try { console.log('Customer payment sources after attach:', JSON.stringify(customerResp?.customer?.payment_sources || customerResp?.payment_sources || null, null, 2)) } catch (e) { }
                  } catch (e) { console.warn('Failed to retrieve customer after setting preferred payment source', e) }
                }
              } catch (e) { console.warn('Failed to set preferred payment source on customer', e) }
            }
          } catch (firstErr) {
            // If Chargebee complains about 'type' not in allowed values, try with type derived from gateway key or fallback to 'braintree'
            const errMsg = String(firstErr?.message || firstErr?.error_msg || '')
            if (errMsg.toLowerCase().includes('type') && errMsg.toLowerCase().includes('not in allowed values')) {
              const inferredType = (runtimeConfig.chargebeeGatewayType || 'braintree')
              const psPayloadWithType = { ...psPayload, type: inferredType }
              try { console.log('Chargebee: retrying payment source creation with type:', inferredType) } catch (e) { }
              const psResp2 = await (chargebee as any).payment_source.create_using_temp_token(psPayloadWithType).request()
              const paymentSourceId2 = psResp2?.payment_source?.id || psResp2?.id || undefined
              if (paymentSourceId2) payload.payment_source_id = paymentSourceId2
            } else {
              throw firstErr
            }
          }
        }
      } catch (e) {
        // log payload and error to help diagnose missing required fields (e.g. type)
        console.log('Chargebee: payment source creation via temp token failed', { payload: psPayload, error: e })
      }
    }

    // If a vaulted token is provided (from Braintree vault), create a payment source using token_id
    // If a vaulted token is provided (from Braintree vault), create a payment source using token_id
    if (params.vaultToken) {
      try {
        const runtimeConfig = useRuntimeConfig()
        const vaultPayload: any = {
          token_id: params.vaultToken,
          gateway_account_id: runtimeConfig.chargebeeGatewayKey || runtimeConfig.chargebeeGatewayAccountId || undefined,
          customer_id: payload.customer?.id,
          type: 'card',
        }

        console.log('💳 Creating Chargebee payment source using vaulted token:', JSON.stringify(vaultPayload, null, 2))

        // ✅ Use PC2-compatible method
        if (
          (chargebee as any).payment_source &&
          typeof (chargebee as any).payment_source.create_using_token === 'function'
        ) {
          const psResp = await (chargebee as any).payment_source.create_using_token(vaultPayload).request()
          const paymentSourceId = psResp?.payment_source?.id || psResp?.id || undefined

          console.log('✅ Full payment source response (vault token):', JSON.stringify(psResp, null, 2))
          console.log('✅ Payment source created successfully:', psResp?.payment_source)

          if (paymentSourceId) {
            payload.payment_source_id = paymentSourceId

            // ✅ Set as preferred payment source for the customer
            const custId = payload.customer?.id
            if (
              custId &&
              (chargebee as any).customer &&
              typeof (chargebee as any).customer.update === 'function'
            ) {
              await (chargebee as any).customer.update(custId, {
                preferred_payment_source_id: paymentSourceId,
              }).request()

              console.log('Set preferred_payment_source_id on customer', custId, paymentSourceId)
            }
          }
        } else {
          console.warn('⚠️ Chargebee SDK: payment_source.create_using_token not available.')
        }
      } catch (e) {
        console.error('❌ Chargebee: payment source creation via vaulted token failed', e)
      }
    }


    // If site is configured to use Product Catalog v2, use explicit API v2 endpoint with form params
    const runtimeConfig = useRuntimeConfig()
    const pcVersion = (runtimeConfig.chargebeeProductCatalogVersion || '').toString()
    if (pcVersion.startsWith('2')) {
      try {
        // Use SDK PC2 flow: create_with_items
        const cbGatewayAccount = runtimeConfig.chargebeeGatewayKey || runtimeConfig.chargebeeGatewayAccountId || process.env.NUXT_CHARGEBEE_GATEWAY_KEY || process.env.CHARGEBEE_GATEWAY_ACCOUNT_ID || undefined
        const customerIdToUse = payload.customer?.id || customerId || undefined

        // Build subscription items for SDK
        const sdkItems: any[] = []
        if (payload.subscription_items && Array.isArray(payload.subscription_items) && payload.subscription_items.length) {
          for (const it of payload.subscription_items) {
            sdkItems.push({
              item_price_id: it.item_price_id || it.price_id || it.itemPriceId,
              unit_price: typeof it.unit_price !== 'undefined' ? Math.round(it.unit_price) : undefined,
              quantity: it.quantity || 1,
            })
          }
        } else if (params.itemPriceId) {
          sdkItems.push({
            item_price_id: params.itemPriceId,
            unit_price: typeof params.amount === 'number' ? Math.round(params.amount) : undefined,
            quantity: params.quantity || 1,
          })
        }

        // Prepare payment_intent/gw_token — only use gwToken when vaultToken is NOT present
        const gwToken = params.gwToken || undefined

        const sdkPayload: any = {
          subscription_items: sdkItems,
          auto_collection: 'on',
        }

        if (payload.payment_source_id) {
          sdkPayload.payment_source_id = payload.payment_source_id
        } else if (gwToken) {
          sdkPayload.payment_intent = {
            gateway_account_id: cbGatewayAccount,
            payment_method_type: 'card',
            gw_token: gwToken,
          }
        }

        try { console.log('Chargebee PC2 SDK create_with_items for customer:', customerIdToUse, 'payload:', JSON.stringify(sdkPayload)) } catch (e) { }

        const verifyCustomer = await (chargebee as any).customer.retrieve(customerIdToUse).request()
        console.log('👤 Customer payment sources before subscription:', JSON.stringify(verifyCustomer?.customer?.payment_source, null, 2))
        const result = await (chargebee as any).subscription.create_with_items(customerIdToUse, sdkPayload).request()
        console.log('✅ Chargebee subscription created (PC2 SDK):', result)
        return { status: 'Success', statusCode: 200, subscription: result }
      } catch (error: any) {
        console.error('❌ Chargebee PC2 error:', error)
        return { status: 'Error', statusCode: error?.http_status_code || 500, error }
      }
    }

    // fallback: use SDK for non-PC2 sites
    const response = await chargebee.subscription.create(payload).request()
    return { status: 'Success', subscription: response.subscription, data: response }
  } catch (err: any) {
    try { console.log('Chargebee subscription creation failed - payload:', JSON.stringify(payload), 'params:', JSON.stringify(params), 'error:', JSON.stringify(err)) } catch (ee) { }
    console.error('Chargebee subscription creation failed:', err)
    return {
      status: 'Error',
      statusCode: err?.http_status_code || 400,
      error: err?.message || err?.error_msg || 'Unknown error',
    }
  }
}

// ✅ Retrieve
export async function getSubscriptionById(subscriptionId: string) {
  try {
    const result = await chargebee.subscription.retrieve(subscriptionId).request()
    return { status: 'Success', statusCode: 200, data: result.subscription }
  } catch (error: any) {
    return handleError(error)
  }
}

// ✅ Cancel
export async function cancelSubscription(subscriptionId: string, endOfTerm = true) {
  try {
    const result = await chargebee.subscription.cancel(subscriptionId, { end_of_term: endOfTerm }).request()
    return { status: 'Success', statusCode: 200, data: result.subscription }
  } catch (error: any) {
    return handleError(error)
  }
}

// ✅ Helper
function handleError(error: any) {
  return {
    status: 'Error',
    statusCode: error.http_status_code || 500,
    error: error.message || 'Unknown error occurred',
  }
}
