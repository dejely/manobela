import { Canvas, Circle, Group } from '@shopify/react-native-skia';
import { StyleSheet } from 'react-native';

interface FacialLandmarkOverlayProps {
  landmarks: number[] | null;
  videoWidth: number;
  videoHeight: number;
  viewWidth: number;
  viewHeight: number;
  mirror?: boolean;
}

/**
 * Renders facial landmarks on top of the video stream.
 */
export const FacialLandmarkOverlay = ({
  landmarks,
  videoWidth,
  videoHeight,
  viewWidth,
  viewHeight,
  mirror = true,
}: FacialLandmarkOverlayProps) => {
  if (!landmarks || landmarks.length === 0) {
    return null;
  }

  // Calculate scaling factors to map from video resolution to view dimensions
  // We need to account for aspect ratio differences
  const videoAspect = videoWidth / videoHeight;
  const viewAspect = viewWidth / viewHeight;

  let scaleX: number;
  let scaleY: number;
  let offsetX = 0;
  let offsetY = 0;

  // Fit to view dimensions if video is bigger
  if (videoAspect > viewAspect) {
    // Video is wider, fit to width
    scaleX = viewWidth;
    scaleY = viewWidth / videoAspect;
    offsetY = (viewHeight - scaleY) / 2;
  } else {
    // Video is taller, fit to height
    scaleY = viewHeight;
    scaleX = viewHeight * videoAspect;
    offsetX = (viewWidth - scaleX) / 2;
  }

  // Parse flat array into individual landmarks
  const landmarkCount = Math.floor(landmarks.length / 2);

  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <Group>
        {Array.from({ length: landmarkCount }).map((_, idx) => {
          const i = idx * 2;

          const x = landmarks[i];
          const y = landmarks[i + 1];

          // Convert normalized coordinates to pixel coordinates
          // Flip x coordinate horizontally to match mirrored view
          const pixelX = (mirror ? 1 - x : x) * scaleX + offsetX;
          const pixelY = y * scaleY + offsetY;

          return (
            <Circle
              key={`landmark-${idx}`}
              cx={pixelX}
              cy={pixelY}
              r={1.5}
              color="rgba(255, 255, 255, 0.5)"
            />
          );
        })}
      </Group>
    </Canvas>
  );
};
