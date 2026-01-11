import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuthStore } from '@/stores/auth-store';

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const { organization } = useAuthStore();

  const isCaregiver = organization?.role === 'Caregiver';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#745EE1',
        tabBarInactiveTintColor: isDark ? 'rgba(255,255,255,0.35)' : '#9CA3AF',
        tabBarStyle: {
          backgroundColor: isDark ? 'rgba(15,15,20,0.95)' : 'rgba(255,255,255,0.98)',
          borderTopWidth: isDark ? 0 : StyleSheet.hairlineWidth,
          borderTopColor: isDark ? 'transparent' : '#F3F4F6',
          height: Platform.OS === 'ios' ? 84 : 60,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 26 : 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
        headerStyle: {
          backgroundColor: isDark ? '#0F0F14' : '#FAF9FF',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 17,
        },
        headerTitleAlign: 'center',
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: isCaregiver ? 'Patients' : 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={isCaregiver ? (focused ? 'people' : 'people-outline') : (focused ? 'home' : 'home-outline')}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="vitals"
        options={{
          title: 'Vitals',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'heart' : 'heart-outline'}
              size={24}
              color={color}
            />
          ),
          href: isCaregiver ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'notifications' : 'notifications-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
