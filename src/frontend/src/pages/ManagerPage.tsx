import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
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
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CalendarOff,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  Search,
  Shield,
  Trash2,
  TrendingUp,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { AttendanceRecord } from "../backend.d";
import {
  getCurrentMonth,
  getTodayDate,
  useAddHoliday,
  useAllAttendance,
  useAllEmployees,
  useApproveEmployee,
  useDeleteEmployee,
  useHolidays,
  useMonthEndReport,
  useRejectEmployee,
  useRemoveHoliday,
  useStats,
} from "../hooks/useQueries";

const MANAGER_PIN = "1234";
const DEPARTMENTS = ["All", "Driver", "Office", "Other"];

function formatTime(timeStr: string): string {
  try {
    const parts = timeStr.split(":");
    if (parts.length >= 2) {
      const h = Number.parseInt(parts[0]);
      const m = parts[1];
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 || 12;
      return `${h12}:${m} ${ampm}`;
    }
    return timeStr;
  } catch {
    return timeStr;
  }
}

function downloadCSV(records: AttendanceRecord[]) {
  const headers = [
    "Employee Name",
    "Employee ID",
    "Department",
    "Date",
    "Check-in Time",
    "Status",
  ];
  const rows = records.map((r) => [
    `"${r.employeeName}"`,
    `"${r.employeeId}"`,
    `"${r.department}"`,
    `"${r.date}"`,
    `"${r.checkInTime}"`,
    `"${r.status}"`,
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join(
    "\n",
  );
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `attendease-report-${getTodayDate()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── PIN Gate ──────────────────────────────────────────────
function PinGate({ onSuccess }: { onSuccess: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 400));
    if (pin === MANAGER_PIN) {
      onSuccess();
    } else {
      setError("Incorrect PIN. Please try again.");
      setPin("");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="pin-gate min-h-full flex items-center justify-center p-6">
      <div
        className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-2xl animate-fade-in-scale"
        data-ocid="manager.pin_dialog"
      >
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "oklch(var(--navy))" }}
          >
            <Shield size={28} className="text-white" />
          </div>
          <h2 className="text-xl font-display font-bold text-foreground">
            Manager Dashboard
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your PIN to access
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="manager-pin" className="text-sm font-semibold">
              Access PIN
            </Label>
            <Input
              id="manager-pin"
              type="password"
              placeholder="Enter 4-digit PIN"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                if (error) setError("");
              }}
              className={`text-center text-xl tracking-widest ${error ? "border-destructive" : ""}`}
              maxLength={4}
              inputMode="numeric"
              data-ocid="manager.pin_input"
            />
            {error && (
              <div
                className="flex items-center gap-1.5 text-xs text-destructive"
                data-ocid="manager.pin_error"
              >
                <AlertTriangle size={12} />
                {error}
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={pin.length !== 4 || isSubmitting}
            className="w-full h-11 font-semibold"
            style={{ background: "oklch(var(--navy))", color: "white" }}
            data-ocid="manager.pin_submit"
          >
            {isSubmitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              "Unlock Dashboard"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

// ── Status Badge ───────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === "approved") {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 font-semibold text-xs">
        <CheckCircle2 size={11} className="mr-1" />
        Approved
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border border-red-200 font-semibold text-xs">
        <XCircle size={11} className="mr-1" />
        Rejected
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border border-amber-200 font-semibold text-xs">
      <Clock size={11} className="mr-1" />
      Pending
    </Badge>
  );
}

// ── Photo Avatar ──────────────────────────────────────────
function PhotoAvatar({ photoData, name }: { photoData: string; name: string }) {
  if (photoData && photoData.length > 0) {
    return (
      <img
        src={photoData}
        alt={name}
        className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-border"
      />
    );
  }
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
      style={{ background: "oklch(var(--navy))" }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ── Registered IDs Tab ────────────────────────────────────
function RegisteredIdsTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: employees, isLoading } = useAllEmployees();
  const { mutateAsync: approveEmployee, isPending: isApproving } =
    useApproveEmployee();
  const { mutateAsync: rejectEmployee, isPending: isRejecting } =
    useRejectEmployee();
  const { mutateAsync: deleteEmployee, isPending: isDeleting } =
    useDeleteEmployee();

  const filtered = useMemo(() => {
    if (!employees) return [];
    let result = [...employees];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.employeeId.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((e) => e.approvalStatus === statusFilter);
    }
    return result;
  }, [employees, searchQuery, statusFilter]);

  const handleApprove = async (employeeId: string, name: string) => {
    try {
      const success = await approveEmployee(employeeId);
      if (success) {
        toast.success(`${name} approved`, {
          description: "Employee can now mark attendance.",
        });
      } else {
        toast.error("Could not approve employee");
      }
    } catch {
      toast.error("Something went wrong");
    }
  };

  const handleReject = async (employeeId: string, name: string) => {
    try {
      const success = await rejectEmployee(employeeId);
      if (success) {
        toast.success(`${name} rejected`, {
          description: "Employee registration was rejected.",
        });
      } else {
        toast.error("Could not reject employee");
      }
    } catch {
      toast.error("Something went wrong");
    }
  };

  const handleDelete = async (employeeId: string, name: string) => {
    try {
      const success = await deleteEmployee(employeeId);
      if (success) {
        toast.success(`"${name}" removed`, {
          description: "All associated records have been deleted.",
        });
      } else {
        toast.error("Could not remove employee");
      }
    } catch {
      toast.error("Something went wrong");
    }
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="form-section">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="text"
              placeholder="Search name, ID, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-ocid="manager.search_input"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger data-ocid="manager.status_select">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {filtered.length} employee{filtered.length !== 1 ? "s" : ""} shown
        </p>
      </div>

      {/* Table */}
      <div
        className="bg-white rounded-xl border border-border overflow-hidden shadow-card"
        data-ocid="manager.employees_table"
      >
        {isLoading ? (
          <div className="p-6 space-y-3" data-ocid="manager.loading_state">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 px-6 text-center"
            data-ocid="manager.employees_table.empty_state"
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "oklch(var(--navy) / 0.06)" }}
            >
              <Users size={24} style={{ color: "oklch(var(--navy) / 0.4)" }} />
            </div>
            <p className="text-base font-semibold text-foreground mb-1">
              No employees found
            </p>
            <p className="text-sm text-muted-foreground">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your search or filter."
                : "No employees have registered yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="data-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((employee, idx) => (
                  <TableRow
                    key={employee.employeeId}
                    data-ocid={`manager.employees_table.row.${idx + 1}`}
                  >
                    <TableCell className="font-medium text-sm">
                      <div className="flex items-center gap-2">
                        <PhotoAvatar
                          photoData={employee.photoData}
                          name={employee.name}
                        />
                        <span>{employee.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">
                      {employee.employeeId}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {employee.department}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {employee.role}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {employee.registeredAt
                        ? new Date(employee.registeredAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={employee.approvalStatus} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {employee.approvalStatus === "pending" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                              disabled={isApproving || isRejecting}
                              onClick={() =>
                                handleApprove(
                                  employee.employeeId,
                                  employee.name,
                                )
                              }
                              data-ocid={`manager.approve_button.${idx + 1}`}
                            >
                              {isApproving ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Check size={13} />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-red-700 hover:text-red-800 hover:bg-red-50"
                              disabled={isApproving || isRejecting}
                              onClick={() =>
                                handleReject(employee.employeeId, employee.name)
                              }
                              data-ocid={`manager.reject_button.${idx + 1}`}
                            >
                              {isRejecting ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <X size={13} />
                              )}
                            </Button>
                          </>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                              disabled={isDeleting}
                              data-ocid={`manager.delete_button.${idx + 1}`}
                            >
                              <Trash2 size={13} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent data-ocid="manager.dialog">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2">
                                <AlertTriangle
                                  size={18}
                                  className="text-destructive"
                                />
                                Delete Employee
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove{" "}
                                <strong>{employee.name}</strong> (
                                {employee.employeeId}) and all their attendance
                                records. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel data-ocid="manager.cancel_button">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleDelete(
                                    employee.employeeId,
                                    employee.name,
                                  )
                                }
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                data-ocid="manager.confirm_button"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Attendance View Tab ───────────────────────────────────
function AttendanceViewTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: attendance, isLoading } = useAllAttendance();
  const { data: holidays } = useHolidays();

  const holidayDates = useMemo(() => {
    if (!holidays) return new Set<string>();
    return new Set(holidays.map((h) => h.date));
  }, [holidays]);

  const filtered = useMemo(() => {
    if (!attendance) return [];
    let result = [...attendance];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.employeeName.toLowerCase().includes(q) ||
          r.employeeId.toLowerCase().includes(q),
      );
    }
    if (deptFilter !== "All") {
      result = result.filter((r) => r.department === deptFilter);
    }
    if (dateFrom) {
      result = result.filter((r) => r.date >= dateFrom);
    }
    if (dateTo) {
      result = result.filter((r) => r.date <= dateTo);
    }

    return result.sort((a, b) => b.date.localeCompare(a.date));
  }, [attendance, searchQuery, deptFilter, dateFrom, dateTo]);

  const handleExport = () => {
    downloadCSV(filtered);
    toast.success(`Exported ${filtered.length} records`, {
      description: `File: attendease-report-${getTodayDate()}.csv`,
    });
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="form-section">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="text"
                placeholder="Search name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-ocid="manager.search_input"
              />
            </div>
          </div>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger data-ocid="manager.department_select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            title="From date"
            className="text-sm"
            data-ocid="manager.date_from_input"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            title="To date"
            className="text-sm"
            data-ocid="manager.date_to_input"
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {filtered.length} record{filtered.length !== 1 ? "s" : ""} shown
          </p>
          <Button
            onClick={handleExport}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 font-semibold"
            data-ocid="manager.export_button"
          >
            <Download size={14} />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden shadow-card">
        {isLoading ? (
          <div className="p-6 space-y-3" data-ocid="manager.loading_state">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 px-6 text-center"
            data-ocid="manager.attendance_view.empty_state"
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "oklch(var(--navy) / 0.06)" }}
            >
              <CalendarDays
                size={24}
                style={{ color: "oklch(var(--navy) / 0.4)" }}
              />
            </div>
            <p className="text-base font-semibold text-foreground mb-1">
              No attendance records
            </p>
            <p className="text-sm text-muted-foreground">
              {searchQuery || deptFilter !== "All" || dateFrom || dateTo
                ? "Try adjusting your filters."
                : "No attendance has been marked yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="data-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Check-in Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((record, idx) => (
                  <TableRow
                    key={`${record.employeeId}-${record.date}-${idx}`}
                    data-ocid={`manager.attendance_view.row.${idx + 1}`}
                  >
                    <TableCell className="font-medium text-sm">
                      <div className="flex items-center gap-2">
                        <PhotoAvatar
                          photoData={record.photoData}
                          name={record.employeeName}
                        />
                        <span>{record.employeeName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">
                      {record.employeeId}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {record.department}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {record.date}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatTime(record.checkInTime)}
                    </TableCell>
                    <TableCell>
                      {holidayDates.has(record.date) ? (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border border-amber-200 font-semibold text-xs">
                          <CalendarOff size={10} className="mr-1" />
                          Holiday
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 font-semibold text-xs">
                          {record.status || "Present"}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Month-End Report Tab ──────────────────────────────────
function MonthEndReportTab() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  const { data: report, isLoading } = useMonthEndReport(selectedMonth);

  const totalPresent = report
    ? report.reduce((sum, r) => sum + Number(r.presentDays), 0)
    : 0;
  const totalAbsent = report
    ? report.reduce((sum, r) => sum + Number(r.absentDays), 0)
    : 0;

  const getAttendancePct = (present: bigint, total: bigint): number => {
    if (Number(total) === 0) return 0;
    return Math.round((Number(present) / Number(total)) * 100);
  };

  const getPctBadgeClass = (pct: number) => {
    if (pct >= 90) return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (pct >= 70) return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  return (
    <div className="space-y-5">
      {/* Month Picker */}
      <div className="form-section">
        <div className="flex items-center gap-4">
          <div className="space-y-1.5 flex-1 max-w-xs">
            <Label htmlFor="month-picker" className="text-sm font-semibold">
              Select Month
            </Label>
            <Input
              id="month-picker"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-sm"
              data-ocid="manager.month_select"
            />
          </div>
          {report && report.length > 0 && (
            <div className="flex gap-4 mt-6">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Avg Present</p>
                <p
                  className="text-lg font-display font-bold"
                  style={{ color: "oklch(0.55 0.17 145)" }}
                >
                  {totalPresent}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Avg Absent</p>
                <p className="text-lg font-display font-bold text-destructive">
                  {totalAbsent}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Report Table */}
      <div
        className="bg-white rounded-xl border border-border overflow-hidden shadow-card"
        data-ocid="manager.report_table"
      >
        {isLoading ? (
          <div
            className="p-6 space-y-3"
            data-ocid="manager.report_table.loading_state"
          >
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !report || report.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 px-6 text-center"
            data-ocid="manager.report_table.empty_state"
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "oklch(var(--navy) / 0.06)" }}
            >
              <BarChart3
                size={24}
                style={{ color: "oklch(var(--navy) / 0.4)" }}
              />
            </div>
            <p className="text-base font-semibold text-foreground mb-1">
              No report data
            </p>
            <p className="text-sm text-muted-foreground">
              No attendance records found for {selectedMonth}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="data-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Employee Name</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-center">Present Days</TableHead>
                  <TableHead className="text-center">Absent Days</TableHead>
                  <TableHead className="text-center">
                    Total Working Days
                  </TableHead>
                  <TableHead className="text-center">Attendance %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.map((row, idx) => {
                  const pct = getAttendancePct(
                    row.presentDays,
                    row.totalWorkingDays,
                  );
                  return (
                    <TableRow
                      key={`${row.employeeId}-${selectedMonth}`}
                      data-ocid={`manager.report_table.row.${idx + 1}`}
                    >
                      <TableCell className="font-medium text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style={{ background: "oklch(var(--navy))" }}
                          >
                            {row.employeeName.charAt(0).toUpperCase()}
                          </div>
                          {row.employeeName}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-mono text-muted-foreground">
                        {row.employeeId}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.department}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className="text-sm font-semibold"
                          style={{ color: "oklch(0.55 0.17 145)" }}
                        >
                          {row.presentDays.toString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm font-semibold text-destructive">
                          {row.absentDays.toString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm text-muted-foreground">
                          {row.totalWorkingDays.toString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={`font-semibold text-xs border ${getPctBadgeClass(pct)}`}
                        >
                          {pct}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Holidays Tab ──────────────────────────────────────────
function HolidaysTab() {
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayReason, setHolidayReason] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: holidays, isLoading } = useHolidays();
  const { mutateAsync: addHoliday, isPending: isAdding } = useAddHoliday();
  const { mutateAsync: removeHoliday, isPending: isRemoving } =
    useRemoveHoliday();

  const formatHolidayDate = (dateStr: string) => {
    try {
      return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayDate) {
      toast.error("Please select a date");
      return;
    }
    try {
      const success = await addHoliday({
        date: holidayDate,
        reason: holidayReason.trim() || "Holiday",
      });
      if (success) {
        toast.success("Holiday added", {
          description: `${formatHolidayDate(holidayDate)} marked as holiday.`,
        });
        setHolidayDate("");
        setHolidayReason("");
      } else {
        toast.error("This date is already a holiday");
      }
    } catch {
      toast.error("Failed to add holiday");
    }
  };

  const handleDelete = async (date: string) => {
    try {
      const success = await removeHoliday(date);
      if (success) {
        toast.success("Holiday removed", {
          description: `${formatHolidayDate(date)} is no longer a holiday.`,
        });
      } else {
        toast.error("Could not remove holiday");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Add Holiday Form */}
      <div className="form-section">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <CalendarOff size={15} style={{ color: "oklch(var(--navy))" }} />
          Mark a Date as Holiday
        </h3>
        <form onSubmit={handleAddHoliday} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="holiday-date"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wide"
              >
                Date <span className="text-destructive">*</span>
              </label>
              <Input
                id="holiday-date"
                type="date"
                value={holidayDate}
                onChange={(e) => setHolidayDate(e.target.value)}
                className="text-sm"
                data-ocid="manager.holiday_date_input"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="holiday-reason"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wide"
              >
                Reason (optional)
              </label>
              <Input
                id="holiday-reason"
                type="text"
                placeholder="e.g. National Holiday"
                value={holidayReason}
                onChange={(e) => setHolidayReason(e.target.value)}
                className="text-sm"
                data-ocid="manager.holiday_reason_input"
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={!holidayDate || isAdding}
            className="font-semibold"
            style={{ background: "oklch(var(--navy))", color: "white" }}
            data-ocid="manager.holiday_add_button"
          >
            {isAdding ? (
              <>
                <Loader2 size={14} className="animate-spin mr-2" />
                Adding…
              </>
            ) : (
              <>
                <CalendarOff size={14} className="mr-2" />
                Add Holiday
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Holidays List */}
      <div
        className="bg-white rounded-xl border border-border overflow-hidden shadow-card"
        data-ocid="manager.holidays_table"
      >
        {isLoading ? (
          <div className="p-6 space-y-3" data-ocid="manager.loading_state">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !holidays || holidays.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 px-6 text-center"
            data-ocid="manager.holidays_table.empty_state"
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "oklch(var(--navy) / 0.06)" }}
            >
              <CalendarOff
                size={24}
                style={{ color: "oklch(var(--navy) / 0.4)" }}
              />
            </div>
            <p className="text-base font-semibold text-foreground mb-1">
              No holidays defined
            </p>
            <p className="text-sm text-muted-foreground">
              Add a holiday above to mark days off for the team.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="data-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="w-20">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays
                  .slice()
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((holiday, idx) => (
                    <TableRow
                      key={holiday.date}
                      data-ocid={`manager.holidays_table.row.${idx + 1}`}
                    >
                      <TableCell className="font-medium text-sm">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border border-amber-200 font-semibold text-xs">
                            <CalendarOff size={10} className="mr-1" />
                            Holiday
                          </Badge>
                          <span className="text-muted-foreground">
                            {formatHolidayDate(holiday.date)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {holiday.reason || "—"}
                      </TableCell>
                      <TableCell>
                        <AlertDialog
                          open={deleteTarget === holiday.date}
                          onOpenChange={(open) =>
                            !open && setDeleteTarget(null)
                          }
                        >
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                              disabled={isRemoving}
                              onClick={() => setDeleteTarget(holiday.date)}
                              data-ocid={`manager.holiday_delete_button.${idx + 1}`}
                            >
                              <Trash2 size={13} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent data-ocid="manager.dialog">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2">
                                <AlertTriangle
                                  size={18}
                                  className="text-destructive"
                                />
                                Remove Holiday
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Remove{" "}
                                <strong>
                                  {formatHolidayDate(holiday.date)}
                                </strong>{" "}
                                as a holiday? This will affect attendance
                                calculations.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel
                                data-ocid="manager.holiday_cancel_button"
                                onClick={() => setDeleteTarget(null)}
                              >
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(holiday.date)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                data-ocid="manager.holiday_confirm_button"
                              >
                                {isRemoving ? (
                                  <Loader2
                                    size={14}
                                    className="animate-spin mr-2"
                                  />
                                ) : null}
                                Remove Holiday
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────
function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useStats();

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "oklch(var(--navy))" }}
        >
          <Shield size={18} className="text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">
            Manager Dashboard
          </h2>
          <p className="text-sm text-muted-foreground">
            {getTodayDate()} · {getCurrentMonth()}
          </p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {statsLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="stat-card">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Employees
                </p>
                <Users size={16} style={{ color: "oklch(var(--navy))" }} />
              </div>
              <p className="text-3xl font-display font-bold">
                {stats?.totalEmployees?.toString() ?? "0"}
              </p>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-muted-foreground">
                  Pending Approvals
                </p>
                <Clock size={16} className="text-amber-500" />
              </div>
              <p className="text-3xl font-display font-bold text-amber-600">
                {stats?.pendingEmployees?.toString() ?? "0"}
              </p>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-muted-foreground">
                  Today's Check-ins
                </p>
                <UserCheck size={16} style={{ color: "oklch(var(--gold))" }} />
              </div>
              <p className="text-3xl font-display font-bold">
                {stats?.todayCheckIns?.toString() ?? "0"}
              </p>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-muted-foreground">
                  This Month
                </p>
                <TrendingUp
                  size={16}
                  style={{ color: "oklch(0.55 0.17 145)" }}
                />
              </div>
              <p className="text-3xl font-display font-bold">
                {stats?.monthCheckIns?.toString() ?? "0"}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Four-Tab Panel */}
      <Tabs defaultValue="registered-ids" className="w-full">
        <TabsList
          className="w-full mb-6 h-12"
          style={{ background: "oklch(var(--navy) / 0.06)" }}
        >
          <TabsTrigger
            value="registered-ids"
            className="flex-1 gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm font-semibold"
            data-ocid="manager.tab.1"
          >
            <Users size={15} />
            <span className="hidden sm:inline">Registered IDs</span>
            <span className="sm:hidden">Register</span>
          </TabsTrigger>
          <TabsTrigger
            value="attendance-view"
            className="flex-1 gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm font-semibold"
            data-ocid="manager.tab.2"
          >
            <CalendarDays size={15} />
            <span className="hidden sm:inline">Attendance View</span>
            <span className="sm:hidden">Attendance</span>
          </TabsTrigger>
          <TabsTrigger
            value="month-end"
            className="flex-1 gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm font-semibold"
            data-ocid="manager.tab.3"
          >
            <BarChart3 size={15} />
            <span className="hidden sm:inline">Month-End Report</span>
            <span className="sm:hidden">Month-End</span>
          </TabsTrigger>
          <TabsTrigger
            value="holidays"
            className="flex-1 gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm font-semibold"
            data-ocid="manager.tab.4"
          >
            <CalendarOff size={15} />
            <span className="hidden sm:inline">Manage Holidays</span>
            <span className="sm:hidden">Holidays</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registered-ids">
          <RegisteredIdsTab />
        </TabsContent>
        <TabsContent value="attendance-view">
          <AttendanceViewTab />
        </TabsContent>
        <TabsContent value="month-end">
          <MonthEndReportTab />
        </TabsContent>
        <TabsContent value="holidays">
          <HolidaysTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Manager Page ──────────────────────────────────────────
export default function ManagerPage() {
  const [authenticated, setAuthenticated] = useState(false);

  if (!authenticated) {
    return <PinGate onSuccess={() => setAuthenticated(true)} />;
  }

  return <Dashboard />;
}
