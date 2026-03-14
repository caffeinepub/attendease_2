import { Camera } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  detectFaceWithBox,
  loadFaceDescriptors,
  loadFaceModels,
  matchFaceToEmployee,
} from "../services/FaceRecognitionService";

interface Employee {
  name: string;
  employeeId: string;
  department: string;
  photoData?: string;
}

interface FaceDetectionCameraProps {
  employees: Employee[];
  onAttendanceMarked?: (employeeId: string, employeeName: string) => void;
}

type CamState = "loading" | "idle" | "live" | "denied" | "error";

export default function FaceDetectionCamera({
  employees,
  onAttendanceMarked,
}: FaceDetectionCameraProps) {
  const [camState, setCamState] = useState<CamState>("loading");
  const [statusText, setStatusText] = useState("Loading face models...");
  const [matchedEmployee, setMatchedEmployee] = useState<Employee | null>(null);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [markedEmployee, setMarkedEmployee] = useState<Employee | null>(null);
  const [noFaceData, setNoFaceData] = useState(false);
  const [isMarking, setIsMarking] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMarkingRef = useRef(false);
  const markedRef = useRef<Set<string>>(new Set());
  const faceDBRef = useRef<
    Array<{ employee: Employee; descriptors: Float32Array[] }>
  >([]);

  const buildFaceDB = useCallback(() => {
    const db = employees
      .map((emp) => ({
        employee: emp,
        // Load from localStorage first; fall back to photoData field (JSON array)
        descriptors: (() => {
          const fromStorage = loadFaceDescriptors(emp.employeeId);
          if (fromStorage.length > 0) return fromStorage;
          if (!emp.photoData || emp.photoData.length < 10) return [];
          try {
            const parsed = JSON.parse(emp.photoData) as number[][];
            if (!Array.isArray(parsed) || parsed.length === 0) return [];
            return parsed.map((d) => new Float32Array(d));
          } catch {
            return [];
          }
        })(),
      }))
      .filter((e) => e.descriptors.length > 0);
    faceDBRef.current = db;
    setNoFaceData(db.length === 0);
  }, [employees]);

  const stopDetection = useCallback(() => {
    if (detectIntervalRef.current) {
      clearInterval(detectIntervalRef.current);
      detectIntervalRef.current = null;
    }
  }, []);

  const stopStream = useCallback(() => {
    stopDetection();
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop();
      streamRef.current = null;
    }
  }, [stopDetection]);

  const drawOnCanvas = useCallback(
    (
      box: { x: number; y: number; w: number; h: number } | null,
      color: string,
      label: string,
    ) => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;
      canvas.width = video.videoWidth || video.offsetWidth;
      canvas.height = video.videoHeight || video.offsetHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!box) {
        // Draw dashed oval guide
        ctx.strokeStyle = "rgba(255,255,255,0.45)";
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.ellipse(
          canvas.width / 2,
          canvas.height / 2,
          canvas.width * 0.22,
          canvas.height * 0.38,
          0,
          0,
          2 * Math.PI,
        );
        ctx.stroke();
        ctx.setLineDash([]);
        return;
      }

      const { x, y, w, h } = box;
      const cs = Math.min(w, h) * 0.2;

      // Main box
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x, y, w, h);

      // Corner accents
      ctx.lineWidth = 4;
      ctx.beginPath();
      // TL
      ctx.moveTo(x, y + cs);
      ctx.lineTo(x, y);
      ctx.lineTo(x + cs, y);
      // TR
      ctx.moveTo(x + w - cs, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + cs);
      // BL
      ctx.moveTo(x, y + h - cs);
      ctx.lineTo(x, y + h);
      ctx.lineTo(x + cs, y + h);
      // BR
      ctx.moveTo(x + w - cs, y + h);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x + w, y + h - cs);
      ctx.stroke();

      // Label
      if (label) {
        const fontSize = 13;
        ctx.font = `bold ${fontSize}px monospace`;
        const tw = ctx.measureText(label).width + 12;
        ctx.fillStyle = color;
        ctx.fillRect(x, y - fontSize - 6, tw, fontSize + 6);
        ctx.fillStyle = color === "#00ff64" ? "#000" : "#fff";
        ctx.fillText(label, x + 6, y - 4);
      }
    },
    [],
  );

  const startDetection = useCallback(() => {
    if (detectIntervalRef.current) return;

    detectIntervalRef.current = setInterval(async () => {
      const video = videoRef.current;
      if (
        !video ||
        video.readyState < 2 ||
        video.videoWidth === 0 ||
        isMarkingRef.current
      )
        return;

      const result = await detectFaceWithBox(video);

      if (!result) {
        setMatchedEmployee(null);
        setMatchScore(null);
        setStatusText("Position your face in front of the camera");
        drawOnCanvas(null, "", "");
        return;
      }

      const { descriptor, box } = result;

      // Find best match from face DB
      let bestMatch: { employee: Employee; distance: number } | null = null;
      for (const { employee, descriptors } of faceDBRef.current) {
        if (markedRef.current.has(employee.employeeId)) continue;
        const dist = matchFaceToEmployee(descriptor, descriptors);
        if (!bestMatch || dist < bestMatch.distance) {
          bestMatch = { employee, distance: dist };
        }
      }

      if (bestMatch && bestMatch.distance < 0.55) {
        const score = Math.max(0, Math.min(1, 1 - bestMatch.distance / 0.8));
        setMatchScore(score);
        setMatchedEmployee(bestMatch.employee);
        setStatusText(`IDENTITY VERIFIED — ${bestMatch.employee.name}`);
        drawOnCanvas(
          { x: box.x, y: box.y, w: box.width, h: box.height },
          "#00ff64",
          `${bestMatch.employee.name} ${(score * 100).toFixed(0)}%`,
        );

        // Auto-mark after 800ms hold
        const matchedEmp = bestMatch.employee;
        isMarkingRef.current = true;
        setIsMarking(true);
        stopDetection();

        setTimeout(() => {
          markedRef.current.add(matchedEmp.employeeId);
          setMarkedEmployee(matchedEmp);
          onAttendanceMarked?.(matchedEmp.employeeId, matchedEmp.name);

          setTimeout(() => {
            setMarkedEmployee(null);
            setMatchedEmployee(null);
            setMatchScore(null);
            setStatusText("Scanning for faces...");
            isMarkingRef.current = false;
            setIsMarking(false);
            startDetection();
          }, 3500);
        }, 800);
      } else {
        setMatchedEmployee(null);
        setMatchScore(null);
        const label =
          faceDBRef.current.length === 0 ? "No DB" : "Not Recognized";
        setStatusText(
          faceDBRef.current.length === 0
            ? "No registered faces found"
            : "Face not recognized",
        );
        drawOnCanvas(
          { x: box.x, y: box.y, w: box.width, h: box.height },
          "#ff4444",
          label,
        );
      }
    }, 500);
  }, [drawOnCanvas, onAttendanceMarked, stopDetection]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only initialization effect
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await loadFaceModels();
        if (cancelled) return;

        buildFaceDB();
        setCamState("idle");

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 640, height: 480 },
        });
        if (cancelled) {
          for (const t of stream.getTracks()) t.stop();
          return;
        }
        streamRef.current = stream;
        setCamState("live");

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
          // Fallback if event never fires
          setTimeout(resolve, 3000);
        });

        if (!cancelled) {
          setStatusText("Scanning for faces...");
          startDetection();
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const name = (err as { name?: string })?.name;
        if (
          name === "NotAllowedError" ||
          name === "PermissionDeniedError" ||
          name === "SecurityError"
        ) {
          setCamState("denied");
          setStatusText(
            "Camera access denied. Please allow camera and reload.",
          );
        } else {
          setCamState("error");
          setStatusText("Camera unavailable. Please check your device.");
        }
      }
    })();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, []); // mount-only

  // Rebuild face DB when employees list changes (e.g. after approval)
  useEffect(() => {
    if (camState === "live") {
      buildFaceDB();
    }
  }, [camState, buildFaceDB]);

  const now = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div
      className="relative rounded-xl overflow-hidden bg-black"
      style={{ aspectRatio: "4/3", maxHeight: 360 }}
    >
      {/* Video — always in DOM so ref is never null */}
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

      {/* Canvas overlay — NOT mirrored; coordinates adjusted in drawOnCanvas */}
      {camState === "live" && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ transform: "scaleX(-1)" }}
        />
      )}

      {/* Non-live fallback */}
      {camState !== "live" && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3"
          style={{ background: "oklch(0.12 0.02 240)" }}
        >
          <Camera size={40} className="text-white/30" />
          <p className="text-white/60 text-sm text-center px-6">{statusText}</p>
          {(camState === "loading" || camState === "idle") && (
            <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          )}
        </div>
      )}

      {/* LIVE badge */}
      {camState === "live" && (
        <div
          className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold"
          style={{ background: "rgba(0,0,0,0.6)", color: "#ff4444" }}
        >
          <span
            className="w-2 h-2 rounded-full bg-red-500"
            style={{ animation: "blink 1.2s ease-in-out infinite" }}
          />
          LIVE
        </div>
      )}

      {/* No face data warning */}
      {camState === "live" && noFaceData && !isMarking && (
        <div
          className="absolute top-10 left-2 right-2 p-2 rounded text-center text-xs font-medium"
          style={{ background: "rgba(220,80,0,0.88)", color: "white" }}
        >
          No face data found. Register employees with face scan first.
        </div>
      )}

      {/* Status bar */}
      {camState === "live" && !markedEmployee && (
        <div
          className="absolute bottom-0 left-0 right-0 px-3 py-2 flex items-center justify-between"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.75) 80%, transparent)",
          }}
        >
          <p
            className="text-xs font-mono"
            style={{ color: matchedEmployee ? "#00ff64" : "#fff" }}
          >
            {statusText}
          </p>
          {matchScore !== null && (
            <span
              className="text-xs font-mono font-bold"
              style={{ color: "#00ff64" }}
            >
              {(matchScore * 100).toFixed(0)}% match
            </span>
          )}
        </div>
      )}

      {/* ATTENDANCE MARKED banner */}
      {markedEmployee && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ background: "rgba(0,0,0,0.65)" }}
        >
          <div className="text-center px-6">
            <div className="text-5xl mb-3" style={{ color: "#00ff64" }}>
              ✓
            </div>
            <p
              className="font-bold text-lg tracking-widest"
              style={{ color: "#00ff64" }}
            >
              ATTENDANCE MARKED
            </p>
            <p className="text-white font-semibold mt-2 text-lg">
              {markedEmployee.name}
            </p>
            <p className="text-white/60 text-sm mt-0.5">
              {markedEmployee.department}
            </p>
            <p className="text-white/50 text-xs mt-3">{now}</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.2; } }
      `}</style>
    </div>
  );
}
