import { View, TouchableOpacity } from 'react-native';
import { Plus, Minus } from 'lucide-react-native';
import { useTheme } from '@react-navigation/native';
import { cn } from '@/lib/utils';

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  className?: string;
}

export function ZoomControls({ onZoomIn, onZoomOut, className }: ZoomControlsProps) {
  const { colors } = useTheme();

  return (
    <View className={cn('flex-col gap-2', className)}>
      {/* Zoom In Button */}
      <TouchableOpacity
        onPress={onZoomIn}
        className="rounded-full bg-background/80 p-3 shadow-lg active:bg-background">
        <Plus color={colors.text} size={20} />
      </TouchableOpacity>

      {/* Zoom Out Button */}
      <TouchableOpacity
        onPress={onZoomOut}
        className="rounded-full bg-background/80 p-3 shadow-lg active:bg-background">
        <Minus color={colors.text} size={20} />
      </TouchableOpacity>
    </View>
  );
}
