import React, { useMemo } from 'react';
import { View, FlatList } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { metrics, sessions } from '@/db/schema';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useDatabase } from '@/components/database-provider';
import { useLocalSearchParams, Stack } from 'expo-router';
import { desc, eq } from 'drizzle-orm';

import { EarTrendChart } from '@/components/charts/ear-trend';
import { MarTrendChart } from '@/components/charts/mar-trend';
import SessionTimeRange from '@/components/insights/session-time-range';

export default function SessionDetailsScreen() {
  const { db } = useDatabase();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  const { data: sessionList } = useLiveQuery(
    db.select().from(sessions).where(eq(sessions.id, sessionId)),
    [sessionId]
  );
  const session = sessionList?.[0];

  const { data: sessionMetrics = [] } = useLiveQuery(
    db
      .select()
      .from(metrics)
      .where(eq(metrics.sessionId, sessionId))
      .orderBy(desc(metrics.timestamp)),
    [sessionId]
  );

  const earValues = useMemo(() => {
    const sorted = [...sessionMetrics].sort((a, b) => a.timestamp - b.timestamp);
    return sorted
      .map((m) => (typeof m.ear === 'number' && !isNaN(m.ear) ? m.ear : null))
      .filter((v) => v !== null) as number[];
  }, [sessionMetrics]);

  const marValues = useMemo(() => {
    const sorted = [...sessionMetrics].sort((a, b) => a.timestamp - b.timestamp);
    return sorted
      .map((m) => (typeof m.mar === 'number' && !isNaN(m.mar) ? m.mar : null))
      .filter((v) => v !== null) as number[];
  }, [sessionMetrics]);

  const HeaderComponent = () => (
    <>
      <Stack.Screen options={{ title: 'Session Details' }} />

      {session ? (
        <View className="mb-4">
          <SessionTimeRange session={session} />
          <Text className="text-sm text-muted-foreground">Client ID: {session.clientId}</Text>
        </View>
      ) : (
        <Text className="text-sm text-muted-foreground">Session not found.</Text>
      )}

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Eye Openness Trend</CardTitle>
          <CardDescription>Lower values may indicate fatigue.</CardDescription>
          <Text className="text-xs text-muted-foreground">Based on Eye Aspect Ratio (EAR).</Text>
        </CardHeader>
        <CardContent>
          <View style={{ height: 250 }}>
            <EarTrendChart data={earValues} />
          </View>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Yawning Trend</CardTitle>
          <CardDescription>Spikes in values may indicate yawning.</CardDescription>
          <Text className="text-xs text-muted-foreground">Based on Mouth Aspect Ratio (MAR).</Text>
        </CardHeader>
        <CardContent>
          <View style={{ height: 250 }}>
            <MarTrendChart data={marValues} />
          </View>
        </CardContent>
      </Card>
    </>
  );

  return (
    <View className="flex-1 px-3 py-4">
      <FlatList
        data={[]}
        keyExtractor={() => 'empty'}
        renderItem={() => null}
        ListHeaderComponent={HeaderComponent}
      />
    </View>
  );
}
