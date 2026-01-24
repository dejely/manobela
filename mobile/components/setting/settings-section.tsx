import React, { ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type SectionProps = {
  title: string;
  children: ReactNode;
  destructive?: boolean;
};

export function Section({ title, children, destructive = false }: SectionProps) {
  return (
    <View className="mb-6">
      <Text
        className={cn(
          'mb-3 text-xs font-semibold uppercase tracking-wide',
          destructive ? 'text-destructive' : 'text-muted-foreground'
        )}>
        {title}
      </Text>
      <View className="gap-3">{children}</View>
    </View>
  );
}
