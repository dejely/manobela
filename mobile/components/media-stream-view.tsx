import { MediaStream, RTCView } from 'react-native-webrtc';
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { FacialLandmarkOverlay } from './facial-landmark-overlay';
import { SessionState } from '@/hooks/useMonitoringSession';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

type MediaStreamViewProps = {
  stream: MediaStream | null;
  sessionState: SessionState;
  inferenceData?: {
    face_landmarks?: number[] | null;
    resolution?: { width: number; height: number };
  };
  style?: object;
  mirror?: boolean;
};

/**
 * Displays a MediaStream (camera view) with optional overlay.
 */
export const MediaStreamView = ({
  stream,
  sessionState,
  inferenceData,
  style,
  mirror = true,
}: MediaStreamViewProps) => {
  const [viewDimensions, setViewDimensions] = useState({ width: 0, height: 0 });
  const [showOverlay, setShowOverlay] = useState(true);

  if (!stream) return null;

  const landmarks = inferenceData?.face_landmarks || null;
  const videoWidth = inferenceData?.resolution?.width || 480;
  const videoHeight = inferenceData?.resolution?.height || 320;

  // Determine whether to show landmarks
  const shouldShowLandmarks =
    showOverlay &&
    sessionState === 'active' &&
    landmarks != null &&
    viewDimensions.width > 0 &&
    viewDimensions.height > 0;

  return (
    <View
      style={[{ width: '100%', height: '100%' }, style]}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setViewDimensions({ width, height });
      }}>
      <RTCView
        streamURL={stream.toURL()}
        objectFit="contain"
        style={StyleSheet.absoluteFill}
        mirror={mirror}
      />

      {shouldShowLandmarks && (
        <FacialLandmarkOverlay
          landmarks={landmarks}
          videoWidth={videoWidth}
          videoHeight={videoHeight}
          viewWidth={viewDimensions.width}
          viewHeight={viewDimensions.height}
          mirror={mirror}
        />
      )}

      {/* Toggle button for overlay */}
      <View className="absolute bottom-3 right-3">
        <Button
          size="sm"
          variant="secondary"
          className="p-2"
          onPress={() => setShowOverlay((v) => !v)}>
          <Text className="text-xs">{showOverlay ? 'Hide overlay' : 'Show overlay'}</Text>
        </Button>
      </View>
    </View>
  );
};
