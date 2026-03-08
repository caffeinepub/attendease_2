# AttendEase

## Current State
Full employee attendance management app with:
- Employee registration (photo, name, ID, department, role)
- Manager approval workflow (approve with salary, reject, delete)
- Attendance marking with face photo
- Manager portal (PIN: 1234) with 4 tabs: Registered IDs, Attendance View, Month-End Report, Holidays
- Single global monthlyPayment per employee
- Per-month salary can be set at approval time or updated via pencil icon

## Requested Changes (Diff)

### Add
- Per-month salary storage: `setSalaryForMonth(employeeId, month, salary)` — stores a salary for a specific employee for a specific month (YYYY-MM format)
- `getSalaryForMonth(employeeId, month)` — returns the salary for that month, falling back to employee's default `monthlyPayment` if not set
- Month-End Report tab: "Set/Edit Salary for Month" button per employee row to set or override the salary for that specific selected month
- Salary is mandatory on approval: input must be >= 1 (no longer allows 0 or empty)

### Modify
- `getMonthEndReport`: use per-month salary override if set for that month, otherwise fall back to employee's default `monthlyPayment`
- `deleteEmployee`: also clean up any `monthlySalaries` records for that employee
- Approval payment dialog: make salary field required (min = 1, validation error if 0 or empty)
- Month-End Report tab: show "Edit Salary" pencil button per row that opens a dialog to set the salary for the selected month

### Remove
- Nothing removed

## Implementation Plan
1. Backend: add `MonthlySalary` type, `monthlySalaries` list, `setSalaryForMonth`, `getSalaryForMonth` functions; update `getMonthEndReport` to use per-month salary; update `deleteEmployee` to clean monthlySalaries
2. Update `backend.d.ts` with `setSalaryForMonth(employeeId, month, salary): Promise<boolean>` and `getSalaryForMonth(employeeId, month): Promise<bigint>`
3. Add `useSetSalaryForMonth` and `useGetSalaryForMonth` hooks in `useQueries.ts`
4. Update `ManagerPage.tsx`:
   - Approval dialog: min salary = 1, show error if 0
   - Month-End Report tab: add "Edit Salary for [Month]" button per row, opens dialog to set that month's salary
