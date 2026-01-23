import { useMemo, useState } from 'react';
import { Alert, ActivityIndicator, ScrollView, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Stack } from 'expo-router';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useSettings } from '@/hooks/useSettings';
import { mapNetworkErrorMessage } from '@/services/network-error';
import { getErrorText } from '@/services/getError';
import { uploadVideoWithProgress } from '@/services/video-upload';
import type { VideoProcessingResponse, VideoFrameResult } from '@/types/video-processing';

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

type SelectedVideo = {
  uri: string;
  name: string;
  size: number | null;
  durationSeconds: number | null;
  type: string;
};

type UploadState = 'idle' | 'uploading' | 'processing' | 'complete';

const formatBytes = (bytes: number | null) => {
  if (bytes === null) return 'Unknown size';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

const formatDuration = (seconds: number | null) => {
  if (seconds === null) return 'Unknown duration';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatFrameLabel = (frame: VideoFrameResult) =>
  `Frame ${frame.frame_index} · ${frame.time_offset_sec.toFixed(2)}s`;

const formatMetricsPayload = (frame: VideoFrameResult) => {
  if (!frame.metrics) return 'No metrics available for this frame.';
  return JSON.stringify(frame.metrics, null, 2);
};

export default function UploadsScreen() {
  const { settings } = useSettings();
  const [selectedVideo, setSelectedVideo] = useState<SelectedVideo | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [response, setResponse] = useState<VideoProcessingResponse | null>(null);

  const isOversized = useMemo(() => {
    if (!selectedVideo?.size) return false;
    return selectedVideo.size > MAX_UPLOAD_BYTES;
  }, [selectedVideo?.size]);

  const handlePickVideo = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Needed', 'Please allow access to your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset) {
        Alert.alert('Selection Error', 'Unable to read the selected video.');
        return;
      }

      const info = await FileSystem.getInfoAsync(asset.uri);
      const size = asset.fileSize ?? (info.exists ? info.size ?? null : null);
      const durationSeconds = asset.duration ? asset.duration / 1000 : null;
      const name = asset.fileName ?? asset.uri.split('/').pop() ?? 'video.mp4';
      const type = asset.type === 'video' ? asset.mimeType ?? 'video/mp4' : 'video/mp4';

      setSelectedVideo({
        uri: asset.uri,
        name,
        size,
        durationSeconds,
        type,
      });
      setResponse(null);
      setUploadProgress(0);
      setUploadState('idle');
    } catch (error) {
      Alert.alert('Selection Error', 'Unable to access your video library right now.');
    }
  };

  const handleUpload = async () => {
    if (!selectedVideo) {
      Alert.alert('No Video Selected', 'Please choose a video to upload.');
      return;
    }

    if (!settings.apiBaseUrl) {
      Alert.alert('Missing API URL', 'Please set the API base URL in settings.');
      return;
    }

    try {
      setUploadState('uploading');
      setUploadProgress(0);
      setResponse(null);

      const data = await uploadVideoWithProgress({
        apiBaseUrl: settings.apiBaseUrl,
        file: {
          uri: selectedVideo.uri,
          name: selectedVideo.name,
          type: selectedVideo.type,
        },
        onProgress: (progress) => {
          setUploadProgress(progress);
          if (progress >= 1) {
            setUploadState((prev) => (prev === 'uploading' ? 'processing' : prev));
          }
        },
      });

      setResponse(data);
      setUploadState('complete');
    } catch (error) {
      setUploadState('idle');
      const rawMessage = getErrorText(error);
      const mappedMessage = mapNetworkErrorMessage(rawMessage);
      const message =
        mappedMessage !== 'Unknown error. Please try again.' ? mappedMessage : rawMessage;
      Alert.alert('Upload Failed', message || 'Something went wrong while uploading.');
    }
  };

  const metadata = response?.video_metadata;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 gap-6">
      <Stack.Screen options={{ title: 'Uploads' }} />

      <View className="gap-2">
        <Text className="text-lg font-semibold">Upload a recorded drive</Text>
        <Text className="text-sm text-muted-foreground">
          Select a video from your gallery to process driver monitoring metrics.
        </Text>
      </View>

      <View className="gap-3">
        <Button onPress={handlePickVideo}>
          <Text>Select video</Text>
        </Button>

        {selectedVideo ? (
          <View className="gap-1 rounded-lg border border-border bg-card p-3">
            <Text className="text-sm font-semibold">{selectedVideo.name}</Text>
            <Text className="text-xs text-muted-foreground">
              Size: {formatBytes(selectedVideo.size)}
            </Text>
            <Text className="text-xs text-muted-foreground">
              Duration: {formatDuration(selectedVideo.durationSeconds)}
            </Text>
            {isOversized && (
              <Text className="text-xs font-semibold text-destructive">
                This file is larger than 50MB and may fail to upload.
              </Text>
            )}
          </View>
        ) : (
          <Text className="text-sm text-muted-foreground">No video selected.</Text>
        )}
      </View>

      <View className="gap-3">
        <Button
          onPress={handleUpload}
          disabled={!selectedVideo || uploadState === 'uploading' || uploadState === 'processing'}>
          <Text>{uploadState === 'uploading' ? 'Uploading...' : 'Upload & Process'}</Text>
        </Button>

        {uploadState === 'uploading' && (
          <View className="gap-2">
            <Text className="text-xs text-muted-foreground">
              Upload progress: {(uploadProgress * 100).toFixed(0)}%
            </Text>
            <View className="h-2 overflow-hidden rounded-full bg-muted">
              <View
                className="h-2 rounded-full bg-primary"
                style={{ width: `${Math.min(uploadProgress * 100, 100)}%` }}
              />
            </View>
          </View>
        )}

        {uploadState === 'processing' && (
          <View className="flex-row items-center gap-2">
            <ActivityIndicator size="small" />
            <Text className="text-sm text-muted-foreground">Processing video...</Text>
          </View>
        )}
      </View>

      {metadata && (
        <View className="gap-3">
          <Text className="text-base font-semibold">Processing summary</Text>
          <View className="gap-1 rounded-lg border border-border bg-card p-3">
            <Text className="text-xs text-muted-foreground">
              File: {metadata.filename ?? selectedVideo?.name ?? 'Unknown'}
            </Text>
            <Text className="text-xs text-muted-foreground">
              Size: {formatBytes(metadata.size_bytes)}
            </Text>
            <Text className="text-xs text-muted-foreground">
              Duration: {formatDuration(metadata.duration_seconds ?? null)}
            </Text>
            <Text className="text-xs text-muted-foreground">
              Processed frames: {metadata.processed_frames}
            </Text>
            <Text className="text-xs text-muted-foreground">
              Target FPS: {metadata.target_fps}
            </Text>
            {metadata.fps !== null && metadata.fps !== undefined && (
              <Text className="text-xs text-muted-foreground">FPS: {metadata.fps}</Text>
            )}
            {metadata.width && metadata.height && (
              <Text className="text-xs text-muted-foreground">
                Resolution: {metadata.width} × {metadata.height}
              </Text>
            )}
          </View>
        </View>
      )}

      {response?.frames?.length ? (
        <View className="gap-3">
          <Text className="text-base font-semibold">Frame metrics</Text>
          <Accordion type="multiple" collapsible>
            {response.frames.map((frame) => (
              <AccordionItem key={frame.frame_index} value={`${frame.frame_index}`}>
                <AccordionTrigger>
                  <Text className="text-sm font-semibold">{formatFrameLabel(frame)}</Text>
                </AccordionTrigger>
                <AccordionContent>
                  <View className="gap-2">
                    <Text className="text-xs text-muted-foreground">
                      Timestamp: {frame.timestamp}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      Resolution: {frame.resolution.width} × {frame.resolution.height}
                    </Text>
                    <Text className="text-xs font-mono text-muted-foreground">
                      {formatMetricsPayload(frame)}
                    </Text>
                  </View>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </View>
      ) : null}
    </ScrollView>
  );
}
