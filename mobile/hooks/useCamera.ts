import { useEffect, useState } from 'react';
import { mediaDevices, MediaStream } from 'react-native-webrtc';
import { Constraints } from 'react-native-webrtc/lib/typescript/getUserMedia';

interface UseCameraReturn {
  localStream: MediaStream | null;
}

/**
 * Initializes the front-facing camera and exposes a MediaStream.
 */
export function useCamera(): UseCameraReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    let active = true;

    async function initCamera() {
      try {
        // Constraints for camera
        const constraints: Constraints = {
          audio: false, // no audio
          video: {
            facingMode: 'user', // front camera
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
            frameRate: { ideal: 15, min: 10, max: 30 },
          },
        };

        const stream = await mediaDevices.getUserMedia(constraints);

        // Set the local stream if still mounted
        if (active) setLocalStream(stream);
      } catch (err) {
        console.error('Failed to get camera', err);
      }
    }

    initCamera();

    // Stop all tracks when the component unmounts
    return () => {
      active = false;
      localStream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { localStream };
}
