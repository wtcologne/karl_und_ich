"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  getUserMedia,
  stopMediaStream,
  captureFrame,
  toggleFacingMode,
  hasMultipleCameras,
  type FacingMode,
} from "@/lib/camera";

type AppState = "permission" | "camera" | "processing" | "result" | "error";

interface ResultData {
  imageBase64: string;
  promptUsed: string;
}

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [appState, setAppState] = useState<AppState>("permission");
  const [facingMode, setFacingMode] = useState<FacingMode>("user");
  const [hasMultipleCams, setHasMultipleCams] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [result, setResult] = useState<ResultData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [loadingMessage, setLoadingMessage] = useState<string>("");

  // Setup camera stream on video element
  const setupCameraStream = useCallback(async (facing: FacingMode) => {
    console.log("🎥 setupCameraStream called with facing:", facing);
    
    try {
      setIsVideoReady(false);
      
      // Stop existing stream first
      if (streamRef.current) {
        console.log("Stopping existing stream...");
        stopMediaStream(streamRef.current);
        streamRef.current = null;
      }

      console.log("📷 Requesting camera access...");
      
      // Get new stream
      const stream = await getUserMedia({
        facingMode: facing,
        width: 1920,
        height: 1080,
      });

      console.log("✅ Got stream!", stream.getVideoTracks()[0]?.getSettings());
      streamRef.current = stream;

      // Wait for video element to be available (it should be rendered now)
      let attempts = 0;
      while (!videoRef.current && attempts < 50) {
        console.log("⏳ Waiting for video element...", attempts);
        await new Promise(resolve => setTimeout(resolve, 50));
        attempts++;
      }

      const video = videoRef.current;
      if (!video) {
        throw new Error("Video element not available after waiting");
      }

      console.log("📺 Video element found!");

      // Clear any existing srcObject
      video.srcObject = null;
      
      // Small delay before setting new stream
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Set the stream
      video.srcObject = stream;
      console.log("📺 Stream assigned to video element");

      // Wait for loadedmetadata before playing
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Video metadata loading timeout"));
        }, 5000);

        const onLoaded = () => {
          clearTimeout(timeout);
          video.removeEventListener("loadedmetadata", onLoaded);
          console.log("📊 Video metadata loaded:", video.videoWidth, "x", video.videoHeight);
          resolve();
        };

        // Check if already loaded
        if (video.readyState >= 1) {
          clearTimeout(timeout);
          console.log("📊 Video already has metadata:", video.videoWidth, "x", video.videoHeight);
          resolve();
        } else {
          video.addEventListener("loadedmetadata", onLoaded);
        }
      });

      // Now try to play
      console.log("▶️ Attempting to play video...");
      await video.play();
      console.log("✅ Video is playing!");

      // Small delay then mark as ready
      await new Promise(resolve => setTimeout(resolve, 200));
      
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        console.log("✅ Video is fully ready:", video.videoWidth, "x", video.videoHeight);
        setIsVideoReady(true);
      } else {
        console.warn("⚠️ Video playing but no dimensions yet, waiting...");
        // Wait a bit more
        await new Promise(resolve => setTimeout(resolve, 500));
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          setIsVideoReady(true);
        }
      }

      // Check for multiple cameras
      const multipleCams = await hasMultipleCameras();
      setHasMultipleCams(multipleCams);
      
    } catch (error) {
      console.error("❌ Camera error:", error);
      setErrorMessage(
        error instanceof Error 
          ? `Kamerafehler: ${error.message}` 
          : "Kamerazugriff nicht möglich. Bitte erlaube den Zugriff."
      );
      setAppState("error");
    }
  }, []);

  // Request permission and start camera
  const requestPermission = async () => {
    console.log("🔐 requestPermission called");
    // First change to camera state so the video element gets rendered
    setAppState("camera");
    // Small delay to ensure React renders the video element
    await new Promise(resolve => setTimeout(resolve, 100));
    // Now setup the camera
    await setupCameraStream(facingMode);
  };

  // Switch camera
  const switchCamera = async () => {
    const newFacing = toggleFacingMode(facingMode);
    setFacingMode(newFacing);
    await setupCameraStream(newFacing);
  };

  // Capture and process selfie
  const captureAndProcess = async () => {
    const video = videoRef.current;
    
    if (!video || isCapturing) {
      console.log("Cannot capture - video ref missing or already capturing");
      return;
    }
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.error("Video has no dimensions:", video.videoWidth, video.videoHeight);
      setErrorMessage("Kamera noch nicht bereit. Bitte warten.");
      return;
    }

    setIsCapturing(true);

    try {
      setLoadingMessage("Foto wird aufgenommen...");
      console.log("📸 Capturing frame, video dimensions:", video.videoWidth, "x", video.videoHeight);
      const blob = await captureFrame(video, facingMode === "user");
      console.log("✅ Captured blob:", blob.size, "bytes");

      setAppState("processing");
      setLoadingMessage("Karl denkt nach... 🤔");

      const formData = new FormData();
      formData.append("selfie", blob, "selfie.jpg");

      setLoadingMessage("Szene wird generiert... ✨");
      const response = await fetch("/api/render", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        // Better error messages for common errors
        let errorMsg = data.error || "Fehler bei der Bildgenerierung";
        
        if (errorMsg.includes("safety") || errorMsg.includes("rejected")) {
          errorMsg = "Das Bild wurde vom Sicherheitssystem abgelehnt. Bitte versuche es mit einem anderen Foto (z.B. mit mehr Abstand oder anderen Lichtverhältnissen).";
        } else if (errorMsg.includes("verified") || errorMsg.includes("organization")) {
          errorMsg = "Dein OpenAI-Konto muss verifiziert werden. Gehe zu platform.openai.com und verifiziere deine Organisation.";
        }
        
        throw new Error(errorMsg);
      }

      setResult({
        imageBase64: data.imageBase64,
        promptUsed: data.promptUsed,
      });
      setAppState("result");
    } catch (error) {
      console.error("Processing error:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Ein Fehler ist aufgetreten"
      );
      setAppState("error");
    } finally {
      setIsCapturing(false);
    }
  };

  // Download result image
  const downloadImage = () => {
    if (!result?.imageBase64) return;

    const link = document.createElement("a");
    link.href = `data:image/png;base64,${result.imageBase64}`;
    link.download = `karl-selfie-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Go back to camera
  const backToCamera = async () => {
    setResult(null);
    setErrorMessage("");
    setAppState("camera");
    await new Promise(resolve => setTimeout(resolve, 100));
    await setupCameraStream(facingMode);
  };

  // Retry after error
  const retryAfterError = async () => {
    setErrorMessage("");
    setAppState("camera");
    await new Promise(resolve => setTimeout(resolve, 100));
    await setupCameraStream(facingMode);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("🧹 Cleaning up camera stream");
      stopMediaStream(streamRef.current);
    };
  }, []);

  // Permission Screen
  if (appState === "permission") {
    return (
      <div className="permission-screen">
        <div className="permission-icon">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </div>
        <h1 className="permission-title">Karl Selfie Generator</h1>
        <p className="permission-text">
          Mache ein Selfie und lass dich von KI in absurde Szenen mit Karl dem
          Kasten zaubern.
        </p>
        <button onClick={requestPermission} className="permission-button">
          Kamera aktivieren
        </button>
      </div>
    );
  }

  // Error Screen
  if (appState === "error") {
    return (
      <div className="permission-screen">
        <div
          className="permission-icon"
          style={{ background: "linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)" }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h1 className="permission-title">Ups!</h1>
        <p className="permission-text">{errorMessage}</p>
        <button onClick={retryAfterError} className="permission-button">
          Erneut versuchen
        </button>
      </div>
    );
  }

  // Processing Screen
  if (appState === "processing") {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
        <p className="text-white text-lg font-medium animate-pulse">
          {loadingMessage}
        </p>
        <p className="text-white/50 text-sm">Das kann bis zu 30 Sekunden dauern</p>
      </div>
    );
  }

  // Result Screen
  if (appState === "result" && result) {
    return (
      <div className="result-overlay animate-fade-in">
        <div className="result-image-container">
          <img
            src={`data:image/png;base64,${result.imageBase64}`}
            alt="Generated scene with Karl"
            className="result-image animate-scale-in"
          />
        </div>

        {/* Prompt Badge */}
        <div className="absolute top-4 left-4 right-4 safe-area-top">
          <div className="glass-dark rounded-2xl px-4 py-3 max-w-md mx-auto">
            <p className="text-white/70 text-xs uppercase tracking-wider mb-1">
              Szene
            </p>
            <p className="text-white text-sm leading-relaxed line-clamp-3">
              {result.promptUsed}
            </p>
          </div>
        </div>

        {/* Action Bar */}
        <div className="action-bar animate-slide-up">
          <button onClick={backToCamera} className="action-button action-button-secondary">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            Neues Foto
          </button>
          <button onClick={downloadImage} className="action-button action-button-primary">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Speichern
          </button>
        </div>
      </div>
    );
  }

  // Camera Screen
  return (
    <div className="camera-container">
      {/* Video Preview */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`video-preview ${facingMode === "user" ? "mirror" : ""}`}
        style={{ background: '#1a1a1a' }}
      />

      {/* Loading indicator while video is not ready */}
      {!isVideoReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
          <div className="flex flex-col items-center gap-4">
            <div className="spinner" />
            <p className="text-white/70 text-sm">Kamera wird initialisiert...</p>
          </div>
        </div>
      )}

      {/* Top Controls */}
      <div className="absolute top-4 left-4 right-4 safe-area-top flex justify-between items-center z-20">
        {/* App Title */}
        <div className="glass-dark rounded-full px-4 py-2">
          <span className="text-white text-sm font-medium">Karl Selfie</span>
        </div>

        {/* Camera Switch Button */}
        {hasMultipleCams && (
          <button onClick={switchCamera} className="icon-button" aria-label="Kamera wechseln">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
              <path d="M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5" />
              <circle cx="12" cy="12" r="3" />
              <path d="m18 22-3-3 3-3" />
              <path d="m6 2 3 3-3 3" />
            </svg>
          </button>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 safe-area-bottom pb-8 z-20">
        {/* Hint Text */}
        <div className="text-center mb-6">
          <p className="text-white/60 text-sm">
            {isVideoReady ? "Tippe zum Aufnehmen" : "Kamera wird geladen..."}
          </p>
        </div>

        {/* Shutter Button */}
        <div className="flex justify-center">
          <button
            onClick={captureAndProcess}
            disabled={isCapturing || !isVideoReady}
            className={`shutter-button ${isCapturing ? "capturing" : ""} ${!isVideoReady ? "opacity-50 cursor-not-allowed" : ""}`}
            aria-label="Foto aufnehmen"
          />
        </div>
      </div>

      {/* Flash Effect */}
      {isCapturing && (
        <div className="absolute inset-0 bg-white animate-pulse pointer-events-none z-30" />
      )}
    </div>
  );
}
