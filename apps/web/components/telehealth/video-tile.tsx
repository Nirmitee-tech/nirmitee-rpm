'use client';

import { useVideo, useHMSStore, selectPeerByID, selectCameraStreamByPeerID, selectIsPeerAudioEnabled, selectIsPeerVideoEnabled } from '@100mslive/react-sdk';
import { Mic, MicOff, User } from 'lucide-react';
import { cn } from '@nirmitee/ui';

interface VideoTileProps {
  peerId: string;
  isLocal?: boolean;
  className?: string;
}

export function VideoTile({ peerId, isLocal = false, className }: VideoTileProps) {
  const peer = useHMSStore(selectPeerByID(peerId));
  const videoTrack = useHMSStore(selectCameraStreamByPeerID(peerId));
  const isAudioEnabled = useHMSStore(selectIsPeerAudioEnabled(peerId));
  const isVideoEnabled = useHMSStore(selectIsPeerVideoEnabled(peerId));

  // useVideo returns a ref that auto-attaches to the video track
  // attach: true ensures stream is attached when track is enabled
  const { videoRef } = useVideo({
    trackId: videoTrack?.id,
    attach: Boolean(videoTrack?.enabled),
  });

  if (!peer) return null;

  return (
    <div
      className={cn(
        'relative rounded-xl overflow-hidden bg-[#1f1f2e] aspect-video',
        className
      )}
    >
      {isVideoEnabled && videoTrack ? (
        <video
          ref={videoRef}
          autoPlay
          muted={isLocal}
          playsInline
          className={cn(
            'w-full h-full object-cover',
            isLocal && 'transform -scale-x-100'
          )}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#745EE1]/20 to-[#8B5CF6]/20">
          <div className="w-20 h-20 rounded-full bg-[#745EE1]/30 flex items-center justify-center">
            <User className="w-10 h-10 text-[#745EE1]" />
          </div>
        </div>
      )}

      {/* Overlay with peer info */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-medium truncate max-w-[150px]">
              {peer.name}
              {isLocal && ' (You)'}
            </span>
            {peer.roleName && (
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-xs capitalize">
                {peer.roleName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {!isAudioEnabled && (
              <div className="p-1.5 rounded-full bg-red-500/80">
                <MicOff className="w-3 h-3 text-white" />
              </div>
            )}
            {isAudioEnabled && (
              <div className="p-1.5 rounded-full bg-white/20">
                <Mic className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
