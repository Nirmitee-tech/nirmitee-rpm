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
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, brand, vitals as vitalColors } from '@/constants/Colors';
import { patientApi, VitalReading } from '@/lib/api/patient-portal';

const { width } = Dimensions.get('window');

const vitalConfig = {
  BLOOD_PRESSURE: {
    icon: 'heart' as const,
    label: 'Blood Pressure',
    unit: 'mmHg',
    ...vitalColors.bloodPressure,
    format: (v: Record<string, number>) => `${v.systolic || '-'}/${v.diastolic || '-'}`,
  },
  BLOOD_GLUCOSE: {
    icon: 'water' as const,
    label: 'Blood Glucose',
    unit: 'mg/dL',
    ...vitalColors.bloodGlucose,
    format: (v: Record<string, number>) => `${v.value || '-'}`,
  },
  WEIGHT: {
    icon: 'fitness' as const,
    label: 'Weight',
    unit: 'kg',
    ...vitalColors.weight,
    format: (v: Record<string, number>) => `${v.value || '-'}`,
  },
  OXYGEN_SATURATION: {
    icon: 'pulse' as const,
    label: 'Oxygen',
    unit: '%',
    ...vitalColors.oxygen,
    format: (v: Record<string, number>) => `${v.value || '-'}`,
  },
};

type VitalType = keyof typeof vitalConfig;

export default function VitalsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  const [refreshing, setRefreshing] = useState(false);
  const [vitals, setVitals] = useState<VitalReading[]>([]);

  const fetchData = async () => {
    try {
      const vitalsData = await patientApi.getVitals({ limit: 30 });
      setVitals(vitalsData);
    } catch (error) {
      console.error('Failed to fetch vitals:', error);
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

  // Get latest reading for each vital type
  const getLatestByType = (type: VitalType) => {
    return vitals.find((v) => v.type === type);
  };

  // Get recent readings (last 10)
  const recentReadings = vitals.slice(0, 10);

  const vitalTypes: VitalType[] = ['BLOOD_PRESSURE', 'BLOOD_GLUCOSE', 'WEIGHT', 'OXYGEN_SATURATION'];

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
          <Text style={[styles.pageTitle, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
            My Vitals
          </Text>
          <TouchableOpacity
            style={[styles.addBtn, {
              backgroundColor: isDark ? '#1F1F2A' : '#FFFFFF',
              shadowColor: isDark ? '#000' : '#6B7280',
            }]}
            onPress={() => router.push('/record-vitals/BLOOD_PRESSURE')}
          >
            <Ionicons name="add" size={24} color={brand.primary} />
          </TouchableOpacity>
        </View>

        {/* Vital Type Cards - 2x2 Grid */}
        <View style={styles.vitalsGrid}>
          {vitalTypes.map((type) => {
            const config = vitalConfig[type];
            const latest = getLatestByType(type);

            return (
              <TouchableOpacity
                key={type}
                style={[styles.vitalCard, { backgroundColor: config.background }]}
                onPress={() => router.push(`/record-vitals/${type}`)}
                activeOpacity={0.7}
              >
                {/* Icon */}
                <View style={[styles.vitalIconWrap, { backgroundColor: config.primary + '20' }]}>
                  <Ionicons name={config.icon} size={22} color={config.primary} />
                </View>

                {/* Add button */}
                <TouchableOpacity
                  style={styles.vitalAddBtn}
                  onPress={() => router.push(`/record-vitals/${type}`)}
                >
                  <Ionicons name="add-circle" size={24} color={config.primary} />
                </TouchableOpacity>

                {/* Label */}
                <Text style={[styles.vitalLabel, { color: config.primary }]}>
                  {config.label}
                </Text>

                {/* Value or empty state */}
                {latest ? (
                  <>
                    <Text style={[styles.vitalValue, { color: config.primary }]}>
                      {config.format(latest.values)}
                      <Text style={styles.vitalUnit}> {config.unit}</Text>
                    </Text>
                    <Text style={[styles.vitalTime, { color: config.primary + '80' }]}>
                      {formatDate(latest.recordedAt)}
                    </Text>
                  </>
                ) : (
                  <Text style={[styles.vitalEmpty, { color: config.primary + '90' }]}>
                    Tap to record
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Recent Activity */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
            Recent Readings
          </Text>
        </View>

        {recentReadings.length > 0 ? (
          <View style={[styles.activityCard, {
            backgroundColor: isDark ? '#1F1F2A' : '#FFFFFF',
            shadowColor: isDark ? '#000' : '#6B7280',
          }]}>
            {recentReadings.map((vital, index) => {
              const config = vitalConfig[vital.type as VitalType];
              if (!config) return null;

              return (
                <View
                  key={vital.id}
                  style={[
                    styles.activityItem,
                    index < recentReadings.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: isDark ? '#2D2D3A' : '#F3F4F6',
                    },
                  ]}
                >
                  <View style={[styles.activityIcon, { backgroundColor: config.background }]}>
                    <Ionicons name={config.icon} size={18} color={config.primary} />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={[styles.activityTitle, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
                      {config.label}
                    </Text>
                    <Text style={[styles.activityTime, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
                      {formatDateTime(vital.recordedAt)}
                    </Text>
                  </View>
                  <View style={styles.activityRight}>
                    <Text style={[styles.activityValue, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
                      {config.format(vital.values)}
                      <Text style={[styles.activityUnit, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
                        {' '}{config.unit}
                      </Text>
                    </Text>
                    <View style={[
                      styles.statusBadge,
                      {
                        backgroundColor: vital.status === 'NORMAL' ? '#ECFDF5'
                          : vital.status === 'CRITICAL' ? '#FFF1F1'
                          : '#FFFBEB'
                      }
                    ]}>
                      <View style={[
                        styles.statusDot,
                        {
                          backgroundColor: vital.status === 'NORMAL' ? '#4ADE80'
                            : vital.status === 'CRITICAL' ? '#FF6B6B'
                            : '#FBBF24'
                        }
                      ]} />
                      <Text style={[
                        styles.statusText,
                        {
                          color: vital.status === 'NORMAL' ? '#059669'
                            : vital.status === 'CRITICAL' ? '#DC2626'
                            : '#D97706'
                        }
                      ]}>
                        {vital.status}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={[styles.emptyCard, {
            backgroundColor: isDark ? '#1F1F2A' : '#FFFFFF',
            shadowColor: isDark ? '#000' : '#6B7280',
          }]}>
            <View style={[styles.emptyIcon, { backgroundColor: isDark ? '#2D2D3A' : '#F5F3FF' }]}>
              <Ionicons name="pulse-outline" size={40} color={brand.secondary} />
            </View>
            <Text style={[styles.emptyTitle, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
              No Readings Yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
              Start tracking your health by recording your first vital sign above.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper functions
function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatDateTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
  pageTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  addBtn: {
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

  // Vitals Grid
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  vitalCard: {
    width: (width - 52) / 2,
    borderRadius: 24,
    padding: 18,
    minHeight: 150,
    position: 'relative',
  },
  vitalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  vitalAddBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    opacity: 0.7,
  },
  vitalLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  vitalValue: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  vitalUnit: {
    fontSize: 14,
    fontWeight: '500',
  },
  vitalTime: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
  },
  vitalEmpty: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },

  // Section
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },

  // Activity Card
  activityCard: {
    borderRadius: 24,
    overflow: 'hidden',
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
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  activityTime: {
    fontSize: 13,
    fontWeight: '500',
  },
  activityRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  activityValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  activityUnit: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
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
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 260,
  },
});
