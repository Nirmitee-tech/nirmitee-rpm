import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NirmiteeRPM API',
      version: '1.0.0',
      description: 'Multi-tenant SaaS API for Remote Patient Monitoring (RPM) platform. Comprehensive healthcare API with authentication, user management, team collaboration, and audit logging.',
      contact: {
        name: 'API Support',
        email: 'support@nirmitee.io',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: '/api/v1',
        description: 'API Version 1',
      },
      {
        url: '/api',
        description: 'API (defaults to v1 for backwards compatibility)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT authentication using access token obtained from /auth/login or /auth/signup',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and session management',
      },
      {
        name: 'MFA',
        description: 'Multi-factor authentication management',
      },
      {
        name: 'OAuth',
        description: 'OAuth 2.0 authentication with Google and Microsoft',
      },
      {
        name: 'Users',
        description: 'User management and profiles',
      },
      {
        name: 'Teams',
        description: 'Team management and member assignments',
      },
      {
        name: 'Roles',
        description: 'Role-based access control (RBAC)',
      },
      {
        name: 'Organizations',
        description: 'Multi-tenant organization management',
      },
      {
        name: 'Invitations',
        description: 'User invitation system',
      },
      {
        name: 'Notifications',
        description: 'Real-time notifications',
      },
      {
        name: 'Audit',
        description: 'Audit logging for compliance',
      },
      {
        name: 'Dashboard',
        description: 'Dashboard statistics and analytics',
      },
    ],
  },
  apis: [
    './src/routes/v1/*.ts',
    './src/config/swagger-schemas.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
