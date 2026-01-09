'use client';

import { HMSRoomProvider } from '@100mslive/react-sdk';
import { ReactNode } from 'react';

interface HmsProviderProps {
  children: ReactNode;
}

export function HmsProvider({ children }: HmsProviderProps) {
  return <HMSRoomProvider>{children}</HMSRoomProvider>;
}
