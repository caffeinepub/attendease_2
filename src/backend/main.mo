import Array "mo:core/Array";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import List "mo:core/List";
import Migration "migration";

(with migration = Migration.run) actor {
  type Employee = {
    employeeId : Text;
    name : Text;
    department : Text;
    role : Text;
    photoData : Text;
    registeredAt : Text;
    approvalStatus : Text;
  };

  type AttendanceRecord = {
    employeeId : Text;
    employeeName : Text;
    department : Text;
    date : Text;
    checkInTime : Text;
    status : Text;
    photoData : Text;
  };

  type Holiday = {
    date : Text;
    reason : Text;
  };

  type Stats = {
    totalEmployees : Nat;
    pendingEmployees : Nat;
    todayCheckIns : Nat;
    monthCheckIns : Nat;
  };

  type MonthEndReport = {
    employeeId : Text;
    employeeName : Text;
    department : Text;
    presentDays : Nat;
    absentDays : Nat;
    totalWorkingDays : Nat;
  };

  // Module for ordering AttendanceRecords
  module AttendanceRecord {
    public func compare(a : AttendanceRecord, b : AttendanceRecord) : Order.Order {
      switch (Text.compare(b.date, a.date)) {
        case (#less) { #less };
        case (#greater) { #greater };
        case (#equal) { Text.compare(a.employeeName, b.employeeName) };
      };
    };
  };

  // Module for ordering Employee by name
  module Employee {
    public func compareByName(a : Employee, b : Employee) : Order.Order {
      Text.compare(a.name, b.name);
    };
  };

  // Module for ordering Holiday by date
  module Holiday {
    public func compareByDate(a : Holiday, b : Holiday) : Order.Order {
      Text.compare(a.date, b.date);
    };
  };

  var employees : List.List<Employee> = List.empty<Employee>();
  var attendanceRecords : List.List<AttendanceRecord> = List.empty<AttendanceRecord>();
  var holidays : List.List<Holiday> = List.empty<Holiday>();

  // Register new Employee
  public shared ({ caller }) func registerEmployee(
    name : Text,
    employeeId : Text,
    department : Text,
    role : Text,
    photoData : Text,
  ) : async Bool {
    let existingEmployeeIter = employees.values().find(func(e) { e.employeeId == employeeId });

    switch (existingEmployeeIter) {
      case (?_employee) { false };
      case (null) {
        let newEmployee : Employee = {
          employeeId;
          name;
          department;
          role;
          photoData;
          registeredAt = Time.now().toText();
          approvalStatus = "pending";
        };
        employees.add(newEmployee);
        true;
      };
    };
  };

  // Approve Employee
  public shared ({ caller }) func approveEmployee(employeeId : Text) : async Bool {
    updateEmployeeStatus(employeeId, "approved");
  };

  // Reject Employee
  public shared ({ caller }) func rejectEmployee(employeeId : Text) : async Bool {
    updateEmployeeStatus(employeeId, "rejected");
  };

  // Helper to update employee status
  func updateEmployeeStatus(employeeId : Text, status : Text) : Bool {
    let updated = employees.map<Employee, Employee>(
      func(emp) {
        if (emp.employeeId == employeeId) {
          { emp with approvalStatus = status };
        } else {
          emp;
        };
      }
    );
    employees := updated;

    let found = employees.values().find(func(emp) { emp.employeeId == employeeId });
    switch (found) {
      case (?_) { true };
      case (null) { false };
    };
  };

  // Mark Attendance
  public shared ({ caller }) func markAttendance(
    name : Text,
    employeeId : Text,
    date : Text,
    checkInTime : Text,
    photoData : Text,
  ) : async Bool {
    switch (employees.values().find(func(e) { e.employeeId == employeeId })) {
      case (null) { false };
      case (?employee) {
        if (employee.approvalStatus != "approved") {
          return false;
        };

        let alreadyMarked = attendanceRecords.values().find(
          func(r) { r.employeeId == employeeId and r.date == date }
        );

        switch (alreadyMarked) {
          case (?_) { false };
          case (null) {
            let newRecord : AttendanceRecord = {
              employeeId;
              employeeName = name;
              department = employee.department;
              date;
              checkInTime;
              status = "Present";
              photoData;
            };

            attendanceRecords.add(newRecord);
            true;
          };
        };
      };
    };
  };

  // Get Attendance for Employee
  public query ({ caller }) func getAttendanceByEmployee(employeeId : Text) : async [AttendanceRecord] {
    let filtered = attendanceRecords.filter(func(record) { record.employeeId == employeeId });
    filtered.toArray();
  };

  // Get All Attendance sorted by date
  public query ({ caller }) func getAllAttendance() : async [AttendanceRecord] {
    attendanceRecords.toArray();
  };

  // Get All Employees sorted by name
  public query ({ caller }) func getAllEmployees() : async [Employee] {
    employees.toArray();
  };

  // Get Only Pending Employees
  public query ({ caller }) func getPendingEmployees() : async [Employee] {
    let filtered = employees.filter(func(emp) { emp.approvalStatus == "pending" });
    filtered.toArray();
  };

  // Check Today's Attendance Marked
  public query ({ caller }) func checkIfAttendanceMarkedToday(employeeId : Text, date : Text) : async Bool {
    attendanceRecords.values().any(
      func(record) {
        record.employeeId == employeeId and record.date == date
      }
    );
  };

  // Delete Employee and their records
  public shared ({ caller }) func deleteEmployee(employeeId : Text) : async Bool {
    let hasEmployee = employees.values().any(
      func(e) { e.employeeId == employeeId }
    );
    if (not hasEmployee) { return false };

    employees := employees.filter(func(e) { e.employeeId != employeeId });
    attendanceRecords := attendanceRecords.filter(func(record) { record.employeeId != employeeId });
    true;
  };

  // Get statistics for date/month
  public query ({ caller }) func getStats(date : Text, month : Text) : async Stats {
    let totalEmployees = employees.size();
    let pendingEmployees = employees.filter(func(e) { e.approvalStatus == "pending" }).size();
    let todayCheckIns = attendanceRecords.filter(func(record) { record.date == date }).size();
    let monthCheckIns = attendanceRecords.filter(func(record) { record.date.startsWith(#text month) }).size();

    {
      totalEmployees;
      pendingEmployees;
      todayCheckIns;
      monthCheckIns;
    };
  };

  // Get Most Recent N Attendance Records
  public query ({ caller }) func getRecentAttendance(limit : Nat) : async [AttendanceRecord] {
    if (limit == 0) { return [] };
    let reversedRecords = attendanceRecords.reverse();
    let takeLimit = Nat.min(limit, reversedRecords.size());
    getFirstNAttendanceRecords(reversedRecords, takeLimit);
  };

  func getFirstNAttendanceRecords(list : List.List<AttendanceRecord>, n : Nat) : [AttendanceRecord] {
    let iterator = list.values();
    var count = 0;

    let filteredList = List.empty<AttendanceRecord>(); // Mutable return array
    while (count < n) {
      switch (iterator.next()) {
        case (?val) {
          filteredList.add(val);
          count += 1;
        };
        case (null) { count := n };
      };
    };
    filteredList.toArray();
  };

  // Holiday management functions

  // Add new holiday (returns false if date already exists)
  public shared ({ caller }) func addHoliday(date : Text, reason : Text) : async Bool {
    let exists = holidays.values().find(func(h) { h.date == date });
    switch (exists) {
      case (?_h) { false };
      case (null) {
        let newHoliday : Holiday = { date; reason };
        holidays.add(newHoliday);
        true;
      };
    };
  };

  // Remove holiday (returns false if not found)
  public shared ({ caller }) func removeHoliday(date : Text) : async Bool {
    let found = holidays.values().find(func(h) { h.date == date });
    switch (found) {
      case (null) { false };
      case (?_h) {
        holidays := holidays.filter(func(h) { h.date != date });
        true;
      };
    };
  };

  // Get all holidays (sorted by date ascending)
  public query ({ caller }) func getHolidays() : async [Holiday] {
    holidays.toArray();
  };

  // Get holidays for a specific month (YYYY-MM format)
  public query ({ caller }) func getHolidaysByMonth(month : Text) : async [Holiday] {
    let filtered = holidays.filter(func(h) { h.date.startsWith(#text month) });
    filtered.toArray();
  };

  // Calculate working days for a month (excluding holidays)
  func calculateWorkingDaysInMonth(month : Text) : Nat {
    let components = getMonthComponents(month);
    switch (components) {
      case (null) { 0 };
      case (?(year, monthNum)) {
        var days : Nat = switch (monthNum) {
          case (1 or 3 or 5 or 7 or 8 or 10 or 12) { 31 };
          case (4 or 6 or 9 or 11) { 30 };
          case (2) {
            if (((year % 4 == 0) and (year % 100 != 0)) or (year % 400 == 0)) { 29 } else { 28 };
          };
          case (_) { 0 };
        };

        // Subtract holidays only for that month
        let holidaysForMonth = holidays.filter(
          func(h) { h.date.startsWith(#text month) }
        );
        days -= holidaysForMonth.size();
        days;
      };
    };
  };

  // Helper to parse YYYY-MM string into (year, month) tuple
  func getMonthComponents(monthStr : Text) : ?(Nat, Nat) {
    let parts = monthStr.split(#char '-').toArray();

    if (parts.size() != 2) { return null };

    let yearOpt = Nat.fromText(parts[0]);
    let monthOpt = Nat.fromText(parts[1]);

    switch (yearOpt, monthOpt) {
      case (?year, ?month) {
        if (month >= 1 and month <= 12) {
          ?(year, month);
        } else { null };
      };
      case (_) { null };
    };
  };

  // Get Month End Report for each employee
  public query ({ caller }) func getMonthEndReport(month : Text) : async [MonthEndReport] {
    let monthRecords = attendanceRecords.filter(
      func(record) { record.date.startsWith(#text month) }
    );

    let reports = List.empty<MonthEndReport>();

    for (employee in employees.values()) {
      let employeeRecords = monthRecords.filter(
        func(record) { record.employeeId == employee.employeeId }
      );
      let presentDays = employeeRecords.size();

      let totalWorkingDays = calculateWorkingDaysInMonth(month);
      let absentDays = if (totalWorkingDays >= presentDays) {
        totalWorkingDays - presentDays;
      } else { 0 };

      let report : MonthEndReport = {
        employeeId = employee.employeeId;
        employeeName = employee.name;
        department = employee.department;
        presentDays;
        absentDays;
        totalWorkingDays;
      };

      reports.add(report);
    };

    reports.toArray();
  };

  // Get Employee Approval Status
  public query ({ caller }) func getEmployeeApprovalStatus(employeeId : Text) : async Text {
    switch (employees.values().find(func(e) { e.employeeId == employeeId })) {
      case (?employee) { employee.approvalStatus };
      case (null) { "notfound" };
    };
  };
};
