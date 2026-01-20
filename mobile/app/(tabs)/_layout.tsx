import { Tabs } from 'expo-router';
import { ChartScatter, NotepadText, Aperture, Bolt, Globe, HardDriveUpload } from 'lucide-react-native';
import { ThemeToggle } from '@/components/theme-toggle';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerRight: () => <ThemeToggle />,

        headerTitleStyle: {
          marginLeft: 8,
        },

        headerRightContainerStyle: {
          paddingRight: 12,
        },
      }}>
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color, size }) => <ChartScatter color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="guide"
        options={{
          title: 'Guide',
          tabBarIcon: ({ color, size }) => <NotepadText color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="index"
        options={{
          title: 'Monitor',
          tabBarIcon: ({ color, size }) => <Aperture color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="uploads"
        options={{
          title: 'Uploads',
          tabBarIcon: ({ color, size }) => <HardDriveUpload color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="settings/index"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Bolt color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="api-websocket"
        options={{
          title: 'API',
          tabBarIcon: ({ color, size }) => <Globe color={color} size={size} />,
        }}
      />
      {/* Hidden compartments from tab navigation: */}


    </Tabs>
  );
}
