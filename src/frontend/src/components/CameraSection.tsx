import { Button } from "@/components/ui/button";
import {
  Camera,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  X,
  ZapOff,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { useCamera } from "../camera/useCamera";

interface CameraSectionProps {
  capturedImage: string | null;
  onCapture: (dataUrl: string) => void;
  onClear: () => void;
  cameraButtonOcid?: string;
  captureButtonOcid?: string;
  required?: boolean;
  photoError?: string;
}

export function useCameraSection() {
  const camera = useCamera({ facingMode: "user", width: 640, height: 480 });
  const capturedImageRef = useRef<string | null>(null);

  const captureToBase64 = async (): Promise<string | null> => {
    const file = await camera.capturePhoto();
    if (!file) return null;

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        capturedImageRef.current = result;
        resolve(result);
      };
      reader.readAsDataURL(file);
    });
  };

  return { camera, captureToBase64 };
}

export default function CameraSection({
  capturedImage,
  onCapture,
  onClear,
  cameraButtonOcid = "camera.camera_button",
  captureButtonOcid = "camera.capture_button",
  required = false,
  photoError,
}: CameraSectionProps) {
  const { camera, captureToBase64 } = useCameraSection();

  const handleStartCamera = async () => {
    await camera.startCamera();
  };

  // Auto-start camera on mount to request permission immediately
  useEffect(() => {
    camera.startCamera();
  }, [camera.startCamera]);

  const handleCapture = async () => {
    const dataUrl = await captureToBase64();
    if (dataUrl) {
      onCapture(dataUrl);
      await camera.stopCamera();
    }
  };

  const handleRetake = async () => {
    onClear();
    await camera.startCamera();
  };

  const isPermissionDenied = camera.error?.type === "permission";

  return (
    <div>
      <p className="text-sm font-semibold text-foreground mb-3">
        Photo Capture{" "}
        {required ? (
          <span className="text-destructive">*</span>
        ) : (
          <span className="text-muted-foreground font-normal">(optional)</span>
        )}
      </p>

      {/* Permission requesting state */}
      {camera.isLoading && !camera.isActive && !capturedImage && (
        <div
          className="flex items-center gap-3 p-4 rounded-xl mb-3 border text-sm"
          style={{
            background: "oklch(var(--navy) / 0.04)",
            borderColor: "oklch(var(--navy) / 0.15)",
          }}
          data-ocid="camera.permission_request"
        >
          <span
            className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin flex-shrink-0"
            style={{ color: "oklch(var(--navy))" }}
          />
          <span className="text-muted-foreground">
            Requesting camera permission...
          </span>
        </div>
      )}

      {/* Permission denied error */}
      {isPermissionDenied && (
        <div
          className="flex items-start gap-3 p-4 rounded-xl mb-3 border"
          style={{
            background: "oklch(0.97 0.02 30)",
            borderColor: "oklch(0.65 0.18 30 / 0.3)",
          }}
          data-ocid="camera.error_state"
        >
          <ShieldAlert
            size={18}
            style={{ color: "oklch(0.5 0.18 30)" }}
            className="flex-shrink-0 mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-semibold mb-0.5"
              style={{ color: "oklch(0.42 0.16 30)" }}
            >
              Camera permission is required
            </p>
            <p className="text-xs" style={{ color: "oklch(0.55 0.12 30)" }}>
              Please allow camera access in your browser settings, then click
              Retry below.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleStartCamera}
              className="mt-2 flex items-center gap-1.5 text-xs h-7"
              style={{
                borderColor: "oklch(0.65 0.18 30 / 0.4)",
                color: "oklch(0.45 0.16 30)",
              }}
              data-ocid="camera.retry_button"
            >
              <RefreshCw size={12} />
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Other error states (non-permission) */}
      {camera.error && !isPermissionDenied && (
        <div
          className="flex items-center gap-2 p-3 rounded-lg mb-3 text-sm"
          style={{
            background: "oklch(0.97 0.02 30)",
            color: "oklch(0.5 0.15 30)",
          }}
          data-ocid="camera.error_state"
        >
          <ZapOff size={14} />
          <span>{camera.error.message}</span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleStartCamera}
            className="ml-auto flex items-center gap-1 text-xs h-6 px-2"
            data-ocid="camera.retry_button"
          >
            <RefreshCw size={11} />
            Retry
          </Button>
        </div>
      )}

      {/* Camera Feed */}
      {camera.isActive && !capturedImage && (
        <div className="camera-container mb-3">
          <video
            ref={camera.videoRef}
            className="w-full max-w-sm mx-auto block rounded-lg overflow-hidden"
            style={{
              transform: "scaleX(-1)",
              height: "240px",
              objectFit: "cover",
            }}
            autoPlay
            playsInline
            muted
          />
          <canvas ref={camera.canvasRef} className="hidden" />
        </div>
      )}

      {/* Captured Image Preview */}
      {capturedImage && (
        <div className="camera-container mb-3 relative">
          <img
            src={capturedImage}
            alt="Employee captured preview"
            className="w-full max-w-sm mx-auto block rounded-lg overflow-hidden"
            style={{ height: "240px", objectFit: "cover" }}
          />
          <button
            type="button"
            onClick={() => {
              onClear();
              camera.stopCamera();
            }}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        {!camera.isActive &&
          !capturedImage &&
          !camera.isLoading &&
          !camera.error && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleStartCamera}
              disabled={camera.isSupported === false}
              data-ocid={cameraButtonOcid}
              className="flex items-center gap-2"
            >
              <Camera size={14} />
              Enable Camera
            </Button>
          )}

        {camera.isActive && !capturedImage && (
          <Button
            type="button"
            size="sm"
            onClick={handleCapture}
            disabled={camera.isLoading}
            data-ocid={captureButtonOcid}
            className="flex items-center gap-2"
            style={{
              background: "oklch(var(--gold))",
              color: "oklch(0.12 0.04 255)",
            }}
          >
            <Camera size={14} />
            Capture Photo
          </Button>
        )}

        {capturedImage && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRetake}
            className="flex items-center gap-2"
          >
            <RotateCcw size={14} />
            Retake
          </Button>
        )}
      </div>

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
