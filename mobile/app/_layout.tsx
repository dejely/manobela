import '@/global.css';
import 'react-native-url-polyfill/auto';

import { NAV_THEME } from '@/lib/theme';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { SettingsProvider } from '@/hooks/useSettings';
import { DatabaseProvider } from '@/components/database-provider';
import { InsightRefreshProvider } from '@/hooks/useInsightsRefresh';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export default function RootLayout() {
  const { colorScheme } = useColorScheme();

  return (
    <DatabaseProvider>
      <SettingsProvider>
        <InsightRefreshProvider>
          <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
            <PortalHost />
          </ThemeProvider>
        </InsightRefreshProvider>
      </SettingsProvider>
    </DatabaseProvider>
  );
}
