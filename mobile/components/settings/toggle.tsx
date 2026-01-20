import * as React from 'react';
import { Switch } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { SettingsRow } from '@/components/settings/rows';

type SettingsToggleProps = {
  icon: LucideIcon;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

export function SettingsToggle({
  icon,
  label,
  description,
  value,
  onValueChange,
}: SettingsToggleProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <SettingsRow
      icon={icon}
      label={label}
      description={description}
      right={
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{
            false: isDark ? '#1f2937' : '#e2e8f0',
            true: isDark ? '#6366f1' : '#4f46e5',
          }}
          thumbColor={value ? (isDark ? '#e2e8f0' : '#ffffff') : '#f8fafc'}
          ios_backgroundColor={isDark ? '#1f2937' : '#e2e8f0'}
        />
      }
    />
  );
}
