# AttendEase

## Current State
Fresh rebuild from scratch.

## Requested Changes (Diff)

### Add
- Two-portal navigation: Attendance View and Manager Portal
- Manager Portal protected by password (1234)
- Employee registration form inside Manager Portal: name, employee ID, department (Driver / Office / Other), monthly salary, and camera photo capture
- Registered employees shown as pending until manager explicitly saves/confirms
- Manager daily attendance marking: shows all registered employees with camera live feed; manager taps an employee and the system simulates face scan and marks them present for today
- Attendance View portal: employee enters their ID to look up their attendance records (date, status, time) and salary information set by the manager -- read-only, no edits

### Modify
- N/A (fresh build)

### Remove
- N/A (fresh build)

## Implementation Plan
1. Backend: store employees (id, name, department, salary, status, photoData), attendance records (employeeId, date, time), manager password
2. Manager Portal: PIN login screen, tabs for Register Employee, Mark Attendance (camera + employee list), View All Attendance
3. Attendance View: enter employee ID, see attendance table and salary card (read-only)
4. Face detection UI on Mark Attendance: live camera, animated bounding box, confidence score, mark present button per employee
5. Salary calculations: exclude Sundays, monthly salary divided by working days multiplied by days present
