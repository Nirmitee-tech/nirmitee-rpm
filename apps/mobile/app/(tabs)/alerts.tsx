import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  RefreshControl,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, brand, semantic } from '@/constants/Colors';
import { patientApi, Alert } from '@/lib/api/patient-portal';

type FilterType = 'all' | 'unread' | 'critical';

export default function AlertsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');

  const fetchData = async () => {
    try {
      const alertsData = await patientApi.getAlerts();
      setAlerts(alertsData);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Filter alerts
  const filteredAlerts = alerts.filter((alert) => {
    if (filter === 'unread') return !alert.read;
    if (filter === 'critical') return alert.severity === 'CRITICAL';
    return true;
  });

  // Stats
  const unreadCount = alerts.filter((a) => !a.read).length;
  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL').length;

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'critical', label: 'Critical' },
  ];

  const markAsRead = async (alertId: string) => {
    try {
      await patientApi.markAlertRead(alertId);
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, read: true } : a))
      );
    } catch (error) {
      console.error('Failed to mark alert as read:', error);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: isDark ? '#0F0F14' : '#FAF9FF' }]}
      edges={['top']}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={brand.primary}
            colors={[brand.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={[styles.pageTitle, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
          Alerts
        </Text>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: brand.primaryMuted }]}>
            <View style={[styles.statIcon, { backgroundColor: brand.primary + '20' }]}>
              <Ionicons name="notifications" size={20} color={brand.primary} />
            </View>
            <Text style={[styles.statValue, { color: brand.primary }]}>{unreadCount}</Text>
            <Text style={[styles.statLabel, { color: brand.primary }]}>Unread</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: semantic.dangerLight }]}>
            <View style={[styles.statIcon, { backgroundColor: semantic.danger + '20' }]}>
              <Ionicons name="alert-circle" size={20} color={semantic.danger} />
            </View>
            <Text style={[styles.statValue, { color: semantic.danger }]}>{criticalCount}</Text>
            <Text style={[styles.statLabel, { color: semantic.danger }]}>Critical</Text>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={[styles.filterRow, {
          backgroundColor: isDark ? '#1F1F2A' : '#F3F4F6',
        }]}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterTab,
                filter === f.key && {
                  backgroundColor: isDark ? '#2D2D3A' : '#FFFFFF',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 1,
                },
              ]}
              onPress={() => setFilter(f.key)}
            >
              <Text
                style={[
                  styles.filterText,
                  {
                    color: filter === f.key
                      ? (isDark ? '#F9FAFB' : '#1F2937')
                      : (isDark ? '#6B7280' : '#9CA3AF'),
                    fontWeight: filter === f.key ? '600' : '500',
                  },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Alerts List */}
        {filteredAlerts.length > 0 ? (
          <View style={[styles.alertsCard, {
            backgroundColor: isDark ? '#1F1F2A' : '#FFFFFF',
            shadowColor: isDark ? '#000' : '#6B7280',
          }]}>
            {filteredAlerts.map((alert, index) => (
              <TouchableOpacity
                key={alert.id}
                style={[
                  styles.alertItem,
                  index < filteredAlerts.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: isDark ? '#2D2D3A' : '#F3F4F6',
                  },
                ]}
                onPress={() => !alert.read && markAsRead(alert.id)}
                activeOpacity={0.7}
              >
                {/* Unread indicator */}
                {!alert.read && <View style={styles.unreadDot} />}

                <View style={[
                  styles.alertIcon,
                  {
                    backgroundColor: alert.severity === 'CRITICAL' ? '#FFF1F1'
                      : alert.severity === 'HIGH' ? '#FFFBEB'
                      : '#F0EEFF'
                  }
                ]}>
                  <Ionicons
                    name={alert.severity === 'CRITICAL' ? 'alert-circle' : 'information-circle'}
                    size={22}
                    color={
                      alert.severity === 'CRITICAL' ? '#FF6B6B'
                        : alert.severity === 'HIGH' ? '#FBBF24'
                        : '#7B6EF6'
                    }
                  />
                </View>
                <View style={styles.alertContent}>
                  <Text style={[
                    styles.alertTitle,
                    {
                      color: isDark ? '#F9FAFB' : '#1F2937',
                      fontWeight: !alert.read ? '700' : '600',
                    }
                  ]}>
                    {alert.title}
                  </Text>
                  <Text
                    style={[styles.alertMessage, { color: isDark ? '#6B7280' : '#9CA3AF' }]}
                    numberOfLines={2}
                  >
                    {alert.message || 'Tap to view details'}
                  </Text>
                  <Text style={[styles.alertTime, { color: isDark ? '#4B5563' : '#D1D5DB' }]}>
                    {formatTime(alert.createdAt)}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={isDark ? '#4B5563' : '#D1D5DB'}
                />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={[styles.emptyCard, {
            backgroundColor: isDark ? '#1F1F2A' : '#FFFFFF',
            shadowColor: isDark ? '#000' : '#6B7280',
          }]}>
            <View style={[styles.emptyIcon, { backgroundColor: isDark ? '#2D2D3A' : '#ECFDF5' }]}>
              <Ionicons name="checkmark-circle" size={44} color="#4ADE80" />
            </View>
            <Text style={[styles.emptyTitle, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
              All Clear!
            </Text>
            <Text style={[styles.emptySubtitle, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
              {filter === 'all'
                ? 'You have no alerts at this time.'
                : filter === 'unread'
                  ? 'All alerts have been read.'
                  : 'No critical alerts.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },

  // Header
  pageTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 20,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },

  // Filter
  filterRow: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  filterText: {
    fontSize: 14,
  },

  // Alerts Card
  alertsCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    left: 8,
    top: '50%',
    marginTop: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: brand.primary,
  },
  alertIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 15,
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    marginBottom: 6,
  },
  alertTime: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Empty State
  emptyCard: {
    borderRadius: 24,
    padding: 48,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
});
