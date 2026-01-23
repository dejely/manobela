import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useDatabase } from '@/components/database-provider';
import { useInsightRefresh } from '@/hooks/useInsightsRefresh';
import { sessions } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import SessionsList from '@/components/insights/sessions-list';

export default function InsightsScreen() {
  const { db } = useDatabase();
  const router = useRouter();
  const { tick } = useInsightRefresh();

  const { data: sessionList = [] } = useLiveQuery(
    db.select().from(sessions).orderBy(desc(sessions.startedAt)),
    [tick]
  );

  return (
    <View className="flex-1">
      <SessionsList
        sessions={sessionList}
        onPressSession={(id) => router.push(`/insights/session/${id}`)}
      />
    </View>
  );
}
