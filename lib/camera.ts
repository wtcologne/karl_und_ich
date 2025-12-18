/**
 * Camera utility functions for capturing selfies
 */

export type FacingMode = "user" | "environment";

export interface CameraConfig {
  facingMode: FacingMode;
  width?: number;
  height?: number;
}

/**
 * Get available camera devices
 */
export async function getCameraDevices(): Promise<MediaDeviceInfo[]> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((device) => device.kind === "videoinput");
}

/**
 * Check if device has multiple cameras
 */
export async function hasMultipleCameras(): Promise<boolean> {
  const cameras = await getCameraDevices();
  return cameras.length > 1;
}

/**
 * Get user media stream with specified configuration
 */
export async function getUserMedia(config: CameraConfig): Promise<MediaStream> {
  const constraints: MediaStreamConstraints = {
    video: {
      facingMode: config.facingMode,
      width: { ideal: config.width || 1920 },
      height: { ideal: config.height || 1080 },
    },
    audio: false,
  };

  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (error) {
    // Fallback to any available camera
    console.warn("Preferred camera not available, trying any camera:", error);
    return await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
  }
}

/**
 * Stop all tracks in a media stream
 */
export function stopMediaStream(stream: MediaStream | null): void {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
}

/**
 * Wait for video to have valid dimensions
 */
export function waitForVideoReady(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve, reject) => {
    // If already ready
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Video loading timeout"));
    }, 10000);

    const onLoadedMetadata = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error("Video loading error"));
    };

    const cleanup = () => {
      clearTimeout(timeout);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("error", onError);
    };

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("error", onError);
  });
}

/**
 * Capture a frame from video element and return as Blob
 */
export async function captureFrame(
  video: HTMLVideoElement,
  mirror: boolean = false
): Promise<Blob> {
  // Wait for video to be ready
  if (video.videoWidth === 0 || video.videoHeight === 0) {
    await waitForVideoReady(video);
  }

  // Double check dimensions
  if (video.videoWidth === 0 || video.videoHeight === 0) {
    throw new Error("Video has no valid dimensions");
  }

  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Canvas context not available"));
      return;
    }

    // Use video's natural dimensions for best quality
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    console.log(`Capturing frame: ${canvas.width}x${canvas.height}`);

    // Apply mirroring for front camera
    if (mirror) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          console.log(`Frame captured: ${blob.size} bytes`);
          resolve(blob);
        } else {
          reject(new Error("Failed to create blob from canvas"));
        }
      },
      "image/jpeg",
      0.92
    );
  });
}

/**
 * Switch between front and back camera
 */
export function toggleFacingMode(current: FacingMode): FacingMode {
  return current === "user" ? "environment" : "user";
}

/**
 * Check if camera permissions are granted
 */
export async function checkCameraPermission(): Promise<PermissionState> {
  try {
    const result = await navigator.permissions.query({
      name: "camera" as PermissionName,
    });
    return result.state;
  } catch {
    // Some browsers don't support permission query for camera
    return "prompt";
  }
}

/**
 * Request camera permission by attempting to get user media
 */
export async function requestCameraPermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stopMediaStream(stream);
    return true;
  } catch {
    return false;
  }
}
