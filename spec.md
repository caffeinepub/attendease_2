# AttendEase

## Current State
- Four pages: Register, Mark Attendance, My Attendance, Manager Portal
- Registration immediately activates the employee (no approval gate)
- Attendance can be marked by any name/ID regardless of approval status
- Manager Portal has a single table showing all attendance records
- No photo display in manager view (photoData stored but not shown)
- No month-end summary of present/absent days
- Manager access gated by PIN "1234"

## Requested Changes (Diff)

### Add
- `approvalStatus` field to Employee: "pending" | "approved" | "rejected"
- `approveEmployee(id)` and `rejectEmployee(id)` backend methods
- `getPendingEmployees()` query to fetch pending-only employees
- Manager portal: three tabs — "Registered IDs", "Attendance View", "Month-End Report"
  - Registered IDs tab: table of all employees with name, ID, department, role, status badge; Accept/Reject buttons for pending entries
  - Attendance View tab: existing attendance table with employee photo shown as thumbnail
  - Month-End Report tab: per-employee summary with name, ID, total days present, total days absent (calculated vs working days in selected month)
- Attendance mark page: validate that employee is approved before allowing check-in; show "Pending approval" or "Rejected" message if not approved

### Modify
- `markAttendance` backend: check `approvalStatus == "approved"` before recording; return false if not approved
- `registerEmployee` backend: set `approvalStatus = "pending"` on creation instead of active
- Manager Portal Dashboard now has three panels/tabs replacing the single table
- Manager Registered IDs panel shows photo thumbnail from photoData if available

### Remove
- The direct attendance mark for non-approved employees (blocked at backend and frontend)

## Implementation Plan
1. Regenerate Motoko backend with:
   - Employee type gains `approvalStatus: Text` ("pending"/"approved"/"rejected")
   - New functions: `approveEmployee`, `rejectEmployee`, `getPendingEmployees`, `getAllEmployeesWithStatus`, `getMonthEndReport`
   - `markAttendance` checks approval before recording
   - `getStats` also returns pendingCount
2. Update `backend.d.ts` to reflect new types and functions
3. Update `useQueries.ts` to add hooks: `useApproveEmployee`, `useRejectEmployee`, `usePendingEmployees`, `useAllEmployeesWithStatus`, `useMonthEndReport`
4. Rewrite `ManagerPage.tsx` with three tab panels:
   - Tab 1 "Registered IDs": employee list with Accept/Reject actions
   - Tab 2 "Attendance View": attendance table with photo thumbnails
   - Tab 3 "Month-End Report": per-employee present/absent summary for selected month
5. Update `AttendancePage.tsx` to show approval status error if employee not approved
6. Update `RegisterPage.tsx` to clarify registration is pending manager approval
