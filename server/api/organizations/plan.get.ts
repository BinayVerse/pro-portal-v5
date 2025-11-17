import jwt from 'jsonwebtoken'
import { defineEventHandler } from 'h3'

import { CustomError } from '../../utils/custom.error'
import { query } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // Resolve token (Authorization header or cookie)
  let token = event.node.req.headers['authorization']?.split(' ')[1]
  if (!token) {
    const cookieHeader = String(event.node.req.headers['cookie'] || '')
    if (cookieHeader) {
      for (const part of cookieHeader.split(';')) {
        const [k, ...v] = part.split('=')
        if (!k) continue
        const key = k.trim()
        const val = decodeURIComponent((v || []).join('=').trim())
        if (key === 'auth-token' || key === 'authToken') {
          token = val
          break
        }
      }
    }
  }

  if (!token) {
    throw new CustomError('Unauthorized: No token provided', 401)
  }

  let userId: string
  try {
    const decodedToken = jwt.verify(token, config.jwtToken as string)
    userId = (decodedToken as any).user_id
  } catch (err) {
    throw new CustomError('Unauthorized: Invalid token', 401)
  }

  try {
    // Get user's org and role
    const userRow = await query('SELECT org_id, role_id FROM users WHERE user_id = $1', [userId])
    if (!userRow?.rows?.length) throw new CustomError('User not found', 404)
    const tokenUserOrg = userRow.rows[0].org_id
    const tokenUserRole = userRow.rows[0].role_id

    const q = getQuery(event) as Record<string, any>
    const requestedOrg = q?.org || q?.org_id || null
    const orgId = tokenUserRole === 0 && requestedOrg ? String(requestedOrg) : tokenUserOrg
    if (!orgId) throw new CustomError('Organization not found', 404)

    const sql = `
      SELECT o.org_id, o.org_name, o.plan_id, o.plan_start_date AT TIME ZONE 'UTC' as plan_start_date, p.id as plan_id, p.title, p.price_amount, p.price_currency, p.duration, p.users, p.limit_requests, p.storage_limit_gb, p.support_level, p.artefacts, p.metadata
      FROM organizations o
      LEFT JOIN public.plans p ON o.plan_id = p.id
      WHERE o.org_id = $1
      LIMIT 1
    `

    const res = await query(sql, [orgId])
    const row = res?.rows?.[0] || null

    if (!row) {
      return { success: true, data: null }
    }

    const metadata = row.metadata || {}

    // Normalize features: can be stored as JSON/text or array
    let features: string[] = []
    try {
      if (Array.isArray(row.features)) features = row.features
      else if (typeof row.features === 'string') features = JSON.parse(row.features)
    } catch (e) {
      try {
        const parsed = JSON.parse(String(row.features))
        if (Array.isArray(parsed)) features = parsed
      } catch { }
    }
    if ((!features || features.length === 0) && metadata && metadata.features) {
      if (Array.isArray(metadata.features)) features = metadata.features
      else if (typeof metadata.features === 'string') features = String(metadata.features).split(/\r?\n|[,;]+/).map((s) => s.trim()).filter(Boolean)
    }

    const interval = (String(row.duration || '').toLowerCase().includes('year') ? 'year' : 'month')

    const planObj = row.plan_id ? {
      id: row.plan_id,
      title: row.title,
      price_amount: row.price_amount,
      price_currency: row.price_currency,
      duration: row.duration,
      metadata: metadata,
      artefacts: row?.artefacts || null,
      limit_requests: row?.limit_requests || null,
      storage_limit_gb: row?.storage_limit_gb || null,
      users: row?.users || null,
      features: features,
      interval,
    } : null

    const out = {
      org_id: row.org_id,
      org_name: row.org_name,
      plan: planObj,
      plan_start_date: row.plan_start_date || null,
    }

    return { success: true, data: out }
  } catch (err: any) {
    console.error('Org plan lookup error:', err?.message || err)
    throw new CustomError('Failed to fetch organization plan', 500)
  }
})
