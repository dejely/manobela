import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useSettings } from '@/hooks/useSettings';
import { formatBytes } from '@/services/format-bytes';
import { VideoProcessingResponse } from '@/types/video-upload';

export default function UploadsScreen() {
  const { settings } = useSettings();
  const apiBaseUrl = useMemo(() => {
    return settings.apiBaseUrl || process.env.EXPO_PUBLIC_API_BASE || '';
  }, [settings.apiBaseUrl]);

  const [selectedVideo, setSelectedVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<'idle' | 'uploading' | 'processing' | 'completed'>(
    'idle'
  );
  const [response, setResponse] = useState<VideoProcessingResponse | null>(null);

  const maxUploadBytes = 50 * 1024 * 1024;

  const handlePickVideo = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== ImagePicker.PermissionStatus.GRANTED) {
      Alert.alert(
        'Permission required',
        'Please allow access to your photo library to pick a video.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets?.[0];
    if (!asset) {
      Alert.alert('No video selected', 'Please choose a video to continue.');
      return;
    }

    setSelectedVideo(asset);
    setUploadProgress(0);
    setUploadPhase('idle');
    setResponse(null);
  }, []);

  const parseUploadResponse = (xhr: XMLHttpRequest): VideoProcessingResponse | null => {
    if (xhr.response && typeof xhr.response === 'object') {
      return xhr.response as VideoProcessingResponse;
    }

    if (!xhr.responseText) {
      return null;
    }

    try {
      return JSON.parse(xhr.responseText) as VideoProcessingResponse;
    } catch (error) {
      return null;
    }
  };

  const getUploadErrorMessage = (xhr: XMLHttpRequest) => {
    const responseBody = parseUploadResponse(xhr) as { detail?: string } | null;
    if (responseBody?.detail) {
      return responseBody.detail;
    }

    if (xhr.responseText) {
      return xhr.responseText;
    }

    return 'We could not upload your video. Please try again.';
  };

  const handleUpload = useCallback(async () => {
    if (!selectedVideo) {
      Alert.alert('Select a video', 'Please choose a video before uploading.');
      return;
    }

    if (!apiBaseUrl) {
      Alert.alert('Missing API URL', 'Set your API Base URL in Settings to continue.');
      return;
    }

    const formData = new FormData();
    const filename = selectedVideo.fileName ?? selectedVideo.uri.split('/').pop() ?? 'video';
    const mimeType = selectedVideo.mimeType ?? 'video/mp4';

    formData.append('video', {
      uri: selectedVideo.uri,
      name: filename,
      type: mimeType,
    } as unknown as Blob);

    setUploadPhase('uploading');
    setUploadProgress(0);
    setResponse(null);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${apiBaseUrl}/driver-monitoring/process-video`);
    xhr.responseType = 'json';

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setUploadProgress(event.loaded / event.total);
      }
    };

    xhr.upload.onload = () => {
      setUploadProgress(1);
      setUploadPhase('processing');
    };

    xhr.onerror = () => {
      setUploadPhase('idle');
      Alert.alert('Upload failed', 'We could not upload your video. Please try again.');
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const nextResponse = parseUploadResponse(xhr);
        if (!nextResponse) {
          setUploadPhase('idle');
          Alert.alert('Processing failed', 'We could not read the response from the server.');
          return;
        }
        setResponse(nextResponse);
        setUploadPhase('completed');
        return;
      }

      setUploadPhase('idle');
      Alert.alert('Upload failed', getUploadErrorMessage(xhr));
    };

    xhr.send(formData);
  }, [apiBaseUrl, selectedVideo]);

  const fileInfo = useMemo(() => {
    if (!selectedVideo) {
      return null;
    }

    const filename = selectedVideo.fileName ?? selectedVideo.uri.split('/').pop() ?? 'video';
    const size = selectedVideo.fileSize ?? null;
    const durationSeconds = selectedVideo.duration ? selectedVideo.duration / 1000 : null;

    return { filename, size, durationSeconds };
  }, [selectedVideo]);

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-4 p-4">
      <View className="gap-2">
        <Text className="text-lg font-semibold">Upload a driving video</Text>
        <Text className="text-sm text-muted-foreground">
          Choose a video from your gallery and upload it for driver monitoring processing.
        </Text>
      </View>

      <Button onPress={handlePickVideo} variant="outline">
        <Text>{selectedVideo ? 'Choose another video' : 'Select video'}</Text>
      </Button>

      {fileInfo ? (
        <View className="gap-2 rounded-md border border-border bg-card p-3">
          <Text className="text-base font-semibold">Selected file</Text>
          <Text className="text-sm text-foreground">Name: {fileInfo.filename}</Text>
          <Text className="text-sm text-foreground">
            Size: {fileInfo.size ? formatBytes(fileInfo.size) : 'Unknown'}
          </Text>
          <Text className="text-sm text-foreground">
            Duration:{' '}
            {fileInfo.durationSeconds
              ? `${fileInfo.durationSeconds.toFixed(1)} sec`
              : 'Unknown'}
          </Text>
          {fileInfo.size && fileInfo.size > maxUploadBytes ? (
            <Text className="text-sm text-destructive">
              Warning: This file exceeds 50 MB and may take longer to upload.
            </Text>
          ) : null}
        </View>
      ) : null}

      <Button
        onPress={handleUpload}
        disabled={!selectedVideo || uploadPhase === 'uploading' || uploadPhase === 'processing'}
      >
        <Text>
          {uploadPhase === 'uploading'
            ? 'Uploading...'
            : uploadPhase === 'processing'
              ? 'Processing...'
              : 'Upload video'}
        </Text>
      </Button>

      {uploadPhase === 'uploading' ? (
        <View className="gap-2">
          <Text className="text-sm text-muted-foreground">
            Upload progress: {Math.round(uploadProgress * 100)}%
          </Text>
          <View className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <View
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.round(uploadProgress * 100)}%` }}
            />
          </View>
        </View>
      ) : null}

      {uploadPhase === 'processing' ? (
        <View className="flex-row items-center gap-2">
          <ActivityIndicator size="small" />
          <Text className="text-sm text-muted-foreground">Processing your video...</Text>
        </View>
      ) : null}

      {response ? (
        <View className="gap-4">
          <View className="gap-2 rounded-md border border-border bg-card p-3">
            <Text className="text-base font-semibold">Response metadata</Text>
            <Text className="text-sm text-foreground">
              Filename: {response.video_metadata.filename ?? 'Unknown'}
            </Text>
            <Text className="text-sm text-foreground">
              Content type: {response.video_metadata.content_type ?? 'Unknown'}
            </Text>
            <Text className="text-sm text-foreground">
              Size: {formatBytes(response.video_metadata.size_bytes)}
            </Text>
            <Text className="text-sm text-foreground">
              Duration:{' '}
              {response.video_metadata.duration_seconds
                ? `${response.video_metadata.duration_seconds.toFixed(1)} sec`
                : 'Unknown'}
            </Text>
            <Text className="text-sm text-foreground">
              Target FPS: {response.video_metadata.target_fps}
            </Text>
            <Text className="text-sm text-foreground">
              Processed frames: {response.video_metadata.processed_frames}
            </Text>
          </View>

          <Accordion type="multiple" collapsible>
            {response.frames.map((frame) => (
              <AccordionItem key={`${frame.frame_index}-${frame.time_offset_sec}`} value={`${frame.frame_index}`}>
                <AccordionTrigger>
                  <Text className="text-sm font-semibold">
                    Frame {frame.frame_index} • {frame.time_offset_sec.toFixed(2)}s
                  </Text>
                </AccordionTrigger>
                <AccordionContent>
                  <View className="gap-2">
                    <Text className="text-xs text-muted-foreground">
                      Resolution: {frame.resolution?.width ?? 0} × {frame.resolution?.height ?? 0}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      Metrics:
                      {frame.metrics
                        ? ` ${JSON.stringify(frame.metrics)}`
                        : ' No metrics for this frame.'}
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
