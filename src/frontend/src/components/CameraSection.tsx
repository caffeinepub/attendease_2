import { Button } from "@/components/ui/button";
import {
  Camera,
  RefreshCw,
  RotateCcw,
  Settings,
  ShieldAlert,
  Video,
  X,
  ZapOff,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface CameraSectionProps {
  capturedImage: string | null;
  onCapture: (dataUrl: string) => void;
  onClear: () => void;
  cameraButtonOcid?: string;
  captureButtonOcid?: string;
  required?: boolean;
  photoError?: string;
}

type CameraState =
  | "idle" // Initial state — show "Enable Camera" button
  | "requesting" // getUserMedia in-flight — permission dialog visible
  | "live" // Camera is on, video feed is showing
  | "denied" // Permission was denied
  | "unsupported" // Browser doesn't support getUserMedia
  | "error" // Other camera error
  | "captured"; // Photo captured successfully

export default function CameraSection({
  capturedImage,
  onCapture,
  onClear,
  cameraButtonOcid = "camera.camera_button",
  captureButtonOcid = "camera.capture_button",
  required = false,
  photoError,
}: CameraSectionProps) {
  const [cameraState, setCameraState] = useState<CameraState>(
    capturedImage ? "captured" : "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // On mount, check if camera permission was previously denied so we show
  // the right UI immediately instead of trying to start the camera silently.
  // We read initiallyHasPhoto once so we don't need capturedImage as a dep.
  const initiallyHasPhoto = useRef(!!capturedImage);
  useEffect(() => {
    if (initiallyHasPhoto.current) return; // already have a photo, skip
    if (!navigator.permissions) return; // API not available

    navigator.permissions
      .query({ name: "camera" as PermissionName })
      .then((result) => {
        if (result.state === "denied") {
          setCameraState("denied");
        }
        // If "granted", leave as idle — user still clicks Enable Camera
        // If "prompt", leave as idle — browser will ask when they click
      })
      .catch(() => {
        // Ignore — permissions API not available for camera on some browsers
      });
  }, []);

  const stopStream = () => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Step 1: Enable Camera — requests permission and shows live feed
  const handleEnableCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState("unsupported");
      return;
    }

    setCameraState("requesting");
    setErrorMessage("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;

      const video = videoRef.current!;
      video.srcObject = stream;
      video.muted = true;
      await video.play();

      setCameraState("live");
    } catch (err: any) {
      stopStream();

      if (
        err?.name === "NotAllowedError" ||
        err?.name === "PermissionDeniedError"
      ) {
        setCameraState("denied");
      } else if (
        err?.name === "NotFoundError" ||
        err?.name === "DevicesNotFoundError"
      ) {
        setCameraState("error");
        setErrorMessage("No camera device was found on this device.");
      } else if (err?.name === "NotSupportedError") {
        setCameraState("unsupported");
      } else {
        setCameraState("error");
        setErrorMessage(
          err?.message || "Failed to access the camera. Please try again.",
        );
      }
    }
  };

  // Step 2: Capture — draw current video frame to canvas and export
  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d")!;

    // Mirror front-facing camera
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0);
    ctx.restore();

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

    // Stop stream — we no longer need the live feed
    stopStream();

    setCameraState("captured");
    onCapture(dataUrl);
  };

  const handleRetake = () => {
    stopStream();
    onClear();
    setCameraState("idle");
    setErrorMessage("");
  };

  return (
    <div>
      {/* Canvas — hidden, used only during capture */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <p className="text-sm font-semibold text-foreground mb-3">
        Photo Capture{" "}
        {required ? (
          <span className="text-destructive">*</span>
        ) : (
          <span className="text-muted-foreground font-normal">(optional)</span>
        )}
      </p>

      {/* ── IDLE: Show "Enable Camera" button ── */}
      {cameraState === "idle" && (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-8 px-4"
          style={{
            borderColor: "oklch(var(--navy) / 0.2)",
            background: "oklch(var(--navy) / 0.03)",
          }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: "oklch(var(--navy) / 0.08)" }}
          >
            <Video size={22} style={{ color: "oklch(var(--navy))" }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">
              Camera is off
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click below to turn on the camera
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleEnableCamera}
            data-ocid={cameraButtonOcid}
            className="flex items-center gap-2 font-semibold"
            style={{
              background: "oklch(var(--navy))",
              color: "white",
            }}
          >
            <Video size={14} />
            Enable Camera
          </Button>
        </div>
      )}

      {/* ── REQUESTING: Permission dialog is open ── */}
      {cameraState === "requesting" && (
        <div
          className="rounded-xl mb-3 overflow-hidden border"
          style={{
            borderColor: "oklch(var(--navy) / 0.15)",
            background: "oklch(var(--navy) / 0.03)",
          }}
          data-ocid="camera.loading_state"
        >
          <div
            className="flex items-center gap-3 px-4 py-3 border-b"
            style={{
              background: "oklch(0.98 0.005 240)",
              borderColor: "oklch(var(--navy) / 0.1)",
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "oklch(var(--navy) / 0.1)" }}
            >
              <Camera size={15} style={{ color: "oklch(var(--navy))" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground leading-snug">
                AttendEase wants to use your camera
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Required to capture your photo for attendance
              </p>
            </div>
            <span
              className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin flex-shrink-0"
              style={{ color: "oklch(var(--navy) / 0.4)" }}
            />
          </div>
          <div className="px-4 py-3 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Please click <strong>Allow</strong> in your browser's permission
              prompt to continue.
            </span>
          </div>
        </div>
      )}

      {/* ── LIVE: Visible video feed + Capture button ── */}
      {cameraState === "live" && (
        <div className="space-y-3">
          <div
            className="rounded-xl overflow-hidden border"
            style={{ borderColor: "oklch(var(--navy) / 0.15)" }}
          >
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
                transform: "scaleX(-1)", // mirror preview
                background: "#ddd",
              }}
            />
          </div>
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
        </div>
      )}

      {/* ── UNSUPPORTED ── */}
      {cameraState === "unsupported" && (
        <div
          className="flex items-start gap-3 p-4 rounded-xl mb-3 border"
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
              Your browser does not support camera access. Please use Chrome,
              Firefox, or Safari.
            </p>
          </div>
        </div>
      )}

      {/* ── PERMISSION DENIED ── */}
      {cameraState === "denied" && (
        <div
          className="rounded-xl mb-3 overflow-hidden border"
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
              <ShieldAlert size={15} style={{ color: "oklch(0.5 0.18 30)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-semibold leading-snug"
                style={{ color: "oklch(0.35 0.16 30)" }}
              >
                Camera access was denied
              </p>
              <p
                className="text-xs mt-0.5"
                style={{ color: "oklch(0.55 0.12 30)" }}
              >
                Please enable camera access in your browser settings.
              </p>
            </div>
          </div>

          <div className="px-4 py-3 space-y-2">
            <p
              className="text-xs font-semibold"
              style={{ color: "oklch(0.45 0.14 30)" }}
            >
              To enable camera in Chrome:
            </p>
            <ol
              className="text-xs space-y-1.5 list-none"
              style={{ color: "oklch(0.5 0.1 30)" }}
            >
              <li className="flex items-start gap-2">
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5"
                  style={{ background: "oklch(0.5 0.18 30)" }}
                >
                  1
                </span>
                Tap the lock / info icon in your browser's address bar
              </li>
              <li className="flex items-start gap-2">
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5"
                  style={{ background: "oklch(0.5 0.18 30)" }}
                >
                  2
                </span>
                Find <strong>Camera</strong> and set it to{" "}
                <strong>Allow</strong>
              </li>
              <li className="flex items-start gap-2">
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5"
                  style={{ background: "oklch(0.5 0.18 30)" }}
                >
                  3
                </span>
                Reload the page, then tap <strong>Enable Camera</strong>
              </li>
            </ol>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Button
                type="button"
                size="sm"
                onClick={handleEnableCamera}
                className="flex items-center gap-1.5 text-xs h-8"
                style={{ background: "oklch(0.5 0.18 30)", color: "white" }}
                data-ocid="camera.retry_button"
              >
                <RefreshCw size={12} />
                Retry Camera
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
          className="rounded-xl mb-3 overflow-hidden border"
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
              <ZapOff size={15} style={{ color: "oklch(0.5 0.18 30)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-semibold leading-snug"
                style={{ color: "oklch(0.35 0.16 30)" }}
              >
                Camera error
              </p>
              <p
                className="text-xs mt-0.5"
                style={{ color: "oklch(0.55 0.12 30)" }}
              >
                {errorMessage || "An error occurred accessing the camera."}
              </p>
            </div>
          </div>
          <div className="px-4 py-3">
            <Button
              type="button"
              size="sm"
              onClick={handleEnableCamera}
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

      {/* ── CAPTURED: Show photo thumbnail ── */}
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
            {/* Green "photo captured" badge */}
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
    </div>
  );
}
