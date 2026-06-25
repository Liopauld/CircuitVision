import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/context/auth';
import { Loader } from '@/components/ui';
import { colors } from '@/theme/colors';

export const unstable_settings = { initialRouteName: '(tabs)' };

function RootNavigator() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Login-first: bounce unauthenticated users to /login, and authenticated
  // users away from the auth screens.
  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === 'login' || segments[0] === 'register';
    if (!user && !inAuth) router.replace('/login');
    else if (user && inAuth) router.replace('/');
  }, [user, loading, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Loader />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { color: colors.text },
        headerTintColor: colors.copperBright,
        contentStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ title: 'Create account' }} />
      <Stack.Screen name="listing/[id]" options={{ title: 'Listing' }} />
      <Stack.Screen name="order/[id]" options={{ title: 'Order' }} />
      <Stack.Screen name="conversation/[id]" options={{ title: 'Conversation' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
