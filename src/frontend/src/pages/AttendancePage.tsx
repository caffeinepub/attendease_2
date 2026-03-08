import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  Camera,
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  X,
  XCircle,
  ZapOff,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  getTodayDate,
  useCheckAttendanceToday,
  useGetApprovalStatus,
  useMarkAttendance,
} from "../hooks/useQueries";

interface FormErrors {
  name?: string;
  employeeId?: string;
  photo?: string;
}

type ApprovalState =
  | "idle"
  | "checking"
  | "approved"
  | "pending"
  | "rejected"
  | "notfound";

type CameraState =
  | "idle"
  | "requesting"
  | "live"
  | "denied"
  | "unsupported"
  | "error"
  | "captured";

function getCurrentTime(): string {
  return new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export default function AttendancePage() {
  const [name, setName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [checkedInAt, setCheckedInAt] = useState<string | null>(null);
  const [approvalState, setApprovalState] = useState<ApprovalState>("idle");
  const [isCheckingApproval, setIsCheckingApproval] = useState(false);

  // Camera state
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { mutateAsync: markAttendance, isPending } = useMarkAttendance();
  const checkToday = useCheckAttendanceToday();
  const getApprovalStatus = useGetApprovalStatus();

  // Check if camera was previously denied
  useEffect(() => {
    if (!navigator.permissions) return;
    navigator.permissions
      .query({ name: "camera" as PermissionName })
      .then((result) => {
        if (result.state === "denied") {
          setCameraState("denied");
        }
      })
      .catch(() => {});
  }, []);

  const stopStream = () => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const handleEnableCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState("unsupported");
      return;
    }
    setCameraState("requesting");
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      // videoRef.current is guaranteed non-null — the <video> element is
      // always in the DOM (just hidden), so there's no race condition.
      const video = videoRef.current!;
      video.srcObject = stream;
      video.muted = true;
      // Reveal the video before calling play()
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
        setCameraError("No camera device was found on this device.");
      } else if (name === "NotSupportedError") {
        setCameraState("unsupported");
      } else {
        setCameraState("error");
        setCameraError(
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
    setPhotoData(dataUrl);
    if (errors.photo) setErrors((p) => ({ ...p, photo: undefined }));
    toast.success("Face captured!", {
      description: "Now fill in your details and submit.",
    });
  };

  const handleRetake = () => {
    stopStream();
    setPhotoData(null);
    setCameraState("idle");
    setCameraError("");
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!name.trim()) newErrors.name = "Employee name is required";
    if (!employeeId.trim()) newErrors.employeeId = "Employee ID is required";
    if (!photoData) {
      newErrors.photo = "Please scan your face before submitting.";
      toast.error("Face scan required", {
        description: "Please capture your face to mark attendance.",
      });
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const today = getTodayDate();
    const checkInTime = getCurrentTime();

    try {
      setIsCheckingApproval(true);
      setApprovalState("checking");
      const status = await getApprovalStatus(employeeId.trim());
      setIsCheckingApproval(false);

      if (status === "notfound") {
        setApprovalState("notfound");
        return;
      }
      if (status === "pending") {
        setApprovalState("pending");
        return;
      }
      if (status === "rejected") {
        setApprovalState("rejected");
        return;
      }

      setApprovalState("approved");

      const alreadyMarked = await checkToday(employeeId.trim());
      if (alreadyMarked) {
        toast.error("Attendance already marked", {
          description: `${name} has already checked in today (${today}).`,
        });
        return;
      }

      const success = await markAttendance({
        name: name.trim(),
        employeeId: employeeId.trim(),
        date: today,
        checkInTime,
        photoData: photoData ?? "",
      });

      if (success) {
        setCheckedInAt(checkInTime);
        toast.success("Attendance marked!", {
          description: `${name} checked in at ${checkInTime}`,
        });
        setName("");
        setEmployeeId("");
        setPhotoData(null);
        setErrors({});
        setApprovalState("idle");
        setCameraState("idle");
      } else {
        toast.error("Employee not found", {
          description:
            "Please verify the name and ID match a registered employee.",
        });
      }
    } catch {
      setIsCheckingApproval(false);
      setApprovalState("idle");
      toast.error("Something went wrong", { description: "Please try again." });
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "oklch(var(--gold))" }}
        >
          <Camera size={18} style={{ color: "oklch(0.12 0.04 255)" }} />
        </div>
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">
            Mark Attendance
          </h2>
          <p className="text-sm text-muted-foreground">
            Scan your face to record today's check-in
          </p>
        </div>
      </div>

      {/* Approval Status Messages */}
      {approvalState === "notfound" && (
        <div
          className="flex items-start gap-3 p-4 rounded-xl mb-6 border animate-fade-in"
          style={{
            background: "oklch(0.97 0.01 0)",
            borderColor: "oklch(0.65 0.2 20 / 0.3)",
          }}
          data-ocid="attendance.approval_error"
        >
          <XCircle
            size={20}
            style={{ color: "oklch(0.55 0.2 20)" }}
            className="flex-shrink-0 mt-0.5"
          />
          <div>
            <p
              className="text-sm font-semibold"
              style={{ color: "oklch(0.45 0.18 20)" }}
            >
              Employee Not Registered
            </p>
            <p
              className="text-xs mt-0.5"
              style={{ color: "oklch(0.55 0.12 20)" }}
            >
              No employee found with this ID. Please register first before
              marking attendance.
            </p>
          </div>
        </div>
      )}
      {approvalState === "pending" && (
        <div
          className="flex items-start gap-3 p-4 rounded-xl mb-6 border animate-fade-in"
          style={{
            background: "oklch(0.97 0.02 85)",
            borderColor: "oklch(0.75 0.12 85 / 0.5)",
          }}
          data-ocid="attendance.approval_error"
        >
          <Clock
            size={20}
            style={{ color: "oklch(0.55 0.12 85)" }}
            className="flex-shrink-0 mt-0.5"
          />
          <div>
            <p
              className="text-sm font-semibold"
              style={{ color: "oklch(0.45 0.1 85)" }}
            >
              Registration Awaiting Approval
            </p>
            <p
              className="text-xs mt-0.5"
              style={{ color: "oklch(0.55 0.08 85)" }}
            >
              Your registration is pending manager approval. You can mark
              attendance once approved.
            </p>
          </div>
        </div>
      )}
      {approvalState === "rejected" && (
        <div
          className="flex items-start gap-3 p-4 rounded-xl mb-6 border animate-fade-in"
          style={{
            background: "oklch(0.97 0.01 0)",
            borderColor: "oklch(0.65 0.2 20 / 0.3)",
          }}
          data-ocid="attendance.approval_error"
        >
          <AlertTriangle
            size={20}
            style={{ color: "oklch(0.55 0.2 20)" }}
            className="flex-shrink-0 mt-0.5"
          />
          <div>
            <p
              className="text-sm font-semibold"
              style={{ color: "oklch(0.45 0.18 20)" }}
            >
              Registration Rejected
            </p>
            <p
              className="text-xs mt-0.5"
              style={{ color: "oklch(0.55 0.12 20)" }}
            >
              Your registration was rejected. Please contact HR for further
              assistance.
            </p>
          </div>
        </div>
      )}

      {/* Success state */}
      {checkedInAt && (
        <div
          className="flex items-center gap-3 p-4 rounded-xl mb-6 border animate-fade-in"
          style={{
            background: "oklch(var(--success-bg))",
            borderColor: "oklch(var(--success) / 0.3)",
          }}
          data-ocid="attendance.success_state"
        >
          <CheckCircle size={20} style={{ color: "oklch(var(--success))" }} />
          <div>
            <p
              className="text-sm font-semibold"
              style={{ color: "oklch(var(--success))" }}
            >
              Check-in successful!
            </p>
            <p className="text-xs" style={{ color: "oklch(0.5 0.1 145)" }}>
              Marked at {checkedInAt} on {getTodayDate()}
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-6">
          {/* ── FACE SCAN SECTION (Primary) ── */}
          <div
            className="rounded-2xl border-2 overflow-hidden"
            style={{
              borderColor: "oklch(var(--gold) / 0.5)",
              background: "oklch(var(--gold) / 0.03)",
            }}
          >
            {/* Section header */}
            <div
              className="flex items-center gap-2 px-4 py-3 border-b"
              style={{
                background: "oklch(var(--gold) / 0.08)",
                borderColor: "oklch(var(--gold) / 0.2)",
              }}
            >
              <Camera size={16} style={{ color: "oklch(0.55 0.15 75)" }} />
              <p
                className="text-sm font-bold"
                style={{ color: "oklch(0.45 0.12 75)" }}
              >
                Step 1 — Scan Your Face
              </p>
              {cameraState === "captured" && (
                <span
                  className="ml-auto flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: "oklch(0.3 0.12 145 / 0.15)",
                    color: "oklch(0.35 0.12 145)",
                  }}
                >
                  <CheckCircle size={11} /> Captured
                </span>
              )}
            </div>

            <div className="p-4">
              {/* Hidden canvas */}
              <canvas ref={canvasRef} style={{ display: "none" }} />

              {/* ─────────────────────────────────────────────────────────────
                  The <video> element is ALWAYS in the DOM regardless of state.
                  We toggle visibility via display so videoRef.current is never
                  null when getUserMedia resolves (fixes the race condition).
              ───────────────────────────────────────────────────────────── */}
              <div
                className="rounded-xl overflow-hidden border relative mb-3"
                style={{
                  borderColor: "oklch(var(--gold) / 0.4)",
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
                    height: "240px",
                    objectFit: "cover",
                    display: "block",
                    transform: "scaleX(-1)",
                    background: "#ddd",
                  }}
                />
                {/* Scan overlay */}
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  style={{ background: "oklch(0 0 0 / 0.05)" }}
                >
                  <div
                    className="w-40 h-48 rounded-full border-4"
                    style={{
                      borderColor: "oklch(var(--gold) / 0.7)",
                      boxShadow:
                        "0 0 0 4px oklch(var(--gold) / 0.15), inset 0 0 0 4px oklch(var(--gold) / 0.1)",
                    }}
                  />
                </div>
                {/* Live badge */}
                <div
                  className="absolute top-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{
                    background: "oklch(0.35 0.18 20 / 0.85)",
                    color: "white",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  LIVE
                </div>
              </div>

              {/* IDLE: Pre-prompt — Chrome-style permission request */}
              {cameraState === "idle" && (
                <div
                  className="rounded-xl border overflow-hidden"
                  style={{
                    borderColor: "oklch(var(--gold) / 0.4)",
                    background: "oklch(var(--gold) / 0.02)",
                  }}
                >
                  {/* Chrome-style permission bar */}
                  <div
                    className="flex items-start gap-3 px-4 py-4 border-b"
                    style={{
                      background: "oklch(0.98 0.005 80)",
                      borderColor: "oklch(var(--gold) / 0.25)",
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: "oklch(var(--gold) / 0.2)" }}
                    >
                      <Camera
                        size={17}
                        style={{ color: "oklch(0.5 0.15 75)" }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground leading-snug">
                        AttendEase wants to use your camera
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        Camera is required to scan your face for attendance.
                        Chrome will ask you to <strong>Allow</strong> or{" "}
                        <strong>Block</strong> — please choose{" "}
                        <strong>Allow</strong>.
                      </p>
                    </div>
                  </div>
                  {/* Action buttons */}
                  <div
                    className="flex items-center justify-end gap-2 px-4 py-3"
                    style={{ background: "oklch(0.97 0.003 80)" }}
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
                      onClick={handleEnableCamera}
                      data-ocid="attendance.camera_button"
                      className="flex items-center gap-1.5 text-xs h-8 px-4 font-semibold"
                      style={{
                        background: "oklch(var(--gold))",
                        color: "oklch(0.12 0.04 255)",
                      }}
                    >
                      <ShieldCheck size={13} />
                      Allow Camera Access
                    </Button>
                  </div>
                </div>
              )}

              {/* REQUESTING: Chrome dialog is open */}
              {cameraState === "requesting" && (
                <div
                  className="rounded-xl border overflow-hidden"
                  style={{
                    borderColor: "oklch(var(--gold) / 0.3)",
                    background: "oklch(0.98 0.005 80)",
                  }}
                  data-ocid="attendance.loading_state"
                >
                  <div className="flex items-center gap-3 px-4 py-4">
                    <span
                      className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin flex-shrink-0"
                      style={{ color: "oklch(0.55 0.15 75)" }}
                    />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Waiting for camera permission...
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        A Chrome dialog should appear — click{" "}
                        <strong>Allow</strong> to continue.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* LIVE: Capture buttons (video shown via always-in-DOM element above) */}
              {cameraState === "live" && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleCapture}
                    data-ocid="attendance.capture_button"
                    className="flex items-center gap-2 font-semibold"
                    style={{
                      background: "oklch(var(--gold))",
                      color: "oklch(0.12 0.04 255)",
                    }}
                  >
                    <Camera size={15} />
                    Capture Face
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

              {/* DENIED */}
              {cameraState === "denied" && (
                <div
                  className="rounded-xl overflow-hidden border"
                  style={{
                    background: "oklch(0.98 0.01 30)",
                    borderColor: "oklch(0.65 0.18 30 / 0.35)",
                  }}
                  data-ocid="attendance.error_state"
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
                      <ShieldAlert
                        size={15}
                        style={{ color: "oklch(0.5 0.18 30)" }}
                      />
                    </div>
                    <div className="flex-1">
                      <p
                        className="text-sm font-semibold"
                        style={{ color: "oklch(0.35 0.16 30)" }}
                      >
                        Camera access was denied
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: "oklch(0.55 0.12 30)" }}
                      >
                        Enable camera access in your browser settings.
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
                      {[
                        "Tap the lock / info icon in your browser's address bar",
                        "Find Camera and set it to Allow",
                        "Reload the page, then tap Enable Camera",
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
                        onClick={handleEnableCamera}
                        className="flex items-center gap-1.5 text-xs h-8"
                        style={{
                          background: "oklch(0.5 0.18 30)",
                          color: "white",
                        }}
                        data-ocid="attendance.retry_camera_button"
                      >
                        <RefreshCw size={12} /> Retry Camera
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-1.5 text-xs h-8"
                      >
                        Reload Page
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* UNSUPPORTED */}
              {cameraState === "unsupported" && (
                <div
                  className="flex items-start gap-3 p-4 rounded-xl border"
                  style={{
                    background: "oklch(0.97 0.02 30)",
                    borderColor: "oklch(0.65 0.18 30 / 0.3)",
                  }}
                  data-ocid="attendance.error_state"
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
                      Please use Chrome, Firefox, or Safari.
                    </p>
                  </div>
                </div>
              )}

              {/* OTHER ERROR */}
              {cameraState === "error" && (
                <div
                  className="rounded-xl overflow-hidden border"
                  style={{
                    background: "oklch(0.98 0.01 30)",
                    borderColor: "oklch(0.65 0.18 30 / 0.35)",
                  }}
                  data-ocid="attendance.error_state"
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <ZapOff size={15} style={{ color: "oklch(0.5 0.18 30)" }} />
                    <p
                      className="text-sm"
                      style={{ color: "oklch(0.5 0.18 30)" }}
                    >
                      {cameraError || "An error occurred accessing the camera."}
                    </p>
                  </div>
                  <div className="px-4 pb-3">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleEnableCamera}
                      className="flex items-center gap-1.5 text-xs h-8"
                      style={{
                        background: "oklch(0.5 0.18 30)",
                        color: "white",
                      }}
                    >
                      <RefreshCw size={12} /> Try Again
                    </Button>
                  </div>
                </div>
              )}

              {/* CAPTURED */}
              {cameraState === "captured" && photoData && (
                <div className="space-y-3">
                  <div className="relative">
                    <img
                      src={photoData}
                      alt="Face scan"
                      className="w-full max-w-sm mx-auto block rounded-xl overflow-hidden border"
                      style={{
                        height: "220px",
                        objectFit: "cover",
                        borderColor: "oklch(var(--gold) / 0.4)",
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
                      Face scanned
                    </div>
                    <button
                      type="button"
                      onClick={handleRetake}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                      aria-label="Retake"
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
                    data-ocid="attendance.retake_button"
                  >
                    <RotateCcw size={14} /> Retake
                  </Button>
                </div>
              )}

              {/* Photo error */}
              {errors.photo && (
                <p
                  className="text-xs text-destructive mt-2"
                  data-ocid="attendance.error_state"
                >
                  {errors.photo}
                </p>
              )}
            </div>
          </div>

          {/* ── DETAILS SECTION (Step 2) ── */}
          <div
            className="rounded-2xl border overflow-hidden"
            style={{
              borderColor: "oklch(var(--navy) / 0.15)",
              background: "white",
            }}
          >
            <div
              className="flex items-center gap-2 px-4 py-3 border-b"
              style={{
                background: "oklch(var(--navy) / 0.04)",
                borderColor: "oklch(var(--navy) / 0.1)",
              }}
            >
              <CheckCircle size={16} style={{ color: "oklch(var(--navy))" }} />
              <p
                className="text-sm font-bold"
                style={{ color: "oklch(var(--navy))" }}
              >
                Step 2 — Enter Your Details
              </p>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="att-name" className="text-sm font-semibold">
                    Employee Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="att-name"
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name)
                        setErrors((p) => ({ ...p, name: undefined }));
                    }}
                    className={errors.name ? "border-destructive" : ""}
                    data-ocid="attendance.name_input"
                  />
                  {errors.name && (
                    <p
                      className="text-xs text-destructive"
                      data-ocid="attendance.error_state"
                    >
                      {errors.name}
                    </p>
                  )}
                </div>
                {/* Employee ID */}
                <div className="space-y-1.5">
                  <Label htmlFor="att-id" className="text-sm font-semibold">
                    Employee ID <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="att-id"
                    type="text"
                    placeholder="e.g. EMP-001"
                    value={employeeId}
                    onChange={(e) => {
                      setEmployeeId(e.target.value);
                      if (errors.employeeId)
                        setErrors((p) => ({ ...p, employeeId: undefined }));
                    }}
                    className={errors.employeeId ? "border-destructive" : ""}
                    data-ocid="attendance.id_input"
                  />
                  {errors.employeeId && (
                    <p className="text-xs text-destructive">
                      {errors.employeeId}
                    </p>
                  )}
                </div>
              </div>

              {/* Today info */}
              <div
                className="flex items-center gap-2 p-3 rounded-lg text-sm"
                style={{ background: "oklch(var(--navy) / 0.04)" }}
              >
                <Clock size={14} style={{ color: "oklch(var(--gold))" }} />
                <span className="text-muted-foreground">
                  Recording attendance for:{" "}
                  <span className="font-semibold text-foreground">
                    {getTodayDate()}
                  </span>
                </span>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isPending || isCheckingApproval}
                className="w-full sm:w-auto h-11 font-semibold px-8 btn-gold"
                data-ocid="attendance.submit_button"
              >
                {isCheckingApproval ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : isPending ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Marking...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} className="mr-2" />
                    Mark Attendance
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
