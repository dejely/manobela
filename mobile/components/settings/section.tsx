import * as React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type SettingsSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export function SettingsSection({
  title,
  description,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <View className={cn('gap-3', className)}>
      <View className="gap-1 px-6">
        <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </Text>
        {description ? (
          <Text className="text-sm text-muted-foreground">{description}</Text>
        ) : null}
      </View>
      <View className="overflow-hidden rounded-2xl border border-border bg-card">
        {children}
      </View>
    </View>
  );
}
