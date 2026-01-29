import { View } from 'react-native';
import { Route, type RouteStep } from 'expo-osm-sdk';
import { Navigation, Clock } from 'lucide-react-native';
import { useTheme } from '@react-navigation/native';
import { Text } from '@/components/ui/text';
import { TurnByTurnList } from '@/components/maps/turn-by-turn-list';
import { formatDistanceMeters, formatTimeSeconds } from '@/utils/formatting';
import { useMemo } from 'react';

interface RouteInfoProps {
  route: Route | null;
}

export function RouteInfo({ route }: RouteInfoProps) {
  const { colors } = useTheme();

  const turnInstructions = useMemo(() => {
    if (!route) return [];
    if (Array.isArray(route.steps) && route.steps.length > 0) {
      return route.steps as RouteStep[];
    }
    return [];
  }, [route]);

  if (!route) return null;

  return (
    <View className="p-2">
      <View className="mb-6 flex-row items-center justify-between">
        {/* Distance */}
        <View className="flex-1 flex-row items-center gap-3">
          <Navigation color={colors.primary} size={20} />
          <View>
            <Text className="text-xs text-muted-foreground">Distance</Text>
            <Text className="text-base font-semibold text-foreground">
              {formatDistanceMeters(route.distance)}
            </Text>
          </View>
        </View>

        {/* Duration */}
        <View className="flex-1 flex-row items-center gap-3">
          <Clock color={colors.primary} size={20} />
          <View>
            <Text className="text-xs text-muted-foreground">Duration</Text>
            <Text className="text-base font-semibold text-foreground">
              {formatTimeSeconds(route.duration)}
            </Text>
          </View>
        </View>
      </View>

      {/* Turn-by-turn preview */}
      {turnInstructions.length > 0 && (
        <View>
          <Text className="mb-2 text-sm font-semibold">Steps</Text>
          <TurnByTurnList turnInstructions={turnInstructions} maxSteps={4} />
        </View>
      )}
    </View>
  );
}
