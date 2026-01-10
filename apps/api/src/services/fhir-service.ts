/**
 * FHIR Integration Service
 * SMART on FHIR client for EHR interoperability
 */

import { prisma } from '../utils/prisma';
import {
  FhirConnection,
  FhirConnectionStatus,
  FhirAuthType,
  FhirSyncDirection,
  FhirResourceMapping,
  FhirSyncLog,
  FhirSyncStatus,
  FhirResourceType as PrismaFhirResourceType,
  Prisma,
  VitalType,
} from '@prisma/client';
import { auditService } from './audit-service';

// Local FHIR R4 Resource Types (for API compatibility)
type FhirResourceType = 'Patient' | 'Observation' | 'Condition' | 'CarePlan' | 'Device' | 'Practitioner' | 'Organization';

interface FhirConnectionInput {
  organizationId: string;
  name: string;
  fhirVersion?: string;
  baseUrl: string;
  authType?: FhirAuthType;
  clientId?: string;
  clientSecret?: string;
  scopes?: string[];
  syncDirection?: FhirSyncDirection;
}

interface FhirResourceMappingInput {
  connectionId: string;
  fhirResourceType: FhirResourceType;
  localEntityType: string;
  direction?: FhirSyncDirection;
  fieldMappings?: Record<string, unknown>;
}

interface SyncOptions {
  resourceTypes?: FhirResourceType[];
  patientIds?: string[];
  sinceDatetime?: Date;
}

interface FhirResource {
  resourceType: string;
  id?: string;
  [key: string]: unknown;
}

interface FhirBundle {
  resourceType: 'Bundle';
  type: string;
  total?: number;
  entry?: Array<{
    resource: FhirResource;
    fullUrl?: string;
  }>;
}

class FhirService {
  /**
   * Create a new FHIR connection
   */
  async createConnection(
    input: FhirConnectionInput,
    userId: string
  ): Promise<FhirConnection> {
    const connection = await prisma.fhirConnection.create({
      data: {
        organizationId: input.organizationId,
        name: input.name,
        fhirVersion: input.fhirVersion || 'R4',
        baseUrl: input.baseUrl,
        authType: input.authType || FhirAuthType.SMART_ON_FHIR,
        clientId: input.clientId,
        clientSecret: input.clientSecret, // TODO: Encrypt
        scopes: input.scopes || ['patient/*.read', 'user/*.read'],
        syncDirection: input.syncDirection || FhirSyncDirection.BIDIRECTIONAL,
        status: FhirConnectionStatus.PENDING_AUTH,
      },
    });

    await auditService.log({
      action: 'fhir_connection.created',
      entity: 'fhir_connection',
      entityId: connection.id,
      organizationId: input.organizationId,
      userId,
      newValues: { name: connection.name },
    });

    return connection;
  }

  // In-memory auth state storage (for OAuth flow)
  private authStateStore: Map<string, { state: string; redirectUri: string; expiresAt: number }> = new Map();

  /**
   * Initiate SMART on FHIR authorization
   */
  async initiateAuth(
    connectionId: string,
    organizationId: string,
    redirectUri: string
  ): Promise<{ authUrl: string; state: string }> {
    const connection = await this.getConnection(connectionId, organizationId);
    if (!connection) {
      throw new Error('FHIR connection not found');
    }

    // Generate state for CSRF protection
    const state = this.generateState();

    // Get SMART configuration
    const smartConfig = await this.getSmartConfiguration(connection.baseUrl);

    // Build authorization URL
    const authParams = new URLSearchParams({
      response_type: 'code',
      client_id: connection.clientId || '',
      redirect_uri: redirectUri,
      scope: connection.scopes.join(' '),
      state,
      aud: connection.baseUrl,
    });

    const authUrl = `${smartConfig.authorizationEndpoint}?${authParams.toString()}`;

    // Store state for verification (expires in 10 minutes)
    this.authStateStore.set(connectionId, {
      state,
      redirectUri,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    return { authUrl, state };
  }

  /**
   * Complete SMART on FHIR authorization (exchange code for tokens)
   */
  async completeAuth(
    connectionId: string,
    organizationId: string,
    code: string,
    state: string
  ): Promise<FhirConnection> {
    const connection = await this.getConnection(connectionId, organizationId);
    if (!connection) {
      throw new Error('FHIR connection not found');
    }

    // Verify state from in-memory store
    const storedAuth = this.authStateStore.get(connectionId);
    if (!storedAuth || storedAuth.state !== state) {
      throw new Error('Invalid state parameter');
    }
    if (storedAuth.expiresAt < Date.now()) {
      this.authStateStore.delete(connectionId);
      throw new Error('Authorization state expired');
    }

    // Get SMART configuration
    const smartConfig = await this.getSmartConfiguration(connection.baseUrl);

    // Exchange code for tokens
    const tokenResponse = await fetch(smartConfig.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: storedAuth.redirectUri,
        client_id: connection.clientId || '',
        client_secret: connection.clientSecret || '',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange authorization code');
    }

    const tokens = await tokenResponse.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      patient?: string;
      scope?: string;
    };

    // Clean up auth state
    this.authStateStore.delete(connectionId);

    // Update connection with tokens
    const updated = await prisma.fhirConnection.update({
      where: { id: connectionId },
      data: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
        status: FhirConnectionStatus.ACTIVE,
        lastConnectedAt: new Date(),
        // Store SMART context in patientIdMapping if available
        patientIdMapping: tokens.patient || null,
      },
    });

    return updated;
  }

  /**
   * Get SMART configuration from .well-known endpoint
   */
  private async getSmartConfiguration(baseUrl: string): Promise<{
    authorizationEndpoint: string;
    tokenEndpoint: string;
    capabilities: string[];
  }> {
    // Try SMART configuration
    let response = await fetch(`${baseUrl}/.well-known/smart-configuration`);

    if (!response.ok) {
      // Fall back to metadata endpoint
      response = await fetch(`${baseUrl}/metadata`);
      if (!response.ok) {
        throw new Error('Failed to get FHIR capability statement');
      }

      const metadata = await response.json() as {
        rest?: Array<{
          security?: {
            extension?: Array<{
              url: string;
              extension?: Array<{ url: string; valueUri?: string }>;
            }>;
          };
        }>;
      };
      const security = metadata.rest?.[0]?.security;
      const oauthExtension = security?.extension?.find(
        (e) => e.url === 'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris'
      );

      return {
        authorizationEndpoint: oauthExtension?.extension?.find((e) => e.url === 'authorize')?.valueUri || '',
        tokenEndpoint: oauthExtension?.extension?.find((e) => e.url === 'token')?.valueUri || '',
        capabilities: [],
      };
    }

    const config = await response.json() as {
      authorization_endpoint?: string;
      token_endpoint?: string;
      capabilities?: string[];
    };
    return {
      authorizationEndpoint: config.authorization_endpoint || '',
      tokenEndpoint: config.token_endpoint || '',
      capabilities: config.capabilities || [],
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(connectionId: string, organizationId: string): Promise<FhirConnection> {
    const connection = await this.getConnection(connectionId, organizationId);
    if (!connection || !connection.refreshToken) {
      throw new Error('Cannot refresh token');
    }

    const smartConfig = await this.getSmartConfiguration(connection.baseUrl);

    const tokenResponse = await fetch(smartConfig.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: connection.refreshToken,
        client_id: connection.clientId || '',
        client_secret: connection.clientSecret || '',
      }),
    });

    if (!tokenResponse.ok) {
      // Mark connection as needing re-auth
      await prisma.fhirConnection.update({
        where: { id: connectionId },
        data: {
          status: FhirConnectionStatus.PENDING_AUTH,
          lastError: 'Token refresh failed',
          lastErrorAt: new Date(),
        },
      });
      throw new Error('Token refresh failed');
    }

    const tokens = await tokenResponse.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    return prisma.fhirConnection.update({
      where: { id: connectionId },
      data: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || connection.refreshToken,
        tokenExpiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
        lastConnectedAt: new Date(),
      },
    });
  }

  /**
   * Make authenticated FHIR API request
   */
  async fhirRequest(
    connectionId: string,
    organizationId: string,
    path: string,
    method: string = 'GET',
    body?: unknown
  ): Promise<FhirResource | FhirBundle> {
    let connection = await this.getConnection(connectionId, organizationId);
    if (!connection) {
      throw new Error('FHIR connection not found');
    }

    // Check if token needs refresh
    if (connection.tokenExpiresAt && connection.tokenExpiresAt < new Date()) {
      connection = await this.refreshToken(connectionId, organizationId);
    }

    const response = await fetch(`${connection.baseUrl}/${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/fhir+json',
        Accept: 'application/fhir+json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`FHIR request failed: ${error}`);
    }

    return response.json() as Promise<FhirResource | FhirBundle>;
  }

  /**
   * Sync resources from EHR
   */
  async syncFromEhr(
    connectionId: string,
    organizationId: string,
    options?: SyncOptions
  ): Promise<FhirSyncLog> {
    const connection = await this.getConnection(connectionId, organizationId);
    if (!connection) {
      throw new Error('FHIR connection not found');
    }

    // Import FhirSyncType for sync log
    const { FhirSyncType } = await import('@prisma/client');

    // Create sync log
    const syncLog = await prisma.fhirSyncLog.create({
      data: {
        connectionId,
        organizationId,
        direction: FhirSyncDirection.INBOUND,
        syncType: FhirSyncType.INCREMENTAL,
        status: FhirSyncStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
    });

    try {
      let recordsProcessed = 0;
      let recordsCreated = 0;
      let recordsUpdated = 0;
      let recordsFailed = 0;
      const errors: string[] = [];

      // Get mappings for this connection
      const mappings = await prisma.fhirResourceMapping.findMany({
        where: {
          connectionId,
          enabled: true,
          direction: { in: [FhirSyncDirection.INBOUND, FhirSyncDirection.BIDIRECTIONAL] },
        },
      });

      // Map local resource type strings to Prisma enum
      const resourceTypeMap: Record<string, PrismaFhirResourceType> = {
        Patient: 'PATIENT' as PrismaFhirResourceType,
        Observation: 'OBSERVATION' as PrismaFhirResourceType,
        Condition: 'CONDITION' as PrismaFhirResourceType,
        CarePlan: 'CAREPLAN' as PrismaFhirResourceType,
      };

      for (const resourceType of (options?.resourceTypes || ['Patient', 'Observation'])) {
        try {
          // Fetch resources
          let searchParams = '';
          if (options?.sinceDatetime) {
            searchParams = `?_lastUpdated=gt${options.sinceDatetime.toISOString()}`;
          }

          const bundle = (await this.fhirRequest(
            connectionId,
            organizationId,
            `${resourceType}${searchParams}`
          )) as FhirBundle;

          if (bundle.entry) {
            for (const entry of bundle.entry) {
              recordsProcessed++;
              try {
                const prismaResourceType = resourceTypeMap[resourceType];
                const mapping = mappings.find((m) => m.fhirResourceType === prismaResourceType);
                if (mapping) {
                  const result = await this.processInboundResource(
                    entry.resource,
                    mapping,
                    organizationId
                  );
                  if (result.created) recordsCreated++;
                  if (result.updated) recordsUpdated++;
                }
              } catch (error) {
                recordsFailed++;
                errors.push(`Error processing ${resourceType}/${entry.resource.id}: ${error}`);
              }
            }
          }
        } catch (error) {
          errors.push(`Error fetching ${resourceType}: ${error}`);
        }
      }

      // Update sync log
      return prisma.fhirSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: errors.length > 0 ? FhirSyncStatus.PARTIAL : FhirSyncStatus.COMPLETED,
          completedAt: new Date(),
          recordsProcessed,
          recordsCreated,
          recordsUpdated,
          recordsFailed,
          errorDetails: errors.length > 0 ? (errors as unknown as Prisma.InputJsonValue) : undefined,
        },
      });
    } catch (error) {
      return prisma.fhirSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: FhirSyncStatus.FAILED,
          completedAt: new Date(),
          recordsFailed: 1,
          errorMessage: String(error),
        },
      });
    }
  }

  /**
   * Process inbound FHIR resource
   */
  private async processInboundResource(
    resource: FhirResource,
    mapping: FhirResourceMapping,
    organizationId: string
  ): Promise<{ created: boolean; updated: boolean }> {
    // fieldMappings contains the mapping configuration
    const _fieldMappings = mapping.fieldMappings as Record<string, unknown>;

    switch (mapping.localEntityType) {
      case 'Patient':
        return this.processPatientResource(resource, organizationId);
      case 'VitalReading':
        return this.processObservationResource(resource, organizationId);
      case 'CarePlan':
        return this.processCarePlanResource(resource, organizationId);
      default:
        return { created: false, updated: false };
    }
  }

  /**
   * Process FHIR Patient resource
   * NOTE: Patient schema doesn't have externalId/mrn fields.
   * Full FHIR patient sync would require schema changes.
   * Currently returns false for all operations.
   */
  private async processPatientResource(
    _resource: FhirResource,
    _organizationId: string
  ): Promise<{ created: boolean; updated: boolean }> {
    // TODO: Implement when Patient schema supports external IDs (mrn field)
    // The Patient model requires a linked User, making direct FHIR patient
    // creation complex. For now, skip patient sync.
    console.warn('FHIR Patient sync not implemented - schema needs externalId/mrn field');
    return { created: false, updated: false };
  }

  /**
   * Process FHIR Observation resource (vital signs)
   * NOTE: Depends on patient sync which is not implemented.
   */
  private async processObservationResource(
    _resource: FhirResource,
    _organizationId: string
  ): Promise<{ created: boolean; updated: boolean }> {
    // TODO: Implement when Patient schema supports external IDs
    console.warn('FHIR Observation sync not implemented - requires patient sync');
    return { created: false, updated: false };
  }

  /**
   * Process FHIR CarePlan resource
   * NOTE: Depends on patient sync which is not implemented.
   */
  private async processCarePlanResource(
    _resource: FhirResource,
    _organizationId: string
  ): Promise<{ created: boolean; updated: boolean }> {
    // TODO: Implement when Patient schema supports external IDs
    console.warn('FHIR CarePlan sync not implemented - requires patient sync');
    return { created: false, updated: false };
  }

  /**
   * Map FHIR gender to local enum
   */
  private mapFhirGender(fhirGender?: string): string {
    const genderMap: Record<string, string> = {
      male: 'MALE',
      female: 'FEMALE',
      other: 'OTHER',
      unknown: 'UNKNOWN',
    };
    return genderMap[fhirGender?.toLowerCase() || ''] || 'UNKNOWN';
  }

  /**
   * Map LOINC code to VitalType
   */
  private mapLoincToVitalType(loincCode?: string): VitalType | null {
    const loincMap: Record<string, VitalType> = {
      '85354-9': VitalType.BLOOD_PRESSURE, // Blood pressure panel
      '8480-6': VitalType.BLOOD_PRESSURE, // Systolic BP
      '8462-4': VitalType.BLOOD_PRESSURE, // Diastolic BP
      '29463-7': VitalType.WEIGHT,
      '2339-0': VitalType.BLOOD_GLUCOSE,
      '59408-5': VitalType.PULSE_OXIMETRY, // SpO2
      '8867-4': VitalType.HEART_RATE,
      '8310-5': VitalType.TEMPERATURE,
    };
    return loincMap[loincCode || ''] || null;
  }

  /**
   * Generate state parameter for OAUTH
   */
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
  }

  /**
   * Get connection by ID
   */
  async getConnection(
    connectionId: string,
    organizationId: string
  ): Promise<FhirConnection | null> {
    return prisma.fhirConnection.findFirst({
      where: { id: connectionId, organizationId },
    });
  }

  /**
   * Get all connections for organization
   */
  async getConnections(organizationId: string): Promise<FhirConnection[]> {
    return prisma.fhirConnection.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Test connection health
   */
  async testConnection(
    connectionId: string,
    organizationId: string
  ): Promise<{ healthy: boolean; message: string }> {
    try {
      await this.fhirRequest(
        connectionId,
        organizationId,
        'metadata'
      );

      await prisma.fhirConnection.update({
        where: { id: connectionId },
        data: {
          status: FhirConnectionStatus.ACTIVE,
          lastConnectedAt: new Date(),
          lastError: null,
        },
      });

      return { healthy: true, message: 'Connection is healthy' };
    } catch (error) {
      await prisma.fhirConnection.update({
        where: { id: connectionId },
        data: {
          status: FhirConnectionStatus.ERROR,
          lastErrorAt: new Date(),
          lastError: String(error),
        },
      });

      return { healthy: false, message: String(error) };
    }
  }

  /**
   * Create resource mapping
   */
  async createMapping(
    input: FhirResourceMappingInput,
    organizationId: string,
    userId: string
  ): Promise<FhirResourceMapping> {
    // Map local resource type to Prisma enum
    const resourceTypeMap: Record<string, PrismaFhirResourceType> = {
      Patient: 'PATIENT' as PrismaFhirResourceType,
      Observation: 'OBSERVATION' as PrismaFhirResourceType,
      Condition: 'CONDITION' as PrismaFhirResourceType,
      CarePlan: 'CAREPLAN' as PrismaFhirResourceType,
      Device: 'ENCOUNTER' as PrismaFhirResourceType, // Map Device to available type
      Practitioner: 'PROCEDURE' as PrismaFhirResourceType, // Map Practitioner to available type
      Organization: 'DIAGNOSTICREPORT' as PrismaFhirResourceType,
    };
    const prismaResourceType = resourceTypeMap[input.fhirResourceType] || ('PATIENT' as PrismaFhirResourceType);

    const mapping = await prisma.fhirResourceMapping.create({
      data: {
        connectionId: input.connectionId,
        organizationId,
        fhirResourceType: prismaResourceType,
        localEntityType: input.localEntityType,
        direction: input.direction || FhirSyncDirection.BIDIRECTIONAL,
        fieldMappings: (input.fieldMappings || {}) as Prisma.InputJsonValue,
        enabled: true,
      },
    });

    await auditService.log({
      action: 'fhir_mapping.created',
      entity: 'fhir_mapping',
      entityId: mapping.id,
      organizationId,
      userId,
      newValues: {
        fhirResourceType: input.fhirResourceType,
        localEntityType: input.localEntityType,
      },
    });

    return mapping;
  }

  /**
   * Get sync logs
   */
  async getSyncLogs(
    connectionId: string,
    organizationId: string,
    limit: number = 20
  ): Promise<FhirSyncLog[]> {
    return prisma.fhirSyncLog.findMany({
      where: { connectionId, organizationId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Delete connection
   */
  async deleteConnection(
    connectionId: string,
    organizationId: string,
    userId: string
  ): Promise<void> {
    const connection = await this.getConnection(connectionId, organizationId);
    if (!connection) {
      throw new Error('FHIR connection not found');
    }

    await prisma.fhirConnection.delete({
      where: { id: connectionId },
    });

    await auditService.log({
      action: 'fhir_connection.deleted',
      entity: 'fhir_connection',
      entityId: connectionId,
      organizationId,
      userId,
      oldValues: { name: connection.name },
    });
  }
}

export const fhirService = new FhirService();
