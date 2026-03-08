import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Stats {
    totalEmployees: bigint;
    pendingEmployees: bigint;
    todayCheckIns: bigint;
    monthCheckIns: bigint;
}
export interface Employee {
    photoData: string;
    name: string;
    role: string;
    approvalStatus: string;
    employeeId: string;
    department: string;
    registeredAt: string;
}
export interface AttendanceRecord {
    status: string;
    photoData: string;
    employeeName: string;
    date: string;
    checkInTime: string;
    employeeId: string;
    department: string;
}
export interface MonthEndReport {
    employeeName: string;
    presentDays: bigint;
    employeeId: string;
    absentDays: bigint;
    totalWorkingDays: bigint;
    department: string;
}
export interface Holiday {
    date: string;
    reason: string;
}
export interface backendInterface {
    addHoliday(date: string, reason: string): Promise<boolean>;
    approveEmployee(employeeId: string): Promise<boolean>;
    checkIfAttendanceMarkedToday(employeeId: string, date: string): Promise<boolean>;
    deleteEmployee(employeeId: string): Promise<boolean>;
    getAllAttendance(): Promise<Array<AttendanceRecord>>;
    getAllEmployees(): Promise<Array<Employee>>;
    getAttendanceByEmployee(employeeId: string): Promise<Array<AttendanceRecord>>;
    getEmployeeApprovalStatus(employeeId: string): Promise<string>;
    getHolidays(): Promise<Array<Holiday>>;
    getHolidaysByMonth(month: string): Promise<Array<Holiday>>;
    getMonthEndReport(month: string): Promise<Array<MonthEndReport>>;
    getPendingEmployees(): Promise<Array<Employee>>;
    getRecentAttendance(limit: bigint): Promise<Array<AttendanceRecord>>;
    getStats(date: string, month: string): Promise<Stats>;
    markAttendance(name: string, employeeId: string, date: string, checkInTime: string, photoData: string): Promise<boolean>;
    registerEmployee(name: string, employeeId: string, department: string, role: string, photoData: string): Promise<boolean>;
    rejectEmployee(employeeId: string): Promise<boolean>;
    removeHoliday(date: string): Promise<boolean>;
}
