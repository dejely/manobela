import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Check, LocateFixed, X, Navigation } from 'lucide-react-native';
import { useTheme } from '@react-navigation/native';
import { cn } from '@/lib/utils';
import { ZoomControls } from './zoom-controls';

interface RouteControlsProps {
  onUseCurrentLocation: () => void;
  onCalculateRoute: () => void;
  onClearRoute: () => void;
  onStartNavigation: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  hasRoute: boolean;
  isCalculating: boolean;
  isGettingUserLocation: boolean;
  isNavigating: boolean;
  className?: string;
}

export function RouteControls({
  onUseCurrentLocation,
  onCalculateRoute,
  onClearRoute,
  onStartNavigation,
  onZoomIn,
  onZoomOut,
  hasRoute,
  isCalculating,
  isGettingUserLocation,
  isNavigating,
  className,
}: RouteControlsProps) {
  const { colors } = useTheme();
  return (
    <View className={cn('flex-col gap-3', className)}>
      {/* Start Navigation Button (shown when route exists and not navigating) */}
      {hasRoute && !isNavigating && (
        <TouchableOpacity
          onPress={onStartNavigation}
          className="rounded-full bg-background/80 p-3 shadow-lg active:bg-background/70">
          <Navigation color={colors.text} size={20} />
        </TouchableOpacity>
      )}

      {/* Start / Stop Route Button */}
      {hasRoute ? (
        <TouchableOpacity
          onPress={onClearRoute}
          className="rounded-full bg-destructive/80 p-3 shadow-lg active:bg-destructive">
          <X color="white" size={20} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={onCalculateRoute}
          className="rounded-full bg-background/80 p-3 shadow-lg active:bg-background/70">
          <Check color={colors.text} size={20} />
        </TouchableOpacity>
      )}

      {/* Use Current Location Button */}
      <TouchableOpacity
        onPress={onUseCurrentLocation}
        disabled={isCalculating || isGettingUserLocation}
        className="rounded-full bg-background/80 p-3 shadow-lg active:bg-background">
        {isCalculating || isGettingUserLocation ? (
          <ActivityIndicator color={colors.text} size="small" />
        ) : (
          <LocateFixed color={colors.text} size={20} />
        )}
      </TouchableOpacity>

      {/* Zoom Controls */}
      <ZoomControls onZoomIn={onZoomIn} onZoomOut={onZoomOut} />
    </View>
  );
}
