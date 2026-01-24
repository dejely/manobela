import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { InferSelectModel } from 'drizzle-orm';
import { sessions } from '@/db/schema';
import { SessionTimeRange } from './session-time-range';

type Session = InferSelectModel<typeof sessions>;

export const SessionCard = ({ session, onPress }: { session: Session; onPress: () => void }) => {
  const isActive = !session.endedAt;

  return (
    <TouchableOpacity onPress={onPress} className="mb-3">
      <Card className={isActive ? 'border-2 border-destructive/50' : ''}>
        <CardContent className="space-y-2">
          <View className="flex-row items-center justify-between">
            <SessionTimeRange session={session} />

            {isActive && (
              <Badge variant="destructive">
                <Text className="text-xs font-semibold">Active</Text>
              </Badge>
            )}
          </View>
        </CardContent>
      </Card>
    </TouchableOpacity>
  );
};
