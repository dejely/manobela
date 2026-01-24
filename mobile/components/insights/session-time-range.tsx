import { Text } from '@/components/ui/text';
import type { InferSelectModel } from 'drizzle-orm';
import { sessions } from '@/db/schema';
import { View } from 'react-native';

type Session = InferSelectModel<typeof sessions>;

function formatTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDuration(durationMs: number) {
  // Convert ms to HH:MM:SS
  const totalSeconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export const SessionTimeRange = ({ session }: { session: Session }) => {
  if (!session) {
    return <Text className="text-sm font-semibold">-</Text>;
  }

  const startDate = new Date(session.startedAt);
  const endDate = session.endedAt ? new Date(session.endedAt) : null;

  return (
    <View>
      <Text className="text-sm font-semibold">
        {startDate.toLocaleDateString()}
        {' | '}
        {formatTime(startDate)}
        {' to '}
        {endDate ? formatTime(endDate) : 'now'}
      </Text>

      <Text className="text-sm text-muted-foreground">
        Duration:{' '}
        {session.durationMs != null
          ? formatDuration(session.durationMs)
          : formatDuration(new Date().getTime() - startDate.getTime())}
      </Text>
    </View>
  );
};
