import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  RefreshControl,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Colors, brand } from '@/constants/Colors';
import { Card } from '@/components/ui';
import {
  caregiverApi,
  PatientSummary,
  PatientVitalReading,
  PatientAlert,
  PatientMedication,
  PatientCarePlan,
} from '@/lib/api/caregiver-portal';

type TabType = 'summary' | 'vitals' | 'alerts' | 'medications' | 'care-plan';

export default function PatientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<PatientSummary | null>(null);
  const [vitals, setVitals] = useState<PatientVitalReading[]>([]);
  const [alerts, setAlerts] = useState<PatientAlert[]>([]);
  const [medications, setMedications] = useState<PatientMedication[]>([]);
  const [carePlan, setCarePlan] = useState<PatientCarePlan | null>(null);

  const fetchData = async () => {
    if (!id) return;

    try {
      const [summaryData, vitalsData, alertsData, medsData, carePlanData] = await Promise.all([
        caregiverApi.getPatientSummary(id),
        caregiverApi.getPatientVitals(id, 14),
        caregiverApi.getPatientAlerts(id),
        caregiverApi.getPatientMedications(id),
        caregiverApi.getPatientCarePlan(id),
      ]);

      setSummary(summaryData);
      setVitals(vitalsData);
      setAlerts(alertsData);
      setMedications(medsData);
      setCarePlan(carePlanData);
    } catch (error) {
      console.error('Failed to fetch patient data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'summary', label: 'Summary', icon: 'home' },
    { key: 'vitals', label: 'Vitals', icon: 'heartbeat' },
    { key: 'alerts', label: 'Alerts', icon: 'bell' },
    { key: 'medications', label: 'Meds', icon: 'medkit' },
    { key: 'care-plan', label: 'Care Plan', icon: 'clipboard' },
  ];

  const patientName = summary
    ? `${summary.patient.firstName} ${summary.patient.lastName}`
    : 'Patient';

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Loading...' }} />
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={brand.primary} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: patientName,
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
        }}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        {/* Tab Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBar}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                {
                  backgroundColor: activeTab === tab.key ? brand.primary : colors.card,
                  borderColor: activeTab === tab.key ? brand.primary : colors.border,
                },
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <FontAwesome
                name={tab.icon as any}
                size={14}
                color={activeTab === tab.key ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === tab.key ? '#FFFFFF' : colors.text },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand.primary} />
          }
        >
          {/* Summary Tab */}
          {activeTab === 'summary' && summary && (
            <>
              {/* Patient Info Card */}
              <Card style={styles.infoCard}>
                <View style={[styles.avatar, { backgroundColor: brand.primary }]}>
                  <Text style={styles.avatarText}>
                    {summary.patient.firstName[0]}
                    {summary.patient.lastName[0]}
                  </Text>
                </View>
                <Text style={[styles.patientName, { color: colors.text }]}>
                  {summary.patient.firstName} {summary.patient.lastName}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: '#5BCC5615' }]}>
                  <Text style={{ color: '#5BCC56', fontSize: 12, fontWeight: '500' }}>
                    {summary.patient.enrollmentStatus}
                  </Text>
                </View>
                {summary.patient.conditions.length > 0 && (
                  <View style={styles.conditionsList}>
                    {summary.patient.conditions.map((condition, index) => (
                      <View
                        key={index}
                        style={[styles.conditionBadge, { backgroundColor: `${brand.primary}15` }]}
                      >
                        <Text style={{ color: brand.primary, fontSize: 11 }}>{condition}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </Card>

              {/* Stats Grid */}
              <View style={styles.statsGrid}>
                <Card style={styles.statCard}>
                  <FontAwesome name="heartbeat" size={20} color={brand.primary} />
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {summary.stats.todayReadings}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Today</Text>
                </Card>
                <Card style={styles.statCard}>
                  <FontAwesome name="calendar" size={20} color="#5BCC56" />
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {summary.stats.weekReadings}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>This Week</Text>
                </Card>
                <Card style={styles.statCard}>
                  <FontAwesome name="bell" size={20} color="#FF4351" />
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {summary.stats.activeAlerts}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Alerts</Text>
                </Card>
                <Card style={styles.statCard}>
                  <FontAwesome name="medkit" size={20} color="#FFB800" />
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {summary.stats.activeMedications}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Meds</Text>
                </Card>
              </View>

              {/* Latest Vitals */}
              {summary.latestVitals.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Latest Vitals</Text>
                  <Card padding="none">
                    {summary.latestVitals.map((vital, index) => (
                      <View
                        key={index}
                        style={[
                          styles.vitalItem,
                          index < summary.latestVitals.length - 1 && {
                            borderBottomWidth: 1,
                            borderBottomColor: colors.border,
                          },
                        ]}
                      >
                        <Text style={[styles.vitalType, { color: colors.text }]}>
                          {vital.type.replace('_', ' ')}
                        </Text>
                        <View style={styles.vitalRight}>
                          <Text style={[styles.vitalValue, { color: colors.text }]}>
                            {JSON.stringify(vital.values)}
                          </Text>
                          <View
                            style={[
                              styles.miniStatusBadge,
                              {
                                backgroundColor:
                                  vital.status === 'NORMAL' ? '#5BCC5615' : '#FF435115',
                              },
                            ]}
                          >
                            <Text
                              style={{
                                color: vital.status === 'NORMAL' ? '#5BCC56' : '#FF4351',
                                fontSize: 10,
                                fontWeight: '600',
                              }}
                            >
                              {vital.status}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </Card>
                </>
              )}

              {/* Care Team */}
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Care Team</Text>
              <Card>
                <View style={styles.careTeamRow}>
                  <FontAwesome name="user-md" size={16} color={brand.primary} />
                  <View style={styles.careTeamInfo}>
                    <Text style={[styles.careTeamLabel, { color: colors.textSecondary }]}>
                      Primary Physician
                    </Text>
                    <Text style={[styles.careTeamName, { color: colors.text }]}>
                      {summary.careTeam.primaryPhysician || 'Not assigned'}
                    </Text>
                  </View>
                </View>
                <View style={[styles.careTeamRow, { marginTop: 12 }]}>
                  <FontAwesome name="stethoscope" size={16} color={brand.primary} />
                  <View style={styles.careTeamInfo}>
                    <Text style={[styles.careTeamLabel, { color: colors.textSecondary }]}>
                      Clinical Staff
                    </Text>
                    <Text style={[styles.careTeamName, { color: colors.text }]}>
                      {summary.careTeam.clinicalStaff || 'Not assigned'}
                    </Text>
                  </View>
                </View>
              </Card>
            </>
          )}

          {/* Vitals Tab */}
          {activeTab === 'vitals' && (
            <>
              {vitals.length > 0 ? (
                vitals.map((vital) => (
                  <Card key={vital.id} style={styles.listCard}>
                    <View style={styles.listHeader}>
                      <Text style={[styles.listTitle, { color: colors.text }]}>
                        {vital.type.replace('_', ' ')}
                      </Text>
                      <Text style={[styles.listTime, { color: colors.textSecondary }]}>
                        {new Date(vital.recordedAt).toLocaleString()}
                      </Text>
                    </View>
                    <Text style={[styles.listValue, { color: colors.text }]}>
                      {JSON.stringify(vital.values)}
                    </Text>
                  </Card>
                ))
              ) : (
                <Card style={styles.emptyCard}>
                  <FontAwesome name="heartbeat" size={40} color={colors.textSecondary} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No vitals recorded
                  </Text>
                </Card>
              )}
            </>
          )}

          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <>
              {alerts.length > 0 ? (
                alerts.map((alert) => (
                  <Card key={alert.id} style={styles.listCard}>
                    <View style={styles.alertHeader}>
                      <View
                        style={[
                          styles.severityDot,
                          {
                            backgroundColor:
                              alert.severity === 'CRITICAL'
                                ? '#FF4351'
                                : alert.severity === 'SIGNIFICANT'
                                ? '#FFB800'
                                : '#35ADF4',
                          },
                        ]}
                      />
                      <Text style={[styles.listTitle, { color: colors.text }]}>{alert.type}</Text>
                    </View>
                    <Text style={[styles.alertMessage, { color: colors.textSecondary }]}>
                      {alert.message || 'Alert triggered'}
                    </Text>
                    <Text style={[styles.listTime, { color: colors.textSecondary }]}>
                      {new Date(alert.createdAt).toLocaleString()}
                    </Text>
                  </Card>
                ))
              ) : (
                <Card style={styles.emptyCard}>
                  <FontAwesome name="bell-slash" size={40} color={colors.textSecondary} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No active alerts
                  </Text>
                </Card>
              )}
            </>
          )}

          {/* Medications Tab */}
          {activeTab === 'medications' && (
            <>
              {medications.length > 0 ? (
                medications.map((med) => (
                  <Card key={med.id} style={styles.listCard}>
                    <Text style={[styles.listTitle, { color: colors.text }]}>{med.name}</Text>
                    {med.genericName && (
                      <Text style={[styles.genericName, { color: colors.textSecondary }]}>
                        ({med.genericName})
                      </Text>
                    )}
                    <View style={styles.medDetails}>
                      <Text style={[styles.medDetail, { color: colors.text }]}>
                        {med.dosage} • {med.frequency}
                      </Text>
                      {med.route && (
                        <Text style={[styles.medRoute, { color: colors.textSecondary }]}>
                          {med.route}
                        </Text>
                      )}
                    </View>
                    {med.instructions && (
                      <Text style={[styles.medInstructions, { color: colors.textSecondary }]}>
                        {med.instructions}
                      </Text>
                    )}
                  </Card>
                ))
              ) : (
                <Card style={styles.emptyCard}>
                  <FontAwesome name="medkit" size={40} color={colors.textSecondary} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No medications
                  </Text>
                </Card>
              )}
            </>
          )}

          {/* Care Plan Tab */}
          {activeTab === 'care-plan' && (
            <>
              {carePlan ? (
                <Card>
                  <Text style={[styles.carePlanTitle, { color: colors.text }]}>{carePlan.name}</Text>
                  {carePlan.effectiveDate && (
                    <Text style={[styles.carePlanDate, { color: colors.textSecondary }]}>
                      Effective: {new Date(carePlan.effectiveDate).toLocaleDateString()}
                    </Text>
                  )}

                  <Text style={[styles.carePlanSection, { color: colors.text }]}>Goals</Text>
                  {(Array.isArray(carePlan.goals) ? carePlan.goals : [carePlan.goals]).map(
                    (goal, index) => (
                      <View key={index} style={styles.goalItem}>
                        <FontAwesome name="check-circle" size={14} color="#5BCC56" />
                        <Text style={[styles.goalText, { color: colors.text }]}>{goal}</Text>
                      </View>
                    )
                  )}

                  {carePlan.instructions && (
                    <>
                      <Text style={[styles.carePlanSection, { color: colors.text }]}>
                        Instructions
                      </Text>
                      <Text style={[styles.instructionsText, { color: colors.textSecondary }]}>
                        {carePlan.instructions}
                      </Text>
                    </>
                  )}

                  {carePlan.createdBy && (
                    <Text style={[styles.createdBy, { color: colors.textSecondary }]}>
                      Created by: {carePlan.createdBy}
                    </Text>
                  )}
                </Card>
              ) : (
                <Card style={styles.emptyCard}>
                  <FontAwesome name="clipboard" size={40} color={colors.textSecondary} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No care plan available
                  </Text>
                </Card>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabBar: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    gap: 6,
  },
  tabText: { fontSize: 13, fontWeight: '500' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  infoCard: { alignItems: 'center', marginBottom: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: '#FFFFFF', fontSize: 22, fontWeight: '600' },
  patientName: { fontSize: 20, fontWeight: '700' },
  statusBadge: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  conditionsList: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 12 },
  conditionBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, minWidth: '45%', alignItems: 'center', gap: 4 },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, marginTop: 8 },
  vitalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  vitalType: { fontSize: 14, fontWeight: '500', textTransform: 'capitalize' },
  vitalRight: { alignItems: 'flex-end', gap: 4 },
  vitalValue: { fontSize: 14 },
  miniStatusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  careTeamRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  careTeamInfo: { flex: 1 },
  careTeamLabel: { fontSize: 12 },
  careTeamName: { fontSize: 15, fontWeight: '500' },
  listCard: { marginBottom: 12 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  listTitle: { fontSize: 15, fontWeight: '600', textTransform: 'capitalize' },
  listTime: { fontSize: 12 },
  listValue: { fontSize: 14 },
  alertHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  severityDot: { width: 8, height: 8, borderRadius: 4 },
  alertMessage: { fontSize: 14, marginBottom: 8 },
  genericName: { fontSize: 13, marginTop: 2 },
  medDetails: { marginTop: 8 },
  medDetail: { fontSize: 14, fontWeight: '500' },
  medRoute: { fontSize: 12, marginTop: 2 },
  medInstructions: { fontSize: 13, marginTop: 8, fontStyle: 'italic' },
  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 14 },
  carePlanTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  carePlanDate: { fontSize: 13, marginBottom: 16 },
  carePlanSection: { fontSize: 15, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  goalItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  goalText: { flex: 1, fontSize: 14 },
  instructionsText: { fontSize: 14, lineHeight: 20 },
  createdBy: { fontSize: 12, marginTop: 16, fontStyle: 'italic' },
});
