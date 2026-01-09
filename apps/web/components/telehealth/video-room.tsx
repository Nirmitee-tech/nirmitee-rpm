'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  useHMSActions,
  useHMSStore,
  selectPeers,
  selectIsConnectedToRoom,
  selectLocalPeer,
  selectRoomState,
  HMSRoomState,
} from '@100mslive/react-sdk';
import { useRouter } from 'next/navigation';
import { VideoTile } from './video-tile';
import { CallControls } from './call-controls';
import { ProviderSidebar } from './provider-sidebar';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { telehealthApi } from '@/lib/api/telehealth';
import {
  Loader2,
  AlertCircle,
  Clock,
  User,
  Users,
  PanelRightClose,
  PanelRightOpen,
  Video,
  Phone,
  Shield,
  AlertTriangle,
  LogOut,
  Timer,
} from 'lucide-react';
import { cn } from '@nirmitee/ui';

// Call lifecycle constants
const MAX_CALL_DURATION_SECONDS = 60 * 60; // 60 minutes
const WARNING_BEFORE_END_SECONDS = 5 * 60; // 5 minutes warning
const PEER_LEFT_GRACE_PERIOD_SECONDS = 2 * 60; // 2 minutes after peer leaves

interface PatientInfo {
  id: string;
  name: string;
  age?: number;
  gender?: string;
  mrn?: string;
  conditions?: string[];
}

interface VideoRoomProps {
  sessionId: string;
  onSessionEnd?: (duration: number, billableMinutes: number) => void;
}

type EndReason = 'manual' | 'timeout' | 'peer_left' | 'error';

export function VideoRoom({ sessionId, onSessionEnd }: VideoRoomProps) {
  const router = useRouter();
  const { t } = useTranslations('telehealth.call');
  const hmsActions = useHMSActions();
  const peers = useHMSStore(selectPeers);
  const localPeer = useHMSStore(selectLocalPeer);
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const roomState = useHMSStore(selectRoomState);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [role, setRole] = useState<'provider' | 'patient' | 'caregiver' | null>(null);
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Auto-end states
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [peerLeftAt, setPeerLeftAt] = useState<number | null>(null);
  const [isEnding, setIsEnding] = useState(false);
  const hadRemotePeerRef = useRef(false);

  // Join room on mount and fetch session info
  useEffect(() => {
    const joinRoom = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get session info first (includes patient details)
        const sessionInfo = await telehealthApi.getSession(sessionId);
        if (sessionInfo.patient) {
          setPatientId(sessionInfo.patient.id);
          setPatientInfo({
            id: sessionInfo.patient.id,
            name: `${sessionInfo.patient.user?.firstName || ''} ${sessionInfo.patient.user?.lastName || ''}`.trim() || 'Patient',
          });
        } else {
          setPatientId(sessionInfo.patientId);
        }

        // Get join token from backend
        const { token, role: userRole } = await telehealthApi.joinSession(sessionId);
        setRole(userRole);

        console.log('[VideoRoom] Joining with token:', token.substring(0, 50) + '...');

        // Join 100ms room
        await hmsActions.join({
          authToken: token,
          userName: 'User',
          settings: {
            isAudioMuted: false,
            isVideoMuted: false,
          },
          rememberDeviceSelection: true,
        });
      } catch (err) {
        console.error('Failed to join room:', err);
        setError(err instanceof Error ? err.message : 'Failed to join video call');
      } finally {
        setIsLoading(false);
      }
    };

    joinRoom();

    return () => {
      if (isConnected) {
        hmsActions.leave();
      }
    };
  }, [sessionId, hmsActions]);

  // Force enable camera/mic after connection
  useEffect(() => {
    if (isConnected && localPeer) {
      const timer = setTimeout(async () => {
        try {
          await hmsActions.setLocalAudioEnabled(true);
          await hmsActions.setLocalVideoEnabled(true);
        } catch (err) {
          console.error('[VideoRoom] Failed to enable audio/video:', err);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isConnected, localPeer, hmsActions]);

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConnected) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isConnected]);

  // Auto-end after max duration
  useEffect(() => {
    if (!isConnected || isEnding) return;

    // Show warning 5 minutes before auto-end
    const timeUntilWarning = MAX_CALL_DURATION_SECONDS - WARNING_BEFORE_END_SECONDS - callDuration;
    if (timeUntilWarning <= 0 && !showTimeWarning) {
      setShowTimeWarning(true);
    }

    // Auto-end at max duration
    if (callDuration >= MAX_CALL_DURATION_SECONDS) {
      handleEndCall('timeout');
    }
  }, [callDuration, isConnected, isEnding, showTimeWarning]);

  // Track when remote peer leaves
  const remotePeers = peers.filter((peer) => !peer.isLocal);
  const hasRemotePeers = remotePeers.length > 0;

  useEffect(() => {
    if (hasRemotePeers) {
      hadRemotePeerRef.current = true;
      setPeerLeftAt(null); // Reset if peer rejoins
    } else if (hadRemotePeerRef.current && !hasRemotePeers && isConnected) {
      // Peer was here but left
      setPeerLeftAt(Date.now());
    }
  }, [hasRemotePeers, isConnected]);

  // Auto-end grace period after peer leaves
  useEffect(() => {
    if (!peerLeftAt || isEnding) return;

    const checkGracePeriod = () => {
      const elapsed = Math.floor((Date.now() - peerLeftAt) / 1000);
      if (elapsed >= PEER_LEFT_GRACE_PERIOD_SECONDS) {
        handleEndCall('peer_left');
      }
    };

    const interval = setInterval(checkGracePeriod, 1000);
    return () => clearInterval(interval);
  }, [peerLeftAt, isEnding]);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRemainingTime = () => {
    return Math.max(0, MAX_CALL_DURATION_SECONDS - callDuration);
  };

  const getPeerLeftCountdown = () => {
    if (!peerLeftAt) return 0;
    const elapsed = Math.floor((Date.now() - peerLeftAt) / 1000);
    return Math.max(0, PEER_LEFT_GRACE_PERIOD_SECONDS - elapsed);
  };

  const handleEndCall = useCallback(async (reason: EndReason = 'manual') => {
    if (isEnding) return;
    setIsEnding(true);

    try {
      await hmsActions.leave();
      if (role === 'provider') {
        const result = await telehealthApi.endSession(sessionId);
        onSessionEnd?.(result.duration, result.billableMinutes);
      }
      console.log(`[VideoRoom] Call ended. Reason: ${reason}`);
      router.push('/telehealth');
    } catch (err) {
      console.error('Failed to end call:', err);
      router.push('/telehealth');
    }
  }, [hmsActions, sessionId, role, onSessionEnd, router, isEnding]);

  const dismissTimeWarning = () => {
    setShowTimeWarning(false);
  };

  // Loading state
  if (isLoading || roomState === HMSRoomState.Connecting) {
    return (
      <div className="h-full w-full bg-gradient-to-br from-[#0a0a12] via-[#0d0d1a] to-[#12101f] flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-[#745EE1]/20 flex items-center justify-center mx-auto mb-6">
              <Video className="w-10 h-10 text-[#745EE1]" />
            </div>
            <Loader2 className="w-6 h-6 text-[#745EE1] animate-spin absolute -bottom-1 -right-1" />
          </div>
          <p className="text-white text-lg font-medium">{t('connecting') || 'Connecting...'}</p>
          <p className="text-[#737373] text-sm mt-2">
            {t('pleaseWait') || 'Setting up your secure video call'}
          </p>
          <div className="flex items-center justify-center gap-2 mt-4 text-[#737373] text-xs">
            <Shield className="w-3.5 h-3.5" />
            <span>{t('encrypted') || 'End-to-end encrypted'}</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full w-full bg-gradient-to-br from-[#0a0a12] via-[#0d0d1a] to-[#12101f] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-white text-xl font-semibold mb-2">
            {t('connectionFailed') || 'Connection Failed'}
          </h2>
          <p className="text-[#737373] mb-6 text-sm">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/telehealth')}
              className="px-5 py-2.5 rounded-xl border border-[#2a2a3e] text-white hover:bg-[#1f1f2e] transition-all text-sm font-medium"
            >
              {t('goBack') || 'Go Back'}
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#745EE1] to-[#8B5CF6] text-white hover:opacity-90 transition-all text-sm font-medium shadow-lg shadow-[#745EE1]/25"
            >
              {t('tryAgain') || 'Try Again'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isProvider = role === 'provider';
  const peerLeftCountdown = getPeerLeftCountdown();

  return (
    <div className="h-full w-full bg-gradient-to-br from-[#0a0a12] via-[#0d0d1a] to-[#12101f] flex relative">
      {/* Time Warning Modal */}
      {showTimeWarning && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a24] border border-white/10 rounded-2xl p-6 max-w-md mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Timer className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h3 className="text-white text-lg font-semibold">
                  {t('timeWarningTitle') || 'Call Ending Soon'}
                </h3>
                <p className="text-[#737373] text-sm">
                  {t('timeWarningSubtitle') || 'Maximum call duration limit'}
                </p>
              </div>
            </div>
            <p className="text-[#a0a0a0] text-sm mb-4">
              {t('timeWarningMessage') || 'This call will automatically end in'}{' '}
              <span className="text-amber-400 font-mono font-semibold">
                {formatDuration(getRemainingTime())}
              </span>
              . {t('timeWarningAction') || 'Please wrap up your consultation.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={dismissTimeWarning}
                className="flex-1 px-4 py-2.5 rounded-xl border border-[#2a2a3e] text-white hover:bg-[#1f1f2e] transition-all text-sm font-medium"
              >
                {t('continue') || 'Continue'}
              </button>
              <button
                onClick={() => handleEndCall('manual')}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/90 text-white hover:bg-red-500 transition-all text-sm font-medium flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4 rotate-[135deg]" />
                {t('endNow') || 'End Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Video Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Enhanced Header with Patient Info */}
        <div className="flex-shrink-0 px-4 py-2 flex items-center justify-between bg-[#12121a]/80 backdrop-blur-md border-b border-white/5">
          {/* Left: Call Status & Patient Info */}
          <div className="flex items-center gap-4">
            {/* Live Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-400 text-xs font-semibold uppercase tracking-wide">Live</span>
            </div>

            {/* Patient Info */}
            {patientInfo && (
              <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#745EE1] to-[#8B5CF6] flex items-center justify-center shadow-lg shadow-[#745EE1]/20">
                  <span className="text-white font-bold text-sm">
                    {patientInfo.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-white text-sm font-semibold leading-tight">{patientInfo.name}</h3>
                  <p className="text-[#737373] text-xs">
                    {role === 'provider' ? (t('patient') || 'Patient') : (t('videoConsultation') || 'Video Consultation')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Center: Duration */}
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
            <Clock className="w-4 h-4 text-[#745EE1]" />
            <span className="font-mono text-white text-sm font-medium">{formatDuration(callDuration)}</span>
            {/* Max duration indicator */}
            <span className="text-[#737373] text-xs">/ {formatDuration(MAX_CALL_DURATION_SECONDS)}</span>
          </div>

          {/* Right: Participants & Controls */}
          <div className="flex items-center gap-3">
            {/* Participants */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <Users className="w-4 h-4 text-[#737373]" />
              <span className="text-white text-sm font-medium">{peers.length}</span>
            </div>

            {/* Role Badge */}
            {role && (
              <div className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide border',
                role === 'provider'
                  ? 'bg-[#745EE1]/10 text-[#745EE1] border-[#745EE1]/20'
                  : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
              )}>
                {role === 'provider' ? (t('provider') || 'Provider') : (t('patientRole') || 'Patient')}
              </div>
            )}

            {/* Sidebar Toggle */}
            {isProvider && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={cn(
                  'p-2 rounded-lg transition-all',
                  sidebarOpen
                    ? 'bg-[#745EE1]/20 text-[#745EE1]'
                    : 'bg-white/5 text-[#737373] hover:bg-white/10 hover:text-white'
                )}
                title={sidebarOpen ? 'Hide RPM Panel' : 'Show RPM Panel'}
              >
                {sidebarOpen ? (
                  <PanelRightClose className="w-5 h-5" />
                ) : (
                  <PanelRightOpen className="w-5 h-5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Video Grid */}
        <div className="flex-1 p-3 min-h-0 relative">
          {hasRemotePeers ? (
            <div className={cn(
              'w-full h-full grid gap-3',
              remotePeers.length === 1 && 'grid-cols-1',
              remotePeers.length === 2 && 'grid-cols-2',
              remotePeers.length >= 3 && 'grid-cols-2',
            )}>
              {remotePeers.map((peer) => (
                <div key={peer.id} className="relative rounded-2xl overflow-hidden bg-[#1a1a24] shadow-2xl">
                  <VideoTile
                    peerId={peer.id}
                    className="w-full h-full"
                  />
                  {/* Peer name overlay */}
                  <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm">
                    <span className="text-white text-sm font-medium">{peer.name || 'Participant'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                {peerLeftAt ? (
                  // Peer left - show countdown
                  <>
                    <div className="relative mb-6">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-500/20 to-red-500/20 flex items-center justify-center mx-auto border-2 border-amber-500/30">
                        <LogOut className="w-12 h-12 text-amber-500" />
                      </div>
                    </div>
                    <p className="text-white text-lg font-medium mb-2">
                      {t('peerLeft') || 'Participant has left'}
                    </p>
                    <p className="text-[#737373] text-sm max-w-xs mx-auto mb-4">
                      {t('peerLeftMessage') || 'The call will automatically end if they don\'t rejoin'}
                    </p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20">
                      <Timer className="w-4 h-4 text-amber-500" />
                      <span className="font-mono text-amber-400 font-semibold">
                        {formatDuration(peerLeftCountdown)}
                      </span>
                      <span className="text-amber-400/70 text-sm">{t('remaining') || 'remaining'}</span>
                    </div>
                  </>
                ) : (
                  // Waiting for peer
                  <>
                    <div className="relative mb-6">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#1f1f2e] to-[#2a2a3e] flex items-center justify-center mx-auto">
                        <User className="w-12 h-12 text-[#737373]" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#745EE1]/20 flex items-center justify-center">
                        <Phone className="w-4 h-4 text-[#745EE1] animate-pulse" />
                      </div>
                    </div>
                    <p className="text-white text-lg font-medium mb-2">
                      {t('waitingForOthers') || 'Waiting for participant...'}
                    </p>
                    <p className="text-[#737373] text-sm max-w-xs mx-auto">
                      {t('shareLink') || 'The other participant will appear here once they join'}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Local video (PIP) */}
          {localPeer && (
            <div className="absolute bottom-4 right-4 w-36 lg:w-44 z-10 group">
              <div className="rounded-xl overflow-hidden shadow-2xl border-2 border-white/10 bg-[#1a1a24] transition-transform group-hover:scale-105">
                <VideoTile
                  peerId={localPeer.id}
                  isLocal
                  className="w-full aspect-video"
                />
              </div>
              <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm">
                <span className="text-white text-xs font-medium">{t('you') || 'You'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Controls */}
        <div className="flex-shrink-0 py-4 px-6 bg-[#0d0d15]/80 backdrop-blur-md border-t border-white/5">
          <div className="flex items-center justify-center">
            <CallControls onEndCall={() => handleEndCall('manual')} />
          </div>
        </div>
      </div>

      {/* Provider Sidebar */}
      {isProvider && patientId && (
        <div className={cn(
          'flex-shrink-0 border-l border-white/5 bg-white dark:bg-[#12121a] transition-all duration-300 ease-in-out',
          sidebarOpen ? 'w-[320px]' : 'w-0 overflow-hidden'
        )}>
          {sidebarOpen && (
            <ProviderSidebar
              patientId={patientId}
              sessionId={sessionId}
              patientInfo={patientInfo || undefined}
              callDuration={callDuration}
            />
          )}
        </div>
      )}
    </div>
  );
}
