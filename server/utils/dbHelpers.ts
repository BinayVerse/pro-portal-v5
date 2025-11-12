import { query } from '~/server/utils/db'
import type { H3Event } from 'h3'
import { getOrgFromToken } from './auth';

function extractUuid(value: string): string | null {
    if (!value) return null
    const match = value.match(
        /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/
    )
    return match ? match[0].trim() : null
}

/**
 * ✅ Update organization with Chargebee customer ID and tax number
 */
export async function updateOrganizationCustomer(
    event: H3Event,
    customerId: string,
    taxNumber?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
        const { orgId } = getOrgFromToken(event)

        const sql = `
      UPDATE public.organizations
      SET 
        chargebee_customer_id = $1,
        tax_number = COALESCE($2, tax_number),
        updated_at = CURRENT_TIMESTAMP
      WHERE org_id = $3
      RETURNING org_id, chargebee_customer_id, tax_number;
    `
        const res = await query(sql, [customerId, taxNumber || null, orgId])
        if (!res.rowCount) throw new Error(`Organization not found: ${orgId}`)

        return { success: true, data: res.rows[0] }
    } catch (error: any) {
        console.error('❌ DB Error: updateOrganizationCustomer failed', {
            error: error.message || error,
        })
        return { success: false, error: error.message || 'Update failed' }
    }
}

/**
 * ✅ Insert billing address
 */
export async function upsertBillingAddress(
    event: H3Event,
    billing: any
): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const { orgId } = getOrgFromToken(event)

        const sql = `
      INSERT INTO public.billing_address (
        org_id, name, contact_number, email, tax_number,
        address_line1, address_line2, address_city, address_state,
        address_zip, address_country, address_phone
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING id;
    `

        const params = [
            orgId,
            billing.firstName + ' ' + (billing.lastName || ''),
            billing.phoneNumber || '',
            billing.email || '',
            billing.gstNumber || null,
            billing.addressLine1 || '',
            billing.addressLine2 || '',
            billing.city || '',
            billing.region || '',
            billing.zipcode || '',
            billing.country || '',
            billing.phoneNumber || '',
        ]

        const res = await query(sql, params)
        if (!res.rowCount) throw new Error('Failed to insert billing address')

        return { success: true, id: res.rows[0].id }
    } catch (error: any) {
        console.error('❌ DB Error: insertBillingAddress failed', {
            billing,
            error: error.message || error,
        })
        return { success: false, error: error.message || 'Insert failed' }
    }
}

/**
 * ✅ Update organization subscription
 */
export async function updateOrganizationSubscription(
    event: H3Event,
    planId: string,
    subscriptionId: string,
    metadata: any = {}
): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const { orgId } = getOrgFromToken(event)

        await query('BEGIN', [])
        const parsedPlanId = extractUuid(planId)
        if (!parsedPlanId) throw new Error(`Invalid planId format: ${planId}`)

        const updateOrgSql = `
      UPDATE public.organizations
      SET 
        plan_id = $1,
        plan_start_date = CURRENT_TIMESTAMP,
        chargebee_subscription_id = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE org_id = $3
      RETURNING org_id;
    `
        const res1 = await query(updateOrgSql, [parsedPlanId, subscriptionId, orgId])
        if (!res1.rowCount)
            throw new Error(`Organization not found for subscription update: ${orgId}`)

        const insertSubSql = `
      INSERT INTO public.subscription_details (org_id, plan_id, status, metadata)
      VALUES ($1, $2, 'active', $3)
      RETURNING id;
    `
        const res2 = await query(insertSubSql, [orgId, parsedPlanId, JSON.stringify(metadata || {})])
        if (!res2.rowCount) throw new Error('Failed to insert subscription_details record')

        await query('COMMIT', [])
        return { success: true, id: res2.rows[0].id }
    } catch (error: any) {
        await query('ROLLBACK', [])
        console.error('❌ DB Error: updateOrganizationSubscription failed', {
            error: error.message || error,
        })
        return { success: false, error: error.message || 'Update failed' }
    }
}
