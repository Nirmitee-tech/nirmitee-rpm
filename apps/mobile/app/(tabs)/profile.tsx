import React from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, brand, semantic } from '@/constants/Colors';
import { useAuthStore } from '@/stores/auth-store';

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
  isDark: boolean;
}

function MenuItem({ icon, title, subtitle, onPress, danger, isDark }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View
        style={[
          styles.menuIcon,
          { backgroundColor: danger ? semantic.dangerLight : brand.primaryMuted },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={danger ? semantic.danger : brand.primary}
        />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuTitle, { color: danger ? semantic.danger : (isDark ? '#F9FAFB' : '#1F2937') }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.menuSubtitle, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
            {subtitle}
          </Text>
        )}
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={isDark ? '#4B5563' : '#D1D5DB'}
      />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const { user, organization, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const roleLabels: Record<string, string> = {
    PATIENT: 'Patient',
    Caregiver: 'Caregiver',
    CLINICAL_STAFF: 'Clinical Staff',
    Admin: 'Administrator',
    ADMIN: 'Administrator',
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0F0F14' : '#FAF9FF' }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Page Title */}
        <Text style={[styles.pageTitle, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
          Profile
        </Text>

        {/* Profile Header - Pastel Card */}
        <View style={[styles.profileCard, {
          backgroundColor: isDark ? '#1F1F2A' : '#FFFFFF',
          shadowColor: isDark ? '#000' : '#6B7280',
        }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.firstName?.[0] || 'U'}
              {user?.lastName?.[0] || ''}
            </Text>
          </View>
          <Text style={[styles.userName, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={[styles.userEmail, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
            {user?.email}
          </Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {roleLabels[organization?.role || ''] || organization?.role || 'Member'}
            </Text>
          </View>
        </View>

        {/* Account Section */}
        <Text style={[styles.sectionTitle, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>Account</Text>
        <View style={[styles.menuCard, {
          backgroundColor: isDark ? '#1F1F2A' : '#FFFFFF',
          shadowColor: isDark ? '#000' : '#6B7280',
        }]}>
          <MenuItem
            icon="person-outline"
            title="Edit Profile"
            subtitle="Update your personal information"
            onPress={() => {}}
            isDark={isDark}
          />
          <View style={[styles.divider, { backgroundColor: isDark ? '#2D2D3A' : '#F3F4F6' }]} />
          <MenuItem
            icon="lock-closed-outline"
            title="Change Password"
            subtitle="Update your password"
            onPress={() => {}}
            isDark={isDark}
          />
          <View style={[styles.divider, { backgroundColor: isDark ? '#2D2D3A' : '#F3F4F6' }]} />
          <MenuItem
            icon="shield-checkmark-outline"
            title="Two-Factor Authentication"
            subtitle={user?.mfaEnabled ? 'Enabled' : 'Not configured'}
            onPress={() => {}}
            isDark={isDark}
          />
        </View>

        {/* Preferences Section */}
        <Text style={[styles.sectionTitle, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>Preferences</Text>
        <View style={[styles.menuCard, {
          backgroundColor: isDark ? '#1F1F2A' : '#FFFFFF',
          shadowColor: isDark ? '#000' : '#6B7280',
        }]}>
          <MenuItem
            icon="notifications-outline"
            title="Notifications"
            subtitle="Manage push notifications"
            onPress={() => {}}
            isDark={isDark}
          />
          <View style={[styles.divider, { backgroundColor: isDark ? '#2D2D3A' : '#F3F4F6' }]} />
          <MenuItem
            icon="language-outline"
            title="Language"
            subtitle="English"
            onPress={() => {}}
            isDark={isDark}
          />
          <View style={[styles.divider, { backgroundColor: isDark ? '#2D2D3A' : '#F3F4F6' }]} />
          <MenuItem
            icon={isDark ? 'moon-outline' : 'sunny-outline'}
            title="Appearance"
            subtitle={isDark ? 'Dark mode' : 'Light mode'}
            onPress={() => {}}
            isDark={isDark}
          />
        </View>

        {/* Support Section */}
        <Text style={[styles.sectionTitle, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>Support</Text>
        <View style={[styles.menuCard, {
          backgroundColor: isDark ? '#1F1F2A' : '#FFFFFF',
          shadowColor: isDark ? '#000' : '#6B7280',
        }]}>
          <MenuItem
            icon="help-circle-outline"
            title="Help Center"
            onPress={() => {}}
            isDark={isDark}
          />
          <View style={[styles.divider, { backgroundColor: isDark ? '#2D2D3A' : '#F3F4F6' }]} />
          <MenuItem
            icon="document-text-outline"
            title="Terms of Service"
            onPress={() => {}}
            isDark={isDark}
          />
          <View style={[styles.divider, { backgroundColor: isDark ? '#2D2D3A' : '#F3F4F6' }]} />
          <MenuItem
            icon="shield-outline"
            title="Privacy Policy"
            onPress={() => {}}
            isDark={isDark}
          />
        </View>

        {/* Sign Out */}
        <View style={[styles.menuCard, {
          backgroundColor: isDark ? '#1F1F2A' : '#FFFFFF',
          shadowColor: isDark ? '#000' : '#6B7280',
        }]}>
          <MenuItem
            icon="log-out-outline"
            title="Sign Out"
            onPress={handleLogout}
            danger
            isDark={isDark}
          />
        </View>

        {/* App Version */}
        <Text style={[styles.version, { color: isDark ? '#4B5563' : '#D1D5DB' }]}>
          NirmiteeRPM v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },

  // Page Title
  pageTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 24,
  },

  // Profile Card - Pastel Style
  profileCard: {
    alignItems: 'center',
    marginBottom: 28,
    borderRadius: 28,
    padding: 32,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    backgroundColor: brand.primary,
    shadowColor: brand.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  userEmail: {
    fontSize: 15,
    marginTop: 6,
    fontWeight: '500',
  },
  roleBadge: {
    marginTop: 14,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: brand.primaryMuted,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '600',
    color: brand.primary,
    letterSpacing: 0.3,
  },

  // Sections
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    marginLeft: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  menuCard: {
    marginBottom: 24,
    borderRadius: 24,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: { flex: 1, gap: 3 },
  menuTitle: { fontSize: 16, fontWeight: '600' },
  menuSubtitle: { fontSize: 13, fontWeight: '500' },
  divider: { height: 1, marginLeft: 74 },

  // Version
  version: {
    textAlign: 'center',
    fontSize: 13,
    marginTop: 8,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});
