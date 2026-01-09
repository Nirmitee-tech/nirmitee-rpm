'use client';

import {
  useHMSActions,
  useHMSStore,
  selectIsLocalAudioEnabled,
  selectIsLocalVideoEnabled,
  selectIsLocalScreenShared,
} from '@100mslive/react-sdk';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  PhoneOff,
  Settings,
  MoreVertical,
  Users,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@nirmitee/ui';
import { useTranslations } from '@/lib/i18n/i18n-context';

interface CallControlsProps {
  onEndCall: () => void;
  onToggleChat?: () => void;
  onToggleParticipants?: () => void;
  className?: string;
}

export function CallControls({
  onEndCall,
  onToggleChat,
  onToggleParticipants,
  className,
}: CallControlsProps) {
  const { t } = useTranslations('telehealth.call');
  const hmsActions = useHMSActions();
  const isAudioEnabled = useHMSStore(selectIsLocalAudioEnabled);
  const isVideoEnabled = useHMSStore(selectIsLocalVideoEnabled);
  const isScreenShared = useHMSStore(selectIsLocalScreenShared);

  const toggleAudio = async () => {
    await hmsActions.setLocalAudioEnabled(!isAudioEnabled);
  };

  const toggleVideo = async () => {
    await hmsActions.setLocalVideoEnabled(!isVideoEnabled);
  };

  const toggleScreenShare = async () => {
    if (isScreenShared) {
      await hmsActions.setScreenShareEnabled(false);
    } else {
      await hmsActions.setScreenShareEnabled(true);
    }
  };

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-4 p-4 bg-[#12121a]/90 backdrop-blur-sm rounded-2xl',
        className
      )}
    >
      {/* Audio Toggle */}
      <button
        onClick={toggleAudio}
        className={cn(
          'p-4 rounded-full transition-all',
          isAudioEnabled
            ? 'bg-[#1f1f2e] hover:bg-[#2a2a3e] text-white'
            : 'bg-red-500 hover:bg-red-600 text-white'
        )}
        title={isAudioEnabled ? (t('mute') || 'Mute') : (t('unmute') || 'Unmute')}
      >
        {isAudioEnabled ? (
          <Mic className="w-6 h-6" />
        ) : (
          <MicOff className="w-6 h-6" />
        )}
      </button>

      {/* Video Toggle */}
      <button
        onClick={toggleVideo}
        className={cn(
          'p-4 rounded-full transition-all',
          isVideoEnabled
            ? 'bg-[#1f1f2e] hover:bg-[#2a2a3e] text-white'
            : 'bg-red-500 hover:bg-red-600 text-white'
        )}
        title={isVideoEnabled ? (t('stopVideo') || 'Stop Video') : (t('startVideo') || 'Start Video')}
      >
        {isVideoEnabled ? (
          <Video className="w-6 h-6" />
        ) : (
          <VideoOff className="w-6 h-6" />
        )}
      </button>

      {/* Screen Share */}
      <button
        onClick={toggleScreenShare}
        className={cn(
          'p-4 rounded-full transition-all',
          isScreenShared
            ? 'bg-[#745EE1] hover:bg-[#6350c9] text-white'
            : 'bg-[#1f1f2e] hover:bg-[#2a2a3e] text-white'
        )}
        title={isScreenShared ? (t('stopShare') || 'Stop Share') : (t('shareScreen') || 'Share Screen')}
      >
        <Monitor className="w-6 h-6" />
      </button>

      {/* Participants */}
      {onToggleParticipants && (
        <button
          onClick={onToggleParticipants}
          className="p-4 rounded-full bg-[#1f1f2e] hover:bg-[#2a2a3e] text-white transition-all"
          title={t('participants') || 'Participants'}
        >
          <Users className="w-6 h-6" />
        </button>
      )}

      {/* Chat */}
      {onToggleChat && (
        <button
          onClick={onToggleChat}
          className="p-4 rounded-full bg-[#1f1f2e] hover:bg-[#2a2a3e] text-white transition-all"
          title={t('chat') || 'Chat'}
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}

      {/* End Call */}
      <button
        onClick={onEndCall}
        className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all"
        title={t('endCall') || 'End Call'}
      >
        <PhoneOff className="w-6 h-6" />
      </button>
    </div>
  );
}
