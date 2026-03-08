import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import CameraSection from "../components/CameraSection";
import { useActor } from "../hooks/useActor";
import { useRegisterEmployee } from "../hooks/useQueries";

const DEPARTMENTS = ["Driver", "Office", "Other"];

interface FormErrors {
  name?: string;
  employeeId?: string;
  department?: string;
  role?: string;
  photo?: string;
}

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("");
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showSuccess, setShowSuccess] = useState(false);

  const { actor, isFetching: isActorLoading } = useActor();
  const { mutateAsync: registerEmployee, isPending } = useRegisterEmployee();

  // Debug: log when actor becomes available so we know the connection state
  useEffect(() => {
    if (actor) {
      console.log(
        "[RegisterPage] Actor is ready — backend connection established.",
      );
    } else if (!isActorLoading) {
      console.warn(
        "[RegisterPage] Actor is null and not loading — backend may be unavailable.",
      );
    }
  }, [actor, isActorLoading]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!name.trim()) newErrors.name = "Employee name is required";
    if (!employeeId.trim()) newErrors.employeeId = "Employee ID is required";
    if (!department) newErrors.department = "Please select a department";
    if (!role.trim()) newErrors.role = "Role / job title is required";
    if (!photoData) {
      newErrors.photo =
        "Photo is required. Please capture a photo before submitting.";
      toast.error("Photo is required", {
        description: "Please capture a photo before submitting.",
      });
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (!actor) {
      toast.error("Connecting to server...", {
        description: "Please wait a moment and try again.",
      });
      return;
    }

    try {
      const attemptRegister = async (retryCount = 0): Promise<boolean> => {
        try {
          return await registerEmployee({
            name: name.trim(),
            employeeId: employeeId.trim(),
            department,
            role: role.trim(),
            photoData: "",
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          const isIcErr =
            msg.includes("IC0") ||
            msg.includes("canister") ||
            msg.includes("reject");
          if (isIcErr && retryCount === 0) {
            toast.info("Retrying connection...", {
              description: "First attempt failed, trying once more.",
            });
            await new Promise((r) => setTimeout(r, 2000));
            return attemptRegister(1);
          }
          throw err;
        }
      };
      const success = await attemptRegister();

      if (success) {
        setShowSuccess(true);
        toast.success(`Registration submitted for "${name}"!`, {
          description: "Your registration is pending manager approval.",
        });
        // Reset
        setName("");
        setEmployeeId("");
        setDepartment("");
        setRole("");
        setPhotoData(null);
        setErrors({});
        setTimeout(() => setShowSuccess(false), 8000);
      } else {
        // success === false means the backend rejected the request (e.g. duplicate ID)
        console.warn(
          "[RegisterPage] Registration returned false — possible duplicate employee ID:",
          employeeId,
        );
        toast.error("Registration failed — ID already exists", {
          description: `An employee with ID "${employeeId}" may already be registered. Please use a different Employee ID.`,
        });
      }
    } catch (error) {
      console.error("[RegisterPage] Registration error:", error);
      // IC errors (IC0508 canister stopped, IC0503 overloaded, etc.) contain
      // raw JSON that is confusing for users — show a friendly message instead.
      const rawMessage =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "";
      const isIcError =
        rawMessage.includes("IC0") ||
        rawMessage.includes("canister") ||
        rawMessage.includes("reject") ||
        rawMessage.includes("non_replicated");
      const friendlyMessage = isIcError
        ? "The server is temporarily unavailable. Please wait a few seconds and try again."
        : rawMessage || "An unexpected error occurred. Please try again.";
      toast.error("Registration failed", {
        description: friendlyMessage,
      });
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "oklch(var(--navy))" }}
        >
          <UserPlus size={18} className="text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">
            Register Employee
          </h2>
          <p className="text-sm text-muted-foreground">
            Add a new employee to the system
          </p>
        </div>
      </div>

      {/* Pending Approval Banner */}
      {showSuccess && (
        <div
          className="flex items-start gap-3 p-4 rounded-xl mb-6 border animate-fade-in"
          style={{
            background: "oklch(0.97 0.02 85)",
            borderColor: "oklch(0.75 0.12 85 / 0.5)",
          }}
          data-ocid="register.success_state"
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: "oklch(0.75 0.12 85 / 0.2)" }}
          >
            <span style={{ color: "oklch(0.55 0.12 85)" }}>⏳</span>
          </div>
          <div>
            <p
              className="text-sm font-semibold"
              style={{ color: "oklch(0.45 0.1 85)" }}
            >
              Registration submitted — Pending Manager Approval
            </p>
            <p
              className="text-xs mt-0.5"
              style={{ color: "oklch(0.55 0.08 85)" }}
            >
              Your registration request has been submitted. You will be able to
              mark attendance once a manager approves your profile.
            </p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-section space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Employee Name */}
            <div className="space-y-1.5">
              <Label htmlFor="reg-name" className="text-sm font-semibold">
                Employee Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="reg-name"
                type="text"
                placeholder="Enter full name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name)
                    setErrors((p) => ({ ...p, name: undefined }));
                }}
                className={
                  errors.name
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }
                data-ocid="register.name_input"
              />
              {errors.name && (
                <p
                  className="text-xs text-destructive"
                  data-ocid="register.error_state"
                >
                  {errors.name}
                </p>
              )}
            </div>

            {/* Employee ID */}
            <div className="space-y-1.5">
              <Label htmlFor="reg-id" className="text-sm font-semibold">
                Employee ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="reg-id"
                type="text"
                placeholder="Enter employee ID"
                value={employeeId}
                onChange={(e) => {
                  setEmployeeId(e.target.value);
                  if (errors.employeeId)
                    setErrors((p) => ({ ...p, employeeId: undefined }));
                }}
                className={
                  errors.employeeId
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }
                data-ocid="register.id_input"
              />
              {errors.employeeId && (
                <p className="text-xs text-destructive">{errors.employeeId}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Department */}
            <div className="space-y-1.5">
              <Label htmlFor="reg-dept" className="text-sm font-semibold">
                Department <span className="text-destructive">*</span>
              </Label>
              <Select
                value={department}
                onValueChange={(v) => {
                  setDepartment(v);
                  if (errors.department)
                    setErrors((p) => ({ ...p, department: undefined }));
                }}
              >
                <SelectTrigger
                  id="reg-dept"
                  className={errors.department ? "border-destructive" : ""}
                  data-ocid="register.department_select"
                >
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.department && (
                <p className="text-xs text-destructive">{errors.department}</p>
              )}
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <Label htmlFor="reg-role" className="text-sm font-semibold">
                Role / Job Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="reg-role"
                type="text"
                placeholder="Enter role or job title"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  if (errors.role)
                    setErrors((p) => ({ ...p, role: undefined }));
                }}
                className={
                  errors.role
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }
                data-ocid="register.role_input"
              />
              {errors.role && (
                <p className="text-xs text-destructive">{errors.role}</p>
              )}
            </div>
          </div>

          {/* Camera section */}
          <div className="pt-2 border-t border-border">
            <CameraSection
              capturedImage={photoData}
              onCapture={(img) => {
                setPhotoData(img);
                if (errors.photo)
                  setErrors((p) => ({ ...p, photo: undefined }));
              }}
              onClear={() => setPhotoData(null)}
              captureButtonOcid="register.capture_button"
              required={true}
              photoError={errors.photo}
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={isPending || isActorLoading || !actor}
              className="w-full sm:w-auto h-11 font-semibold px-8"
              style={{
                background:
                  isPending || isActorLoading
                    ? undefined
                    : "oklch(var(--navy))",
                color: "white",
              }}
              data-ocid="register.submit_button"
            >
              {isActorLoading ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Connecting...
                </>
              ) : isPending ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <UserPlus size={16} className="mr-2" />
                  Register Employee
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
