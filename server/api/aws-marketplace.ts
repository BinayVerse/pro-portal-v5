// server/api/aws-marketplace.ts
import { H3Event } from 'h3'

export default defineEventHandler(async (event: H3Event) => {
    // Get query params (GET or after redirect)
    const query = getQuery(event) || {}

    // Read body — supports JSON and urlencoded form data
    let body: any = {}
    try {
        body = await readBody(event)
    } catch (err) {
        // readBody may throw if empty or unparseable — ignore
        body = {}
    }

    // Try various token keys AWS might send
    const token =
        body?.['x-amzn-marketplace-token'] ||
        body?.['x_amzn_marketplace_token'] ||
        body?.['x_amzn_marketplace-token'] ||
        query?.['x-amzn-marketplace-token'] ||
        query?.['x_amzn_marketplace_token'] ||
        query?.['x_amzn_marketplace-token'] ||
        null

    // Log for debugging (server logs)
    // console.log('[aws-marketplace] method=', event.node.req.method, 'query=', query, 'body=', body)
    // console.log('[aws-marketplace] extracted token=', token)

    // If token present, redirect to /signup with token in query
    if (token) {
        // Important: encode token for safety
        const encoded = encodeURIComponent(String(token))
        // Use 302 redirect to bring user to signup page with token
        return sendRedirect(event, `/signup?x-amzn-marketplace-token=${encoded}`, 302)
    }

    // If no token, return a JSON response so AWS (or caller) gets a 200-ish response
    return {
        message: 'No marketplace token found',
    }
})
