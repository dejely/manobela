import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Stack } from 'expo-router';
import {
  Bell,
  ChevronRight,
  Contrast,
  Lock,
  Mail,
  Palette,
  UserRound,
} from 'lucide-react-native';
import { SettingsSection } from '@/components/settings/section';
import { SettingsRow } from '@/components/settings/rows';
import { SettingsToggle } from '@/components/settings/toggle';
import { ThemeToggle } from '@/components/theme-toggle';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

export default function SettingsScreen() {
  const [highContrast, setHighContrast] = useState(false);
  const [pushAlerts, setPushAlerts] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(false);

  return (
  <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-6 pb-10">
      <Stack.Screen options={{ title: 'Settings' }} />

      <View className="gap-2 px-6 pt-4">
        <Text className="text-2xl font-semibold text-foreground">Settings</Text>
        <Text className="text-sm text-muted-foreground">
          Personalize your monitoring experience and account preferences.
        </Text>
      </View>

      <SettingsSection
        title="Appearance"
        description="Fine tune the interface to match your environment.">
        <SettingsRow
          icon={Palette}
          label="Theme"
          description="Switch between light and dark mode."
          right={<ThemeToggle />}
        />
        <SettingsToggle
          icon={Contrast}
          label="High Contrast"
          description="Increase visibility for dashboard text."
          value={highContrast}
          onValueChange={setHighContrast}
        />
      </SettingsSection>

      <SettingsSection
        title="Notifications"
        description="Choose how you want to stay informed.">
        <SettingsToggle
          icon={Bell}
          label="Push Alerts"
          description="Receive safety notifications instantly."
          value={pushAlerts}
          onValueChange={setPushAlerts}
        />
        <SettingsToggle
          icon={Mail}
          label="Weekly Reports"
          description="Summary email every Monday morning."
          value={weeklyReports}
          onValueChange={setWeeklyReports}
        />
      </SettingsSection>

      <SettingsSection
        title="Account"
        description="Update personal details and privacy controls.">
        <SettingsRow
          icon={UserRound}
          label="Profile Details"
          description="Review your driver profile information."
          right={<Icon as={ChevronRight} className="size-4 text-muted-foreground" />}
        />
        <SettingsRow
          icon={Lock}
          label="Privacy Controls"
          description="Manage data sharing permissions."
          right={<Icon as={ChevronRight} className="size-4 text-muted-foreground" />}
        />
      </SettingsSection>
    </ScrollView>
  );
}
