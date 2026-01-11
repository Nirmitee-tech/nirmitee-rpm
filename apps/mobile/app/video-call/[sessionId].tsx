import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, Platform, Linking } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';

import { VideoRoom } from '@/components/video';
import { brand } from '@/constants/Colors';

export default function VideoCallScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [hasPermissions, setHasPermissions] = useState<boolean | null>(null);

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      // Request camera permission
      const cameraPermission = await Camera.requestCameraPermissionsAsync();

      // Request microphone permission
      const audioPermission = await Audio.requestPermissionsAsync();

      if (cameraPermission.status === 'granted' && audioPermission.status === 'granted') {
        setHasPermissions(true);
      } else {
        setHasPermissions(false);
        Alert.alert(
          'Permissions Required',
          'Camera and microphone access are required for video calls. Please enable them in your device settings.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => router.back() },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
    } catch (error) {
      console.error('[VideoCall] Permission request error:', error);
      setHasPermissions(false);
    }
  };

  const handleSessionEnd = (duration: number, billableMinutes: number) => {
    console.log('[VideoCall] Session ended:', { duration, billableMinutes });
    // Could show a summary or navigate to a post-call screen
  };

  if (!sessionId) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Invalid session</Text>
      </View>
    );
  }

  if (hasPermissions === null) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Requesting permissions...</Text>
      </View>
    );
  }

  if (hasPermissions === false) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Camera & Microphone Access Required</Text>
        <Text style={styles.errorText}>
          Please grant camera and microphone permissions to join video calls.
        </Text>
        <Text style={styles.settingsLink} onPress={() => Linking.openSettings()}>
          Open Settings
        </Text>
        <Text style={styles.backLink} onPress={() => router.back()}>
          Go Back
        </Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          gestureEnabled: false,
          animation: 'fade',
        }}
      />
      <VideoRoom sessionId={sessionId} onSessionEnd={handleSessionEnd} />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0A12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#0A0A12',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    color: '#9CA3AF',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  settingsLink: {
    color: brand.primary,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(116, 94, 225, 0.1)',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  backLink: {
    color: '#737373',
    fontSize: 15,
    marginTop: 8,
  },
});
