import { prisma } from '../utils/prisma';
import { log } from '../utils/logger';

export interface SearchOptions {
  organizationId: string;
  entityTypes?: string[];
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  entityType: string;
  entityId: string;
  title: string;
  subtitle?: string;
  highlight?: string;
  score: number;
}

export interface SearchResults {
  results: SearchResult[];
  total: number;
  query: string;
}

class SearchService {
  /**
   * Global search across multiple entity types
   */
  async search(query: string, options: SearchOptions): Promise<SearchResults> {
    const { organizationId, entityTypes, limit = 20, offset = 0 } = options;

    if (!query || query.trim().length === 0) {
      return { results: [], total: 0, query };
    }

    const searchTerm = query.trim();
    const results: SearchResult[] = [];

    // Determine which entity types to search
    const typesToSearch = entityTypes || ['user', 'team', 'patient'];

    // Search Users
    if (typesToSearch.includes('user')) {
      const users = await this.searchUsers(organizationId, searchTerm, limit);
      results.push(...users);
    }

    // Search Teams
    if (typesToSearch.includes('team')) {
      const teams = await this.searchTeams(organizationId, searchTerm, limit);
      results.push(...teams);
    }

    // Search Patients (if exists)
    if (typesToSearch.includes('patient')) {
      const patients = await this.searchPatients(organizationId, searchTerm, limit);
      results.push(...patients);
    }

    // Sort by score and apply limit/offset
    const sortedResults = results
      .sort((a, b) => b.score - a.score)
      .slice(offset, offset + limit);

    return {
      results: sortedResults,
      total: results.length,
      query: searchTerm,
    };
  }

  /**
   * Search users using PostgreSQL full-text search
   */
  private async searchUsers(
    organizationId: string,
    query: string,
    limit: number
  ): Promise<SearchResult[]> {
    const searchPattern = `%${query}%`;

    const users = await prisma.$queryRaw<
      Array<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        avatar: string | null;
      }>
    >`
      SELECT u.id, u.email, u."firstName", u."lastName", u.avatar
      FROM users u
      INNER JOIN organization_members om ON om."userId" = u.id
      WHERE om."organizationId" = ${organizationId}
        AND u."isActive" = true
        AND (
          u.email ILIKE ${searchPattern}
          OR u."firstName" ILIKE ${searchPattern}
          OR u."lastName" ILIKE ${searchPattern}
          OR CONCAT(u."firstName", ' ', u."lastName") ILIKE ${searchPattern}
        )
      LIMIT ${limit}
    `;

    return users.map((user) => ({
      entityType: 'user',
      entityId: user.id,
      title: `${user.firstName} ${user.lastName}`,
      subtitle: user.email,
      score: this.calculateScore(query, `${user.firstName} ${user.lastName} ${user.email}`),
    }));
  }

  /**
   * Search teams
   */
  private async searchTeams(
    organizationId: string,
    query: string,
    limit: number
  ): Promise<SearchResult[]> {
    const searchPattern = `%${query}%`;

    const teams = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        description: string | null;
        memberCount: bigint;
      }>
    >`
      SELECT
        t.id,
        t.name,
        t.description,
        COUNT(tm.id)::int as "memberCount"
      FROM teams t
      LEFT JOIN team_members tm ON tm."teamId" = t.id
      WHERE t."organizationId" = ${organizationId}
        AND (
          t.name ILIKE ${searchPattern}
          OR t.description ILIKE ${searchPattern}
        )
      GROUP BY t.id
      LIMIT ${limit}
    `;

    return teams.map((team) => ({
      entityType: 'team',
      entityId: team.id,
      title: team.name,
      subtitle: team.description || `${Number(team.memberCount)} members`,
      score: this.calculateScore(query, `${team.name} ${team.description || ''}`),
    }));
  }

  /**
   * Search patients
   */
  private async searchPatients(
    organizationId: string,
    query: string,
    limit: number
  ): Promise<SearchResult[]> {
    try {
      const searchPattern = `%${query}%`;

      const patients = await prisma.$queryRaw<
        Array<{
          id: string;
          userId: string;
          firstName: string;
          lastName: string;
          email: string;
          enrollmentStatus: string;
        }>
      >`
        SELECT
          p.id,
          p."userId",
          u."firstName",
          u."lastName",
          u.email,
          p."enrollmentStatus"
        FROM patients p
        INNER JOIN users u ON u.id = p."userId"
        WHERE p."organizationId" = ${organizationId}
          AND (
            u.email ILIKE ${searchPattern}
            OR u."firstName" ILIKE ${searchPattern}
            OR u."lastName" ILIKE ${searchPattern}
            OR CONCAT(u."firstName", ' ', u."lastName") ILIKE ${searchPattern}
          )
        LIMIT ${limit}
      `;

      return patients.map((patient) => ({
        entityType: 'patient',
        entityId: patient.id,
        title: `${patient.firstName} ${patient.lastName}`,
        subtitle: `${patient.email} • ${patient.enrollmentStatus}`,
        score: this.calculateScore(
          query,
          `${patient.firstName} ${patient.lastName} ${patient.email}`
        ),
      }));
    } catch (error) {
      // Table might not exist yet - return empty results
      log.warn('Patient search failed:', { error: error });
      return [];
    }
  }

  /**
   * Calculate relevance score (simple implementation)
   */
  private calculateScore(query: string, text: string): number {
    const lowerQuery = query.toLowerCase();
    const lowerText = text.toLowerCase();

    // Exact match gets highest score
    if (lowerText === lowerQuery) return 100;

    // Starts with query gets high score
    if (lowerText.startsWith(lowerQuery)) return 90;

    // Contains query gets medium score
    if (lowerText.includes(lowerQuery)) return 70;

    // Calculate word-level matches
    const queryWords = lowerQuery.split(/\s+/);
    const textWords = lowerText.split(/\s+/);
    const matchingWords = queryWords.filter((word) =>
      textWords.some((textWord) => textWord.includes(word))
    );

    return (matchingWords.length / queryWords.length) * 50;
  }

  /**
   * Index an entity (for future use with dedicated search indexes)
   */
  async indexEntity(entityType: string, entity: unknown): Promise<void> {
    // Placeholder for future implementation
    // Could integrate with Elasticsearch, MeiliSearch, etc.
    log.debug('Indexing entity', { entityType, entity });
  }

  /**
   * Remove entity from index
   */
  async removeEntity(entityType: string, entityId: string): Promise<void> {
    // Placeholder for future implementation
    log.debug('Removing entity from index', { entityType, entityId });
  }

  /**
   * Reindex all entities
   */
  async reindex(entityType?: string): Promise<void> {
    // Placeholder for future implementation
    log.info('Reindexing entities', { entityType: entityType || 'all' });
  }
}

export const searchService = new SearchService();
