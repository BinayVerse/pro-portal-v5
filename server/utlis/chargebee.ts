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

type SubscriptionStatus = {
  subscription_id: string | null
  status: 'active' | 'non_renewing' | 'cancelled' | null
  auto_renew: boolean
  current_term_start: string | null
  current_term_end: string | null
  next_billing_at: string | null
  renewal_at: string | null
  payment_issue?: boolean
  due_invoices?: number
  cancel_reason?: string
}


// ***** Create customer with basic information we can add more details like billing address and stuff
export async function createChargebeeCustomer(orderDetails: any) {
  try {
    // 1️⃣ Try reuse

    const existing = await chargebee.customer
      .list({ email: orderDetails.email })
      .request()

    if (existing.list.length > 0) {
      const customers = existing.list
        .map(r => r.customer)
        .filter(Boolean)

      const exactCustomer = customers.find(
        c => c.email?.toLowerCase() === orderDetails.email.toLowerCase()
      )

      if (exactCustomer) {
        return {
          status: 'Success',
          statusCode: 200,
          customerId: exactCustomer.id,
        }
      }
    }

    // 2️⃣ Create only if not exists
    const res = await chargebee.customer.create({
      email: orderDetails.email,
      first_name: orderDetails.firstName,
      last_name: orderDetails.lastName || '',
      phone: orderDetails.phoneNumber,
      company: orderDetails.orgName,
      billing_address: {
        line1: orderDetails.addressLine1,
        line2: orderDetails.addressLine2,
        city: orderDetails.city,
        country: orderDetails.countryCode,
        zip: orderDetails.zipcode,
      },
    }).request()

    return {
      status: 'Success',
      statusCode: 200,
      customerId: res.customer.id,
    }
  } catch (error: any) {
    return { status: 'Error', statusCode: 500, error }
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
export async function cancelSubscription(subscriptionId: string, endOfTerm: boolean = true) {
  try {
    const result = await chargebee.subscription
      .cancel_for_items(subscriptionId, {
        end_of_term: endOfTerm,
      } as any)
      .request()

    return {
      status: 'Success',
      statusCode: 200,
      data: result.subscription,
    }
  } catch (error: any) {
    return {
      status: 'Error',
      statusCode: error.http_status_code || 500,
      error: error.message || 'Chargebee cancellation failed',
    }
  }
}

// Cancel subscription IMMEDIATELY
export async function cancelSubscriptionImmediately(subscriptionId: string) {
  try {
    const result = await chargebee.subscription
      .cancel_for_items(subscriptionId, {
        end_of_term: false,
      } as any)
      .request()

    return {
      status: 'Success',
      statusCode: 200,
      data: result.subscription,
    }
  } catch (error: any) {
    return {
      status: 'Error',
      statusCode: error.http_status_code || 500,
      error: error.message || 'Chargebee immediate cancellation failed',
    }
  }
}

/**
 * DAILY Chargebee sync
 * - Detects renewal (even for legacy rows)
 * - Expires subscription + addons
 * - Creates new subscription cycle row
 * - Resets org limits
 * - Preserves old metadata and injects chargebee
 */
export async function getSubscriptionDetails(orgId: string): Promise<SubscriptionStatus> {
  /* --------------------------------------------------
   * 1️⃣ Fetch latest subscription anchor
   * -------------------------------------------------- */
  const subRes = await query(
    `
      SELECT id, status, metadata, created_at
      FROM subscription_details
      WHERE org_id = $1
        AND subscription_kind = 'subscription'
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [orgId]
  )

  if (!subRes.rows.length)
    return emptyResult()

  const anchor = subRes.rows[0]
  const anchorId = anchor.id
  const anchorCreatedAt = anchor.created_at
  const metadata = anchor.metadata || {}

  let cb = metadata.chargebee || null

  /* --------------------------------------------------
   * 2️⃣ Fallback: hydrate subscription_id from org table
   * -------------------------------------------------- */
  if (!cb?.subscription_id) {
    const orgRes = await query(
      `
        SELECT chargebee_subscription_id
        FROM organizations
        WHERE org_id = $1
        LIMIT 1
      `,
      [orgId]
    )

    if (!orgRes.rows[0]?.chargebee_subscription_id)
      return emptyResult()

    cb = {
      subscription_id: orgRes.rows[0].chargebee_subscription_id,
      last_synced_at: null,
    }
  }

  /* --------------------------------------------------
   * 3️⃣ Fetch subscription from Chargebee (source of truth)
   * -------------------------------------------------- */
  const result = await chargebee.subscription
    .retrieve(cb.subscription_id)
    .request()

  const sub = result.subscription

  const cycleStart = sub.current_term_start
    ? new Date(sub.current_term_start * 1000)
    : null

  const cycleEnd = sub.current_term_end
    ? new Date(sub.current_term_end * 1000)
    : null

  if (!cycleStart)
    return normalize(cb)

  const cycleStartIso = cycleStart.toISOString()
  const cycleEndIso = cycleEnd?.toISOString() ?? null
  const nextBillingAtIso = sub.next_billing_at
    ? new Date(sub.next_billing_at * 1000).toISOString()
    : null

  /* --------------------------------------------------
   * 4️⃣ Determine DB cycle start (legacy-safe)
   * -------------------------------------------------- */
  const dbCycleStart = cb?.current_term_start
    ? new Date(cb.current_term_start)
    : new Date(anchorCreatedAt)

  /* --------------------------------------------------
   * 5️⃣ Renewal detection (robust)
   * -------------------------------------------------- */
  const isRenewal =
    dbCycleStart.getTime() !== cycleStart.getTime()

  /* --------------------------------------------------
   * 6️⃣ Handle renewal
   * -------------------------------------------------- */
  if (isRenewal) {
    console.log(
      '🔁 Renewal detected',
      {
        orgId,
        at: new Date().toISOString(),
        db_subscription_start: dbCycleStart.toISOString(),
        cb_cycle_start: cycleStartIso,
      }
    )

    /* 6.1 Expire ALL active subscriptions + addons */
    await query(
      `
        UPDATE subscription_details
        SET status = 'expired'
        WHERE org_id = $1
          AND status = 'active'
          AND subscription_kind IN ('subscription', 'addon')
      `,
      [orgId]
    )

    /* 6.2 Reset org limits to BASE plan */
    const planRes = await query(
      `
        SELECT p.users, p.limit_requests, p.storage_limit_gb, p.artefacts
        FROM organizations o
        JOIN plans p ON p.id = o.plan_id
        WHERE o.org_id = $1
        LIMIT 1
      `,
      [orgId]
    )

    if (planRes.rows.length) {
      const limits = planRes.rows[0]

      await query(
        `
          UPDATE organizations
          SET
            org_users = $2,
            org_limit_requests = $3,
            org_storage_limit_gb = $4,
            org_artefacts = $5,
            updated_at = CURRENT_TIMESTAMP
          WHERE org_id = $1
        `,
        [
          orgId,
          limits.users ?? null,
          limits.limit_requests ?? null,
          limits.storage_limit_gb ?? null,
          limits.artefacts ?? null,
        ]
      )
    }

    /* 6.3 Insert NEW subscription row (preserve metadata + inject chargebee) */
    await query(
      `
        INSERT INTO subscription_details (
          org_id,
          plan_id,
          status,
          subscription_kind,
          metadata
        )
        SELECT
          o.org_id,
          o.plan_id,
          'active',
          'subscription',
          jsonb_set(
            COALESCE(sd.metadata, '{}'::jsonb),
            '{chargebee}',
            $1::jsonb,
            true
          )
        FROM organizations o
        LEFT JOIN subscription_details sd
          ON sd.org_id = o.org_id
          AND sd.subscription_kind = 'subscription'
        WHERE o.org_id = $2
        ORDER BY sd.created_at DESC
        LIMIT 1
      `,
      [
        JSON.stringify({
          subscription_id: sub.id,
          status: sub.status,
          auto_renew: sub.status === 'active',
          current_term_start: cycleStartIso,
          current_term_end: cycleEndIso,
          next_billing_at: nextBillingAtIso,
          renewal_at: cycleEndIso,
          last_synced_at: new Date().toISOString(),
          source: 'chargebee',
        }),
        orgId,
      ]
    )
  }

  /* --------------------------------------------------
   * 7️⃣ Always sync org plan_start_date
   * -------------------------------------------------- */
  await query(
    `
      UPDATE organizations
      SET plan_start_date = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE org_id = $1
    `,
    [orgId, cycleStartIso]
  )

  /* --------------------------------------------------
   * 8️⃣ Update Chargebee cache on anchor row
   * -------------------------------------------------- */
  const updatedCb = {
    subscription_id: sub.id,
    status: sub.status,
    auto_renew: sub.status === 'active',
    current_term_start: cycleStartIso,
    current_term_end: cycleEndIso,
    next_billing_at: nextBillingAtIso,
    renewal_at: cycleEndIso,
    last_synced_at: new Date().toISOString(),
  }

  await query(
    `
      UPDATE subscription_details
      SET metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{chargebee}',
        $1::jsonb,
        true
      )
      WHERE id = $2
    `,
    [JSON.stringify(updatedCb), anchorId]
  )

  return normalize(updatedCb)
}


/* ---------------- HELPERS ---------------- */

function isSameDay(date: string) {
  return new Date(date).toDateString() === new Date().toDateString()
}

function normalize(cb: any): SubscriptionStatus {
  return {
    subscription_id: cb?.subscription_id ?? null,
    status: cb?.status ?? null,
    auto_renew: cb?.auto_renew ?? false,
    current_term_start: cb?.current_term_start ?? null,
    current_term_end: cb?.current_term_end ?? cb?.renewal_at ?? null,
    next_billing_at: cb?.next_billing_at ?? null,
    renewal_at: cb?.current_term_end ?? cb?.renewal_at ?? null,
  }
}


function emptyResult(): SubscriptionStatus {
  return {
    subscription_id: null,
    status: null,
    auto_renew: false,
    current_term_start: null,
    current_term_end: null,
    next_billing_at: null,
    renewal_at: null,
  }
}

function handleError(error: any) {
  return {
    status: 'Error',
    statusCode: error.http_status_code || 500,
    error: error.message || 'Unknown error occurred',
  }
}
