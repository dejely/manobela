import { useTheme } from '@react-navigation/native';
import { useMemo } from 'react';
import { LineChart, CurveType } from 'react-native-gifted-charts';
import { Text } from '@/components/ui/text';

export const EarTrendChart = ({
  data,
  ear_threshold = 0.14,
}: {
  data: number[];
  ear_threshold?: number;
}) => {
  const { colors } = useTheme();

  const chartData = useMemo(() => data.map((value) => ({ value })), [data]);

  if (!data.length) {
    return (
      <Text className="text-sm text-muted-foreground">No valid values available for chart.</Text>
    );
  }

  return (
    <LineChart
      data={chartData}
      height={200}
      spacing={20}
      initialSpacing={10}
      adjustToWidth
      thickness={2}
      colors={[
        {
          from: 0,

          to: ear_threshold,

          color: colors.destructive,
        },
        {
          from: ear_threshold,
          to: 25,
          color: colors.primary,
        },
      ]}
      dataPointsColor={colors.primary}
      yAxisTextStyle={{ color: colors.text }}
      xAxisLabelTextStyle={{ color: colors.text }}
      curved
      curveType={CurveType.CUBIC}
      curvature={0.3}
      hideRules={true}
      showVerticalLines={false}
      isAnimated={true}
    />
  );
};
