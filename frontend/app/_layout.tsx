import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider } from '../contexts/AuthContext';

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return null;
  }

  // Force light theme
  return (
    <AuthProvider>
      <ThemeProvider value={DefaultTheme}>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
          initialRouteName="index"
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="editandaddscreens" />
          <Stack.Screen name="admin" />
          <Stack.Screen name="auth" />
        </Stack>
      </ThemeProvider>
    </AuthProvider>
  );
}
