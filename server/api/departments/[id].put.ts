import { defineEventHandler, readBody, getRouterParam, setResponseStatus } from 'h3'
import { query } from '../../utils/db'
import { CustomError } from '../../utils/custom.error'
import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
    const deptId = getRouterParam(event, 'id')
    const { name, description } = await readBody(event)
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

    // Check if the department is a system department
    const deptCheck = await query(
        'SELECT is_system FROM organization_departments WHERE dept_id = $1 AND org_id = $2',
        [deptId, orgId],
    )

    if (!deptCheck.rows.length) {
        setResponseStatus(event, 404)
        throw new CustomError('Department not found', 404)
    }

    if (deptCheck.rows[0].is_system) {
        setResponseStatus(event, 403)
        throw new CustomError('Cannot edit system departments', 403)
    }

    const result = await query(
        `
            UPDATE organization_departments
            SET name = $1, description = $2, updated_at = now(), updated_by = $5
            WHERE dept_id = $3 AND org_id = $4
            RETURNING dept_id AS id, name, description, status, is_system
        `,
        [name, description, deptId, orgId, userId],
    )

    if (!result.rowCount) {
        setResponseStatus(event, 404)
        throw new CustomError('Department not found', 404)
    }

    setResponseStatus(event, 200)
    return {
        statusCode: 200,
        status: 'success',
        data: result.rows[0],
    }
})
