import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';

interface KpiCardProps {
  eyeClosedPercent: number;
  totalYawnCount: number;
  phoneUsagePercent: number;
  gazeAlertPercent: number;
  headPoseAlertPercent: number;
  faceMissingPercent: number;
}

/**
 * Shows KPI (Key Performance Indicator) values for the current session.
 */
export const KpiCard = ({
  eyeClosedPercent,
  totalYawnCount,
  phoneUsagePercent,
  gazeAlertPercent,
  headPoseAlertPercent,
  faceMissingPercent,
}: KpiCardProps) => {
  return (
    <View className="mb-4 flex-row flex-wrap px-1">
      <View className="mb-2 w-1/3">
        <Text className="text-xl font-semibold">{(eyeClosedPercent * 100).toFixed(1)}%</Text>
        <Text className="text-xs text-muted-foreground">Eyes Closed</Text>
      </View>

      <View className="mb-2 w-1/3">
        <Text className="text-xl font-semibold">{totalYawnCount}</Text>
        <Text className="text-xs text-muted-foreground">Yawns</Text>
      </View>

      <View className="mb-2 w-1/3">
        <Text className="text-xl font-semibold">{(phoneUsagePercent * 100).toFixed(1)}%</Text>
        <Text className="text-xs text-muted-foreground">Phone Usage</Text>
      </View>

      <View className="mb-2 w-1/3">
        <Text className="text-xl font-semibold">{(gazeAlertPercent * 100).toFixed(1)}%</Text>
        <Text className="text-xs text-muted-foreground">Gaze Alert</Text>
      </View>

      <View className="mb-2 w-1/3">
        <Text className="text-xl font-semibold">{(headPoseAlertPercent * 100).toFixed(1)}%</Text>
        <Text className="text-xs text-muted-foreground">Head Pose Alert</Text>
      </View>

      <View className="mb-2 w-1/3">
        <Text className="text-xl font-semibold">{(faceMissingPercent * 100).toFixed(1)}%</Text>
        <Text className="text-xs text-muted-foreground">Face Missing</Text>
      </View>
    </View>
  );
};
