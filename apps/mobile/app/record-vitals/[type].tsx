import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, brand, vitals as vitalColors } from '@/constants/Colors';
import { Card, Button, Input } from '@/components/ui';
import { patientApi } from '@/lib/api/patient-portal';

type VitalType = 'BLOOD_PRESSURE' | 'BLOOD_GLUCOSE' | 'WEIGHT' | 'OXYGEN_SATURATION';

interface VitalConfig {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  colorKey: keyof typeof vitalColors;
  fields: {
    key: string;
    label: string;
    placeholder: string;
    unit: string;
    min: number;
    max: number;
  }[];
}

const vitalConfigs: Record<VitalType, VitalConfig> = {
  BLOOD_PRESSURE: {
    title: 'Blood Pressure',
    icon: 'heart',
    colorKey: 'bloodPressure',
    fields: [
      { key: 'systolic', label: 'Systolic', placeholder: '120', unit: 'mmHg', min: 70, max: 250 },
      { key: 'diastolic', label: 'Diastolic', placeholder: '80', unit: 'mmHg', min: 40, max: 150 },
      { key: 'pulse', label: 'Pulse (optional)', placeholder: '72', unit: 'bpm', min: 30, max: 200 },
    ],
  },
  BLOOD_GLUCOSE: {
    title: 'Blood Glucose',
    icon: 'water',
    colorKey: 'bloodGlucose',
    fields: [
      { key: 'value', label: 'Blood Glucose', placeholder: '100', unit: 'mg/dL', min: 20, max: 600 },
    ],
  },
  WEIGHT: {
    title: 'Weight',
    icon: 'fitness',
    colorKey: 'weight',
    fields: [
      { key: 'value', label: 'Weight', placeholder: '70', unit: 'kg', min: 20, max: 300 },
    ],
  },
  OXYGEN_SATURATION: {
    title: 'Oxygen Saturation',
    icon: 'pulse',
    colorKey: 'oxygen',
    fields: [
      { key: 'value', label: 'SpO2', placeholder: '98', unit: '%', min: 70, max: 100 },
    ],
  },
};

export default function RecordVitalScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

  const vitalType = (type?.toUpperCase() || 'BLOOD_PRESSURE') as VitalType;
  const config = vitalConfigs[vitalType] || vitalConfigs.BLOOD_PRESSURE;
  const vitalColor = vitalColors[config.colorKey];

  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleValueChange = (key: string, value: string) => {
    // Allow only numbers and decimal point
    const sanitized = value.replace(/[^0-9.]/g, '');
    setValues((prev) => ({ ...prev, [key]: sanitized }));
    // Clear error when user starts typing
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    config.fields.forEach((field) => {
      const value = values[field.key];
      const numValue = parseFloat(value);

      // Required validation (skip optional fields)
      if (!field.label.includes('optional')) {
        if (!value || value.trim() === '') {
          newErrors[field.key] = `${field.label} is required`;
          return;
        }
      } else if (!value || value.trim() === '') {
        return; // Skip validation for empty optional fields
      }

      // Range validation
      if (isNaN(numValue)) {
        newErrors[field.key] = 'Please enter a valid number';
      } else if (numValue < field.min || numValue > field.max) {
        newErrors[field.key] = `Value must be between ${field.min} and ${field.max}`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      // Convert string values to numbers
      const numericValues: Record<string, number> = {};
      config.fields.forEach((field) => {
        const value = values[field.key];
        if (value && value.trim() !== '') {
          numericValues[field.key] = parseFloat(value);
        }
      });

      await patientApi.recordVital({
        type: vitalType,
        values: numericValues,
        notes: notes.trim() || undefined,
      });

      Alert.alert('Success', 'Vital recorded successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to record vital. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: config.title,
          headerStyle: {
            backgroundColor: isDark ? '#0F0F14' : '#FAF9FF',
          },
          headerTintColor: isDark ? '#F9FAFB' : '#1F2937',
          headerShadowVisible: false,
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 17,
          },
        }}
      />
      <SafeAreaView
        style={[styles.container, { backgroundColor: isDark ? '#0F0F14' : '#FAF9FF' }]}
        edges={['bottom']}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header Card - Pastel Style */}
            <View style={[styles.headerCard, { backgroundColor: vitalColor.background }]}>
              <View style={[styles.iconContainer, { backgroundColor: vitalColor.primary + '20' }]}>
                <Ionicons name={config.icon} size={32} color={vitalColor.primary} />
              </View>
              <Text style={[styles.headerTitle, { color: vitalColor.primary }]}>
                Record {config.title}
              </Text>
              <Text style={[styles.headerSubtitle, { color: vitalColor.primary + '90' }]}>
                Enter your current reading below
              </Text>
            </View>

            {/* Input Fields - Premium Card */}
            <View style={[styles.formCard, {
              backgroundColor: isDark ? '#1F1F2A' : '#FFFFFF',
              shadowColor: isDark ? '#000' : '#6B7280',
            }]}>
              {config.fields.map((field, index) => (
                <View
                  key={field.key}
                  style={[
                    styles.fieldContainer,
                    index < config.fields.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: isDark ? '#2D2D3A' : '#F3F4F6',
                    },
                  ]}
                >
                  <Text style={[styles.fieldLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                    {field.label}
                  </Text>
                  <View style={styles.inputRow}>
                    <Input
                      placeholder={field.placeholder}
                      keyboardType="decimal-pad"
                      value={values[field.key] || ''}
                      onChangeText={(value) => handleValueChange(field.key, value)}
                      error={errors[field.key]}
                      style={styles.valueInput}
                    />
                    <View style={[styles.unitBadge, { backgroundColor: vitalColor.background }]}>
                      <Text style={[styles.unitText, { color: vitalColor.primary }]}>
                        {field.unit}
                      </Text>
                    </View>
                  </View>
                  {errors[field.key] && (
                    <Text style={styles.errorText}>{errors[field.key]}</Text>
                  )}
                </View>
              ))}

              {/* Notes */}
              <View style={styles.notesContainer}>
                <Text style={[styles.fieldLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                  Notes (optional)
                </Text>
                <Input
                  placeholder="Add any notes about this reading..."
                  multiline
                  numberOfLines={3}
                  value={notes}
                  onChangeText={setNotes}
                  style={styles.notesInput}
                />
              </View>
            </View>

            {/* Guidelines - Soft Card */}
            <View style={[styles.guidelinesCard, {
              backgroundColor: isDark ? '#1F1F2A' : '#FFFFFF',
              shadowColor: isDark ? '#000' : '#6B7280',
            }]}>
              <View style={styles.guidelineHeader}>
                <View style={[styles.guidelineIcon, { backgroundColor: brand.secondaryMuted }]}>
                  <Ionicons name="bulb-outline" size={18} color={brand.secondary} />
                </View>
                <Text style={[styles.guidelineTitle, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
                  Recording Tips
                </Text>
              </View>
              <Text style={[styles.guidelineText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                {vitalType === 'BLOOD_PRESSURE' &&
                  '• Sit quietly for 5 minutes before measuring\n• Keep your arm at heart level\n• Take 2-3 readings and record the average'}
                {vitalType === 'BLOOD_GLUCOSE' &&
                  '• Wash hands before testing\n• Note if reading is fasting or after meal\n• Keep your meter calibrated'}
                {vitalType === 'WEIGHT' &&
                  '• Weigh yourself at the same time each day\n• Use the same scale\n• Wear similar clothing'}
                {vitalType === 'OXYGEN_SATURATION' &&
                  '• Ensure finger is warm\n• Remove nail polish if present\n• Stay still during measurement'}
              </Text>
            </View>

            {/* Submit Button - Soft Pink */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: brand.primary },
                isSubmitting && { opacity: 0.7 },
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Saving...' : 'Save Reading'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelButtonText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },

  // Header Card
  headerCard: {
    alignItems: 'center',
    padding: 28,
    borderRadius: 28,
    marginBottom: 20,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 6,
    fontWeight: '500',
  },

  // Form Card
  formCard: {
    borderRadius: 24,
    padding: 4,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  fieldContainer: {
    padding: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  valueInput: {
    flex: 1,
  },
  unitBadge: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  unitText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    color: '#FF6B6B',
    marginTop: 6,
    fontWeight: '500',
  },
  notesContainer: {
    padding: 16,
    paddingTop: 8,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Guidelines Card
  guidelinesCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  guidelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  guidelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guidelineTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  guidelineText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },

  // Buttons
  submitButton: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  cancelButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
