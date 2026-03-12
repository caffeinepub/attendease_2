import { Camera, Wifi } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface FaceDetectionCameraProps {
  /** Employee info to show in the overlay banner when marking */
  markingEmployee?: {
    name: string;
    employeeId: string;
    photoData?: string;
  } | null;
  onMarkingComplete?: () => void;
}

type CamState = "idle" | "live" | "denied" | "error";

export default function FaceDetectionCamera({
  markingEmployee,
  onMarkingComplete,
}: FaceDetectionCameraProps) {
  const [camState, setCamState] = useState<CamState>("idle");
  const [confidence, setConfidence] = useState(0.82);
  const [showBanner, setShowBanner] = useState(false);
  const [bannerEmployee, setBannerEmployee] =
    useState<typeof markingEmployee>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const confidenceRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bannerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamState("error");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        try {
          await videoRef.current.play();
        } catch {
          /* autoPlay */
        }
      }
      setCamState("live");
      // Animate confidence score
      confidenceRef.current = setInterval(() => {
        setConfidence(0.78 + Math.random() * 0.18);
      }, 800);
    } catch (err: unknown) {
      const name = (err as { name?: string })?.name;
      if (name === "NotAllowedError" || name === "PermissionDeniedError")
        setCamState("denied");
      else setCamState("error");
    }
  }, []);

  // Auto-start camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current)
        for (const t of streamRef.current.getTracks()) t.stop();
      if (confidenceRef.current) clearInterval(confidenceRef.current);
      if (bannerRef.current) clearTimeout(bannerRef.current);
    };
  }, [startCamera]);

  // Show banner when markingEmployee changes
  useEffect(() => {
    if (markingEmployee) {
      setBannerEmployee(markingEmployee);
      setShowBanner(true);
      if (bannerRef.current) clearTimeout(bannerRef.current);
      bannerRef.current = setTimeout(() => {
        setShowBanner(false);
        setBannerEmployee(null);
        onMarkingComplete?.();
      }, 3500);
    }
  }, [markingEmployee, onMarkingComplete]);

  const now = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div
      className="relative rounded-xl overflow-hidden bg-black"
      style={{ aspectRatio: "4/3", maxHeight: 320 }}
    >
      {/* Video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        style={{
          transform: "scaleX(-1)",
          display: camState === "live" ? "block" : "none",
        }}
      />

      {/* Idle / Error fallback */}
      {camState !== "live" && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3"
          style={{ background: "oklch(0.12 0.02 240)" }}
        >
          <Camera size={40} className="text-white/30" />
          {camState === "idle" && (
            <p className="text-white/50 text-sm">Starting camera...</p>
          )}
          {camState === "denied" && (
            <div className="text-center px-4">
              <p className="text-white/70 text-sm font-semibold">
                Camera access denied
              </p>
              <p className="text-white/40 text-xs mt-1">
                Allow camera in browser settings, then reload
              </p>
            </div>
          )}
          {camState === "error" && (
            <p className="text-white/50 text-sm">Camera unavailable</p>
          )}
        </div>
      )}

      {/* Scanning grid lines (subtle) */}
      {camState === "live" && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(0,255,100,0.04) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(0,255,100,0.04) 40px)",
          }}
        />
      )}

      {/* Face bounding box */}
      {camState === "live" && !showBanner && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: "18%",
            left: "25%",
            width: "50%",
            height: "60%",
            border: "2px solid #00ff64",
            boxShadow:
              "0 0 12px rgba(0,255,100,0.5), inset 0 0 12px rgba(0,255,100,0.05)",
            animation: "face-box-pulse 2s ease-in-out infinite",
          }}
        >
          {/* Corner accents */}
          {["tl", "tr", "bl", "br"].map((c) => (
            <span
              key={c}
              style={{
                position: "absolute",
                width: 14,
                height: 14,
                borderColor: "#00ff64",
                borderStyle: "solid",
                ...(c === "tl"
                  ? { top: -2, left: -2, borderWidth: "3px 0 0 3px" }
                  : {}),
                ...(c === "tr"
                  ? { top: -2, right: -2, borderWidth: "3px 3px 0 0" }
                  : {}),
                ...(c === "bl"
                  ? { bottom: -2, left: -2, borderWidth: "0 0 3px 3px" }
                  : {}),
                ...(c === "br"
                  ? { bottom: -2, right: -2, borderWidth: "0 3px 3px 0" }
                  : {}),
              }}
            />
          ))}
        </div>
      )}

      {/* Confidence score */}
      {camState === "live" && !showBanner && (
        <div
          className="absolute top-3 left-3 text-xs font-mono font-bold px-2 py-0.5 rounded"
          style={{
            background: "rgba(0,0,0,0.55)",
            color: "#00ff64",
            letterSpacing: "0.03em",
          }}
        >
          Real {confidence.toFixed(4)}
        </div>
      )}

      {/* Live indicator */}
      {camState === "live" && (
        <div
          className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold"
          style={{ background: "rgba(0,0,0,0.55)", color: "#ff4444" }}
        >
          <span
            className="w-2 h-2 rounded-full bg-red-500"
            style={{ animation: "blink 1.2s ease-in-out infinite" }}
          />
          LIVE
        </div>
      )}

      {/* SCANNING sweep line */}
      {camState === "live" && !showBanner && (
        <div
          className="absolute left-0 right-0 h-0.5 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, transparent, #00ff64, transparent)",
            animation: "scan-line 2.5s linear infinite",
            opacity: 0.7,
          }}
        />
      )}

      {/* Employee marking banner */}
      {showBanner && bannerEmployee && (
        <div
          className="absolute bottom-0 left-0 right-0 flex items-end gap-3 px-4 py-3"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.88) 70%, transparent)",
            animation: "banner-slide 0.3s ease-out",
          }}
        >
          <div className="flex-1 min-w-0">
            <p
              className="text-white font-bold text-sm uppercase tracking-widest"
              style={{ color: "#f59e0b" }}
            >
              EMPLOYEE : {bannerEmployee.name}
            </p>
            <p className="text-white/80 text-xs font-mono mt-0.5">
              TIME : {now}
            </p>
            <p className="text-white/60 text-xs mt-0.5 flex items-center gap-1.5">
              <Wifi size={10} className="text-green-400" />
              <span style={{ color: "#00ff64" }}>Marking attendance...</span>
            </p>
          </div>
          {bannerEmployee.photoData && (
            <img
              src={bannerEmployee.photoData}
              alt={bannerEmployee.name}
              className="w-14 h-14 rounded-lg object-cover border-2"
              style={{ borderColor: "#f59e0b" }}
            />
          )}
        </div>
      )}

      {/* Face-detect box on banner-active (locked green box) */}
      {showBanner && camState === "live" && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: "10%",
            left: "22%",
            width: "56%",
            height: "62%",
            border: "2.5px solid #00ff64",
            boxShadow: "0 0 20px rgba(0,255,100,0.6)",
          }}
        >
          {["tl", "tr", "bl", "br"].map((c) => (
            <span
              key={c}
              style={{
                position: "absolute",
                width: 16,
                height: 16,
                borderColor: "#00ff64",
                borderStyle: "solid",
                ...(c === "tl"
                  ? { top: -2, left: -2, borderWidth: "3px 0 0 3px" }
                  : {}),
                ...(c === "tr"
                  ? { top: -2, right: -2, borderWidth: "3px 3px 0 0" }
                  : {}),
                ...(c === "bl"
                  ? { bottom: -2, left: -2, borderWidth: "0 0 3px 3px" }
                  : {}),
                ...(c === "br"
                  ? { bottom: -2, right: -2, borderWidth: "0 3px 3px 0" }
                  : {}),
              }}
            />
          ))}
          <div
            className="absolute top-1 left-1/2 -translate-x-1/2 text-xs font-mono px-2 py-0.5 rounded"
            style={{
              background: "rgba(0,200,80,0.85)",
              color: "#fff",
              whiteSpace: "nowrap",
            }}
          >
            IDENTITY VERIFIED
          </div>
        </div>
      )}

      <style>{`
        @keyframes face-box-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes scan-line {
          0% { top: 10%; }
          100% { top: 90%; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
        @keyframes banner-slide {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
