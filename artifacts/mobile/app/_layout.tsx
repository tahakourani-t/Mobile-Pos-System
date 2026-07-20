import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AppProvider, useApp } from '@/contexts/AppContext';
import { DataProvider } from '@/contexts/DataContext';
import { CartProvider } from '@/contexts/CartContext';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, trialExpired, isOnboardingComplete } = useApp();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const current = segments[0] as string | undefined;
    const inOnboarding = current === 'onboarding';
    const inLogin      = current === 'login';
    const inPaywall    = current === 'paywall';

    if (!isOnboardingComplete && !inOnboarding) {
      // First launch — go to onboarding
      router.replace('/onboarding');
    } else if (isOnboardingComplete && !isAuthenticated && !inLogin && !inOnboarding) {
      // Onboarding done, needs PIN login
      router.replace('/login');
    } else if (isOnboardingComplete && isAuthenticated && trialExpired && !inPaywall) {
      // Trial over — paywall
      router.replace('/paywall');
    } else if (isOnboardingComplete && isAuthenticated && !trialExpired && (inLogin || inOnboarding || inPaywall)) {
      // All good — go to app
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, trialExpired, isOnboardingComplete, segments]);

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <AuthGuard>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="login"      options={{ animation: 'fade' }} />
        <Stack.Screen name="paywall"    options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="inventory"     options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="customers"     options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="reports"       options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="settings"      options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="notifications" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="expenses"      options={{ animation: 'slide_from_right' }} />
      </Stack>
    </AuthGuard>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AppProvider>
                <DataProvider>
                  <CartProvider>
                    <RootLayoutNav />
                  </CartProvider>
                </DataProvider>
              </AppProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
