import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { brand } from '@/constants/Colors';

interface CallControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isFrontCamera: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onSwitchCamera: () => void;
  onEndCall: () => void;
}

export function CallControls({
  isAudioEnabled,
  isVideoEnabled,
  isFrontCamera,
  onToggleAudio,
  onToggleVideo,
  onSwitchCamera,
  onEndCall,
}: CallControlsProps) {
  return (
    <View style={styles.container}>
      {/* Mute/Unmute */}
      <TouchableOpacity
        style={[styles.button, !isAudioEnabled && styles.buttonActive]}
        onPress={onToggleAudio}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isAudioEnabled ? 'mic' : 'mic-off'}
          size={26}
          color={!isAudioEnabled ? '#FFFFFF' : '#E5E7EB'}
        />
      </TouchableOpacity>

      {/* Camera On/Off */}
      <TouchableOpacity
        style={[styles.button, !isVideoEnabled && styles.buttonActive]}
        onPress={onToggleVideo}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isVideoEnabled ? 'videocam' : 'videocam-off'}
          size={26}
          color={!isVideoEnabled ? '#FFFFFF' : '#E5E7EB'}
        />
      </TouchableOpacity>

      {/* Switch Camera */}
      <TouchableOpacity
        style={styles.button}
        onPress={onSwitchCamera}
        activeOpacity={0.7}
      >
        <Ionicons
          name="camera-reverse"
          size={26}
          color="#E5E7EB"
        />
      </TouchableOpacity>

      {/* End Call */}
      <TouchableOpacity
        style={[styles.button, styles.endCallButton]}
        onPress={onEndCall}
        activeOpacity={0.7}
      >
        <Ionicons name="call" size={26} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(18, 18, 26, 0.95)',
    borderRadius: 28,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(31, 31, 46, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonActive: {
    backgroundColor: '#EF4444',
  },
  endCallButton: {
    backgroundColor: '#EF4444',
    width: 64,
    height: 64,
    borderRadius: 32,
  },
});
