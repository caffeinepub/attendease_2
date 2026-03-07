import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AttendanceRecord,
  Employee,
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
