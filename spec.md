# AttendEase

## Current State
Full-stack employee attendance app with:
- Employee registration (photo capture, department, role) with manager approval workflow
- Mark Attendance (camera photo capture, approved employees only, one check-in per day)
- My Attendance page (view attendance history by employee ID)
- Manager Portal (PIN: 1234) with 3 tabs: Registered IDs, Attendance View, Month-End Report
- Month-End Report calculates totalWorkingDays as all calendar days in the month (no weekend exclusions)
- No holiday management exists

## Requested Changes (Diff)

### Add
- `Holiday` type in backend: `{ date: Text; reason: Text }`
- `addHoliday(date, reason)` backend function -- manager adds a holiday by date (YYYY-MM-DD) and optional reason
- `removeHoliday(date)` backend function -- manager removes a holiday by date
- `getHolidays()` backend function -- returns all holidays as array
- `getHolidaysByMonth(month)` backend function -- returns holidays for a given month (YYYY-MM)
- Month-End Report logic: totalWorkingDays = calendar days in month MINUS holidays in that month; absentDays = totalWorkingDays - presentDays (min 0)
- "Holidays" tab (4th tab) in Manager Portal where manager can:
  - Pick a date and enter a reason to add a holiday
  - See a list of all holidays with date, reason, and a delete button
- Holiday dates shown with a "Holiday" badge in Attendance View table
- Frontend hooks: `useHolidays`, `useHolidaysByMonth`, `useAddHoliday`, `useRemoveHoliday`

### Modify
- `getMonthEndReport(month)`: subtract holiday count for that month from totalWorkingDays before computing absentDays
- Manager Portal: add 4th tab "Holidays" alongside Registered IDs, Attendance View, Month-End Report
- Attendance View table: if a date matches a holiday, show "Holiday" badge instead of "Present"

### Remove
- Nothing removed

## Implementation Plan
1. Regenerate Motoko backend with Holiday type, addHoliday/removeHoliday/getHolidays/getHolidaysByMonth functions, and updated getMonthEndReport
2. Add holiday hooks (useHolidays, useHolidaysByMonth, useAddHoliday, useRemoveHoliday) to useQueries.ts
3. Add Holidays tab to ManagerPage.tsx with date picker + reason input + holiday list table with remove buttons
4. Update Attendance View to show "Holiday" badge when a record date matches a holiday
5. Validate and deploy
