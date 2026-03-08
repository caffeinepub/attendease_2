import Text "mo:core/Text";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Order "mo:core/Order";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Nat "mo:core/Nat";



actor {
  public type Employee = {
    employeeId : Text;
    name : Text;
    department : Text;
    role : Text;
    photoData : Text;
    registeredAt : Text;
    approvalStatus : Text;
  };

  public type AttendanceRecord = {
    employeeId : Text;
    employeeName : Text;
    department : Text;
    date : Text;
    checkInTime : Text;
    status : Text;
    photoData : Text;
  };

  public type Stats = {
    totalEmployees : Nat;
    pendingEmployees : Nat;
    todayCheckIns : Nat;
    monthCheckIns : Nat;
  };

  public type MonthEndReport = {
    employeeId : Text;
    employeeName : Text;
    department : Text;
    presentDays : Nat;
    absentDays : Nat;
    totalWorkingDays : Nat;
  };

  module AttendanceRecord {
    public func compare(a : AttendanceRecord, b : AttendanceRecord) : Order.Order {
      switch (Text.compare(b.date, a.date)) {
        case (#less) { #less };
        case (#greater) { #greater };
        case (#equal) { Text.compare(a.employeeName, b.employeeName) };
      };
    };
  };

  module Employee {
    public func compareByName(a : Employee, b : Employee) : Order.Order {
      Text.compare(a.name, b.name);
    };
  };

  let employees = Map.empty<Text, Employee>();
  var attendanceRecords : [AttendanceRecord] = [];

  public shared ({ caller }) func registerEmployee(
    name : Text,
    employeeId : Text,
    department : Text,
    role : Text,
    photoData : Text
  ) : async Bool {
    if (employees.containsKey(employeeId)) {
      return false;
    };

    let newEmployee : Employee = {
      employeeId;
      name;
      department;
      role;
      photoData;
      registeredAt = Time.now().toText();
      approvalStatus = "pending";
    };

    employees.add(employeeId, newEmployee);
    true;
  };

  public shared ({ caller }) func approveEmployee(employeeId : Text) : async Bool {
    switch (employees.get(employeeId)) {
      case (null) { return false };
      case (?employee) {
        let updatedEmployee = { employee with approvalStatus = "approved" };
        employees.add(employeeId, updatedEmployee);
        true;
      };
    };
  };

  public shared ({ caller }) func rejectEmployee(employeeId : Text) : async Bool {
    switch (employees.get(employeeId)) {
      case (null) { return false };
      case (?employee) {
        let updatedEmployee = { employee with approvalStatus = "rejected" };
        employees.add(employeeId, updatedEmployee);
        true;
      };
    };
  };

  public shared ({ caller }) func markAttendance(
    name : Text,
    employeeId : Text,
    date : Text,
    checkInTime : Text,
    photoData : Text
  ) : async Bool {
    switch (employees.get(employeeId)) {
      case (null) { return false };
      case (?employee) {
        if (employee.approvalStatus != "approved") {
          return false;
        };

        if (attendanceRecords.any(func(r) { r.employeeId == employeeId and r.date == date })) {
          return false;
        };

        let newRecord : AttendanceRecord = {
          employeeId;
          employeeName = name;
          department = employee.department;
          date;
          checkInTime;
          status = "Present";
          photoData;
        };

        attendanceRecords := attendanceRecords.concat([newRecord]);
        true;
      };
    };
  };

  public query ({ caller }) func getAttendanceByEmployee(employeeId : Text) : async [AttendanceRecord] {
    let filtered = attendanceRecords.filter(func(record) { record.employeeId == employeeId });
    filtered.sort();
  };

  public query ({ caller }) func getAllAttendance() : async [AttendanceRecord] {
    attendanceRecords.sort();
  };

  public query ({ caller }) func getAllEmployees() : async [Employee] {
    employees.values().toArray().sort(Employee.compareByName);
  };

  public query ({ caller }) func getPendingEmployees() : async [Employee] {
    let filtered = employees.values().toArray().filter(func(emp) { emp.approvalStatus == "pending" });
    filtered.sort(Employee.compareByName);
  };

  public query ({ caller }) func checkIfAttendanceMarkedToday(employeeId : Text, date : Text) : async Bool {
    attendanceRecords.any(func(record) { record.employeeId == employeeId and record.date == date });
  };

  public shared ({ caller }) func deleteEmployee(employeeId : Text) : async Bool {
    if (not employees.containsKey(employeeId)) {
      return false;
    };

    employees.remove(employeeId);
    attendanceRecords := attendanceRecords.filter(func(record) { record.employeeId != employeeId });
    true;
  };

  public query ({ caller }) func getStats(date : Text, month : Text) : async Stats {
    let totalEmployees = employees.size();
    let pendingEmployees = employees.values().toArray().filter(func(e) { e.approvalStatus == "pending" }).size();
    let todayCheckIns = attendanceRecords.filter(func(record) { record.date == date }).size();
    let monthCheckIns = attendanceRecords.filter(func(record) { record.date.startsWith(#text month) }).size();

    {
      totalEmployees;
      pendingEmployees;
      todayCheckIns;
      monthCheckIns;
    };
  };

  public query ({ caller }) func getRecentAttendance(limit : Nat) : async [AttendanceRecord] {
    if (limit == 0) {
      return [];
    };

    let sorted = attendanceRecords.sort();
    let takeLimit = Nat.min(limit, sorted.size());
    sorted.sliceToArray(0, takeLimit);
  };

  public query ({ caller }) func getMonthEndReport(month : Text) : async [MonthEndReport] {
    let monthRecords = attendanceRecords.filter(func(record) { record.date.startsWith(#text month) });

    let employeeEntries = employees.toArray();
    employeeEntries.map<(Text, Employee), MonthEndReport>(
      func((id, employee)) {
        let employeeRecords = monthRecords.filter(func(record) { record.employeeId == id });
        let presentDays = employeeRecords.size();
        let totalWorkingDays = calculateWorkingDaysInMonth(month);
        let absentDays = if (totalWorkingDays > presentDays) {
          totalWorkingDays - presentDays;
        } else {
          0;
        };

        {
          employeeId = id;
          employeeName = employee.name;
          department = employee.department;
          presentDays;
          absentDays;
          totalWorkingDays;
        };
      }
    );
  };

  func calculateWorkingDaysInMonth(month : Text) : Nat {
    22;
  };

  public query ({ caller }) func getEmployeeApprovalStatus(employeeId : Text) : async Text {
    switch (employees.get(employeeId)) {
      case (null) { "notfound" };
      case (?employee) { employee.approvalStatus };
    };
  };
};
