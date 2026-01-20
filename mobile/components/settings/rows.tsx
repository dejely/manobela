import * as React from 'react';
import { Pressable, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type SettingsRowProps = {
  icon: LucideIcon;
  label: string;
  description?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  className?: string;
};

export function SettingsRow({
  icon,
  label,
  description,
  right,
  onPress,
  className,
}: SettingsRowProps) {
  const Container = onPress ? Pressable : View;

  return (
    <Container
      {...(onPress ? { onPress } : {})}
      className={cn(
        'flex-row items-center gap-3 border-b border-border px-4 py-3 last:border-b-0',
        className
      )}>
      <View className="size-10 items-center justify-center rounded-full bg-muted/60">
        <Icon as={icon} className="size-5 text-muted-foreground" />
      </View>
      <View className="flex-1 gap-1">
        <Text className="text-base font-medium text-foreground">{label}</Text>
        {description ? (
          <Text className="text-xs text-muted-foreground">{description}</Text>
        ) : null}
      </View>
      {right ? <View className="ml-auto">{right}</View> : null}
    </Container>
  );
}
