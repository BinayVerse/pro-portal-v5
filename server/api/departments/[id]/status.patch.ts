import { defineEventHandler, readBody, getRouterParam, setResponseStatus } from 'h3'
import { query } from '../../../utils/db'
import { CustomError } from '../../../utils/custom.error'
import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
    const deptId = getRouterParam(event, 'id')
    const { status } = await readBody(event)
    const config = useRuntimeConfig()
    const token = event.node.req.headers.authorization?.split(' ')[1]

    if (!token) {
        setResponseStatus(event, 401)
        throw new CustomError('Unauthorized', 401)
    }

    let userId: string
    try {
        userId = (jwt.verify(token, config.jwtToken as string) as any).user_id
    } catch {
        setResponseStatus(event, 401)
        throw new CustomError('Invalid token', 401)
    }

    const user = await query(
        'SELECT org_id FROM users WHERE user_id = $1',
        [userId],
    )

    if (!user.rows.length) {
        setResponseStatus(event, 404)
        throw new CustomError('User not found', 404)
    }

    const orgId = user.rows[0].org_id

    await query(
        `
    UPDATE organization_departments
    SET status = $1, updated_at = now()
    WHERE dept_id = $2 AND org_id = $3
    `,
        [status, deptId, orgId],
    )

    setResponseStatus(event, 200)
    return {
        statusCode: 200,
        status: 'success',
        message: `Department ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
    }
})
