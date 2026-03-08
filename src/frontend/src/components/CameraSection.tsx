import { Button } from "@/components/ui/button";
import {
  Camera,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  X,
  ZapOff,
} from "lucide-react";
import { useRef, useState } from "react";

interface CameraSectionProps {
  capturedImage: string | null;
  onCapture: (dataUrl: string) => void;
  onClear: () => void;
  captureButtonOcid?: string;
  required?: boolean;
  photoError?: string;
}

type CameraState =
  | "idle" // Show pre-prompt: explain we need camera & ask user to allow
  | "requesting" // getUserMedia in-flight — Chrome permission dialog visible
  | "live" // Camera on, video feed showing
  | "denied" // Permission denied
  | "unsupported" // Browser doesn't support getUserMedia
  | "error" // Other camera error
  | "captured"; // Photo captured

export default function CameraSection({
  capturedImage,
  onCapture,
  onClear,
  captureButtonOcid = "camera.capture_button",
  required = false,
  photoError,
}: CameraSectionProps) {
  const [cameraState, setCameraState] = useState<CameraState>(
    capturedImage ? "captured" : "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string>("");

  // videoRef is attached to a <video> that is ALWAYS rendered in the DOM.
  // We only toggle its display via cameraState so the ref is never null
  // when getUserMedia resolves — eliminates the race condition.
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = () => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  // Trigger getUserMedia → Chrome native permission dialog appears
  const handleRequestCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState("unsupported");
      return;
    }

    setCameraState("requesting");
    setErrorMessage("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;

      // videoRef.current is guaranteed non-null because the <video> element
      // is always in the DOM (just hidden).
      const video = videoRef.current!;
      video.srcObject = stream;
      video.muted = true;
      // Set state to "live" first — this makes display: "block" kick in via
      // React's next render, then play(). autoPlay also handles most browsers.
      setCameraState("live");
      try {
        await video.play();
      } catch {
        // autoPlay handles it; non-fatal
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
  };

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d")!;
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0);
    ctx.restore();

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
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
      {/* Hidden canvas used only during capture */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* ─────────────────────────────────────────────────────────────
          The <video> element is ALWAYS in the DOM regardless of state.
          We toggle visibility via display so videoRef.current is never
          null when getUserMedia resolves (fixes the race condition).
      ───────────────────────────────────────────────────────────── */}
      <div
        className="rounded-xl overflow-hidden border mb-3"
        style={{
          borderColor: "oklch(var(--navy) / 0.15)",
          display: cameraState === "live" ? "block" : "none",
        }}
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
            transform: "scaleX(-1)",
            background: "#ddd",
          }}
        />
      </div>

      <p className="text-sm font-semibold text-foreground mb-3">
        Photo Capture{" "}
        {required ? (
          <span className="text-destructive">*</span>
        ) : (
          <span className="text-muted-foreground font-normal">(optional)</span>
        )}
      </p>

      {/* ── IDLE: Chrome-style permission pre-prompt ── */}
      {cameraState === "idle" && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{
            borderColor: "oklch(var(--navy) / 0.25)",
            background: "oklch(var(--navy) / 0.02)",
          }}
        >
          {/* Chrome-style permission bar */}
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
                Camera is required to capture your photo for registration.
                Chrome will ask you to <strong>Allow</strong> or{" "}
                <strong>Block</strong> — please choose <strong>Allow</strong>.
              </p>
            </div>
          </div>
          {/* Action buttons */}
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

      {/* ── REQUESTING: Chrome permission dialog is open ── */}
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
                Waiting for camera permission...
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                A Chrome dialog should appear — click <strong>Allow</strong> to
                continue.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── LIVE: Capture button (video shown via always-in-DOM element above) ── */}
      {cameraState === "live" && (
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
                You chose "Block" — re-enable it in your browser settings.
              </p>
            </div>
          </div>
          <div className="px-4 py-3 space-y-2">
            <p
              className="text-xs font-semibold"
              style={{ color: "oklch(0.45 0.14 30)" }}
            >
              To unblock camera in Chrome:
            </p>
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
            <div className="flex gap-2 mt-2 flex-wrap">
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

      {/* ── CAPTURED: Show thumbnail ── */}
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
    </div>
  );
}
