/**
 * @openapi
 * components:
 *   schemas:
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: Error message
 *       required:
 *         - error
 *
 *     ValidationError:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: Validation error message
 *         details:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               field:
 *                 type: string
 *               message:
 *                 type: string
 *
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: cuid
 *         email:
 *           type: string
 *           format: email
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         organizationId:
 *           type: string
 *           format: cuid
 *         status:
 *           type: string
 *           enum: [active, inactive, suspended]
 *         mfaEnabled:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     LoginResponse:
 *       type: object
 *       properties:
 *         accessToken:
 *           type: string
 *           description: JWT access token
 *         refreshToken:
 *           type: string
 *           description: JWT refresh token
 *         user:
 *           $ref: '#/components/schemas/User'
 *         requiresMfa:
 *           type: boolean
 *           description: Indicates if MFA verification is required
 *         userId:
 *           type: string
 *           description: User ID for MFA verification (only present when requiresMfa is true)
 *
 *     SignupResponse:
 *       type: object
 *       properties:
 *         accessToken:
 *           type: string
 *         refreshToken:
 *           type: string
 *         user:
 *           $ref: '#/components/schemas/User'
 *         organization:
 *           $ref: '#/components/schemas/Organization'
 *
 *     RefreshTokenResponse:
 *       type: object
 *       properties:
 *         accessToken:
 *           type: string
 *         refreshToken:
 *           type: string
 *
 *     Organization:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: cuid
 *         name:
 *           type: string
 *         slug:
 *           type: string
 *         settings:
 *           type: object
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     Team:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: cuid
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         organizationId:
 *           type: string
 *           format: cuid
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     Role:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: cuid
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         organizationId:
 *           type: string
 *           format: cuid
 *         permissions:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Permission'
 *         isSystem:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     Permission:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: cuid
 *         resource:
 *           type: string
 *         action:
 *           type: string
 *         description:
 *           type: string
 *
 *     Notification:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: cuid
 *         userId:
 *           type: string
 *           format: cuid
 *         type:
 *           type: string
 *         title:
 *           type: string
 *         message:
 *           type: string
 *         read:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     AuditLog:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: cuid
 *         userId:
 *           type: string
 *           format: cuid
 *         organizationId:
 *           type: string
 *           format: cuid
 *         action:
 *           type: string
 *         resource:
 *           type: string
 *         resourceId:
 *           type: string
 *         details:
 *           type: object
 *         ipAddress:
 *           type: string
 *         userAgent:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     Invitation:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: cuid
 *         email:
 *           type: string
 *           format: email
 *         organizationId:
 *           type: string
 *           format: cuid
 *         roleId:
 *           type: string
 *           format: cuid
 *         status:
 *           type: string
 *           enum: [pending, accepted, expired, cancelled]
 *         expiresAt:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     OAuthProvider:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         displayName:
 *           type: string
 *         enabled:
 *           type: boolean
 *
 *     MfaStatus:
 *       type: object
 *       properties:
 *         enabled:
 *           type: boolean
 *         methods:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [totp, email]
 *               enabled:
 *                 type: boolean
 *
 *     DashboardStats:
 *       type: object
 *       properties:
 *         totalUsers:
 *           type: integer
 *         totalTeams:
 *           type: integer
 *         activeUsers:
 *           type: integer
 *         recentActivity:
 *           type: array
 *           items:
 *             type: object
 *
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: JWT authentication using access token
 */

// This file contains OpenAPI schema definitions used across the API
// Schemas are defined using JSDoc comments and will be parsed by swagger-jsdoc
export {};
