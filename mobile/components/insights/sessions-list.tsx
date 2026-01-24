import { FlatList, View } from 'react-native';
import type { InferSelectModel } from 'drizzle-orm';
import { sessions } from '@/db/schema';
import { SessionCard } from './session-card';
import { Text } from '@/components/ui/text';

type Session = InferSelectModel<typeof sessions>;

export const SessionsList = ({
  sessions,
  onPressSession,
}: {
  sessions: Session[];
  onPressSession: (id: string) => void;
}) => {
  return (
    <FlatList<Session>
      data={sessions}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingBottom: 24 }}
      ListHeaderComponent={
        <View className="py-2">
          <Text className="text-lg font-bold">Sessions</Text>
          <Text className="text-xs text-muted-foreground">Tap a session to view details.</Text>
        </View>
      }
      ListEmptyComponent={
        <View className="py-8">
          <Text className="text-center text-sm text-muted-foreground">No sessions found.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <SessionCard session={item} onPress={() => onPressSession(item.id)} />
      )}
    />
  );
};
