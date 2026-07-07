import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Boogaloo_400Regular } from '@expo-google-fonts/boogaloo';
import { PermanentMarker_400Regular } from '@expo-google-fonts/permanent-marker';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect } from 'react';
import { useColorScheme } from '@/lib/useColorScheme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';

export const unstable_settings = {
  initialRouteName: 'index',
};

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav({ colorScheme }: { colorScheme: 'light' | 'dark' | null | undefined }) {
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0B0B14' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="create" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="play/[id]" options={{ animation: 'fade' }} />
        <Stack.Screen name="remix/[id]" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen
          name="send-challenge"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.65],
            sheetGrabberVisible: true,
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="import-challenge"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.65],
            sheetGrabberVisible: true,
            headerShown: false,
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({ Boogaloo_400Regular, PermanentMarker_400Regular });

  // Render once fonts are ready OR if they failed to load — never block the UI forever.
  const ready = fontsLoaded || !!fontError;

  // Dismiss the native splash screen once we're ready to render content.
  // Without this the splash stays up forever and the app looks frozen on launch.
  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  const onLayoutRootView = useCallback(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <KeyboardProvider>
          <StatusBar style="light" />
          <RootLayoutNav colorScheme={colorScheme} />
        </KeyboardProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
