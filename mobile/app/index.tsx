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

type SessionState = 'idle' | 'starting' | 'active' | 'stopping';

export default function Screen() {
  const { localStream } = useCamera();
  const {
    clientId,
    startConnection,
    cleanup,
    transportStatus,
    connectionStatus,
    onDataMessage,
    error,
  } = useWebRTC({
    url: WS_URL,
    stream: localStream,
  });

  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [inferenceData, setInferenceData] = useState<Record<string, any>>({});

  // Sync session state
  useEffect(() => {
    if (connectionStatus === 'connected' && sessionState === 'starting') {
      setSessionState('active');
    } else if (connectionStatus === 'closed' && sessionState === 'stopping') {
      setSessionState('idle');
    } else if (connectionStatus === 'failed') {
      setSessionState('idle');
    }
  }, [connectionStatus, sessionState]);

  useEffect(() => {
    const handler = (msg: any) => {
      setInferenceData(msg);
    };

    onDataMessage(handler);
  }, [onDataMessage]);

  const handleToggle = useCallback(async () => {
    if (sessionState === 'idle') {
      // Start connection
      try {
        setSessionState('starting');
        startConnection();
      } catch (err) {
        console.error('Failed to start connection:', err);
        setSessionState('idle');
      }
    } else if (sessionState === 'active') {
      // Stop connection
      setSessionState('stopping');
      cleanup();
      setSessionState('idle');
      setInferenceData({});
    }
  }, [sessionState, startConnection, cleanup]);

  // Derived state for UI
  const canInteract = localStream !== null;
  const isConnecting = sessionState === 'starting' || transportStatus === 'connecting';
  const isDisconnecting = sessionState === 'stopping';
  const isActive = sessionState === 'active' && connectionStatus === 'connected';
  const isDisabled = !canInteract || isConnecting || isDisconnecting;

  const buttonText = (() => {
    if (!canInteract) return 'No camera';
    if (isConnecting) return 'Connecting...';
    if (isDisconnecting) return 'Stopping...';
    if (isActive) return 'Stop';
    return 'Start';
  })();

  const statusColor = (() => {
    if (isActive) return 'text-green-600';
    if (isConnecting || isDisconnecting) return 'text-yellow-600';
    if (error) return 'text-red-600';
    return 'text-muted-foreground';
  })();

  return (
    <ScrollView className="flex-1 px-4">
      <Stack.Screen options={SCREEN_OPTIONS} />

      <View className="mb-2">
        <Text className={`text-xs ${statusColor}`}>Status: {sessionState}</Text>
        <Text className="text-xs text-muted-foreground">
          Client ID: {clientId ?? 'Not connected'}
        </Text>
        <Text className="text-xs text-muted-foreground">
          WebRTC: {connectionStatus} | Transport: {transportStatus}
        </Text>
      </View>

      {error && (
        <View className="mb-2">
          <Text className="text-xs text-destructive">{error}</Text>
        </View>
      )}

      <View className="mb-4 h-96 w-full">
        <MediaStreamView stream={localStream} />
      </View>

      <Button
        onPress={handleToggle}
        disabled={isDisabled}
        className="mb-4 w-full"
        variant={isActive ? 'destructive' : 'default'}>
        <Text className="text-center">{buttonText}</Text>
      </Button>

      {isActive && (
        <View className="mb-4">
          <Text className="mb-1 font-semibold">Inference Results:</Text>
          <Text className="font-mono text-xs">
            {inferenceData ? JSON.stringify(inferenceData, null, 2) : 'Waiting for data...'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
