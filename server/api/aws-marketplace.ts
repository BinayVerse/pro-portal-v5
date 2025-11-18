// server/api/aws-marketplace.ts
import { H3Event } from 'h3'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event: H3Event) => {
    const queryParams = getQuery(event) || {}

    let body: any = {}
    try {
        body = await readBody(event)
    } catch {
        body = {}
    }

    const token =
        body?.['x-amzn-marketplace-token'] ||
        body?.['x_amzn_marketplace_token'] ||
        body?.['x_amzn-marketplace-token'] ||
        queryParams?.['x-amzn-marketplace-token'] ||
        queryParams?.['x_amzn_marketplace_token'] ||
        queryParams?.['x_amzn-marketplace-token'] ||
        null

    // If token was received
    if (token) {
        const encoded = encodeURIComponent(String(token))
        const decodedToken = decodeURIComponent(encoded)

        const fulfillmentRes = await processFulfillment(decodedToken)
        const customerId = fulfillmentRes?.data?.customerId || null

        if (customerId) {
            // Query subscription table to check org status
            const subscriptionQuery = `
                SELECT org_id, active
                FROM public.aws_marketplace_subscriptions
                WHERE customer_id = $1
                LIMIT 1
            `
            const subscriptionRes = await query(subscriptionQuery, [customerId])
            const subscription = subscriptionRes?.rows?.[0]

            if (subscription?.org_id && subscription?.active === true) {
                return sendRedirect(event, `/login`, 302)
            }

            // Else → redirect to signup with encoded token
            return sendRedirect(event, `/signup?x-amzn-marketplace-token=${encoded}`, 302)
        }

        // If no customer ID was returned → treat as new signup
        return sendRedirect(event, `/signup?x-amzn-marketplace-token=${encoded}`, 302)
    }

    // Fallback no-token response
    return {
        message: "No marketplace token found"
    }
})
