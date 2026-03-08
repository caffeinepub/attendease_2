# AttendEase

## Current State
The app has 4 portals: Register, Mark Attendance, My Attendance, Manager Portal.
- Employees can mark their own attendance from the "Mark Attendance" portal.
- The top nav shows all 4 portals to everyone.
- My Attendance is already read-only (no edit controls).
- Manager Portal has 4 tabs: Registered IDs, Attendance View, Month-End Report, Manage Holidays.

## Requested Changes (Diff)

### Add
- A new "Mark Attendance" tab inside the Manager Portal Dashboard (5th tab), where the manager can:
  - See a list of all approved employees for today
  - Mark each approved employee as present for today's date (with a time stamp)
  - The backend `markAttendance` API already exists and accepts: name, employeeId, date, checkInTime, photoData (photoData can be empty string when manager marks)
  - Show which employees are already marked today (disabled/checked state)
  - Show today's date clearly

### Modify
- **TopNav**: Remove the "Mark Attendance" nav item entirely (the `attendance` page id entry). Navigation should only show: Register, My Attendance, Manager Portal.
- **App.tsx**: Remove `attendance` from `PageId` type and remove the `AttendancePage` case from the router. Default page stays "register".
- **Manager Portal tabs**: Add a 5th tab "Mark Attendance" (with a Camera or UserCheck icon) between "Registered IDs" and "Attendance View", or at the end -- place it as tab 2 (right after Registered IDs).

### Remove
- Remove the "Mark Attendance" button from the top navigation bar.
- The `AttendancePage.tsx` file can be left in place but is no longer reachable.

## Implementation Plan
1. Update `TopNav.tsx`: Remove the `attendance` nav item from the navItems array.
2. Update `App.tsx`: Remove `"attendance"` from `PageId` type union and remove its case in `renderPage`. Default stays `"register"`.
3. In `ManagerPage.tsx`, add a new `MarkAttendanceTab` component:
   - Fetches all approved employees via `useAllEmployees` (filter by `approvalStatus === "approved"`)
   - Fetches today's attendance via `useAllAttendance` to know who's already marked
   - Displays a table/list with each approved employee: photo, name, ID, department
   - Each row has a "Mark Present" button that calls `useMarkAttendance` with today's date, current time, and empty photoData
   - Already-marked employees show a green "Present" badge and disabled button
   - Shows today's date prominently at the top
4. Add the new tab trigger and content in the `Dashboard` component's `Tabs`, shifting existing tab numbers as needed.
5. Add `useMarkAttendance` import to ManagerPage (it's already in useQueries.ts).
