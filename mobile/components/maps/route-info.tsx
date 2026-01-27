import { View, Text } from 'react-native';
import { Route } from 'expo-osm-sdk';
import { Navigation, Clock } from 'lucide-react-native';
import { useTheme } from '@react-navigation/native';

interface RouteInfoProps {
  route: Route | null;
  formatDistance: (route: Route) => string;
  formatDuration: (route: Route) => string;
}

export function RouteInfo({ route, formatDistance, formatDuration }: RouteInfoProps) {
  const { colors } = useTheme();

  if (!route) return null;

  return (
    <View className="p-2">
      <View className="flex-row items-center justify-between">
        {/* Distance */}
        <View className="flex-1 flex-row items-center gap-3">
          <Navigation color={colors.primary} size={20} />
          <View>
            <Text className="text-xs text-muted-foreground">Distance</Text>
            <Text className="text-base font-semibold text-foreground">{formatDistance(route)}</Text>
          </View>
        </View>

        {/* Duration */}
        <View className="flex-1 flex-row items-center gap-3">
          <Clock color={colors.primary} size={20} />
          <View>
            <Text className="text-xs text-muted-foreground">Duration</Text>
            <Text className="text-base font-semibold text-foreground">{formatDuration(route)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
