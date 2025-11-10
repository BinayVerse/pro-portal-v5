import jwt from 'jsonwebtoken'
import { CustomError } from './custom.error'

export function getCurrentUserId(event: any): any {
  const token = event.node?.req?.headers?.['authorization']?.split?.(' ')[1]
  if (!token) {
    throw new CustomError('Unauthorized: No token provided', 401)
  }

  try {
    const config = useRuntimeConfig()
    const decoded = jwt.verify(token, config.jwtToken as string) as { user_id?: any }
    if (!decoded || typeof decoded.user_id === 'undefined') {
      throw new CustomError('Unauthorized: Invalid token payload', 401)
    }
    return decoded.user_id
  } catch (err) {
    throw new CustomError('Unauthorized: Invalid token', 401)
  }
}
