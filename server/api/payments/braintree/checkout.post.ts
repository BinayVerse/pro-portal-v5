import { defineEventHandler, readBody, setResponseStatus } from 'h3' // uses chargebee-typescript wrapper
import { createChargebeeCustomer, createSubscription } from '~/server/utlis/chargebee'
import { z } from 'zod'

const CheckoutValidation = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional().nullable().or(z.literal('')),
  country: z.string().min(1),
  countryCode: z.string().min(2).max(4),
  region: z.string().min(1),
  city: z.string().min(1),
  zipcode: z.string().min(1),
  addressLine1: z.string().min(1),
  addressLine2: z.string().min(1),
  phoneNumber: z.string().min(1),
  amount: z.number().min(1),
  email: z.string().email(),
  subscriptionTypeId: z.string().min(1),
  planType: z.enum(['monthly', 'yearly']),
  currencyCode: z.enum(['INR', 'EUR', 'USD']),
  gstNumber: z.string().optional().nullable().or(z.literal('')),
  couponCode: z.string().optional().nullable().or(z.literal('')),
  paidAmount: z.number().min(1).optional(),
  couponDurationType: z.string().optional().nullable().or(z.literal('')),
  gwToken: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  const merchantId = config.braintreeMerchantId
  const publicKey = config.braintreePublicKey
  const privateKey = config.braintreePrivateKey
  const envName = config.braintreeEnvironment || 'sandbox'

  if (!merchantId || !publicKey || !privateKey) {
    return { success: false, error: 'Braintree not configured on server (missing keys)' }
  }

  const body = await readBody(event)

  // Normalize incoming payload: convert numeric-like strings to numbers and strip explicit nulls for optional numeric fields
  const params: any = { ...body }
  if (params.amount != null) params.amount = Number(params.amount)
  if (Object.prototype.hasOwnProperty.call(params, 'paidAmount')) {
    if (params.paidAmount == null) delete params.paidAmount
    else params.paidAmount = Number(params.paidAmount)
  }

  // Remove other empty string fields set to null that would fail strict zod checks
  for (const k of Object.keys(params)) {
    if (params[k] === '') params[k] = undefined
  }

  // const parsed = CheckoutValidation.safeParse(params)
  // if (!parsed.success) {
  //   const msg = parsed.error.errors
  //     .map((e) => `${(e.path && e.path.length ? e.path.join('.') : 'value')}: ${e.message}`)
  //     .join('; ')
  //   throw new CustomError(`Invalid input: ${msg}`, 400)
  // }

  const orderDetails = params

  console.log('Processing Braintree checkout with data:', orderDetails)

  try {
    try {
      const site = config.chargebeeSite
      const apiKey = config.chargebeeApiKey

      if (!site || !apiKey) {
        console.warn('Chargebee configuration missing — skipping Chargebee sync')
      }

      console.log(`Chargebee integration active for site: ${site}`)

      // ✅ Step 1: Create Customer in Chargebee
      const { customerId, status, error: errorMessage, statusCode: charStatusCode } = await createChargebeeCustomer(orderDetails)

      if (status === 'Error') {
        console.warn('Error while trying to create customer details:', JSON.stringify(errorMessage, null, 2))
        throw new CustomError(`Error while trying to create customer details: ${errorMessage}`, charStatusCode)
      }

      orderDetails.customerId = customerId
      if (status === 'Success') {
        //  ✅ update customer with GST on DB
        const { error } = await updateOrganizationCustomer(event, customerId, orderDetails.gstNumber)
        if (error)
          throw new CustomError(`Error while trying to update customer details: ${error}`, 400)
        console.log('✅ Chargebee customer created:', customerId)
      }
      else { throw new CustomError(`Error while trying to create customer on chargbee: ${errorMessage.message}`, 404) }

      // ✅ Step 2: Create Subscription via chargebee-typescript
      const cbPlanId = orderDetails.subscriptionTypeId ? String(orderDetails.subscriptionTypeId) : null
      if (cbPlanId) {
        const subscriptionObj: any = {
          itemPriceId: cbPlanId,
          amount: Math.round(Number(orderDetails.amount) * 100), // in cents
          gwToken: params.gwToken,
        }
        if (orderDetails.couponCode) subscriptionObj.couponCode = orderDetails.couponCode
        if (orderDetails.paidAmount) subscriptionObj.paidAmount = orderDetails.paidAmount
        if (orderDetails.currencyCode) subscriptionObj.currencyCode = orderDetails.currencyCode
        if (orderDetails.planType) subscriptionObj.planType = orderDetails.planType

        console.log(`Creating Chargebee subscription for customer ${orderDetails.customerId} with payload ${JSON.stringify(subscriptionObj)}`)

        // insert billing details in DB
        const { error: errorInsertBilling } = await upsertBillingAddress(event, orderDetails)
        if (errorInsertBilling) {
          throw new CustomError(`Error while trying to insert billing address: ${errorInsertBilling}`, 400)
        }

        try {
          const { subscription: chargebeeSubscription, error: errorMessage, status: subStatus, statusCode: subStatusCode } = await createSubscription(subscriptionObj, orderDetails.customerId)

          if (subStatus === 'Error') {
            console.warn('Error while trying to create subscription details:', JSON.stringify(errorMessage, null, 2))
            throw new CustomError(`Error while trying to create subscription details: ${errorMessage}`, subStatusCode)
          }

          if (chargebeeSubscription && chargebeeSubscription.subscription) {
            console.log('✅ Chargebee subscription created successfully:', chargebeeSubscription)
            // Update Subscription details in DB
            const { error: errorUpdateSubscription } = await updateOrganizationSubscription(event, orderDetails.subscriptionTypeId, chargebeeSubscription.subscription.id, orderDetails)
            if (errorUpdateSubscription) {
              throw new CustomError(`Error while trying to update subscription details: ${errorUpdateSubscription}`, 400)
            }
          } else {
            console.warn('⚠️ Chargebee subscription failed:', chargebeeSubscription)
            throw new CustomError('Chargebee subscription failed', 500)
          }
        } catch (e) {
          console.warn('Chargebee subscription creation errored:', e)
          throw new CustomError('Chargebee subscription creation errored', 500)
        }
      } else {
        console.warn('Missing Chargebee plan ID, skipping subscription creation')
        throw new CustomError('Missing Chargebee plan ID, skipping subscription creation', 500)
      }
    } catch (err) {
      console.warn('Error while trying to create subscription:', err)
      throw new CustomError('Error while trying to create subscription!', 500)
    }

    setResponseStatus(event, 201)
    return {
      statusCode: 201,
      status: 'success',
      message: 'Payment processing completed successfully',
      data: orderDetails,
    }
  } catch (err: any) {
    console.error('Braintree checkout error:', err)
    if (err instanceof CustomError) {
      setResponseStatus(event, err.statusCode)
      return {
        statusCode: err.statusCode,
        status: 'error',
        message: err.message,
      }
    }
    setResponseStatus(event, 500)
    throw new CustomError(err?.message || 'Payment processing failed', 500)
  }
})
