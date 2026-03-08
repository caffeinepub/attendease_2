import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AttendanceRecord,
  Employee,
  Holiday,
  MonthEndReport,
  Stats,
} from "../backend.d";
import { useActor } from "./useActor";

// ── Helpers ────────────────────────────────────────────────
export function getTodayDate(): string {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}

export function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; // YYYY-MM
}

/**
 * Count working days in a month excluding Sundays (and optionally excluding
 * a set of holiday date strings like "2026-03-08").
 */
export function countWorkingDaysExcludingSundays(
  month: string,
  holidayDates: Set<string> = new Set(),
): number {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIdx = Number(monthStr) - 1; // 0-based for Date
  if (Number.isNaN(year) || Number.isNaN(monthIdx)) return 0;
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, monthIdx, d);
    if (date.getDay() === 0) continue; // skip Sunday
    const dateStr = `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (holidayDates.has(dateStr)) continue; // skip holidays
    count++;
  }
  return count;
}

// ── Stats ──────────────────────────────────────────────────
export function useStats() {
  const { actor, isFetching } = useActor();
  return useQuery<Stats>({
    queryKey: ["stats", getTodayDate(), getCurrentMonth()],
    queryFn: async (): Promise<Stats> => {
      if (!actor)
        return {
          totalEmployees: 0n,
          pendingEmployees: 0n,
          todayCheckIns: 0n,
          monthCheckIns: 0n,
        };
      return actor.getStats(getTodayDate(), getCurrentMonth());
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30000,
  });
}

// ── Recent Attendance ──────────────────────────────────────
export function useRecentAttendance(limit = 5n) {
  const { actor, isFetching } = useActor();
  return useQuery<AttendanceRecord[]>({
    queryKey: ["recentAttendance", limit.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getRecentAttendance(limit);
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30000,
  });
}

// ── All Attendance ─────────────────────────────────────────
export function useAllAttendance() {
  const { actor, isFetching } = useActor();
  return useQuery<AttendanceRecord[]>({
    queryKey: ["allAttendance"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllAttendance();
    },
    enabled: !!actor && !isFetching,
  });
}

// ── All Employees ──────────────────────────────────────────
export function useAllEmployees() {
  const { actor, isFetching } = useActor();
  return useQuery<Employee[]>({
    queryKey: ["allEmployees"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllEmployees();
    },
    enabled: !!actor && !isFetching,
  });
}

// ── Attendance by Employee ─────────────────────────────────
export function useAttendanceByEmployee(employeeId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<AttendanceRecord[]>({
    queryKey: ["attendanceByEmployee", employeeId],
    queryFn: async () => {
      if (!actor || !employeeId) return [];
      return actor.getAttendanceByEmployee(employeeId);
    },
    enabled: !!actor && !isFetching && employeeId.length > 0,
  });
}

// ── Register Employee mutation ─────────────────────────────
export function useRegisterEmployee() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      name: string;
      employeeId: string;
      department: string;
      role: string;
      photoData: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.registerEmployee(
        params.name,
        params.employeeId,
        params.department,
        params.role,
        params.photoData,
      );
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allEmployees"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

// ── Mark Attendance mutation ───────────────────────────────
export function useMarkAttendance() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      name: string;
      employeeId: string;
      date: string;
      checkInTime: string;
      photoData: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.markAttendance(
        params.name,
        params.employeeId,
        params.date,
        params.checkInTime,
        params.photoData,
      );
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allAttendance"] });
      qc.invalidateQueries({ queryKey: ["recentAttendance"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["attendanceByEmployee"] });
    },
  });
}

// ── Check Attendance Today ─────────────────────────────────
export function useCheckAttendanceToday() {
  const { actor } = useActor();
  return async (employeeId: string): Promise<boolean> => {
    if (!actor) return false;
    return actor.checkIfAttendanceMarkedToday(employeeId, getTodayDate());
  };
}

// ── Approve Employee mutation ──────────────────────────────
export function useApproveEmployee() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (employeeId: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.approveEmployee(employeeId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allEmployees"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

// ── Approve Employee with Payment mutation ─────────────────
export function useApproveEmployeeWithPayment() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { employeeId: string; payment: bigint }) => {
      if (!actor) throw new Error("Not connected");
      return actor.approveEmployeeWithPayment(
        params.employeeId,
        params.payment,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allEmployees"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["monthEndReport"] });
    },
  });
}

// ── Set Employee Payment mutation ──────────────────────────
export function useSetEmployeePayment() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { employeeId: string; payment: bigint }) => {
      if (!actor) throw new Error("Not connected");
      return actor.setEmployeePayment(params.employeeId, params.payment);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allEmployees"] });
      qc.invalidateQueries({ queryKey: ["monthEndReport"] });
    },
  });
}

// ── Reject Employee mutation ───────────────────────────────
export function useRejectEmployee() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (employeeId: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.rejectEmployee(employeeId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allEmployees"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

// ── Month End Report ───────────────────────────────────────
export function useMonthEndReport(month: string) {
  const { actor, isFetching } = useActor();
  return useQuery<MonthEndReport[]>({
    queryKey: ["monthEndReport", month],
    queryFn: async () => {
      if (!actor || !month) return [];
      return actor.getMonthEndReport(month);
    },
    enabled: !!actor && !isFetching && month.length > 0,
  });
}

// ── Get Approval Status (async function, not a hook) ──────
export function useGetApprovalStatus() {
  const { actor } = useActor();
  return async (employeeId: string): Promise<string> => {
    if (!actor) return "notfound";
    return actor.getEmployeeApprovalStatus(employeeId);
  };
}

// ── Delete Employee mutation ───────────────────────────────
export function useDeleteEmployee() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (employeeId: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteEmployee(employeeId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allEmployees"] });
      qc.invalidateQueries({ queryKey: ["allAttendance"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

// ── Holidays ───────────────────────────────────────────────
export function useHolidays() {
  const { actor, isFetching } = useActor();
  return useQuery<Holiday[]>({
    queryKey: ["holidays"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getHolidays();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useHolidaysByMonth(month: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Holiday[]>({
    queryKey: ["holidaysByMonth", month],
    queryFn: async () => {
      if (!actor || !month) return [];
      return actor.getHolidaysByMonth(month);
    },
    enabled: !!actor && !isFetching && month.length > 0,
  });
}

export function useAddHoliday() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { date: string; reason: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addHoliday(params.date, params.reason);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["holidays"] });
      qc.invalidateQueries({ queryKey: ["holidaysByMonth"] });
      qc.invalidateQueries({ queryKey: ["monthEndReport"] });
    },
  });
}

export function useRemoveHoliday() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (date: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.removeHoliday(date);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["holidays"] });
      qc.invalidateQueries({ queryKey: ["holidaysByMonth"] });
      qc.invalidateQueries({ queryKey: ["monthEndReport"] });
    },
  });
}

// ── Get Salary for Month ───────────────────────────────────
export function useGetSalaryForMonth(employeeId: string, month: string) {
  const { actor, isFetching } = useActor();
  return useQuery<bigint>({
    queryKey: ["salaryForMonth", employeeId, month],
    queryFn: async () => {
      if (!actor || !employeeId || !month) return 0n;
      return actor.getSalaryForMonth(employeeId, month);
    },
    enabled:
      !!actor && !isFetching && employeeId.length > 0 && month.length > 0,
  });
}

// ── Set Salary for Month mutation ──────────────────────────
export function useSetSalaryForMonth() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      employeeId: string;
      month: string;
      salary: bigint;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.setSalaryForMonth(
        params.employeeId,
        params.month,
        params.salary,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["monthEndReport"] });
      qc.invalidateQueries({ queryKey: ["allEmployees"] });
    },
  });
}
