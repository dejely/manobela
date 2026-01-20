import { useMemo, type ReactNode } from 'react';
import { Linking, Pressable, ScrollView, Switch, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import Constants from 'expo-constants';
import {
  ChevronRight,
  Globe,
  HelpCircle,
  Github,
  Info,
  Link2,
  ShieldCheck,
  FileText,
  Languages,
  SunMoon,
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';

const LINKS = {
  faq: 'https://github.com/popcorn-prophets/manobela/blob/main/README.md',
  issues: 'https://github.com/popcorn-prophets/manobela/issues',
  privacy: 'https://github.com/popcorn-prophets/manobela/blob/master/CODE_OF_CONDUCT.md',
  terms: 'https://github.com/popcorn-prophets/manobela/blob/master/LICENSE',
  dataProtection: 'https://github.com/popcorn-prophets/manobela/blob/master/CODE_OF_CONDUCT.md',
};

type SettingRowProps = {
  icon: typeof ChevronRight;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: ReactNode;
  disabled?: boolean;
};

function SettingRow({
  icon,
  label,
  value,
  onPress,
  rightElement,
  disabled,
}: SettingRowProps) {

// Faint glowing code block -- start --
const baseClassName = 'flex-row items-center justify-between rounded-2xl px-4 py-3';
const content = (pressed?: boolean) => (
  <View
    className={[
      baseClassName,
      disabled ? 'bg-card opacity-50' : pressed ? 'bg-muted/40' : 'bg-card',
    ].join(' ')}
  >
    <View className="flex-row items-center">
      <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-muted">
        <Icon as={icon} className="text-foreground" size={18} />
      </View>

      <View>
        <Text className="text-base font-medium text-foreground">{label}</Text>
        {value ? <Text className="text-sm text-muted-foreground">{value}</Text> : null}
      </View>
    </View>

    <View className="flex-row items-center">
      {rightElement}
      {onPress ? <Icon as={ChevronRight} className="ml-2 text-muted-foreground" size={18} /> : null}
    </View>
  </View>
);

if (!onPress) return content(false);

return (
  <Pressable
    accessibilityRole="button"
    disabled={disabled}
    onPress={disabled ? undefined : onPress}
  >
    {({ pressed }) => content(pressed)}
  </Pressable>
);
// Faint glowing code block -- end --
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View className="mb-6">
      <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </Text>
      <View className="gap-3">{children}</View>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { colorScheme, setColorScheme } = useColorScheme();

  const isDarkMode = colorScheme === 'dark';
  const appName = Constants.expoConfig?.name ?? 'Manobela';
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const aboutValue = useMemo(() => `${appName} • v${appVersion}`, [appName, appVersion]);

  const handleOpenLink = async (url: string) => {
    try{
      await Linking.openURL(url)
    }catch (e){
      console.warn('Failed to open URL', url, e)
    }
  };

  return (
    <ScrollView className="flex-1 px-4 py-4">
      <Stack.Screen options={{ title: 'Settings' }} />

      <Section title="Appearance">
        <SettingRow
          icon={SunMoon}
          label="Theme"
          value={isDarkMode ? 'Dark' : 'Light'}
          rightElement={
            <Switch
              accessibilityLabel="Toggle dark mode"
              onValueChange={(value) => setColorScheme(value ? 'dark' : 'light')}
              value={isDarkMode}
            />
          }
        />
      </Section>

      <Section title="Language">
        <SettingRow icon={Languages} label="English" value="Only language available" disabled />
      </Section>

      <Section title="Support & Feedback">
        <SettingRow
          icon={HelpCircle}
          label="FAQ"
          onPress={() => handleOpenLink(LINKS.faq)}
        />
        <SettingRow
          icon={Github}
          label="GitHub Issues"
          onPress={() => handleOpenLink(LINKS.issues)}
        />
      </Section>

      <Section title="About">
        <SettingRow icon={Info} label="App" value={aboutValue} />
      </Section>

      <Section title = "API">
        <SettingRow
          icon={Globe}
          label="Configure URL"
          onPress={() => router.push('/settings/api-websocket')}
        />
      </Section>

      <Section title="Legal & Compliance">
        <SettingRow
          icon={ShieldCheck}
          label="Privacy Policy"
          onPress={() => handleOpenLink(LINKS.privacy)}
        />
        <SettingRow
          icon={FileText}
          label="Terms & Conditions"
          onPress={() => handleOpenLink(LINKS.terms)}
        />
        <SettingRow
          icon={Link2}
          label="Data Protection"
          onPress={() => handleOpenLink(LINKS.dataProtection)}
        />
      </Section>
    </ScrollView>
  );
}
