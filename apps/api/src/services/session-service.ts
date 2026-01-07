import { prisma } from '../utils/prisma';
import { ApiError } from '../utils/api-error';
import { UAParser } from 'ua-parser-js';

interface SessionMetadata {
  ipAddress?: string;
  userAgent?: string;
}

interface ParsedSession {
  id: string;
  userId: string;
  token: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceType: string;
  browser: string;
  os: string;
  location: string | null;
  lastActive: Date;
  createdAt: Date;
  expiresAt: Date;
  isCurrent: boolean;
}

export class SessionService {
  /**
   * Parse user agent string to extract device/browser info
   */
  private parseUserAgent(userAgentString: string): { deviceType: string; browser: string; os: string } {
    const parser = new UAParser();
    parser.setUA(userAgentString);
    const result = parser.getResult();

    const deviceType = result.device.type || 'desktop';
    const browser = result.browser.name || 'Unknown';
    const os = result.os.name || 'Unknown';

    return { deviceType, browser, os };
  }

  /**
   * Get location from IP address (placeholder - can integrate with IP geolocation service)
   */
  private async getLocationFromIP(ipAddress: string): Promise<string | null> {
    // Placeholder for IP geolocation
    // In production, integrate with services like:
    // - ipapi.co
    // - ip-api.com
    // - MaxMind GeoIP2

    // For localhost/development
    if (ipAddress.includes('127.0.0.1') || ipAddress.includes('::1') || ipAddress.includes('localhost')) {
      return 'Local Development';
    }

    return null;
  }

  /**
   * Create session with metadata
   */
  async createSession(
    userId: string,
    refreshToken: string,
    expiresAt: Date,
    metadata?: SessionMetadata
  ): Promise<void> {
    await prisma.session.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      },
    });
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string, currentToken?: string): Promise<ParsedSession[]> {
    const sessions = await prisma.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    const parsedSessions: ParsedSession[] = await Promise.all(
      sessions.map(async (session) => {
        let deviceType = 'desktop';
        let browser = 'Unknown';
        let os = 'Unknown';

        if (session.userAgent) {
          const parsed = this.parseUserAgent(session.userAgent);
          deviceType = parsed.deviceType;
          browser = parsed.browser;
          os = parsed.os;
        }

        let location = null;
        if (session.ipAddress) {
          location = await this.getLocationFromIP(session.ipAddress);
        }

        return {
          id: session.id,
          userId: session.userId,
          token: session.token,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          deviceType,
          browser,
          os,
          location,
          lastActive: session.createdAt, // Can be updated to track last activity
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
          isCurrent: currentToken === session.token,
        };
      })
    );

    return parsedSessions;
  }

  /**
   * Get current session info
   */
  async getCurrentSession(userId: string, token: string): Promise<ParsedSession | null> {
    const session = await prisma.session.findFirst({
      where: {
        userId,
        token,
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      return null;
    }

    let deviceType = 'desktop';
    let browser = 'Unknown';
    let os = 'Unknown';

    if (session.userAgent) {
      const parsed = this.parseUserAgent(session.userAgent);
      deviceType = parsed.deviceType;
      browser = parsed.browser;
      os = parsed.os;
    }

    let location = null;
    if (session.ipAddress) {
      location = await this.getLocationFromIP(session.ipAddress);
    }

    return {
      id: session.id,
      userId: session.userId,
      token: session.token,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      deviceType,
      browser,
      os,
      location,
      lastActive: session.createdAt,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      isCurrent: true,
    };
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await prisma.session.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw ApiError.notFound('Session not found');
    }

    await prisma.session.delete({
      where: { id: sessionId },
    });
  }

  /**
   * Revoke all sessions except current
   */
  async revokeAllOtherSessions(userId: string, currentToken: string): Promise<number> {
    const result = await prisma.session.deleteMany({
      where: {
        userId,
        token: { not: currentToken },
      },
    });

    return result.count;
  }

  /**
   * Clean up expired sessions (can be run as a scheduled job)
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    return result.count;
  }
}

export const sessionService = new SessionService();
