'use client';

import { useParams } from 'next/navigation';
import { HmsProvider, VideoRoom } from '@/components/telehealth';

export default function VideoCallPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const handleSessionEnd = (duration: number, billableMinutes: number) => {
    console.log('Session ended:', { duration, billableMinutes });
    // Could show a summary modal here
  };

  return (
    <HmsProvider>
      <VideoRoom sessionId={sessionId} onSessionEnd={handleSessionEnd} />
    </HmsProvider>
  );
}
