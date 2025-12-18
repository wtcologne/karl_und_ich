"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  getUserMedia,
  stopMediaStream,
  toggleFacingMode,
  hasMultipleCameras,
  type FacingMode,
} from "@/lib/camera";
import { SCENES, type Scene } from "@/lib/scenes";

type AppState = "permission" | "camera" | "selectScene" | "processing" | "result" | "error";

interface ResultData {
  imageBase64: string;
  promptUsed: string;
}

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [appState, setAppState] = useState<AppState>("permission");
  const [facingMode, setFacingMode] = useState<FacingMode>("user");
  const [hasMultipleCams, setHasMultipleCams] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [result, setResult] = useState<ResultData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  
  // Scene selection state
  const [capturedImageData, setCapturedImageData] = useState<string | null>(null);
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>("");

  // Setup camera stream on video element
  const setupCameraStream = useCallback(async (facing: FacingMode) => {
    console.log("🎥 setupCameraStream called with facing:", facing);
    
    try {
      setIsVideoReady(false);
      
      if (streamRef.current) {
        stopMediaStream(streamRef.current);
        streamRef.current = null;
      }

      console.log("📷 Requesting camera access...");
      
      const stream = await getUserMedia({
        facingMode: facing,
        width: 1920,
        height: 1080,
      });

      console.log("✅ Got stream!");
      streamRef.current = stream;

      let attempts = 0;
      while (!videoRef.current && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 50));
        attempts++;
      }

      const video = videoRef.current;
      if (!video) {
        throw new Error("Video element not available");
      }

      video.srcObject = null;
      await new Promise(resolve => setTimeout(resolve, 100));
      video.srcObject = stream;

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Video timeout")), 5000);
        const onLoaded = () => {
          clearTimeout(timeout);
          video.removeEventListener("loadedmetadata", onLoaded);
          resolve();
        };
        if (video.readyState >= 1) {
          clearTimeout(timeout);
          resolve();
        } else {
          video.addEventListener("loadedmetadata", onLoaded);
        }
      });

      await video.play();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setIsVideoReady(true);
      }

      const multipleCams = await hasMultipleCameras();
      setHasMultipleCams(multipleCams);
      
    } catch (error) {
      console.error("❌ Camera error:", error);
      setErrorMessage(
        error instanceof Error 
          ? `Kamerafehler: ${error.message}` 
          : "Kamerazugriff nicht möglich."
      );
      setAppState("error");
    }
  }, []);

  const requestPermission = async () => {
    setAppState("camera");
    await new Promise(resolve => setTimeout(resolve, 100));
    await setupCameraStream(facingMode);
  };

  const switchCamera = async () => {
    const newFacing = toggleFacingMode(facingMode);
    setFacingMode(newFacing);
    await setupCameraStream(newFacing);
  };

  // Capture photo and go to scene selection
  const capturePhoto = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas || isCapturing) return;
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setErrorMessage("Kamera noch nicht bereit.");
      return;
    }

    setIsCapturing(true);

    try {
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context not available");

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Mirror for front camera
      if (facingMode === "user") {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0);

      // Get data URL for preview
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      setCapturedImageData(dataUrl);
      
      // Stop camera stream
      stopMediaStream(streamRef.current);
      streamRef.current = null;
      
      // Go to scene selection
      setAppState("selectScene");
      setSelectedScene(null);
      setCustomPrompt("");
      
    } catch (error) {
      console.error("Capture error:", error);
      setErrorMessage("Fehler beim Aufnehmen des Fotos.");
      setAppState("error");
    } finally {
      setIsCapturing(false);
    }
  };

  // Generate image with selected scene
  const generateImage = async () => {
    if (!capturedImageData) return;
    
    const promptToUse = customPrompt.trim() || selectedScene?.fullPrompt;
    if (!promptToUse) {
      setErrorMessage("Bitte wähle eine Szene oder gib einen eigenen Text ein.");
      return;
    }

    setAppState("processing");
    setLoadingMessage("Bild wird vorbereitet... 📸");

    try {
      // Convert data URL to Blob
      const response = await fetch(capturedImageData);
      const blob = await response.blob();
      
      console.log("📤 Sending to API, blob size:", blob.size);

      const formData = new FormData();
      formData.append("selfie", blob, "selfie.jpg");
      formData.append("customPrompt", promptToUse);

      setLoadingMessage("Karl denkt nach... 🤔");

      const apiResponse = await fetch("/api/render", {
        method: "POST",
        body: formData,
      });

      const data = await apiResponse.json();

      if (!apiResponse.ok) {
        let errorMsg = data.error || "Fehler bei der Bildgenerierung";
        if (errorMsg.includes("safety") || errorMsg.includes("rejected")) {
          errorMsg = "Das Bild wurde vom Sicherheitssystem abgelehnt. Bitte versuche es mit einem anderen Foto.";
        } else if (errorMsg.includes("verified") || errorMsg.includes("organization")) {
          errorMsg = "OpenAI-Konto muss verifiziert werden.";
        }
        throw new Error(errorMsg);
      }

      setResult({
        imageBase64: data.imageBase64,
        promptUsed: customPrompt.trim() || selectedScene?.shortTitle || "Custom",
      });
      setAppState("result");
      
    } catch (error) {
      console.error("Processing error:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Ein Fehler ist aufgetreten"
      );
      setAppState("error");
    }
  };

  const downloadImage = () => {
    if (!result?.imageBase64) return;
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${result.imageBase64}`;
    link.download = `karl-selfie-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const backToCamera = async () => {
    setResult(null);
    setCapturedImageData(null);
    setErrorMessage("");
    setAppState("camera");
    await new Promise(resolve => setTimeout(resolve, 100));
    await setupCameraStream(facingMode);
  };

  const retakePhoto = async () => {
    setCapturedImageData(null);
    setSelectedScene(null);
    setCustomPrompt("");
    setAppState("camera");
    await new Promise(resolve => setTimeout(resolve, 100));
    await setupCameraStream(facingMode);
  };

  const retryAfterError = async () => {
    setErrorMessage("");
    if (capturedImageData) {
      setAppState("selectScene");
    } else {
      setAppState("camera");
      await new Promise(resolve => setTimeout(resolve, 100));
      await setupCameraStream(facingMode);
    }
  };

  useEffect(() => {
    return () => {
      stopMediaStream(streamRef.current);
    };
  }, []);

  // Permission Screen
  if (appState === "permission") {
    return (
      <div className="permission-screen">
        <div className="permission-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </div>
        <h1 className="permission-title">Karl Selfie Generator</h1>
        <p className="permission-text">
          Mache ein Selfie und lass dich von KI in absurde Szenen mit Karl dem Kasten zaubern.
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
        <div className="permission-icon" style={{ background: "linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        <p className="text-white text-lg font-medium animate-pulse">{loadingMessage}</p>
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
        <div className="absolute top-4 left-4 right-4 safe-area-top">
          <div className="glass-dark rounded-2xl px-4 py-3 max-w-md mx-auto">
            <p className="text-white/70 text-xs uppercase tracking-wider mb-1">Szene</p>
            <p className="text-white text-sm leading-relaxed line-clamp-3">{result.promptUsed}</p>
          </div>
        </div>
        <div className="action-bar animate-slide-up">
          <button onClick={backToCamera} className="action-button action-button-secondary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            Neues Foto
          </button>
          <button onClick={downloadImage} className="action-button action-button-primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

  // Scene Selection Screen
  if (appState === "selectScene" && capturedImageData) {
    return (
      <div className="scene-select-screen">
        {/* Preview Image */}
        <div className="scene-preview">
          <img src={capturedImageData} alt="Dein Foto" className="scene-preview-image" />
        </div>

        {/* Scene Selection */}
        <div className="scene-select-content">
          <h2 className="scene-select-title">Wähle eine Szene</h2>
          
          {/* Custom Prompt Input */}
          <div className="custom-prompt-container">
            <textarea
              value={customPrompt}
              onChange={(e) => {
                setCustomPrompt(e.target.value);
                if (e.target.value.trim()) setSelectedScene(null);
              }}
              placeholder="✏️ Oder beschreibe deine eigene Szene..."
              className="custom-prompt-input"
              rows={2}
            />
          </div>

          {/* Scene Grid */}
          <div className="scene-grid">
            {SCENES.map((scene) => (
              <button
                key={scene.id}
                onClick={() => {
                  setSelectedScene(scene);
                  setCustomPrompt("");
                }}
                className={`scene-card ${selectedScene?.id === scene.id ? "scene-card-selected" : ""}`}
              >
                <span className="scene-emoji">{scene.emoji}</span>
                <span className="scene-title">{scene.shortTitle}</span>
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="scene-actions">
            <button onClick={retakePhoto} className="action-button action-button-secondary">
              Neues Foto
            </button>
            <button
              onClick={generateImage}
              disabled={!selectedScene && !customPrompt.trim()}
              className={`action-button action-button-primary ${!selectedScene && !customPrompt.trim() ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Generieren ✨
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Camera Screen
  return (
    <div className="camera-container">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`video-preview ${facingMode === "user" ? "mirror" : ""}`}
        style={{ background: '#1a1a1a' }}
      />
      
      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {!isVideoReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
          <div className="flex flex-col items-center gap-4">
            <div className="spinner" />
            <p className="text-white/70 text-sm">Kamera wird initialisiert...</p>
          </div>
        </div>
      )}

      <div className="absolute top-4 left-4 right-4 safe-area-top flex justify-between items-center z-20">
        <div className="glass-dark rounded-full px-4 py-2">
          <span className="text-white text-sm font-medium">Karl Selfie</span>
        </div>
        {hasMultipleCams && (
          <button onClick={switchCamera} className="icon-button" aria-label="Kamera wechseln">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
              <path d="M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5" />
              <circle cx="12" cy="12" r="3" />
              <path d="m18 22-3-3 3-3" />
              <path d="m6 2 3 3-3 3" />
            </svg>
          </button>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 safe-area-bottom pb-8 z-20">
        <div className="text-center mb-6">
          <p className="text-white/60 text-sm">
            {isVideoReady ? "Tippe zum Aufnehmen" : "Kamera wird geladen..."}
          </p>
        </div>
        <div className="flex justify-center">
          <button
            onClick={capturePhoto}
            disabled={isCapturing || !isVideoReady}
            className={`shutter-button ${isCapturing ? "capturing" : ""} ${!isVideoReady ? "opacity-50 cursor-not-allowed" : ""}`}
            aria-label="Foto aufnehmen"
          />
        </div>
      </div>

      {isCapturing && (
        <div className="absolute inset-0 bg-white animate-pulse pointer-events-none z-30" />
      )}
    </div>
  );
}
