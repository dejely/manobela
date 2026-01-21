import React, { useState } from 'react';
import { MediaStream, RTCView } from 'react-native-webrtc';
import { SessionState } from '@/hooks/useMonitoringSession';
import { CameraRecordButton } from './camera-record-button';
import { FacialLandmarkOverlay } from './facial-landmark-overlay';
import { ObjectDetectionOverlay } from './object-detection-overlay';
import { InferenceData } from '@/types/inference';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Eye, EyeOff, Frown, Meh, ScanFace } from 'lucide-react-native';
import { colors } from '@/theme/colors';

type MediaStreamViewProps = {
  stream: MediaStream | null;
  sessionState: SessionState;
  inferenceData?: InferenceData | null;
  style?: object;
  mirror?: boolean;
  hasCamera: boolean;
  onToggle: () => void;
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
  hasCamera,
  onToggle,
}: MediaStreamViewProps) => {
  const [viewDimensions, setViewDimensions] = useState({ width: 0, height: 0 });
  const [showOverlay, setShowOverlay] = useState(true);

  if (!stream) return null;

  const landmarks = inferenceData?.face_landmarks || null;
  const objectDetections = inferenceData?.object_detections || null;

  const videoWidth = inferenceData?.resolution?.width || 480;
  const videoHeight = inferenceData?.resolution?.height || 320;

  // Determine whether to show landmarks
  const showOverlays =
    inferenceData &&
    showOverlay &&
    sessionState === 'active' &&
    viewDimensions.width > 0 &&
    viewDimensions.height > 0;

  const showLandmarks = showOverlays && landmarks != null;
  const showDetections = showOverlays && objectDetections != null;

  return (
    <View
      style={[
        { width: '100%', height: '100%', flex: 1, borderRadius: 16, overflow: 'hidden' },
        style,
      ]}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setViewDimensions({ width, height });
      }}>
      <RTCView
        streamURL={stream.toURL()}
        objectFit="cover"
        style={StyleSheet.absoluteFill}
        mirror={mirror}
      />

      {showLandmarks && (
        <FacialLandmarkOverlay
          landmarks={landmarks}
          videoWidth={videoWidth}
          videoHeight={videoHeight}
          viewWidth={viewDimensions.width}
          viewHeight={viewDimensions.height}
          mirror={mirror}
        />
      )}

      {showDetections && (
        <ObjectDetectionOverlay
          detections={objectDetections}
          videoWidth={videoWidth}
          videoHeight={videoHeight}
          viewWidth={viewDimensions.width}
          viewHeight={viewDimensions.height}
          mirror={mirror}
        />
      )}

      {/* Overlay record button */}
      <View className="absolute bottom-3 left-0 right-0 items-center">
        <CameraRecordButton
          isRecording={sessionState === 'active'}
          disabled={!hasCamera || sessionState === 'starting' || sessionState === 'stopping'}
          onPress={onToggle}
        />
      </View>

      {/* Top overlay */}
      <View className="absolute left-0 right-0 top-3 z-10 flex-row items-center justify-between px-3">
        <View className="h-9 w-9 items-center justify-center">
          {sessionState !== 'active' ? (
            <Meh size={24} color="white" />
          ) : inferenceData?.metrics?.face_missing ? (
            <Frown size={24} color={colors.destructive} />
          ) : (
            <ScanFace size={24} color="white" />
          )}
        </View>

        <View className="items-center justify-center">
          {inferenceData?.resolution && (
            <View className="rounded-full bg-black/40 px-2 py-1">
              <Text className="text-xs text-white">
                {inferenceData.resolution.width}x{inferenceData.resolution.height}
              </Text>
            </View>
          )}
        </View>

        <View className="h-9 w-9 items-center justify-center">
          <Pressable
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={showOverlay ? 'Hide overlays' : 'Show overlays'}
            onPress={() => setShowOverlay((v) => !v)}
            className="h-9 w-9 items-center justify-center">
            {showOverlay ? <Eye size={24} color="white" /> : <EyeOff size={24} color="white" />}
          </Pressable>
        </View>
      </View>
    </View>
  );
};
