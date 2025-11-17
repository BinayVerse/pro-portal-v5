import { defineEventHandler } from 'h3';
import { query } from '../../utils/db';
import { CustomError } from '../../utils/custom.error';
import jwt from 'jsonwebtoken';

// Mapping entitlement → internal plan title
const ENTITLEMENT_PLAN_MAP: Record<string, string> = {
  BasicTier: "Starter",
  ProfessionalTier: "Professional",
  CustomTier: "Enterprise"
};

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  /** -----------------------------------
   * TOKEN PARSING & VALIDATION
   * ----------------------------------- **/
  let token = event.node.req.headers['authorization']?.split(' ')[1];

  if (!token) {
    const cookies = String(event.node.req.headers['cookie'] || '');
    token = cookies.split(';')
      .map(c => c.trim().split('='))
      .filter(([key]) => key === 'auth-token' || key === 'authToken')
      .map(([, value]) => decodeURIComponent(value))
      .shift();
  }

  if (!token) throw new CustomError('Unauthorized: No token provided', 401);

  let userId: string;
  try {
    const decoded = jwt.verify(token, config.jwtToken as string) as { user_id: string };
    userId = decoded.user_id;
  } catch (err) {
    console.error('Token verification error:', err);
    throw new CustomError('Unauthorized: Invalid token', 401);
  }

  if (!userId) throw new CustomError('Unauthorized: User ID missing in token', 401);

  /** -----------------------------------
   * FETCH USER + CURRENT PLAN
   * ----------------------------------- **/
  const userQuery = `
    SELECT
      u.user_id,
      u.name,
      u.email,
      u.contact_number,
      u.primary_contact,
      u.org_id,
      u.role_id,
      o.plan_id,
      COALESCE(o.org_name, '') AS company
    FROM users u
    LEFT JOIN organizations o ON u.org_id = o.org_id
    WHERE u.user_id = $1
  `;

  try {
    const { rows } = await query(userQuery, [userId]);
    if (!rows.length) throw new CustomError('User or Organization not found', 404);

    const user = rows[0];

    // Values that will be returned
    let finalPlanId = user.plan_id || null;
    let finalPlanName: string | null = null;

    /** -----------------------------------
     * ELIGIBLE FOR PLAN SYNC?
     * ----------------------------------- **/
    if (user.org_id) {

      const subscriptionRes = await query(
        `SELECT customer_id FROM aws_marketplace_subscriptions WHERE org_id = $1 LIMIT 1`,
        [user.org_id]
      );

      const subscription = subscriptionRes.rows[0];

      if (subscription?.customer_id) {
        const entitlementRes = await query(
          `SELECT dimension, updated_at FROM aws_marketplace_entitlements WHERE customer_id = $1 LIMIT 1`,
          [subscription.customer_id]
        );

        const entitlement = entitlementRes.rows[0];

        if (entitlement?.dimension) {
          const mappedPlanTitle = ENTITLEMENT_PLAN_MAP[entitlement.dimension];

          if (mappedPlanTitle) {
            const planRes = await query(
              `SELECT id FROM plans WHERE title = $1 AND duration = 'Monthly' AND active = TRUE LIMIT 1`,
              [mappedPlanTitle]
            );

            const plan = planRes.rows[0];

            if (plan && plan.id) {
              if (user.plan_id && user.plan_id === plan.id) {
                finalPlanId = plan.id;
                finalPlanName = mappedPlanTitle;
              } else {
                await query(
                  `
                    UPDATE organizations
                    SET plan_id = $1,
                        plan_start_date = $2,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE org_id = $3
                  `,
                  [plan.id, entitlement.updated_at, user.org_id]
                );

                const updatedPlanRes = await query(
                  `
                    SELECT o.plan_id, p.title AS plan_name
                    FROM organizations o
                    LEFT JOIN plans p ON o.plan_id = p.id
                    WHERE o.org_id = $1
                    LIMIT 1
                  `,
                  [user.org_id]
                );

                const updatedPlan = updatedPlanRes.rows[0];
                finalPlanId = updatedPlan?.plan_id || null;
                finalPlanName = updatedPlan?.plan_name || null;
              }
            }
          }
        }
      }
    }

    /** -----------------------------------
     * FALLBACK: GET PLAN NAME IF NOT UPDATED ABOVE
     * ----------------------------------- **/
    if (!finalPlanName && finalPlanId) {
      const existingPlanRes = await query(
        `SELECT title FROM plans WHERE id = $1 LIMIT 1`,
        [finalPlanId]
      );
      finalPlanName = existingPlanRes.rows.length ? existingPlanRes.rows[0].title : null;
    }

    /** -----------------------------------
     * FINAL RESPONSE
     * ----------------------------------- **/
    return {
      statusCode: 200,
      status: 'success',
      message: 'User profile fetched successfully',
      data: {
        ...user,
        plan_id: finalPlanId,
        plan_name: finalPlanName,
        isCompanyRegistered: !!user.org_id,
      },
    };

  } catch (err) {
    console.error(err);
    throw new CustomError('Failed to fetch user profile', 500);
  }
});
