import React, { Component, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/lib/useColorScheme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import S from '@/utils/storage';
import { rescheduleAll } from '@/lib/notifications';

export const unstable_settings = {
  initialRouteName: 'setup',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Catches any unhandled render error and shows a recovery screen instead of
// a white blank screen. Patient data is always safe (stored in AsyncStorage).
class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#F8FAFC' }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>⚠️</Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 8, textAlign: 'center' }}>
            Something went wrong
          </Text>
          <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 32, lineHeight: 22 }}>
            The app ran into an unexpected error. Your health data is safe.
          </Text>
          <Pressable
            style={{ backgroundColor: '#6366F1', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12 }}
            onPress={() => this.setState({ hasError: false })}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>Try Again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

function RootLayoutNav({ colorScheme }: { colorScheme: 'light' | 'dark' | null | undefined }) {
  const router = useRouter();

  useEffect(() => {
    async function checkOnboarding() {
      const done = await S.get('onboarding_complete');
      SplashScreen.hideAsync();
      if (done) {
        // Restore any OS-cleared medication reminders on every app launch.
        // The OS can clear scheduled notifications after a reboot or under memory
        // pressure; this ensures they are always active when the app opens.
        const meds = await S.get('medications');
        if (Array.isArray(meds)) rescheduleAll(meds).catch(() => {});
        router.replace('/(tabs)');
      }
    }
    checkOnboarding();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="setup" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="dev" options={{ title: 'Dev Tools', presentation: 'modal' }} />
        <Stack.Screen name="food-guide" options={{ headerShown: false }} />
        <Stack.Screen name="pharmacy-hub" options={{ headerShown: false }} />
        <Stack.Screen name="insurance-hub" options={{ headerShown: false }} />
        <Stack.Screen name="rejection-log" options={{ headerShown: false }} />
        <Stack.Screen name="vaccination-record" options={{ headerShown: false }} />
        <Stack.Screen name="clinical-notes" options={{ headerShown: false }} />
        <Stack.Screen name="backup-restore" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardProvider>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
            <RootLayoutNav colorScheme={colorScheme} />
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
