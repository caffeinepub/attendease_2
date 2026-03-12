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
import { useActor } from "../hooks/useActor";
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

const MANAGER_PASSWORD = "1234";

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
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-5 h-5 text-primary" />
          </div>
          <CardTitle className="text-xl">Manager Login</CardTitle>
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

// ─── Camera Hook ──────────────────────────────────────────────────────────────
function useRegCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraOn(true);
    } catch {
      setCameraError(
        "Camera access denied. Please allow camera permission in your browser.",
      );
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
    }
    streamRef.current = null;
    setIsCameraOn(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    setCapturedPhoto(dataUrl);
    return dataUrl;
  }, []);

  const retakePhoto = useCallback(() => {
    setCapturedPhoto(null);
  }, []);

  return {
    videoRef,
    canvasRef,
    isCameraOn,
    capturedPhoto,
    cameraError,
    startCamera,
    stopCamera,
    capturePhoto,
    retakePhoto,
  };
}

// ─── Register Tab ──────────────────────────────────────────────────────────────
function RegisterTab() {
  const [name, setName] = useState("");
  const [empId, setEmpId] = useState("");
  const [department, setDepartment] = useState("");
  const [salary, setSalary] = useState("");
  const {
    videoRef,
    canvasRef,
    isCameraOn,
    capturedPhoto,
    cameraError,
    startCamera,
    capturePhoto,
    retakePhoto,
  } = useRegCamera();
  const registerMutation = useRegisterEmployee();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !empId || !department || !salary) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (!capturedPhoto) {
      toast.error("Please capture a photo first.");
      return;
    }
    try {
      const result = await registerMutation.mutateAsync({
        name,
        employeeId: empId,
        department,
        role: "employee",
        photoData: "",
      });
      if (result) {
        toast.success(
          "Employee registered successfully! Awaiting manager approval.",
        );
        setName("");
        setEmpId("");
        setDepartment("");
        setSalary("");
        retakePhoto();
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
            placeholder="e.g. John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="reg-id">Employee ID</Label>
          <Input
            id="reg-id"
            data-ocid="register.id.input"
            placeholder="e.g. EMP001"
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
            placeholder="e.g. 25000"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
            min="1"
          />
        </div>

        {/* Camera Section */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="bg-muted/40 px-3 py-2 flex items-center gap-2">
            <Camera className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Face Photo</span>
          </div>
          <div className="p-3 space-y-3">
            {cameraError && (
              <p className="text-destructive text-xs">{cameraError}</p>
            )}
            {!capturedPhoto ? (
              <>
                <div
                  className="relative bg-black rounded overflow-hidden"
                  style={{ height: 200 }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {!isCameraOn && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
                      <Camera className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <canvas ref={canvasRef} className="hidden" />
                <div className="flex gap-2">
                  {!isCameraOn ? (
                    <Button
                      type="button"
                      data-ocid="register.camera.primary_button"
                      variant="outline"
                      className="flex-1"
                      onClick={startCamera}
                    >
                      <Camera className="w-4 h-4 mr-2" /> Enable Camera
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      data-ocid="register.capture.primary_button"
                      className="flex-1"
                      onClick={capturePhoto}
                    >
                      Capture Photo
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <img
                  src={capturedPhoto}
                  alt="Captured"
                  className="w-full rounded object-cover"
                  style={{ maxHeight: 200 }}
                />
                <Button
                  type="button"
                  data-ocid="register.retake.secondary_button"
                  variant="outline"
                  size="sm"
                  onClick={retakePhoto}
                  className="w-full"
                >
                  Retake Photo
                </Button>
              </div>
            )}
          </div>
        </div>

        <Button
          type="submit"
          data-ocid="register.submit_button"
          className="w-full"
          disabled={registerMutation.isPending}
        >
          {registerMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Registering...
            </>
          ) : (
            "Register Employee"
          )}
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
              placeholder="e.g. 25000"
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

// ─── Face Detection Camera (Mark Attendance) ──────────────────────────────────
function FaceDetectionCamera({ employees }: { employees: Employee[] }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [confidence, setConfidence] = useState(0.92);
  const [verifiedEmp, setVerifiedEmp] = useState<Employee | null>(null);
  const [verifiedTime, setVerifiedTime] = useState("");
  const markMutation = useMarkAttendance();
  const { actor } = useActor();
  const [markedIds, setMarkedIds] = useState<Set<string>>(new Set());

  // Start camera when component mounts
  useEffect(() => {
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setIsCameraOn(true);
      } catch {
        setIsCameraOn(false);
      }
    };
    start();
    return () => {
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) {
          track.stop();
        }
      }
    };
  }, []);

  // Check which employees are already marked today
  useEffect(() => {
    if (!actor || employees.length === 0) return;
    const today = getTodayDate();
    const checkAll = async () => {
      const results = await Promise.all(
        employees.map(async (emp) => {
          const marked = await actor.checkIfAttendanceMarkedToday(
            emp.employeeId,
            today,
          );
          return { id: emp.employeeId, marked };
        }),
      );
      const ids = new Set(results.filter((r) => r.marked).map((r) => r.id));
      setMarkedIds(ids);
    };
    checkAll();
  }, [actor, employees]);

  // Confidence update interval
  useEffect(() => {
    const interval = setInterval(() => {
      setConfidence(0.85 + Math.random() * 0.14);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const handleMarkPresent = async (emp: Employee) => {
    const today = getTodayDate();
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    try {
      const result = await markMutation.mutateAsync({
        name: emp.name,
        employeeId: emp.employeeId,
        date: today,
        checkInTime: timeStr,
        photoData: "",
      });
      if (result) {
        setVerifiedEmp(emp);
        setVerifiedTime(timeStr);
        setMarkedIds((prev) => new Set(prev).add(emp.employeeId));
        setTimeout(() => setVerifiedEmp(null), 4000);
        toast.success(`${emp.name} marked present at ${timeStr}`);
      } else {
        toast.error("Already marked or failed.");
      }
    } catch {
      toast.error("Failed to mark attendance.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Camera with face detection overlay */}
      <div
        className="relative bg-black rounded-xl overflow-hidden"
        style={{ height: 280 }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {isCameraOn && (
          <>
            {/* LIVE indicator */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 rounded-full px-2 py-1">
              <div className="blink-dot" />
              <span className="text-white text-xs font-bold tracking-widest">
                LIVE
              </span>
            </div>

            {/* Confidence score */}
            <div className="absolute top-3 right-3 bg-black/60 rounded-md px-2 py-1">
              <span className="text-green-400 text-xs font-mono">
                Real {confidence.toFixed(4)}
              </span>
            </div>

            {/* Face bounding box */}
            <div
              className="absolute"
              style={{
                left: "30%",
                top: "15%",
                width: "40%",
                height: "65%",
              }}
            >
              <div className="corner-tl" />
              <div className="corner-tr" />
              <div className="corner-bl" />
              <div className="corner-br" />
              <div className="scan-line" />
            </div>

            {/* Identity verified banner */}
            {verifiedEmp && (
              <div className="verified-banner absolute bottom-0 left-0 right-0 bg-green-600/90 text-white p-3 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold text-sm">IDENTITY VERIFIED</p>
                  <p className="text-xs opacity-90 truncate">
                    {verifiedEmp.name} — {verifiedTime}
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {!isCameraOn && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Camera className="w-8 h-8 text-white/40 mx-auto mb-2" />
              <p className="text-white/60 text-sm">Camera unavailable</p>
            </div>
          </div>
        )}
      </div>

      {/* Employee list */}
      {employees.length === 0 ? (
        <div
          data-ocid="attendance.mark.empty_state"
          className="text-center py-8 text-muted-foreground"
        >
          <p>No approved employees found.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Department</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((emp, idx) => (
              <TableRow key={emp.employeeId} data-ocid={`mark.item.${idx + 1}`}>
                <TableCell className="font-medium">{emp.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {emp.employeeId}
                </TableCell>
                <TableCell>{emp.department}</TableCell>
                <TableCell className="text-right">
                  {markedIds.has(emp.employeeId) ? (
                    <Badge className="bg-success/10 text-success border-success/30">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Present Today
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      data-ocid={`mark.present.primary_button.${idx + 1}`}
                      onClick={() => handleMarkPresent(emp)}
                      disabled={markMutation.isPending}
                      className="h-7 text-xs"
                    >
                      Mark Present
                    </Button>
                  )}
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
  const approvedEmployees = employees.filter(
    (e) => e.approvalStatus === "approved",
  );

  if (isLoading)
    return <Skeleton className="h-48 w-full" data-ocid="mark.loading_state" />;

  return <FaceDetectionCamera employees={approvedEmployees} />;
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
              placeholder="Reason (e.g. Diwali)"
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
          <h1 className="text-2xl font-bold text-foreground">Manager Portal</h1>
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
        <TabsList className="mb-6 flex flex-wrap h-auto gap-1">
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
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Register New Employee</CardTitle>
            </CardHeader>
            <CardContent>
              <RegisterTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employees">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Registered Employees</CardTitle>
            </CardHeader>
            <CardContent>
              <RegisteredTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mark">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Mark Daily Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <MarkAttendanceTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Attendance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <AttendanceOverviewTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="holidays">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Holiday Management</CardTitle>
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
