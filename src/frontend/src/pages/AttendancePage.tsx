import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  Camera,
  CheckCircle,
  Clock,
  Loader2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import CameraSection from "../components/CameraSection";
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

  const { mutateAsync: markAttendance, isPending } = useMarkAttendance();
  const checkToday = useCheckAttendanceToday();
  const getApprovalStatus = useGetApprovalStatus();

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!name.trim()) newErrors.name = "Employee name is required";
    if (!employeeId.trim()) newErrors.employeeId = "Employee ID is required";
    if (!photoData) {
      newErrors.photo =
        "Photo is required. Please capture a photo to mark attendance.";
      toast.error("Photo is required", {
        description: "Please capture a photo to mark attendance.",
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
      // Check approval status first
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

      // Check duplicate
      const alreadyMarked = await checkToday(employeeId.trim());
      if (alreadyMarked) {
        toast.error("Attendance already marked", {
          description: `${name} has already checked in today (${today}).`,
        });
        return;
      }

      // Mark attendance
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
      } else {
        toast.error("Employee not found", {
          description:
            "Please verify the name and ID match a registered employee.",
        });
      }
    } catch {
      setIsCheckingApproval(false);
      setApprovalState("idle");
      toast.error("Something went wrong", {
        description: "Please try again.",
      });
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
            Record your check-in for today
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

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-section space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
                <p className="text-xs text-destructive">{errors.employeeId}</p>
              )}
            </div>
          </div>

          {/* Camera */}
          <div className="pt-2 border-t border-border">
            <CameraSection
              capturedImage={photoData}
              onCapture={(img) => {
                setPhotoData(img);
                if (errors.photo)
                  setErrors((p) => ({ ...p, photo: undefined }));
              }}
              onClear={() => setPhotoData(null)}
              cameraButtonOcid="attendance.camera_button"
              captureButtonOcid="attendance.capture_button"
              required={true}
              photoError={errors.photo}
            />
          </div>

          {/* Today info */}
          <div
            className="flex items-center gap-2 p-3 rounded-lg text-sm"
            style={{ background: "oklch(var(--navy) / 0.04)" }}
          >
            <CheckCircle size={14} style={{ color: "oklch(var(--gold))" }} />
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
      </form>
    </div>
  );
}
