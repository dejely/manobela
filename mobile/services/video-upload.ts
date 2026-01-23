import type { VideoProcessingResponse } from '@/types/video-processing';

export type UploadVideoFile = {
  uri: string;
  name: string;
  type: string;
};

export type UploadVideoOptions = {
  apiBaseUrl: string;
  file: UploadVideoFile;
  onProgress?: (progress: number) => void;
};

const getUploadErrorMessage = (status: number, responseText?: string) => {
  if (!responseText) return `Upload failed with status ${status}.`;

  try {
    const parsed = JSON.parse(responseText) as { detail?: string };
    if (parsed?.detail) return parsed.detail;
  } catch {
    // ignore JSON parse errors
  }

  return responseText;
};

export const uploadVideoWithProgress = ({
  apiBaseUrl,
  file,
  onProgress,
}: UploadVideoOptions): Promise<VideoProcessingResponse> =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    formData.append('video', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);

    const baseUrl = apiBaseUrl.replace(/\/$/, '');
    const url = `${baseUrl}/driver-monitoring/process-video`;

    xhr.open('POST', url);

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText) as VideoProcessingResponse;
          resolve(response);
        } catch (error) {
          reject(new Error('Unable to read response from server.'));
        }
        return;
      }

      reject(new Error(getUploadErrorMessage(xhr.status, xhr.responseText)));
    };

    xhr.onerror = () => {
      reject(new Error('Network error while uploading.'));
    };

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(event.total ? event.loaded / event.total : 0);
      }
    };

    xhr.send(formData);
  });
