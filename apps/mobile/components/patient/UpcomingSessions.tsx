import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { format, isToday, isTomorrow, formatDistanceToNow } from 'date-fns';

import { telehealthApi, TelehealthSession } from '@/lib/api/telehealth';
import { brand, semantic } from '@/constants/Colors';

interface UpcomingSessionsProps {
  limit?: number;
}

export function UpcomingSessions({ limit = 3 }: UpcomingSessionsProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  const [sessions, setSessions] = useState<TelehealthSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const upcomingSessions = await telehealthApi.getUpcomingSessions();
      setSessions(upcomingSessions.slice(0, limit));
    } catch (err) {
      console.error('[UpcomingSessions] Failed to fetch:', err);
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const formatScheduledTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return `Today at ${format(date, 'h:mm a')}`;
    }
    if (isTomorrow(date)) {
      return `Tomorrow at ${format(date, 'h:mm a')}`;
    }
    return format(date, 'MMM d, h:mm a');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return '#22C55E';
      case 'SCHEDULED':
        return brand.primary;
      default:
        return '#9CA3AF';
    }
  };

  const handleJoinCall = (sessionId: string) => {
    router.push(`/video-call/${sessionId}`);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#1F1F2A' : '#FFFFFF' }]}>
        <ActivityIndicator size="small" color={brand.primary} />
      </View>
    );
  }

  if (error || sessions.length === 0) {
    return null; // Don't show anything if no sessions
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
          Video Consultations
        </Text>
        {/* TODO: Add telehealth list page */}
      </View>

      <View style={[styles.container, {
        backgroundColor: isDark ? '#1F1F2A' : '#FFFFFF',
        shadowColor: isDark ? '#000' : '#6B7280',
      }]}>
        {sessions.map((session, index) => {
          const isActive = session.status === 'ACTIVE';
          const providerName = session.provider
            ? `Dr. ${session.provider.firstName} ${session.provider.lastName}`
            : 'Your Provider';

          return (
            <View
              key={session.id}
              style={[
                styles.sessionItem,
                index < sessions.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: isDark ? '#2D2D3A' : '#F3F4F6',
                },
              ]}
            >
              {/* Video icon */}
              <View style={[styles.iconContainer, {
                backgroundColor: isActive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(116, 94, 225, 0.1)',
              }]}>
                <Ionicons
                  name="videocam"
                  size={20}
                  color={isActive ? '#22C55E' : brand.primary}
                />
              </View>

              {/* Session info */}
              <View style={styles.sessionInfo}>
                <Text style={[styles.providerName, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
                  {providerName}
                </Text>
                <View style={styles.timeRow}>
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color={isDark ? '#6B7280' : '#9CA3AF'}
                  />
                  <Text style={[styles.timeText, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
                    {formatScheduledTime(session.scheduledAt)}
                  </Text>
                </View>
              </View>

              {/* Status / Join button */}
              {isActive ? (
                <TouchableOpacity
                  style={styles.joinButton}
                  onPress={() => handleJoinCall(session.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.joinButtonText}>Join Now</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.statusBadge, {
                  backgroundColor: 'rgba(116, 94, 225, 0.1)',
                }]}>
                  <View style={[styles.statusDot, { backgroundColor: brand.primary }]} />
                  <Text style={[styles.statusText, { color: brand.primary }]}>
                    Scheduled
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  joinButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
