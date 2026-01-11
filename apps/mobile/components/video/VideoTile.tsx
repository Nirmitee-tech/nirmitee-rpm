import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { HMSVideoViewMode } from '@100mslive/react-native-hms';
import { Ionicons } from '@expo/vector-icons';
import { brand } from '@/constants/Colors';

// Note: HmsView is accessed differently in React Native HMS SDK
// We'll use a simple placeholder view until we can integrate the actual view component

interface VideoTileProps {
  trackId?: string;
  isLocal?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  peerName: string;
  style?: object;
}

export function VideoTile({
  trackId,
  isLocal = false,
  isMuted = false,
  isVideoOff = false,
  peerName,
  style,
}: VideoTileProps) {
  // Show placeholder when video is off
  if (isVideoOff || !trackId) {
    return (
      <View style={[styles.container, styles.placeholder, style]}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {peerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </Text>
        </View>
        <Text style={styles.placeholderName}>{peerName}</Text>
        {isMuted && (
          <View style={styles.mutedBadge}>
            <Ionicons name="mic-off" size={14} color="#EF4444" />
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Video view rendered by parent using HMSSDK.HmsView */}
      <View style={[styles.video, styles.videoPlaceholder]}>
        <View style={styles.videoAvatarContainer}>
          <Text style={styles.videoAvatarText}>
            {peerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </Text>
        </View>
      </View>

      {/* Name overlay */}
      <View style={styles.nameOverlay}>
        <Text style={styles.nameText} numberOfLines={1}>
          {isLocal ? 'You' : peerName}
        </Text>
        {isMuted && (
          <Ionicons name="mic-off" size={14} color="#EF4444" style={styles.muteIcon} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A24',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A24',
  },
  videoAvatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#12121A',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  placeholderName: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '600',
  },
  mutedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  nameText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  muteIcon: {
    marginLeft: 6,
  },
});
