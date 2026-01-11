import { useState, useEffect, useCallback } from 'react';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Stack } from 'expo-router';
import { View, ScrollView } from 'react-native';
import { ThemeToggle } from '@/components/theme-toggle';

import { useCamera } from '@/hooks/useCamera';
import { useWebRTC } from '@/hooks/useWebRTC';
import { MediaStreamView } from '@/components/media-stream-view';

const SCREEN_OPTIONS = {
  title: 'Manobela',
  headerRight: () => <ThemeToggle />,
};

const WS_BASE = process.env.EXPO_PUBLIC_WS_BASE!;
const WS_URL = `${WS_BASE}/driver-monitoring`;

export default function Screen() {
  const { localStream } = useCamera();

  const { clientId, startConnection, cleanup, transportStatus, connectionStatus, onDataMessage } =
    useWebRTC({
      url: WS_URL,
      stream: localStream,
    });

  const [isRunning, setIsRunning] = useState(false);
  const [inferenceData, setInferenceData] = useState<Record<string, any>>({});

  useEffect(() => {
    const handler = (msg: any) => {
      setInferenceData(msg);
    };

    onDataMessage(handler);
  }, [onDataMessage]);

  const handleToggle = useCallback(async () => {
    if (!isRunning) {
      try {
        setIsRunning(true);
        startConnection();
      } catch {
        setIsRunning(false);
      }
    } else {
      cleanup();
      setIsRunning(false);
    }
  }, [isRunning, startConnection, cleanup]);

  const isDisabled =
    !localStream || transportStatus === 'connecting' || connectionStatus === 'connecting';
  const buttonText = (() => {
    if (!localStream) return 'No camera';
    if (isDisabled && !isRunning) return 'Connecting...';
    return isRunning ? 'Stop' : 'Start';
  })();

  return (
    <ScrollView className="flex-1 px-4">
      <Stack.Screen options={SCREEN_OPTIONS} />

      <View className="mb-2">
        <Text>Client ID: {clientId ?? 'Not connected'}</Text>
        <Text>Connection: {connectionStatus}</Text>
        <Text>Transport: {transportStatus}</Text>
      </View>

      <View className="mb-4 h-96 w-full">
        <MediaStreamView stream={localStream} />
      </View>

      <View className="mb-4">
        <Text>Latest Inference:</Text>
        <Text>{inferenceData ? JSON.stringify(inferenceData, null, 2) : 'No data yet'}</Text>
      </View>

      <Button onPress={handleToggle} disabled={isDisabled} className="w-full">
        <Text className="text-center">{buttonText}</Text>
      </Button>
    </ScrollView>
  );
}
