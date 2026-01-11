import React, { createContext, useContext, useRef, useState, useEffect, ReactNode } from 'react';
import { HMSSDK } from '@100mslive/react-native-hms';

interface HmsContextType {
  hmsInstance: HMSSDK | null;
  isInitialized: boolean;
}

const HmsContext = createContext<HmsContextType>({ hmsInstance: null, isInitialized: false });

export function useHms() {
  return useContext(HmsContext);
}

interface HmsProviderProps {
  children: ReactNode;
}

export function HmsProvider({ children }: HmsProviderProps) {
  const [hmsInstance, setHmsInstance] = useState<HMSSDK | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initHms = async () => {
      try {
        const instance = await HMSSDK.build();
        setHmsInstance(instance);
        setIsInitialized(true);
      } catch (error) {
        console.error('[HmsProvider] Failed to initialize HMS:', error);
      }
    };

    initHms();

    return () => {
      if (hmsInstance) {
        hmsInstance.destroy();
      }
    };
  }, []);

  return (
    <HmsContext.Provider value={{ hmsInstance, isInitialized }}>
      {children}
    </HmsContext.Provider>
  );
}
