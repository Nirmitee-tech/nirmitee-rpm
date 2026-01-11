import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F8F7FC' },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="mfa-verify" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
