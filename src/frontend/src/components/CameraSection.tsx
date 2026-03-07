import { Button } from "@/components/ui/button";
import { Camera, RotateCcw, X, ZapOff } from "lucide-react";
import { useRef } from "react";
import { useCamera } from "../camera/useCamera";

interface CameraSectionProps {
  capturedImage: string | null;
  onCapture: (dataUrl: string) => void;
  onClear: () => void;
  cameraButtonOcid?: string;
  captureButtonOcid?: string;
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
}: CameraSectionProps) {
  const { camera, captureToBase64 } = useCameraSection();

  const handleStartCamera = async () => {
    await camera.startCamera();
  };

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

  return (
    <div>
      <p className="text-sm font-semibold text-foreground mb-3">
        Photo Capture{" "}
        <span className="text-muted-foreground font-normal">(optional)</span>
      </p>

      {/* Camera Feed */}
      {camera.isActive && !capturedImage && (
        <div className="camera-container mb-3">
          <video
            ref={camera.videoRef}
            className="w-full max-w-sm mx-auto block"
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
            className="w-full max-w-sm mx-auto block"
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

      {/* Error state */}
      {camera.error && (
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
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        {!camera.isActive && !capturedImage && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleStartCamera}
            disabled={camera.isLoading || camera.isSupported === false}
            data-ocid={cameraButtonOcid}
            className="flex items-center gap-2"
          >
            {camera.isLoading ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Camera size={14} />
                Enable Camera
              </>
            )}
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
    </div>
  );
}
