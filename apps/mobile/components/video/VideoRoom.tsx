import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  HMSSDK,
  HMSUpdateListenerActions,
  HMSPeer,
  HMSTrack,
  HMSTrackType,
  HMSConfig,
  HMSRoom,
  HMSException,
  HMSTrackUpdate,
  HMSPeerUpdate,
} from '@100mslive/react-native-hms';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { VideoTile } from './VideoTile';
import { CallControls } from './CallControls';
import { telehealthApi, TelehealthSession } from '@/lib/api/telehealth';
import { brand, semantic } from '@/constants/Colors';

const { width, height } = Dimensions.get('window');

interface VideoRoomProps {
  sessionId: string;
  onSessionEnd?: (duration: number, billableMinutes: number) => void;
}

export function VideoRoom({ sessionId, onSessionEnd }: VideoRoomProps) {
  const hmsInstanceRef = useRef<HMSSDK | null>(null);

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [role, setRole] = useState<'provider' | 'patient' | 'caregiver' | null>(null);
  const [session, setSession] = useState<TelehealthSession | null>(null);

  // Peer state
  const [localPeer, setLocalPeer] = useState<HMSPeer | null>(null);
  const [remotePeers, setRemotePeers] = useState<HMSPeer[]>([]);

  // Track state
  const [localVideoTrackId, setLocalVideoTrackId] = useState<string | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);

  // Initialize HMS SDK
  useEffect(() => {
    const initHms = async () => {
      try {
        hmsInstanceRef.current = await HMSSDK.build();
        setupEventListeners();
        await joinRoom();
      } catch (err) {
        console.error('[VideoRoom] Failed to initialize HMS:', err);
        setError('Failed to initialize video call');
        setIsLoading(false);
      }
    };

    initHms();

    return () => {
      cleanupCall();
    };
  }, [sessionId]);

  // Call duration timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isConnected) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConnected]);

  const setupEventListeners = () => {
    const hms = hmsInstanceRef.current;
    if (!hms) return;

    // Room joined
    hms.addEventListener(HMSUpdateListenerActions.ON_JOIN, (data: { room: HMSRoom }) => {
      console.log('[VideoRoom] Joined room:', data.room.id);
      setIsConnected(true);
      setIsLoading(false);
    });

    // Room state update
    hms.addEventListener(HMSUpdateListenerActions.ON_ROOM_UPDATE, (data: { room: HMSRoom }) => {
      console.log('[VideoRoom] Room update');
    });

    // Peer updates
    hms.addEventListener(HMSUpdateListenerActions.ON_PEER_UPDATE, (data: { peer: HMSPeer; type: HMSPeerUpdate }) => {
      const { peer, type } = data;
      console.log('[VideoRoom] Peer update:', type, peer.name);

      if (peer.isLocal) {
        setLocalPeer(peer);
      } else {
        setRemotePeers(prev => {
          const filtered = prev.filter(p => p.peerID !== peer.peerID);
          if (type === HMSPeerUpdate.PEER_LEFT) {
            return filtered;
          }
          return [...filtered, peer];
        });
      }
    });

    // Track updates
    hms.addEventListener(HMSUpdateListenerActions.ON_TRACK_UPDATE, (data: { peer: HMSPeer; track: HMSTrack; type: HMSTrackUpdate }) => {
      const { peer, track, type } = data;
      console.log('[VideoRoom] Track update:', type, track.type, 'from', peer.name);

      if (peer.isLocal && track.type === HMSTrackType.VIDEO) {
        setLocalVideoTrackId(track.trackId);
        setIsVideoEnabled(!track.isMute());
      }

      if (peer.isLocal && track.type === HMSTrackType.AUDIO) {
        setIsAudioEnabled(!track.isMute());
      }

      // Update remote peers when their tracks change
      if (!peer.isLocal) {
        setRemotePeers(prev => {
          return prev.map(p => p.peerID === peer.peerID ? peer : p);
        });
      }
    });

    // Error handling
    hms.addEventListener(HMSUpdateListenerActions.ON_ERROR, (data: HMSException) => {
      console.error('[VideoRoom] HMS Error:', data.code, data.message);
      if (data.code === 2000 || data.code === 2001) {
        setError('Connection error. Please check your network.');
      }
    });
  };

  const joinRoom = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get session info
      const sessionInfo = await telehealthApi.getSession(sessionId);
      setSession(sessionInfo);

      // Get join token
      const { token, role: userRole, roomId } = await telehealthApi.joinSession(sessionId);
      setRole(userRole);

      console.log('[VideoRoom] Joining with token, role:', userRole);

      const hms = hmsInstanceRef.current;
      if (!hms) throw new Error('HMS not initialized');

      // Configure and join
      const config = new HMSConfig({
        authToken: token,
        username: sessionInfo.patient?.user?.firstName
          ? `${sessionInfo.patient.user.firstName} ${sessionInfo.patient.user.lastName}`
          : 'User',
      });

      await hms.join(config);
    } catch (err) {
      console.error('[VideoRoom] Failed to join room:', err);
      setError(err instanceof Error ? err.message : 'Failed to join video call');
      setIsLoading(false);
    }
  };

  const cleanupCall = async () => {
    const hms = hmsInstanceRef.current;
    if (hms) {
      try {
        await hms.leave();
        hms.destroy();
      } catch (err) {
        console.error('[VideoRoom] Error during cleanup:', err);
      }
    }
    hmsInstanceRef.current = null;
  };

  const handleToggleAudio = async () => {
    const hms = hmsInstanceRef.current;
    if (hms) {
      try {
        const peer = await hms.getLocalPeer();
        const audioTrack = peer?.localAudioTrack();
        if (audioTrack) {
          audioTrack.setMute(isAudioEnabled); // Toggle mute state
          setIsAudioEnabled(!isAudioEnabled);
        }
      } catch (err) {
        console.error('[VideoRoom] Failed to toggle audio:', err);
      }
    }
  };

  const handleToggleVideo = async () => {
    const hms = hmsInstanceRef.current;
    if (hms) {
      try {
        const peer = await hms.getLocalPeer();
        const videoTrack = peer?.localVideoTrack();
        if (videoTrack) {
          videoTrack.setMute(isVideoEnabled); // Toggle mute state
          setIsVideoEnabled(!isVideoEnabled);
        }
      } catch (err) {
        console.error('[VideoRoom] Failed to toggle video:', err);
      }
    }
  };

  const handleSwitchCamera = async () => {
    const hms = hmsInstanceRef.current;
    if (hms) {
      try {
        const peer = await hms.getLocalPeer();
        const videoTrack = peer?.localVideoTrack();
        if (videoTrack) {
          await videoTrack.switchCamera();
          setIsFrontCamera(!isFrontCamera);
        }
      } catch (err) {
        console.error('[VideoRoom] Failed to switch camera:', err);
      }
    }
  };

  const handleEndCall = useCallback(async () => {
    Alert.alert(
      'End Call',
      'Are you sure you want to end this call?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Call',
          style: 'destructive',
          onPress: async () => {
            try {
              await cleanupCall();

              // End session if provider
              if (role === 'provider') {
                const result = await telehealthApi.endSession(sessionId);
                onSessionEnd?.(result.duration, result.billableMinutes);
              }

              router.back();
            } catch (err) {
              console.error('[VideoRoom] Failed to end call:', err);
              router.back();
            }
          },
        },
      ]
    );
  }, [role, sessionId, onSessionEnd]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get remote peer video track ID
  const getRemotePeerVideoTrackId = (peer: HMSPeer): string | undefined => {
    return peer.videoTrack?.trackId;
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContent}>
          <View style={styles.loadingIcon}>
            <Ionicons name="videocam" size={40} color={brand.primary} />
          </View>
          <ActivityIndicator size="small" color={brand.primary} style={styles.loadingSpinner} />
          <Text style={styles.loadingText}>Connecting...</Text>
          <Text style={styles.loadingSubtext}>Setting up your secure video call</Text>
          <View style={styles.encryptedBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#737373" />
            <Text style={styles.encryptedText}>End-to-end encrypted</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContent}>
          <View style={[styles.loadingIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
            <Ionicons name="alert-circle" size={40} color="#EF4444" />
          </View>
          <Text style={styles.errorTitle}>Connection Failed</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <View style={styles.errorButtons}>
            <Text
              style={styles.errorButton}
              onPress={() => router.back()}
            >
              Go Back
            </Text>
            <Text
              style={[styles.errorButton, styles.retryButton]}
              onPress={() => joinRoom()}
            >
              Try Again
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const patientName = session?.patient?.user
    ? `${session.patient.user.firstName} ${session.patient.user.lastName}`
    : 'Patient';
  const providerName = session?.provider
    ? `Dr. ${session.provider.firstName} ${session.provider.lastName}`
    : 'Provider';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        {/* Live indicator */}
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>

        {/* Duration */}
        <View style={styles.durationContainer}>
          <Ionicons name="time-outline" size={16} color={brand.primary} />
          <Text style={styles.durationText}>{formatDuration(callDuration)}</Text>
        </View>

        {/* Participants */}
        <View style={styles.participantsBadge}>
          <Ionicons name="people" size={16} color="#737373" />
          <Text style={styles.participantsText}>{remotePeers.length + 1}</Text>
        </View>
      </View>

      {/* Video Grid */}
      <View style={styles.videoGrid}>
        {/* Remote peers (main view) */}
        {remotePeers.length > 0 ? (
          <View style={styles.mainVideo}>
            {remotePeers.map(peer => (
              <VideoTile
                key={peer.peerID}
                trackId={getRemotePeerVideoTrackId(peer)}
                peerName={peer.name || 'Participant'}
                isVideoOff={peer.videoTrack?.isMute() ?? true}
                isMuted={peer.audioTrack?.isMute() ?? false}
                style={styles.remoteTile}
              />
            ))}
          </View>
        ) : (
          <View style={styles.waitingContainer}>
            <View style={styles.waitingAvatar}>
              <Ionicons name="person" size={48} color="#737373" />
            </View>
            <Text style={styles.waitingTitle}>Waiting for participant...</Text>
            <Text style={styles.waitingSubtext}>
              {role === 'provider' ? 'The patient will appear here' : 'The provider will join shortly'}
            </Text>
          </View>
        )}

        {/* Local video (PiP) */}
        <View style={styles.localVideoContainer}>
          <VideoTile
            trackId={localVideoTrackId ?? undefined}
            peerName="You"
            isLocal
            isVideoOff={!isVideoEnabled}
            isMuted={!isAudioEnabled}
            style={styles.localVideo}
          />
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controlsWrapper}>
        <CallControls
          isAudioEnabled={isAudioEnabled}
          isVideoEnabled={isVideoEnabled}
          isFrontCamera={isFrontCamera}
          onToggleAudio={handleToggleAudio}
          onToggleVideo={handleToggleVideo}
          onSwitchCamera={handleSwitchCamera}
          onEndCall={handleEndCall}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A12',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0A12',
  },
  loadingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(116, 94, 225, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loadingSpinner: {
    marginBottom: 16,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  loadingSubtext: {
    color: '#737373',
    fontSize: 14,
    marginBottom: 24,
  },
  encryptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  encryptedText: {
    color: '#737373',
    fontSize: 12,
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    color: '#737373',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  errorButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  errorButton: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(31, 31, 46, 0.9)',
    overflow: 'hidden',
  },
  retryButton: {
    backgroundColor: brand.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(18, 18, 26, 0.8)',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
    marginRight: 6,
  },
  liveText: {
    color: '#22C55E',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    fontVariant: ['tabular-nums'],
  },
  participantsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  participantsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  videoGrid: {
    flex: 1,
    padding: 12,
    position: 'relative',
  },
  mainVideo: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  remoteTile: {
    flex: 1,
    borderRadius: 20,
  },
  waitingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#12121A',
    borderRadius: 20,
  },
  waitingAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1F1F2E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  waitingTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  waitingSubtext: {
    color: '#737373',
    fontSize: 14,
  },
  localVideoContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 120,
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  localVideo: {
    flex: 1,
  },
  controlsWrapper: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 24,
    alignItems: 'center',
  },
});
