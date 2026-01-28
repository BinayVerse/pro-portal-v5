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
            org_tax_id = COALESCE($2, org_tax_id),
            updated_at = CURRENT_TIMESTAMP
            WHERE org_id = $3
            RETURNING org_id, chargebee_customer_id, org_tax_id;
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
): Promise<{ success: boolean; message: string; id?: string; error?: string }> {
    try {
        const { orgId } = getOrgFromToken(event)

        const billingData = {
            org_id: orgId,
            name: `${billing.firstName || ''} ${billing.lastName || ''}`.trim(),
            contact_number: billing.phoneNumber || '',
            email: billing.email || '',
            address_line1: billing.addressLine1 || '',
            address_line2: billing.addressLine2 || '',
            address_city: billing.city || '',
            address_state: billing.region || '',
            address_zip: billing.zipcode || '',
            address_country: billing.country || '',
            address_phone: billing.phoneNumber || '',
        }

        /** -----------------------------------------------------------
         * CHECK IF BILLING ADDRESS ALREADY EXISTS
         * ----------------------------------------------------------- */
        const findExisting = await query(
            `SELECT id FROM billing_address WHERE org_id = $1 LIMIT 1`,
            [orgId]
        )

        /** -----------------------------------------------------------
         * UPDATE CASE
         * ----------------------------------------------------------- */
        if (findExisting.rows.length > 0) {
            const existingId = findExisting.rows[0].id

            const updateSQL = `
                UPDATE billing_address
                SET
                    name = $1,
                    contact_number = $2,
                    email = $3,
                    address_line1 = $4,
                    address_line2 = $5,
                    address_city = $6,
                    address_state = $7,
                    address_zip = $8,
                    address_country = $9,
                    address_phone = $10,
                    updated_at = CURRENT_TIMESTAMP
                WHERE org_id = $11
                RETURNING id
            `

            const params = [
                billingData.name,
                billingData.contact_number,
                billingData.email,
                billingData.address_line1,
                billingData.address_line2,
                billingData.address_city,
                billingData.address_state,
                billingData.address_zip,
                billingData.address_country,
                billingData.address_phone,
                billingData.org_id,
            ]

            const updateRes = await query(updateSQL, params)

            return {
                success: true,
                message: 'Billing address updated successfully',
                id: updateRes.rows[0].id,
            }
        }

        /** -----------------------------------------------------------
         * INSERT CASE
         * ----------------------------------------------------------- */
        const insertSQL = `
            INSERT INTO billing_address (
                org_id, name, contact_number, email,
                address_line1, address_line2, address_city,
                address_state, address_zip, address_country, address_phone
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            RETURNING id
        `

        const insertParams = [
            billingData.org_id,
            billingData.name,
            billingData.contact_number,
            billingData.email,
            billingData.address_line1,
            billingData.address_line2,
            billingData.address_city,
            billingData.address_state,
            billingData.address_zip,
            billingData.address_country,
            billingData.address_phone,
        ]

        const insertRes = await query(insertSQL, insertParams)

        return {
            success: true,
            message: 'Billing address created successfully',
            id: insertRes.rows[0].id,
        }

    } catch (err: any) {
        console.error('❌ Billing Address upsert failed:', err)
        return {
            success: false,
            message: err.message || 'Billing update failed',
            error: err.message || 'Billing update failed',
        }
    }
}


/**
 * Update organization subscription
 */
export async function updateOrganizationSubscription(
    event: H3Event,
    planId: string,
    subscriptionId: string,
    metadata: any = {},
    purchaseType: 'subscription' | 'addon',
    quantity = 1
): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const { orgId } = getOrgFromToken(event)

        await query('BEGIN', [])

        // --------------------------------------------------
        // 1. Validate & normalize plan ID
        // --------------------------------------------------
        const parsedPlanId = extractUuid(planId)
        if (!parsedPlanId)
            throw new Error(`Invalid planId format: ${planId}`)

        // --------------------------------------------------
        // 2. Fetch plan limits
        // --------------------------------------------------
        const planLimitRes = await query(
            `
                SELECT 
                users,
                limit_requests,
                storage_limit_gb,
                artefacts
                FROM plans
                WHERE id = $1
                LIMIT 1
            `,
            [parsedPlanId]
        )

        if (!planLimitRes.rows.length)
            throw new Error(`Plan not found for id: ${parsedPlanId}`)

        const limits = planLimitRes.rows[0]

        // --------------------------------------------------
        // 3. Update organization limits
        // --------------------------------------------------
        if (purchaseType === 'subscription') {
            await query(
                `
                    UPDATE subscription_details
                    SET status = 'expired'
                    WHERE org_id = $1
                        AND status = 'active'
                `,
                [orgId]
            )
            // 🔵 BASE SUBSCRIPTION → OVERWRITE LIMITS
            const res = await query(
                `
                    UPDATE public.organizations
                    SET
                        plan_id = $1,
                        plan_start_date = CURRENT_TIMESTAMP,
                        chargebee_subscription_id = $2,

                        -- ✅ RESET limits to BASE PLAN ONLY
                        org_users = $4,
                        org_limit_requests = $5,
                        org_storage_limit_gb = $6,
                        org_artefacts = $7,

                        updated_at = CURRENT_TIMESTAMP
                    WHERE org_id = $3
                    RETURNING org_id;
                `,
                [
                    parsedPlanId,
                    subscriptionId,
                    orgId,
                    limits.users ?? null,
                    limits.limit_requests ?? null,
                    limits.storage_limit_gb ?? null,
                    limits.artefacts ?? null
                ]
            )

            if (!res.rowCount)
                throw new Error(`Organization not found for subscription update: ${orgId}`)
        }

        if (purchaseType === 'addon') {
            // 🟣 ADDON → ADD LIMITS (PLUS)
            const res = await query(
                `
                    UPDATE public.organizations
                    SET
                        org_users = org_users + COALESCE($1, 0),
                        org_limit_requests = org_limit_requests + COALESCE($2, 0),
                        org_storage_limit_gb = org_storage_limit_gb + COALESCE($3, 0),
                        org_artefacts = org_artefacts + COALESCE($4, 0),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE org_id = $5
                    RETURNING org_id;
                `,
                [
                    (limits.users ?? 0) * quantity,
                    (limits.limit_requests ?? 0) * quantity,
                    (limits.storage_limit_gb ?? 0) * quantity,
                    (limits.artefacts ?? 0) * quantity,
                    orgId
                ]
            )

            if (!res.rowCount)
                throw new Error(`Organization not found for addon update: ${orgId}`)
        }

        // --------------------------------------------------
        // 4. Insert subscription_details (audit trail)
        // --------------------------------------------------
        const insertRes = await query(
            `
                INSERT INTO public.subscription_details (
                org_id,
                plan_id,
                status,
                subscription_kind,
                addon_quantity,
                addon_limits,
                metadata
                )
                VALUES ($1, $2, 'active', $3, $4, $5, $6)
                RETURNING id;
            `,
            [
                orgId,
                parsedPlanId,
                purchaseType,
                purchaseType === 'addon' ? quantity : null,
                purchaseType === 'addon' ? JSON.stringify(limits) : null,
                JSON.stringify(metadata || {})
            ]
        )

        if (!insertRes.rowCount)
            throw new Error('Failed to insert subscription_details record')

        await query('COMMIT', [])
        return { success: true, id: insertRes.rows[0].id }

    } catch (error: any) {
        await query('ROLLBACK', [])
        console.error('❌ DB Error: updateOrganizationSubscription failed', {
            error: error.message || error,
        })
        return { success: false, error: error.message || 'Update failed' }
    }
}

/**
 * Activate Free plan for an organization
 * - No Chargebee
 * - No Braintree
 * - Explicit & auditable
 */
export async function activateFreePlanForOrg(
    event: H3Event,
    planId: string,
    metadata: any = {},
    billing?: {
        firstName?: string
        lastName?: string
        email?: string
        phoneNumber?: string
        addressLine1?: string
        addressLine2?: string
        city?: string
        region?: string
        zipcode?: string
        country?: string
        taxId?: string
    }
) {
    const { orgId } = getOrgFromToken(event)

    // Validate plan is actually free
    const planRes = await query(
        `
            SELECT id, users, limit_requests, storage_limit_gb, artefacts, metadata
            FROM plans
            WHERE id = $1
            LIMIT 1
        `,
        [planId],
    )

    const plan = planRes.rows[0]
    if (!plan || plan.metadata?.free_plan !== true) {
        return {
            success: false,
            error: 'Invalid free plan',
        }
    }

    // Insert or update billing address if provided

    if (billing) {
        await upsertBillingAddress(event, {
            firstName: billing.firstName,
            lastName: billing.lastName,
            email: billing.email,
            phoneNumber: billing.phoneNumber,
            addressLine1: billing.addressLine1,
            addressLine2: billing.addressLine2,
            city: billing.city,
            region: billing.region,
            zipcode: billing.zipcode,
            country: billing.country,
        })
    }

    if (billing?.taxId) {
        await updateOrganizationCustomer(
            event,
            null,
            billing.taxId
        )
    }

    // Expire existing active subscriptions
    await query(
        `
            UPDATE subscription_details
            SET status = 'expired'
            WHERE org_id = $1 AND status = 'active'
        `,
        [orgId],
    )

    // Insert new subscription_details row
    await query(
        `
            INSERT INTO subscription_details (
            org_id,
            plan_id,
            status,
            subscription_kind,
            metadata
            )
            VALUES ($1, $2, 'active', 'subscription', $3)
        `,
        [
            orgId,
            planId,
            JSON.stringify(metadata),
        ],
    )

    // Apply org limits directly
    await query(
        `
            UPDATE organizations
            SET
            plan_id = $1,
            plan_start_date = CURRENT_TIMESTAMP,
            org_users = $2,
            org_limit_requests = $3,
            org_storage_limit_gb = $4,
            org_artefacts = $5,
            chargebee_subscription_id = NULL,
            updated_at = CURRENT_TIMESTAMP
            WHERE org_id = $6
         `,
        [
            planId,
            plan.users,
            plan.limit_requests,
            plan.storage_limit_gb,
            plan.artefacts,
            orgId,
        ],
    )

    return { success: true }
}
