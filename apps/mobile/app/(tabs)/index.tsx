import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  RefreshControl,
  TouchableOpacity,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { Colors, brand, vitals as vitalColors, semantic } from '@/constants/Colors';
import { useAuthStore } from '@/stores/auth-store';
import { patientApi, DashboardStats, VitalReading, Alert } from '@/lib/api/patient-portal';
import { caregiverApi, LinkedPatient } from '@/lib/api/caregiver-portal';
import { UpcomingSessions } from '@/components/patient/UpcomingSessions';

const { width } = Dimensions.get('window');

// Circular Progress Ring Component
function HealthRing({ progress, size = 180, strokeWidth = 12 }: { progress: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <SvgGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={brand.primary} />
            <Stop offset="100%" stopColor={brand.primaryLight} />
          </SvgGradient>
        </Defs>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#gradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={styles.ringContent}>
        <Text style={[styles.ringValue, { color: brand.primary }]}>{progress}%</Text>
        <Text style={styles.ringLabel}>Health Score</Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { user, organization } = useAuthStore();

  const isCaregiver = organization?.role === 'Caregiver';

  if (isCaregiver) {
    return <CaregiverDashboard colors={colors} />;
  }

  return <PatientDashboard colors={colors} userName={user?.firstName || 'there'} />;
}

// Patient Dashboard - Flo-inspired design
function PatientDashboard({ colors, userName }: { colors: typeof Colors.light; userName: string }) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentVitals, setRecentVitals] = useState<VitalReading[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const fetchData = async () => {
    try {
      const [statsData, vitalsData, alertsData] = await Promise.all([
        patientApi.getDashboard(),
        patientApi.getVitals({ limit: 7 }),
        patientApi.getAlerts(),
      ]);
      setStats(statsData);
      setRecentVitals(vitalsData.slice(0, 4));
      setAlerts(alertsData.filter((a: Alert) => !a.read).slice(0, 3));
    } catch (err) {
      console.error('Failed to fetch data:', err);
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

  const quickActions = [
    { icon: 'heart', label: 'Blood Pressure', type: 'BLOOD_PRESSURE', colors: vitalColors.bloodPressure },
    { icon: 'water', label: 'Glucose', type: 'BLOOD_GLUCOSE', colors: vitalColors.bloodGlucose },
    { icon: 'fitness', label: 'Weight', type: 'WEIGHT', colors: vitalColors.weight },
    { icon: 'pulse', label: 'Oxygen', type: 'OXYGEN_SATURATION', colors: vitalColors.oxygen },
  ];

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
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              Good {getTimeOfDay()}
            </Text>
            <Text style={[styles.userName, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
              {userName}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.notificationBtn, {
              backgroundColor: isDark ? '#1F1F2A' : '#FFFFFF',
              shadowColor: isDark ? '#000' : '#6B7280',
            }]}
            onPress={() => router.push('/(tabs)/alerts')}
          >
            <Ionicons name="notifications-outline" size={22} color={isDark ? '#F9FAFB' : '#1F2937'} />
            {alerts.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{alerts.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Health Score Ring Card */}
        <View style={[styles.healthCard, {
          backgroundColor: isDark ? '#1F1F2A' : '#FFFFFF',
          shadowColor: isDark ? '#000' : '#6B7280',
        }]}>
          <HealthRing progress={stats?.complianceRate ?? 85} />
          <View style={styles.healthStats}>
            <View style={styles.healthStat}>
              <Text style={[styles.statValue, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
                {stats?.todayReadings ?? 0}
              </Text>
              <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                Today
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: isDark ? '#2D2D3A' : '#F3F4F6' }]} />
            <View style={styles.healthStat}>
              <Text style={[styles.statValue, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
                {stats?.weekReadings ?? 0}
              </Text>
              <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                This Week
              </Text>
            </View>
          </View>
        </View>

        {/* Upcoming Video Consultations */}
        <UpcomingSessions limit={2} />

        {/* Quick Actions - Vital Recording */}
        <Text style={[styles.sectionTitle, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
          Record Vitals
        </Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.type}
              style={[styles.actionCard, { backgroundColor: action.colors.background }]}
              onPress={() => router.push(`/record-vitals/${action.type}`)}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.colors.primary + '20' }]}>
                <Ionicons name={action.icon as any} size={24} color={action.colors.primary} />
              </View>
              <Text style={[styles.actionLabel, { color: action.colors.primary }]}>
                {action.label}
              </Text>
              <Ionicons name="add-circle" size={20} color={action.colors.primary} style={styles.actionAdd} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Activity */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
            Recent Activity
          </Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/vitals')}>
            <Text style={[styles.seeAll, { color: brand.primary }]}>See All</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.activityCard, {
          backgroundColor: isDark ? '#1F1F2A' : '#FFFFFF',
          shadowColor: isDark ? '#000' : '#6B7280',
        }]}>
          {recentVitals.length > 0 ? (
            recentVitals.map((vital, index) => {
              const vitalConfig = getVitalConfig(vital.type);
              return (
                <View
                  key={vital.id}
                  style={[
                    styles.activityItem,
                    index < recentVitals.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: isDark ? '#2D2D3A' : '#F3F4F6',
                    },
                  ]}
                >
                  <View style={[styles.activityIcon, { backgroundColor: vitalConfig.background }]}>
                    <Ionicons name={vitalConfig.icon as any} size={18} color={vitalConfig.primary} />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={[styles.activityTitle, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
                      {vitalConfig.label}
                    </Text>
                    <Text style={[styles.activityTime, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
                      {formatTime(vital.recordedAt)}
                    </Text>
                  </View>
                  <View style={styles.activityValue}>
                    <Text style={[styles.valueText, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
                      {formatVitalValue(vital)}
                    </Text>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: vital.status === 'NORMAL' ? '#ECFDF5' : '#FFF1F1' }
                    ]}>
                      <View style={[
                        styles.statusDot,
                        { backgroundColor: vital.status === 'NORMAL' ? '#4ADE80' : '#FF6B6B' }
                      ]} />
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: isDark ? '#2D2D3A' : '#F5F3FF' }]}>
                <Ionicons name="pulse-outline" size={32} color={brand.secondary} />
              </View>
              <Text style={[styles.emptyTitle, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
                No readings yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
                Start tracking your health
              </Text>
            </View>
          )}
        </View>

        {/* Alerts Preview */}
        {alerts.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
                Alerts
              </Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/alerts')}>
                <Text style={[styles.seeAll, { color: brand.primary }]}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.alertsCard, {
              backgroundColor: isDark ? '#1F1F2A' : '#FFFFFF',
              shadowColor: isDark ? '#000' : '#6B7280',
            }]}>
              {alerts.map((alert, index) => (
                <View
                  key={alert.id}
                  style={[
                    styles.alertItem,
                    index < alerts.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: isDark ? '#2D2D3A' : '#F3F4F6',
                    },
                  ]}
                >
                  <View style={[
                    styles.alertIcon,
                    { backgroundColor: alert.severity === 'CRITICAL' ? '#FFF1F1' : '#FFFBEB' }
                  ]}>
                    <Ionicons
                      name="alert-circle"
                      size={20}
                      color={alert.severity === 'CRITICAL' ? '#FF6B6B' : '#FBBF24'}
                    />
                  </View>
                  <View style={styles.alertContent}>
                    <Text style={[styles.alertTitle, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
                      {alert.title}
                    </Text>
                    <Text
                      style={[styles.alertMessage, { color: isDark ? '#6B7280' : '#9CA3AF' }]}
                      numberOfLines={1}
                    >
                      {alert.message || 'Tap to view details'}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={isDark ? '#4B5563' : '#D1D5DB'}
                  />
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Caregiver Dashboard
function CaregiverDashboard({ colors }: { colors: typeof Colors.light }) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const [refreshing, setRefreshing] = useState(false);
  const [patients, setPatients] = useState<LinkedPatient[]>([]);

  const fetchData = async () => {
    try {
      const patientsData = await caregiverApi.getLinkedPatients();
      setPatients(patientsData);
    } catch (error) {
      console.error('Failed to fetch patients:', error);
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
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.pageTitle, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
          My Patients
        </Text>
        <Text style={[styles.pageSubtitle, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
          {patients.length} {patients.length === 1 ? 'person' : 'people'} in your care
        </Text>

        {patients.map((patient) => (
          <TouchableOpacity
            key={patient.id}
            onPress={() => router.push(`/patient/${patient.id}`)}
            activeOpacity={0.7}
          >
            <View style={[styles.patientCard, {
              backgroundColor: isDark ? '#1F1F2A' : '#FFFFFF',
              shadowColor: isDark ? '#000' : '#6B7280',
            }]}>
              <LinearGradient
                colors={[brand.primary, brand.primaryLight]}
                style={styles.patientAvatar}
              >
                <Text style={styles.avatarText}>
                  {patient.firstName[0]}{patient.lastName[0]}
                </Text>
              </LinearGradient>
              <View style={styles.patientInfo}>
                <Text style={[styles.patientName, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
                  {patient.firstName} {patient.lastName}
                </Text>
                <Text style={[styles.patientRelation, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
                  {patient.relationship}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={22}
                color={isDark ? '#4B5563' : '#D1D5DB'}
              />
            </View>
          </TouchableOpacity>
        ))}

        {patients.length === 0 && (
          <View style={[styles.emptyCard, {
            backgroundColor: isDark ? '#1F1F2A' : '#FFFFFF'
          }]}>
            <View style={[styles.emptyIcon, { backgroundColor: isDark ? '#2D2D3A' : '#F5F3FF' }]}>
              <Ionicons name="people-outline" size={40} color={brand.secondary} />
            </View>
            <Text style={[styles.emptyTitle, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
              No Patients Yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
              Contact your provider to link patients
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper functions
function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function getVitalConfig(type: string) {
  const configs: Record<string, { icon: string; label: string; primary: string; background: string }> = {
    BLOOD_PRESSURE: { icon: 'heart', label: 'Blood Pressure', ...vitalColors.bloodPressure },
    BLOOD_GLUCOSE: { icon: 'water', label: 'Blood Glucose', ...vitalColors.bloodGlucose },
    WEIGHT: { icon: 'fitness', label: 'Weight', ...vitalColors.weight },
    OXYGEN_SATURATION: { icon: 'pulse', label: 'Oxygen', ...vitalColors.oxygen },
  };
  return configs[type] || { icon: 'analytics', label: type, primary: '#7B6EF6', background: '#F0EEFF' };
}

function formatVitalValue(vital: VitalReading) {
  if (vital.type === 'BLOOD_PRESSURE') {
    return `${vital.values.systolic || '-'}/${vital.values.diastolic || '-'}`;
  }
  return `${vital.values.value || '-'}`;
}

function formatTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);

  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  userName: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  notificationBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: semantic.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },

  // Health Card with Ring
  healthCard: {
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    marginBottom: 28,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  ringContent: {
    position: 'absolute',
    alignItems: 'center',
  },
  ringValue: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1,
  },
  ringLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
    marginTop: 2,
  },
  healthStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
    justifyContent: 'center',
    gap: 32,
  },
  healthStat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
  },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Actions Grid
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  actionCard: {
    width: (width - 52) / 2,
    borderRadius: 20,
    padding: 16,
    position: 'relative',
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionAdd: {
    position: 'absolute',
    top: 14,
    right: 14,
    opacity: 0.6,
  },

  // Activity Card
  activityCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 13,
    fontWeight: '500',
  },
  activityValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  valueText: {
    fontSize: 15,
    fontWeight: '600',
  },
  statusBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  alertMessage: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Empty State
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Caregiver
  pageTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 24,
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    gap: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  patientAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  patientRelation: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 48,
    borderRadius: 24,
  },
});
