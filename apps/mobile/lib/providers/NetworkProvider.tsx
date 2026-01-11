import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { brand } from '@/constants/Colors';

interface NetworkContextType {
  isConnected: boolean;
  isInternetReachable: boolean | null;
}

const NetworkContext = createContext<NetworkContextType>({
  isConnected: true,
  isInternetReachable: true,
});

export const useNetwork = () => useContext(NetworkContext);

interface NetworkProviderProps {
  children: ReactNode;
}

export function NetworkProvider({ children }: NetworkProviderProps) {
  const [networkState, setNetworkState] = useState<NetworkContextType>({
    isConnected: true,
    isInternetReachable: true,
  });
  const [showBanner, setShowBanner] = useState(false);
  const slideAnim = useState(new Animated.Value(-50))[0];

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const isConnected = state.isConnected ?? false;
      const isInternetReachable = state.isInternetReachable;

      setNetworkState({ isConnected, isInternetReachable });

      if (!isConnected) {
        setShowBanner(true);
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      } else if (showBanner) {
        // Hide banner after connection restored
        setTimeout(() => {
          Animated.timing(slideAnim, {
            toValue: -50,
            duration: 300,
            useNativeDriver: true,
          }).start(() => setShowBanner(false));
        }, 2000);
      }
    });

    return () => unsubscribe();
  }, [showBanner]);

  return (
    <NetworkContext.Provider value={networkState}>
      {children}
      {showBanner && (
        <Animated.View
          style={[
            styles.banner,
            {
              transform: [{ translateY: slideAnim }],
              backgroundColor: networkState.isConnected ? '#5BCC56' : '#FF4351',
            },
          ]}
        >
          <Text style={styles.bannerText}>
            {networkState.isConnected
              ? 'Connection restored'
              : 'No internet connection'}
          </Text>
        </Animated.View>
      )}
    </NetworkContext.Provider>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50,
    paddingBottom: 10,
    paddingHorizontal: 16,
    zIndex: 9999,
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default NetworkProvider;
