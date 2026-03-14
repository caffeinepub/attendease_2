import { Button } from "@/components/ui/button";
import {
  Camera,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  X,
  ZapOff,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  detectFaceDescriptorOnly,
  loadFaceModels,
} from "../services/FaceRecognitionService";

const AUTO_SCAN_TOTAL = 8;

interface CameraSectionProps {
  capturedImage: string | null;
  onCapture: (dataUrl: string) => void;
  onClear: () => void;
  captureButtonOcid?: string;
  required?: boolean;
  photoError?: string;
  /** When true: skip manual capture, auto-scan face 8 times and collect descriptors */
  autoScanMode?: boolean;
  /** Called with the 8 collected face descriptors once scanning is complete */
  onDescriptorsCaptured?: (descriptors: Float32Array[]) => void;
}

type CameraState =
  | "idle"
  | "requesting"
  | "live"
  | "denied"
  | "unsupported"
  | "error"
  | "captured"
  | "scanning" // autoScanMode: scanning in progress
  | "scan_done"; // autoScanMode: all scans collected

export default function CameraSection({
  capturedImage,
  onCapture,
  onClear,
  captureButtonOcid = "camera.capture_button",
  required = false,
  photoError,
  autoScanMode = false,
  onDescriptorsCaptured,
}: CameraSectionProps) {
  const [cameraState, setCameraState] = useState<CameraState>(
    capturedImage ? "captured" : "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [scanCount, setScanCount] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const descriptorsRef = useRef<Float32Array[]>([]);

  const stopStream = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    return () => stopStream();
  }, [stopStream]);

  const startAutoScan = useCallback(
    async (stream: MediaStream) => {
      setCameraState("scanning");
      descriptorsRef.current = [];
      setScanCount(0);
      setFaceDetected(false);

      const video = videoRef.current!;
      video.srcObject = stream;
      video.muted = true;

      await new Promise<void>((resolve) => {
        const onReady = () => {
          video.removeEventListener("canplay", onReady);
          resolve();
        };
        video.addEventListener("canplay", onReady);
        video.play().catch(() => resolve());
        setTimeout(resolve, 3000);
      });

      scanIntervalRef.current = setInterval(async () => {
        if (descriptorsRef.current.length >= AUTO_SCAN_TOTAL) return;
        const vid = videoRef.current;
        if (!vid || vid.readyState < 2 || vid.videoWidth === 0) return;

        const descriptor = await detectFaceDescriptorOnly(vid);
        if (!descriptor) {
          setFaceDetected(false);
          return;
        }

        setFaceDetected(true);
        descriptorsRef.current = [...descriptorsRef.current, descriptor];
        const count = descriptorsRef.current.length;
        setScanCount(count);

        if (count >= AUTO_SCAN_TOTAL) {
          clearInterval(scanIntervalRef.current!);
          scanIntervalRef.current = null;
          stopStream();
          setCameraState("scan_done");
          onDescriptorsCaptured?.(descriptorsRef.current);
        }
      }, 800);
    },
    [onDescriptorsCaptured, stopStream],
  );

  const handleRequestCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState("unsupported");
      return;
    }

    setCameraState("requesting");
    setErrorMessage("");

    try {
      // Pre-load face models in autoScanMode
      if (autoScanMode) {
        try {
          await loadFaceModels();
        } catch {
          setCameraState("error");
          setErrorMessage(
            "Failed to load face recognition models. Check your connection.",
          );
          return;
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      streamRef.current = stream;

      if (autoScanMode) {
        await startAutoScan(stream);
      } else {
        const video = videoRef.current!;
        video.srcObject = stream;
        video.muted = true;
        setCameraState("live");
        try {
          await video.play();
        } catch {
          // autoPlay handles it
        }
      }
    } catch (err: unknown) {
      stopStream();
      const name = (err as { name?: string })?.name;
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setCameraState("denied");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setCameraState("error");
        setErrorMessage("No camera device was found on this device.");
      } else if (name === "NotSupportedError") {
        setCameraState("unsupported");
      } else {
        setCameraState("error");
        setErrorMessage(
          (err as { message?: string })?.message ||
            "Failed to access the camera. Please try again.",
        );
      }
    }
  }, [autoScanMode, startAutoScan, stopStream]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const TARGET_W = 320;
    const TARGET_H = 240;
    const srcW = video.videoWidth || 640;
    const srcH = video.videoHeight || 480;
    const scale = Math.min(TARGET_W / srcW, TARGET_H / srcH, 1);
    canvas.width = Math.round(srcW * scale);
    canvas.height = Math.round(srcH * scale);

    const ctx = canvas.getContext("2d")!;
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    stopStream();
    setCameraState("captured");
    onCapture(dataUrl);
  };

  const handleRetake = () => {
    stopStream();
    onClear();
    descriptorsRef.current = [];
    setScanCount(0);
    setFaceDetected(false);
    setCameraState("idle");
    setErrorMessage("");
  };

  const isAutoScanning =
    cameraState === "scanning" || cameraState === "requesting";
  const scanDone = cameraState === "scan_done";

  return (
    <div>
      {/* Hidden canvas used only during manual capture */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Video element — always in DOM; hidden unless camera is live */}
      <div
        className="rounded-xl overflow-hidden border mb-3"
        style={{
          borderColor: "oklch(var(--navy) / 0.15)",
          display: cameraState === "live" || isAutoScanning ? "block" : "none",
        }}
      >
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              height: "220px",
              objectFit: "cover",
              display: "block",
              transform: "scaleX(-1)",
              background: "#ddd",
            }}
          />

          {/* Auto-scan overlay */}
          {isAutoScanning && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Dashed oval guide */}
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 640 480"
                preserveAspectRatio="none"
                aria-label="Face alignment guide"
              >
                <title>Face alignment guide</title>
                <ellipse
                  cx="320"
                  cy="240"
                  rx="130"
                  ry="175"
                  fill="none"
                  stroke={faceDetected ? "#00e664" : "rgba(255,255,255,0.45)"}
                  strokeWidth="3"
                  strokeDasharray={faceDetected ? "0" : "12 8"}
                />
              </svg>

              {/* Scan counter */}
              <div
                className="absolute top-2 left-2 flex items-center gap-2 px-3 py-1.5 rounded-lg"
                style={{ background: "rgba(0,0,0,0.7)" }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: faceDetected ? "#00e664" : "#ff4444",
                    animation: faceDetected
                      ? "none"
                      : "blink-dot 1s ease-in-out infinite",
                  }}
                />
                <span
                  className="text-xs font-mono font-semibold"
                  style={{ color: faceDetected ? "#00e664" : "#fff" }}
                >
                  {faceDetected ? "Face detected" : "Looking for face..."}{" "}
                  {scanCount}/{AUTO_SCAN_TOTAL}
                </span>
              </div>

              {/* Progress bar */}
              <div
                className="absolute bottom-0 left-0 right-0 h-1"
                style={{ background: "rgba(0,0,0,0.5)" }}
              >
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${(scanCount / AUTO_SCAN_TOTAL) * 100}%`,
                    background: "#00e664",
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-sm font-semibold text-foreground mb-3">
        {autoScanMode ? "Face Scan" : "Photo Capture"}{" "}
        {required ? (
          <span className="text-destructive">*</span>
        ) : (
          <span className="text-muted-foreground font-normal">(optional)</span>
        )}
      </p>

      {/* ── IDLE ── */}
      {cameraState === "idle" && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{
            borderColor: "oklch(var(--navy) / 0.25)",
            background: "oklch(var(--navy) / 0.02)",
          }}
        >
          <div
            className="flex items-start gap-3 px-4 py-4 border-b"
            style={{
              background: "oklch(0.98 0.005 240)",
              borderColor: "oklch(var(--navy) / 0.15)",
            }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: "oklch(var(--navy) / 0.12)" }}
            >
              <Camera size={17} style={{ color: "oklch(var(--navy))" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground leading-snug">
                AttendEase wants to use your camera
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {autoScanMode
                  ? "Camera is required to scan the employee's face for recognition. The system will capture 8 face scans automatically."
                  : "Camera is required to capture your photo for registration. Chrome will ask you to Allow or Block — please choose Allow."}
              </p>
            </div>
          </div>
          <div
            className="flex items-center justify-end gap-2 px-4 py-3"
            style={{ background: "oklch(0.97 0.003 240)" }}
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-8 px-4"
              disabled
              tabIndex={-1}
              aria-hidden
            >
              Don't Allow
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleRequestCamera}
              data-ocid="camera.enable_button"
              className="flex items-center gap-1.5 text-xs h-8 px-4 font-semibold"
              style={{
                background: "oklch(var(--navy))",
                color: "white",
              }}
            >
              <ShieldCheck size={13} />
              Allow Camera Access
            </Button>
          </div>
        </div>
      )}

      {/* ── REQUESTING ── */}
      {cameraState === "requesting" && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{
            borderColor: "oklch(var(--navy) / 0.2)",
            background: "oklch(0.98 0.005 240)",
          }}
          data-ocid="camera.loading_state"
        >
          <div className="flex items-center gap-3 px-4 py-4">
            <span
              className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin flex-shrink-0"
              style={{ color: "oklch(var(--navy) / 0.5)" }}
            />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {autoScanMode
                  ? "Loading face recognition models..."
                  : "Waiting for camera permission..."}
              </p>
              {!autoScanMode && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  A Chrome dialog should appear — click <strong>Allow</strong>{" "}
                  to continue.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── LIVE (manual mode only): Capture button ── */}
      {cameraState === "live" && !autoScanMode && (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleCapture}
            data-ocid={captureButtonOcid}
            className="flex items-center gap-2 font-semibold"
            style={{
              background: "oklch(var(--gold))",
              color: "oklch(0.12 0.04 255)",
            }}
          >
            <Camera size={14} />
            Capture Photo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRetake}
            className="flex items-center gap-2"
          >
            <X size={14} />
            Cancel
          </Button>
        </div>
      )}

      {/* ── AUTO SCAN DONE ── */}
      {scanDone && (
        <div
          className="flex items-center gap-3 p-4 rounded-xl border"
          style={{
            background: "oklch(0.97 0.02 145)",
            borderColor: "oklch(0.6 0.14 145 / 0.4)",
          }}
          data-ocid="camera.success_state"
        >
          <CheckCircle2
            size={20}
            style={{ color: "oklch(0.45 0.14 145)" }}
            className="flex-shrink-0"
          />
          <div className="flex-1">
            <p
              className="text-sm font-semibold"
              style={{ color: "oklch(0.38 0.12 145)" }}
            >
              Face scanned successfully! ✓
            </p>
            <p
              className="text-xs mt-0.5"
              style={{ color: "oklch(0.5 0.1 145)" }}
            >
              {AUTO_SCAN_TOTAL} face samples captured for accurate recognition.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRetake}
            className="text-xs h-8"
            data-ocid="camera.retry_button"
          >
            <RotateCcw size={12} className="mr-1" />
            Re-scan
          </Button>
        </div>
      )}

      {/* ── UNSUPPORTED ── */}
      {cameraState === "unsupported" && (
        <div
          className="flex items-start gap-3 p-4 rounded-xl border"
          style={{
            background: "oklch(0.97 0.02 30)",
            borderColor: "oklch(0.65 0.18 30 / 0.3)",
          }}
          data-ocid="camera.error_state"
        >
          <ZapOff
            size={18}
            style={{ color: "oklch(0.5 0.18 30)" }}
            className="flex-shrink-0 mt-0.5"
          />
          <div>
            <p
              className="text-sm font-semibold"
              style={{ color: "oklch(0.42 0.16 30)" }}
            >
              Camera not supported
            </p>
            <p
              className="text-xs mt-0.5"
              style={{ color: "oklch(0.55 0.12 30)" }}
            >
              Please use Chrome, Firefox, or Safari on a device with a camera.
            </p>
          </div>
        </div>
      )}

      {/* ── PERMISSION DENIED ── */}
      {cameraState === "denied" && (
        <div
          className="rounded-xl overflow-hidden border"
          style={{
            background: "oklch(0.98 0.01 30)",
            borderColor: "oklch(0.65 0.18 30 / 0.35)",
          }}
          data-ocid="camera.error_state"
        >
          <div
            className="flex items-center gap-3 px-4 py-3 border-b"
            style={{
              background: "oklch(0.97 0.02 30)",
              borderColor: "oklch(0.65 0.18 30 / 0.2)",
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "oklch(0.65 0.18 30 / 0.15)" }}
            >
              <Camera size={15} style={{ color: "oklch(0.5 0.18 30)" }} />
            </div>
            <div className="flex-1">
              <p
                className="text-sm font-semibold"
                style={{ color: "oklch(0.35 0.16 30)" }}
              >
                Camera access was blocked
              </p>
              <p className="text-xs" style={{ color: "oklch(0.55 0.12 30)" }}>
                You chose “Block” — re-enable it in your browser settings.
              </p>
            </div>
          </div>
          <div className="px-4 py-3 space-y-2">
            <ol
              className="text-xs space-y-1.5 list-none"
              style={{ color: "oklch(0.5 0.1 30)" }}
            >
              {[
                "Tap the lock icon in the address bar",
                'Find "Camera" and change it to "Allow"',
                "Reload the page and try again",
              ].map((step, idx) => (
                <li key={step} className="flex items-start gap-2">
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5"
                    style={{ background: "oklch(0.5 0.18 30)" }}
                  >
                    {idx + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                size="sm"
                onClick={handleRequestCamera}
                className="flex items-center gap-1.5 text-xs h-8"
                style={{ background: "oklch(0.5 0.18 30)", color: "white" }}
                data-ocid="camera.retry_button"
              >
                <RefreshCw size={12} />
                Try Again
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => window.location.reload()}
                className="flex items-center gap-1.5 text-xs h-8"
                data-ocid="camera.reload_button"
              >
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── OTHER ERROR ── */}
      {cameraState === "error" && (
        <div
          className="rounded-xl overflow-hidden border"
          style={{
            background: "oklch(0.98 0.01 30)",
            borderColor: "oklch(0.65 0.18 30 / 0.35)",
          }}
          data-ocid="camera.error_state"
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <ZapOff size={15} style={{ color: "oklch(0.5 0.18 30)" }} />
            <p className="text-sm" style={{ color: "oklch(0.5 0.18 30)" }}>
              {errorMessage || "An error occurred accessing the camera."}
            </p>
          </div>
          <div className="px-4 pb-3">
            <Button
              type="button"
              size="sm"
              onClick={handleRequestCamera}
              className="flex items-center gap-1.5 text-xs h-8"
              style={{ background: "oklch(0.5 0.18 30)", color: "white" }}
              data-ocid="camera.retry_button"
            >
              <RefreshCw size={12} />
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* ── CAPTURED (manual mode) ── */}
      {cameraState === "captured" && capturedImage && (
        <div className="space-y-3">
          <div className="relative">
            <img
              src={capturedImage}
              alt="Captured preview"
              className="w-full max-w-sm mx-auto block rounded-xl overflow-hidden border"
              style={{
                height: "220px",
                objectFit: "cover",
                borderColor: "oklch(var(--navy) / 0.15)",
              }}
            />
            <div
              className="absolute top-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{
                background: "oklch(0.3 0.12 145 / 0.85)",
                color: "white",
                backdropFilter: "blur(4px)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              Photo captured
            </div>
            <button
              type="button"
              onClick={handleRetake}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              aria-label="Remove photo and retake"
            >
              <X size={14} />
            </button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRetake}
            className="flex items-center gap-2"
            data-ocid="camera.retry_button"
          >
            <RotateCcw size={14} />
            Retake Photo
          </Button>
        </div>
      )}

      {/* Photo validation error */}
      {photoError && (
        <p
          className="text-xs text-destructive mt-2"
          data-ocid="camera.error_state"
        >
          {photoError}
        </p>
      )}

      <style>{`
        @keyframes blink-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.2; } }
      `}</style>
    </div>
  );
}
