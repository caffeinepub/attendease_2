import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Camera,
  CheckCircle2,
  Edit3,
  Loader2,
  Lock,
  Trash2,
  UserCheck,
  UserX,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Employee, MonthEndReport } from "../backend.d";
import FaceDetectionCamera from "../components/FaceDetectionCamera";
import { useActor } from "../hooks/useActor";
import { faceapi, loadFaceModels } from "../hooks/useFaceAPI";
import {
  countWorkingDaysExcludingSundays,
  getCurrentMonth,
  getTodayDate,
  useAddHoliday,
  useAllEmployees,
  useApproveEmployeeWithPayment,
  useDeleteEmployee,
  useHolidays,
  useMarkAttendance,
  useMonthEndReport,
  useRegisterEmployee,
  useRejectEmployee,
  useRemoveHoliday,
  useSetEmployeePayment,
} from "../hooks/useQueries";
import { storeFaceDescriptors } from "../services/FaceRecognitionService";

const MANAGER_PASSWORD = "1234";
const SCAN_TOTAL = 8;

// ─── Face Position Helpers ───────────────────────────────────────────────────
function evaluateFacePosition(
  box: { x: number; y: number; width: number; height: number },
  videoWidth: number,
  videoHeight: number,
): { isGood: boolean; instruction: string } {
  const faceCenterX = box.x + box.width / 2;
  const faceCenterY = box.y + box.height / 2;
  const videoCenterX = videoWidth / 2;
  const videoCenterY = videoHeight / 2;
  const offsetX = Math.abs(faceCenterX - videoCenterX) / videoWidth;
  const offsetY = Math.abs(faceCenterY - videoCenterY) / videoHeight;
  const faceRatio = box.width / videoWidth;

  if (faceRatio < 0.08) return { isGood: false, instruction: "Move closer" };
  if (faceRatio > 0.85) return { isGood: false, instruction: "Move back" };
  if (offsetX > 0.38) return { isGood: false, instruction: "Center your face" };
  if (offsetY > 0.38) return { isGood: false, instruction: "Center your face" };
  return { isGood: true, instruction: "Good position - Hold still" };
}

function drawFaceBox(
  ctx: CanvasRenderingContext2D,
  box: { x: number; y: number; width: number; height: number },
  isGood: boolean,
  instruction: string,
) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Draw face guide oval
  const cx = ctx.canvas.width / 2;
  const cy = ctx.canvas.height / 2;
  ctx.beginPath();
  ctx.ellipse(
    cx,
    cy,
    ctx.canvas.width * 0.25,
    ctx.canvas.height * 0.38,
    0,
    0,
    Math.PI * 2,
  );
  ctx.strokeStyle = isGood ? "rgba(0,230,100,0.3)" : "rgba(255,80,80,0.3)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  const color = isGood ? "#00e664" : "#ff4444";
  const { x, y, width, height } = box;
  const cornerLen = Math.min(width, height) * 0.18;

  // Main box
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);

  // Corner accents (thicker)
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  // TL
  ctx.moveTo(x, y + cornerLen);
  ctx.lineTo(x, y);
  ctx.lineTo(x + cornerLen, y);
  // TR
  ctx.moveTo(x + width - cornerLen, y);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x + width, y + cornerLen);
  // BL
  ctx.moveTo(x, y + height - cornerLen);
  ctx.lineTo(x, y + height);
  ctx.lineTo(x + cornerLen, y + height);
  // BR
  ctx.moveTo(x + width - cornerLen, y + height);
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x + width, y + height - cornerLen);
  ctx.stroke();

  // Instruction text
  const padding = 6;
  const fontSize = Math.max(11, Math.min(14, width * 0.1));
  ctx.font = `bold ${fontSize}px sans-serif`;
  const textW = ctx.measureText(instruction).width;
  const textX = x + (width - textW) / 2;
  const textY = y + height + fontSize + padding;
  ctx.fillStyle = isGood ? "rgba(0,200,80,0.85)" : "rgba(220,50,50,0.85)";
  ctx.fillRect(
    textX - padding,
    textY - fontSize - 2,
    textW + padding * 2,
    fontSize + padding,
  );
  ctx.fillStyle = "#fff";
  ctx.fillText(instruction, textX, textY - 2);
}

// ─── Login Screen ───────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd === MANAGER_PASSWORD) {
      onLogin();
    } else {
      setError(true);
      setPwd("");
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <Card className="w-full max-w-sm shadow-card">
        <CardHeader className="text-center pb-2">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-foreground" />
          </div>
          <CardTitle className="text-2xl font-extrabold">
            Manager Login
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter your password to access the portal
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="pwd">Password</Label>
              <Input
                id="pwd"
                data-ocid="manager.login.input"
                type="password"
                placeholder="Enter password"
                value={pwd}
                onChange={(e) => {
                  setPwd(e.target.value);
                  setError(false);
                }}
                className={error ? "border-destructive" : ""}
                autoFocus
              />
              {error && (
                <p
                  data-ocid="manager.login.error_state"
                  className="text-destructive text-xs mt-1"
                >
                  Incorrect password. Please try again.
                </p>
              )}
            </div>
            <Button
              data-ocid="manager.login.primary_button"
              type="submit"
              className="w-full"
            >
              Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Register Tab ──────────────────────────────────────────────────────────────
function RegisterTab() {
  const [name, setName] = useState("");
  const [empId, setEmpId] = useState("");
  const [department, setDepartment] = useState("");
  const [salary, setSalary] = useState("");
  const registerMutation = useRegisterEmployee();

  // Face scan state
  const [scanPhase, setScanPhase] = useState<
    "idle" | "loading" | "scanning" | "done" | "error"
  >("idle");
  const [scanCount, setScanCount] = useState(0);
  const [scanError, setScanError] = useState("");
  const [faceDescriptors, setFaceDescriptors] = useState<Float32Array[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const descriptorsRef = useRef<Float32Array[]>([]);

  const stopCamera = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // Set srcObject after video element is in DOM
  useEffect(() => {
    if (scanPhase === "scanning" && streamRef.current && videoRef.current) {
      if (!videoRef.current.srcObject) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [scanPhase]);

  const startFaceScan = async () => {
    setScanPhase("loading");
    setScanError("");
    setScanCount(0);
    setFaceDescriptors([]);
    descriptorsRef.current = [];

    try {
      await loadFaceModels();
    } catch {
      setScanPhase("error");
      setScanError(
        "Failed to load face recognition models. Check your internet connection.",
      );
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
    } catch {
      setScanPhase("error");
      setScanError("Camera access denied. Please allow camera permission.");
      return;
    }

    setScanPhase("scanning");

    // Directly assign srcObject — don't rely solely on useEffect (React may not flush yet)
    await new Promise((r) => setTimeout(r, 80));
    if (videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = stream;
      try {
        await videoRef.current.play();
      } catch {}
    }
    // Retry if still not assigned
    if (!videoRef.current?.srcObject) {
      await new Promise((r) => setTimeout(r, 150));
      if (videoRef.current && !videoRef.current.srcObject) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {}
      }
    }

    // Poll until video is delivering frames (max 10s)
    const waitForVideo = async (): Promise<HTMLVideoElement | null> => {
      for (let i = 0; i < 100; i++) {
        const vid = videoRef.current;
        if (vid && vid.videoWidth > 0) return vid;
        await new Promise((r) => setTimeout(r, 100));
      }
      return null;
    };

    const video = await waitForVideo();
    if (!video) {
      setScanPhase("error");
      setScanError("Camera failed to start. Please try again.");
      return;
    }

    // Fail-safe timeout: 30 seconds from when video is ready
    timeoutRef.current = setTimeout(() => {
      if (descriptorsRef.current.length < SCAN_TOTAL) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        stopCamera();
        setScanPhase("error");
        setScanError(
          "Face not detected. Ensure good lighting and face the camera directly.",
        );
      }
    }, 30000);

    intervalRef.current = setInterval(async () => {
      const vid = videoRef.current;
      const canvas = canvasRef.current;
      if (!vid || vid.videoWidth === 0 || !canvas) return;
      if (descriptorsRef.current.length >= SCAN_TOTAL) return;

      try {
        const detection = await faceapi
          .detectSingleFace(
            vid,
            new faceapi.TinyFaceDetectorOptions({
              inputSize: 224,
              scoreThreshold: 0.2,
            }),
          )
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!detection) return;

        // Draw bounding box with position feedback
        canvas.width = vid.videoWidth || canvas.offsetWidth;
        canvas.height = vid.videoHeight || canvas.offsetHeight;
        const dims = faceapi.matchDimensions(canvas, vid, true);
        const resized = faceapi.resizeResults(detection, dims);
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const box = resized.detection.box;
          const pos = evaluateFacePosition(
            { x: box.x, y: box.y, width: box.width, height: box.height },
            canvas.width,
            canvas.height,
          );
          drawFaceBox(
            ctx,
            { x: box.x, y: box.y, width: box.width, height: box.height },
            pos.isGood,
            pos.instruction,
          );
        }

        descriptorsRef.current = [
          ...descriptorsRef.current,
          detection.descriptor,
        ];
        const newCount = descriptorsRef.current.length;
        setScanCount(newCount);
        setFaceDescriptors([...descriptorsRef.current]);

        if (newCount >= SCAN_TOTAL) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          stopCamera();
          setScanPhase("done");
        }
      } catch {
        // Silently continue if detection fails on a frame
      }
    }, 400);
  };

  const resetScan = () => {
    stopCamera();
    setScanPhase("idle");
    setScanCount(0);
    setScanError("");
    setFaceDescriptors([]);
    descriptorsRef.current = [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !empId || !department || !salary) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (faceDescriptors.length < SCAN_TOTAL) {
      toast.error("Please complete the face scan (8/8) first.");
      return;
    }
    const descriptorJson = JSON.stringify(
      faceDescriptors.map((d) => Array.from(d)),
    );
    try {
      const result = await registerMutation.mutateAsync({
        name,
        employeeId: empId,
        department,
        role: "employee",
        photoData: descriptorJson,
      });
      if (result) {
        // Store face descriptors in localStorage for offline face matching
        if (descriptorsRef.current.length > 0) {
          storeFaceDescriptors(empId, descriptorsRef.current);
        }
        toast.success(
          "Employee registered successfully! Awaiting manager approval.",
        );
        setName("");
        setEmpId("");
        setDepartment("");
        setSalary("");
        resetScan();
      } else {
        toast.error("Employee ID already exists. Please use a different ID.");
      }
    } catch {
      toast.error("Registration failed. Please try again.");
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="reg-name">Full Name</Label>
          <Input
            id="reg-name"
            data-ocid="register.name.input"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="reg-id">Employee ID</Label>
          <Input
            id="reg-id"
            data-ocid="register.id.input"
            placeholder="Employee ID"
            value={empId}
            onChange={(e) => setEmpId(e.target.value)}
          />
        </div>
        <div>
          <Label>Department</Label>
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger data-ocid="register.department.select">
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Driver">Driver</SelectItem>
              <SelectItem value="Office">Office</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="reg-salary">Monthly Salary (₹)</Label>
          <Input
            id="reg-salary"
            data-ocid="register.salary.input"
            type="number"
            placeholder="Salary amount"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
            min="1"
          />
        </div>

        {/* Face Scan Section */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="bg-muted/40 px-3 py-2 flex items-center gap-2">
            <Camera className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Face Recognition Scan</span>
          </div>
          <div className="p-3 space-y-3">
            {scanPhase === "idle" && (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Scan employee's face 8 times for accurate recognition
                </p>
                <Button
                  type="button"
                  data-ocid="register.face_scan.primary_button"
                  onClick={startFaceScan}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Start Face Scan
                </Button>
              </div>
            )}

            {scanPhase === "loading" && (
              <div className="text-center py-4 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">
                  Loading face recognition models...
                </span>
              </div>
            )}

            {(scanPhase === "scanning" ||
              scanPhase === "loading" ||
              scanPhase === "done") && (
              <div className="space-y-2">
                <div
                  className="relative bg-black rounded overflow-hidden"
                  style={{ height: 220 }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{
                      display: scanPhase === "scanning" ? "block" : "none",
                    }}
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full"
                    style={{
                      display: scanPhase === "scanning" ? "block" : "none",
                    }}
                  />
                  {scanPhase === "done" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
                      <CheckCircle2 className="w-10 h-10 text-green-400 mb-2" />
                      <p className="text-green-400 font-bold text-sm">
                        Face captured successfully!
                      </p>
                    </div>
                  )}
                  {scanPhase === "scanning" && (
                    <div className="absolute top-2 left-2 bg-black/70 rounded-lg px-3 py-1.5 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-green-400 text-xs font-mono font-semibold">
                        🔍 Scanning... {scanCount}/{SCAN_TOTAL}
                      </span>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-300"
                      style={{ width: `${(scanCount / SCAN_TOTAL) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-10 text-right">
                    {scanCount}/{SCAN_TOTAL}
                  </span>
                </div>

                {scanPhase === "done" && (
                  <p className="text-green-600 text-xs font-medium text-center">
                    ✓ Face captured successfully ({SCAN_TOTAL}/{SCAN_TOTAL})
                  </p>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  data-ocid="register.rescan.secondary_button"
                  onClick={resetScan}
                  className="w-full text-xs"
                >
                  Re-scan Face
                </Button>
              </div>
            )}

            {scanPhase === "error" && (
              <div className="space-y-2">
                <p
                  data-ocid="register.face_scan.error_state"
                  className="text-destructive text-xs"
                >
                  {scanError}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  data-ocid="register.retry_scan.secondary_button"
                  onClick={resetScan}
                  className="w-full text-xs"
                >
                  Try Again
                </Button>
              </div>
            )}
          </div>
        </div>

        <Button
          data-ocid="register.submit.primary_button"
          type="submit"
          className="w-full"
          disabled={
            registerMutation.isPending || faceDescriptors.length < SCAN_TOTAL
          }
        >
          {registerMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : null}
          {faceDescriptors.length < SCAN_TOTAL
            ? `Please complete face scan (${faceDescriptors.length}/${SCAN_TOTAL})`
            : "Register Employee"}
        </Button>
      </form>
    </div>
  );
}

// ─── Approve Dialog ────────────────────────────────────────────────────────────
function ApproveDialog({
  employee,
  open,
  onClose,
}: {
  employee: Employee | null;
  open: boolean;
  onClose: () => void;
}) {
  const [salary, setSalary] = useState("");
  const approveMutation = useApproveEmployeeWithPayment();

  useEffect(() => {
    if (employee)
      setSalary(
        employee.monthlyPayment > 0n ? String(employee.monthlyPayment) : "",
      );
  }, [employee]);

  const handleApprove = async () => {
    if (!employee) return;
    const s = Number(salary);
    if (!s || s < 1) {
      toast.error("Salary is required.");
      return;
    }
    try {
      await approveMutation.mutateAsync({
        employeeId: employee.employeeId,
        payment: BigInt(s),
      });
      toast.success(
        `${employee.name} approved with salary ₹${s.toLocaleString()}.`,
      );
      onClose();
    } catch {
      toast.error("Approval failed.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent data-ocid="approve.dialog">
        <DialogHeader>
          <DialogTitle>Approve Employee</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            Approving <strong>{employee?.name}</strong> ({employee?.employeeId})
          </p>
          <div>
            <Label htmlFor="approve-salary">Monthly Salary (₹) *</Label>
            <Input
              id="approve-salary"
              data-ocid="approve.salary.input"
              type="number"
              placeholder="Salary amount"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              min="1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            data-ocid="approve.cancel_button"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            data-ocid="approve.confirm_button"
            onClick={handleApprove}
            disabled={approveMutation.isPending}
          >
            {approveMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Approve"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Salary Dialog ────────────────────────────────────────────────────────
function EditSalaryDialog({
  employee,
  open,
  onClose,
}: {
  employee: Employee | null;
  open: boolean;
  onClose: () => void;
}) {
  const [salary, setSalary] = useState("");
  const setPaymentMutation = useSetEmployeePayment();

  useEffect(() => {
    if (employee) setSalary(String(employee.monthlyPayment));
  }, [employee]);

  const handleSave = async () => {
    if (!employee) return;
    const s = Number(salary);
    if (!s || s < 1) {
      toast.error("Enter a valid salary.");
      return;
    }
    try {
      await setPaymentMutation.mutateAsync({
        employeeId: employee.employeeId,
        payment: BigInt(s),
      });
      toast.success("Salary updated.");
      onClose();
    } catch {
      toast.error("Update failed.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent data-ocid="edit_salary.dialog">
        <DialogHeader>
          <DialogTitle>Edit Salary</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            {employee?.name} ({employee?.employeeId})
          </p>
          <div>
            <Label>Monthly Salary (₹)</Label>
            <Input
              data-ocid="edit_salary.input"
              type="number"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              min="1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            data-ocid="edit_salary.cancel_button"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            data-ocid="edit_salary.save_button"
            onClick={handleSave}
            disabled={setPaymentMutation.isPending}
          >
            {setPaymentMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Registered Employees Tab ──────────────────────────────────────────────────
function RegisteredTab() {
  const { data: employees = [], isLoading } = useAllEmployees();
  const rejectMutation = useRejectEmployee();
  const deleteMutation = useDeleteEmployee();
  const [approveTarget, setApproveTarget] = useState<Employee | null>(null);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  const handleReject = async (emp: Employee) => {
    try {
      await rejectMutation.mutateAsync(emp.employeeId);
      toast.success(`${emp.name} rejected.`);
    } catch {
      toast.error("Rejection failed.");
    }
  };

  if (isLoading)
    return (
      <div data-ocid="employees.loading_state">
        <Skeleton className="h-48 w-full" />
      </div>
    );

  return (
    <div>
      <ApproveDialog
        employee={approveTarget}
        open={!!approveTarget}
        onClose={() => setApproveTarget(null)}
      />
      <EditSalaryDialog
        employee={editTarget}
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
      />
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <DialogContent data-ocid="delete_employee.dialog">
          <DialogHeader>
            <DialogTitle>Remove Employee</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to remove{" "}
            <strong>{deleteTarget?.name}</strong> (ID:{" "}
            {deleteTarget?.employeeId})? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              data-ocid="delete_employee.cancel_button"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              data-ocid="delete_employee.confirm_button"
              onClick={async () => {
                if (!deleteTarget) return;
                try {
                  await deleteMutation.mutateAsync(deleteTarget.employeeId);
                  toast.success("Employee removed.");
                } catch {
                  toast.error("Failed to remove employee.");
                }
                setDeleteTarget(null);
              }}
            >
              <Trash2 className="w-4 h-4 mr-1" /> Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {employees.length === 0 ? (
        <div
          data-ocid="employees.empty_state"
          className="text-center py-12 text-muted-foreground"
        >
          <p>No employees registered yet.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Salary</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((emp, idx) => (
              <TableRow
                key={emp.employeeId}
                data-ocid={`employees.item.${idx + 1}`}
              >
                <TableCell className="font-medium">{emp.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {emp.employeeId}
                </TableCell>
                <TableCell>{emp.department}</TableCell>
                <TableCell>
                  ₹{Number(emp.monthlyPayment).toLocaleString()}
                </TableCell>
                <TableCell>
                  {emp.approvalStatus === "approved" && (
                    <Badge className="bg-success/10 text-success border-success/30">
                      Approved
                    </Badge>
                  )}
                  {emp.approvalStatus === "pending" && (
                    <Badge
                      variant="outline"
                      className="text-amber-600 border-amber-300"
                    >
                      Pending
                    </Badge>
                  )}
                  {emp.approvalStatus === "rejected" && (
                    <Badge variant="destructive">Rejected</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {emp.approvalStatus === "pending" && (
                      <>
                        <Button
                          size="sm"
                          data-ocid={`employees.approve.primary_button.${idx + 1}`}
                          onClick={() => setApproveTarget(emp)}
                          className="h-7 text-xs"
                        >
                          <UserCheck className="w-3 h-3 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          data-ocid={`employees.reject.secondary_button.${idx + 1}`}
                          onClick={() => handleReject(emp)}
                          className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                        >
                          <UserX className="w-3 h-3 mr-1" /> Reject
                        </Button>
                      </>
                    )}
                    {emp.approvalStatus === "approved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        data-ocid={`employees.edit.edit_button.${idx + 1}`}
                        onClick={() => setEditTarget(emp)}
                        className="h-7 text-xs"
                      >
                        <Edit3 className="w-3 h-3 mr-1" /> Salary
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      data-ocid={`employees.delete_button.${idx + 1}`}
                      onClick={() => setDeleteTarget(emp)}
                      className="h-7 text-xs"
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Remove
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ─── Mark Attendance Tab ───────────────────────────────────────────────────────
function MarkAttendanceTab() {
  const { data: employees = [], isLoading } = useAllEmployees();
  const markMutation = useMarkAttendance();
  const { actor } = useActor();

  const approvedEmployees = employees.filter(
    (e) => e.approvalStatus === "approved",
  );

  const handleAttendanceMarked = useCallback(
    async (employeeId: string, employeeName: string) => {
      const today = getTodayDate();
      const now = new Date();
      const checkInTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

      // Check for duplicate attendance
      try {
        if (actor) {
          const alreadyMarked = await actor.checkIfAttendanceMarkedToday(
            employeeId,
            today,
          );
          if (alreadyMarked) {
            toast.error(`${employeeName} already checked in today`);
            return;
          }
        }
        const success = await markMutation.mutateAsync({
          name: employeeName,
          employeeId,
          date: today,
          checkInTime,
          photoData: "",
        });
        if (success) {
          toast.success(
            `Attendance marked for ${employeeName} at ${checkInTime}`,
          );
        } else {
          toast.error(`Could not mark attendance for ${employeeName}`);
        }
      } catch {
        toast.error(`Failed to mark attendance for ${employeeName}`);
      }
    },
    [actor, markMutation],
  );

  if (isLoading)
    return <Skeleton className="h-48 w-full" data-ocid="mark.loading_state" />;

  return (
    <FaceDetectionCamera
      employees={approvedEmployees}
      onAttendanceMarked={handleAttendanceMarked}
    />
  );
}

// ─── Attendance Overview Tab ───────────────────────────────────────────────────
function AttendanceOverviewTab() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [deptFilter, setDeptFilter] = useState("all");
  const { data: report = [], isLoading } = useMonthEndReport(month);
  const { data: holidays = [] } = useHolidays();

  const holidayDates = new Set(holidays.map((h) => h.date));
  const workingDays = countWorkingDaysExcludingSundays(month, holidayDates);

  const filtered: MonthEndReport[] = report.filter(
    (r) => deptFilter === "all" || r.department === deptFilter,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Input
          data-ocid="overview.month.input"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-40"
        />
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger
            data-ocid="overview.department.select"
            className="w-40"
          >
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            <SelectItem value="Driver">Driver</SelectItem>
            <SelectItem value="Office">Office</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">
        Working days in {month}: <strong>{workingDays}</strong> (excluding
        Sundays &amp; holidays)
      </p>

      {isLoading ? (
        <Skeleton className="h-48 w-full" data-ocid="overview.loading_state" />
      ) : filtered.length === 0 ? (
        <div
          data-ocid="overview.empty_state"
          className="text-center py-10 text-muted-foreground"
        >
          No data found for the selected filters.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Dept</TableHead>
              <TableHead>Present</TableHead>
              <TableHead>Salary</TableHead>
              <TableHead>Earned</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row, idx) => (
              <TableRow
                key={row.employeeId}
                data-ocid={`overview.item.${idx + 1}`}
              >
                <TableCell className="font-medium">
                  {row.employeeName}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {row.employeeId}
                </TableCell>
                <TableCell>{row.department}</TableCell>
                <TableCell>{String(row.presentDays)} days</TableCell>
                <TableCell>
                  ₹{Number(row.monthlyPayment).toLocaleString()}
                </TableCell>
                <TableCell className="font-semibold text-success">
                  ₹{Number(row.earnedAmount).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ─── Holidays Tab ──────────────────────────────────────────────────────────────
function HolidaysTab() {
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const { data: holidays = [], isLoading } = useHolidays();
  const addMutation = useAddHoliday();
  const removeMutation = useRemoveHoliday();

  const handleAdd = async () => {
    if (!date || !reason.trim()) {
      toast.error("Enter date and reason.");
      return;
    }
    try {
      await addMutation.mutateAsync({ date, reason });
      toast.success("Holiday added.");
      setDate("");
      setReason("");
    } catch {
      toast.error("Failed to add holiday.");
    }
  };

  const handleRemove = async (d: string) => {
    try {
      await removeMutation.mutateAsync(d);
      toast.success("Holiday removed.");
    } catch {
      toast.error("Failed to remove holiday.");
    }
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Add Holiday</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input
              data-ocid="holiday.date.input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-44"
            />
            <Input
              data-ocid="holiday.reason.input"
              placeholder="Holiday reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="flex-1 min-w-32"
            />
            <Button
              data-ocid="holiday.add.primary_button"
              onClick={handleAdd}
              disabled={addMutation.isPending}
            >
              {addMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Add Holiday"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="h-32 w-full" data-ocid="holidays.loading_state" />
      ) : holidays.length === 0 ? (
        <div
          data-ocid="holidays.empty_state"
          className="text-center py-8 text-muted-foreground"
        >
          No holidays added yet.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holidays.map((h, idx) => (
              <TableRow key={h.date} data-ocid={`holidays.item.${idx + 1}`}>
                <TableCell className="font-medium">{h.date}</TableCell>
                <TableCell>{h.reason}</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    data-ocid={`holidays.delete_button.${idx + 1}`}
                    onClick={() => handleRemove(h.date)}
                    className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                    disabled={removeMutation.isPending}
                  >
                    <Trash2 className="w-3 h-3 mr-1" /> Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ─── Manager Portal ────────────────────────────────────────────────────────────
export default function ManagerPortalPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  if (!isLoggedIn) {
    return <LoginScreen onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
            Manager Portal
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage employees, attendance, and payroll
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          data-ocid="manager.logout.secondary_button"
          onClick={() => setIsLoggedIn(false)}
          className="text-xs"
        >
          <XCircle className="w-3 h-3 mr-1" /> Logout
        </Button>
      </div>

      <Tabs defaultValue="register">
        <TabsList className="mb-6 flex flex-wrap h-auto gap-1 bg-muted p-1 rounded-xl">
          <TabsTrigger data-ocid="manager.register.tab" value="register">
            Register Employee
          </TabsTrigger>
          <TabsTrigger data-ocid="manager.employees.tab" value="employees">
            Registered Employees
          </TabsTrigger>
          <TabsTrigger data-ocid="manager.mark.tab" value="mark">
            Mark Attendance
          </TabsTrigger>
          <TabsTrigger data-ocid="manager.overview.tab" value="overview">
            Attendance View
          </TabsTrigger>
          <TabsTrigger data-ocid="manager.holidays.tab" value="holidays">
            Holidays
          </TabsTrigger>
        </TabsList>

        <TabsContent value="register">
          <Card className="shadow-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-extrabold">
                Register New Employee
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RegisterTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employees">
          <Card className="shadow-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-extrabold">
                Registered Employees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RegisteredTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mark">
          <Card className="shadow-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-extrabold">
                Mark Daily Attendance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MarkAttendanceTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview">
          <Card className="shadow-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-extrabold">
                Attendance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AttendanceOverviewTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="holidays">
          <Card className="shadow-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-extrabold">
                Holiday Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HolidaysTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
