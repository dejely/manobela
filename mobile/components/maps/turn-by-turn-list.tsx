import { useMemo } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { formatDistanceMeters, formatTimeSeconds } from '@/utils/formatting';
import type { RouteStep } from 'expo-osm-sdk';

interface TurnItem {
  step: RouteStep;
  index: number;
}
interface TurnByTurnListProps {
  turnInstructions: RouteStep[];
  currentStepIndex?: number;
  maxSteps?: number;
}

export const TurnByTurnList = ({
  turnInstructions,
  currentStepIndex,
  maxSteps = 6,
}: TurnByTurnListProps) => {
  const visibleSteps = useMemo(() => {
    if (!turnInstructions.length) return [] as { step: RouteStep; index: number }[];

    const clampedMax = Math.max(1, Math.min(maxSteps, turnInstructions.length));
    const startIndex =
      typeof currentStepIndex === 'number'
        ? Math.min(Math.max(currentStepIndex, 0), turnInstructions.length - 1)
        : 0;
    const endIndex = Math.min(startIndex + clampedMax, turnInstructions.length);

    return turnInstructions.slice(startIndex, endIndex).map((step, offset) => ({
      step,
      index: startIndex + offset,
    }));
  }, [turnInstructions, currentStepIndex, maxSteps]);

  return (
    <BottomSheetFlatList
      data={visibleSteps}
      keyExtractor={(item: TurnItem) => item.index.toString()}
      className="h-40"
      scrollEnabled={true}
      nestedScrollEnabled={true}
      showsVerticalScrollIndicator={true}
      contentContainerClassName="gap-2"
      renderItem={({ item }: { item: TurnItem }) => (
        <View className="gap-1 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <View className="flex-row items-start gap-2">
            <Text className="text-xs font-semibold text-muted-foreground">{item.index + 1}</Text>
            <Text className="flex-1 text-sm font-medium text-foreground">
              {item.step.instruction}
            </Text>
          </View>
          <View className="ml-4 flex-row gap-3">
            {item.step.distance > 0 && (
              <View className="flex flex-row gap-1">
                <Text className="text-xs text-muted-foreground">Distance</Text>
                <Text className="text-xs font-semibold text-foreground">
                  {formatDistanceMeters(item.step.distance)}
                </Text>
              </View>
            )}
            {item.step.duration > 0 && (
              <View className="flex flex-row gap-1">
                <Text className="text-xs text-muted-foreground">Duration</Text>
                <Text className="text-xs font-semibold text-foreground">
                  {formatTimeSeconds(item.step.duration)}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
      ListEmptyComponent={
        <View className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2">
          <Text className="text-sm text-muted-foreground">
            No turn-by-turn steps available yet.
          </Text>
        </View>
      }
    />
  );
};
