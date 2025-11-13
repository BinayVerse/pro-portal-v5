import { ChargeBee } from 'chargebee-typescript'
import { formatExpiryDate } from './helper'

const runtimeConfig = useRuntimeConfig()

// ✅ Configure Chargebee
const chargebee = new ChargeBee()
chargebee.configure({
  site: runtimeConfig.chargebeeSite ?? '',
  api_key: runtimeConfig.chargebeeApiKey ?? '',
  product_catalog_version: runtimeConfig.chargebeeProductCatalogVersion ?? 'v2',
})

// ***** Create customer with basic information we can add more details like billing address and stuff
export async function createChargebeeCustomer(orderDetails: any) {
  try {
    console.log('Creating Chargebee customer with details:', orderDetails)
    // const [cFirstName, cLastName] = orderDetails.cardHolderName.split(' ')
    const res = await chargebee.customer.create({
      email: orderDetails.email,
      first_name: orderDetails.firstName,
      last_name: orderDetails.lastName,
      phone: orderDetails.phoneNumber,
      company: orderDetails.orgName,
      billing_address: {
        first_name: orderDetails.firstName,
        last_name: orderDetails.lastName,
        email: orderDetails.email,
        phone: orderDetails.phoneNumber,
        line1: orderDetails.address,
        city: orderDetails.city,
        country: orderDetails.countryCode,
        zip: orderDetails.zipcode,
      },
    }).request()
    return { status: 'Success', statusCode: 200, customerId: res.customer.id }
  }
  catch (error: any) {
    return { status: 'Error', statusCode: error.statusCode, error }
  }
}

// **** Card details of customer
export async function getCustomerCardDetails(chargebeeCustomerId: string) {
  try {
    const cardDetails = await chargebee.card.retrieve(chargebeeCustomerId).request()
    // this one is not working as it is throwing error when card is not there in chargbee for that respective user
    // if (!cardDetails || !cardDetails.card)
    //   return { status: 200, data: {} }

    const firstName = cardDetails.card.first_name || ''
    const lastName = cardDetails.card.last_name || ''

    const response = {
      cardNumber: cardDetails.card.masked_number,
      expiryMonth: formatExpiryDate(cardDetails.card.expiry_month),
      expiryYear: cardDetails.card.expiry_year,
      gateway: cardDetails.card.gateway,
      cardType: cardDetails.card.card_type,
      status: cardDetails.card.status,
      fundingType: cardDetails.card.funding_type,
      cardHolderName: firstName + (lastName ? ` ${lastName}` : ''),
    }
    return { status: 200, data: response }
  }
  catch (error: any) {
    // we need to pass empty as we are getting error from chargbee when we don't have card detailes for that user there
    if (error.http_status_code === 404)
      return { status: 200, data: {} } // Return empty data if the card is not found

    return {
      status: error.http_status_code || 500,
      error: {
        message: `Error getting customer card information: ${error.message}`,
      },
    }
  }
}

// **** Delete customer card details
export async function deleteCustomerCardDetails(chargebeeCustomerId: string) {
  try {
    const response = await chargebee.card.delete_card_for_customer(chargebeeCustomerId).request()
    return { status: 200, data: response.customer.card_status }
  }
  catch (error: any) {
    return {
      status: error.http_status_code || 500,
      error: {
        message: `Error removing card details: ${error.message}`,
      },
    }
  }
}

// **** update Card details of customer
export async function updateCustomerCardDetails(cardDetails: any, chargebeeCustomerId: string) {
  try {
    const [cFirstName, cLastName] = cardDetails.cardHolderName.split(' ').length > 1
      ? cardDetails.cardHolderName.split(' ')
      : [cardDetails.cardHolderName, '']

    const response = await chargebee.card.update_card_for_customer(chargebeeCustomerId, {
      gateway_account_id: process.env.CHARGEBEE_GATEWAY_ACCOUNT_ID, // paypal gatway id
      first_name: cFirstName || '',
      last_name: cLastName || '',
      number: cardDetails.cardNumber,
      expiry_month: cardDetails.expiryMonth,
      expiry_year: cardDetails.expiryYear,
      cvv: cardDetails.securityCode,
    }).request()
    const res = {
      cardNumber: response.card.masked_number,
      expiryMonth: response.card.expiry_month,
      expiryYear: response.card.expiry_year,
      gateway: response.card.gateway,
      cardType: response.card.card_type,
      status: response.card.status,
      fundingType: response.card.funding_type,
      cardHolderName: `${cFirstName} ${cLastName}`,
    }
    return { status: 'Success', statusCode: 200, data: res }
  }
  catch (error: any) {
    return {
      status: error.http_status_code || 500,
      error: {
        message: `Error in updation customer card details: ${error.message}`,
      },
    }
  }
}

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

export async function createSubscription(subscription: any, customerId: string) {
  try {
    const runtimeConfig = useRuntimeConfig()
    const requestPayload: any = {
      payment_intent: {
        gateway_account_id: runtimeConfig.chargebeeGatewayKey || undefined,
        payment_method_type: 'card',
        gw_token: subscription.gwToken,
      },
      auto_collection: 'on'
    }

    // Build subscription items, prefer explicit subscription_items
    if (subscription.subscription_items) {
      requestPayload.subscription_items = subscription.subscription_items.map((it) => ({ ...it }))
    } else if (subscription.itemPriceId) {
      const item: any = { item_price_id: subscription.itemPriceId, quantity: subscription.quantity || 1 }
      if (typeof subscription.amount === 'number') {
        // Chargebee expects unit_price in cents
        item.unit_price = Math.round(subscription.amount)
      }
      requestPayload.subscription_items = [item]
    }

    // if (subscription.trialEnd) requestPayload.trial_end = subscription.trialEnd

    // Include coupon_ids if provided
    if (subscription.couponCode)
      requestPayload.coupon_ids = [subscription.couponCode]

    console.log('Chargebee create_with_items for customer:', customerId, 'payload:', JSON.stringify(requestPayload))

    const result = await chargebee.subscription.create_with_items(customerId, requestPayload).request()

    console.log('✅ Chargebee subscription created (PC2 SDK):', result)

    return { status: 'Success', statusCode: 200, subscription: result }
  }
  catch (error: any) {
    console.error('Chargebee subscription creation failed:', error)
    return {
      statusCode: error.http_status_code || 500,
      error: {
        message: error.message,
      },
      status: 'Error',
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
