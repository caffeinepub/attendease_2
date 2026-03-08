import Array "mo:core/Array";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Iter "mo:core/Iter";



actor {
  type Employee = {
    employeeId : Text;
    name : Text;
    department : Text;
    role : Text;
    photoData : Text;
    registeredAt : Text;
    approvalStatus : Text;
    monthlyPayment : Nat;
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

  type MonthlySalary = {
    employeeId : Text;
    month : Text;
    salary : Nat;
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
    monthlyPayment : Nat;
    earnedAmount : Nat;
    presentDates : [Text];
  };

  // Module for ordering AttendanceRecords
  module AttendanceRecord {
    public func compare(a : AttendanceRecord, b : AttendanceRecord) : Int {
      switch (Text.compare(b.date, a.date)) {
        case (#less) { -1 };
        case (#greater) { 1 };
        case (#equal) {
          switch (Text.compare(a.employeeName, b.employeeName)) {
            case (#equal) { 0 };
            case (#greater) { 1 };
            case (#less) { -1 };
          };
        };
      };
    };
  };

  // Module for ordering Employee by name
  module Employee {
    public func compareByName(a : Employee, b : Employee) : Int {
      switch (Text.compare(a.name, b.name)) {
        case (#equal) { 0 };
        case (#greater) { 1 };
        case (#less) { -1 };
      };
    };
  };

  // Module for ordering Holiday by date
  module Holiday {
    public func compareByDate(a : Holiday, b : Holiday) : Int {
      switch (Text.compare(a.date, b.date)) {
        case (#equal) { 0 };
        case (#greater) { 1 };
        case (#less) { -1 };
      };
    };
  };

  var employees : List.List<Employee> = List.empty<Employee>();
  var attendanceRecords : List.List<AttendanceRecord> = List.empty<AttendanceRecord>();
  var holidays : List.List<Holiday> = List.empty<Holiday>();
  var monthlySalaries : List.List<MonthlySalary> = List.empty<MonthlySalary>();

  /////////////////////////////////////////////////////////////////////////
  // New Per-Month Salary Functions
  /////////////////////////////////////////////////////////////////////////

  // Set/Update Monthly Salary for an Employee
  public shared ({ caller }) func setSalaryForMonth(employeeId : Text, month : Text, salary : Nat) : async Bool {
    monthlySalaries := monthlySalaries.filter(
      func(entry) {
        not (entry.employeeId == employeeId and entry.month == month);
      }
    );
    monthlySalaries.add({
      employeeId;
      month;
      salary;
    });
    true;
  };

  // Get per-month salary, falling back to employee default if not set
  public query ({ caller }) func getSalaryForMonth(employeeId : Text, month : Text) : async Nat {
    switch (
      monthlySalaries.values().find(
        func(entry) {
          entry.employeeId == employeeId and entry.month == month
        }
      )
    ) {
      case (?entry) { entry.salary };
      case (null) {
        // Fallback to employee default
        switch (employees.values().find(func(e) { e.employeeId == employeeId })) {
          case (?employee) {
            employee.monthlyPayment;
          };
          case (null) { 0 };
        };
      };
    };
  };

  // Helper to get monthly salary or fallback
  func getMonthlySalaryOrFallback(employeeId : Text, month : Text) : Nat {
    switch (
      monthlySalaries.values().find(func(entry) { entry.employeeId == employeeId and entry.month == month })
    ) {
      case (?entry) { entry.salary };
      case (null) {
        switch (employees.values().find(func(e) { e.employeeId == employeeId })) {
          case (?employee) { employee.monthlyPayment };
          case (null) { 0 };
        };
      };
    };
  };

  // Delete Employee and their records + monthly salaries
  public shared ({ caller }) func deleteEmployee(employeeId : Text) : async Bool {
    let hasEmployee = employees.values().any(
      func(e) { e.employeeId == employeeId }
    );
    if (not hasEmployee) { return false };

    employees := employees.filter(func(e) { e.employeeId != employeeId });
    attendanceRecords := attendanceRecords.filter(func(record) { record.employeeId != employeeId });
    monthlySalaries := monthlySalaries.filter(func(entry) { entry.employeeId != employeeId });
    true;
  };

  /////////////////////////////////////////////////////////////////////////
  // Old Functions
  /////////////////////////////////////////////////////////////////////////

  // Approve and Set Payment for Employee
  public shared ({ caller }) func approveEmployeeWithPayment(employeeId : Text, payment : Nat) : async Bool {
    var updated = false; // Track if employee was found and updated
    let newEmployees = employees.map<Employee, Employee>(
      func(emp) {
        if (emp.employeeId == employeeId) {
          updated := true;
          {
            emp with
            approvalStatus = "approved";
            monthlyPayment = payment;
          };
        } else { emp };
      }
    );
    employees := newEmployees;
    updated;
  };

  // Set/Update Monthly Payment for an Employee
  public shared ({ caller }) func setEmployeePayment(employeeId : Text, payment : Nat) : async Bool {
    var updated = false;
    let newEmployees = employees.map<Employee, Employee>(
      func(emp) {
        if (emp.employeeId == employeeId) {
          updated := true;
          { emp with monthlyPayment = payment };
        } else { emp };
      }
    );
    employees := newEmployees;
    updated;
  };

  //////////////////////////////////////////////////////////////////////////
  // Old System Functions
  //////////////////////////////////////////////////////////////////////////

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
          monthlyPayment = 0;
        };
        employees.add(newEmployee);
        true;
      };
    };
  };

  // Approve Employee (without changing payment)
  public shared ({ caller }) func approveEmployee(employeeId : Text) : async Bool {
    updateEmployeeStatus(employeeId, "approved");
  };

  // Reject Employee
  public shared ({ caller }) func rejectEmployee(employeeId : Text) : async Bool {
    updateEmployeeStatus(employeeId, "rejected");
  };

  // Helper to update employee status
  func updateEmployeeStatus(employeeId : Text, status : Text) : Bool {
    var updated = false;
    let newEmployees = employees.map<Employee, Employee>(
      func(emp) {
        if (emp.employeeId == employeeId) {
          updated := true;
          { emp with approvalStatus = status };
        } else { emp };
      }
    );
    employees := newEmployees;
    updated;
  };

  // Mark Attendance
  public shared ({ caller }) func markAttendance(
    name : Text,
    employeeId : Text,
    date : Text,
    checkInTime : Text,
    photoData : Text,
  ) : async Bool {
    let employeeOptIter = employees.values().find(func(e) { e.employeeId == employeeId });
    switch (employeeOptIter) {
      case (null) { false };
      case (?employee) {
        if (employee.approvalStatus != "approved") {
          return false;
        };
        let alreadyMarkedIter = attendanceRecords.values().find(
          func(r) { r.employeeId == employeeId and r.date == date }
        );
        switch (alreadyMarkedIter) {
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

  // Get All Attendance
  public query ({ caller }) func getAllAttendance() : async [AttendanceRecord] {
    attendanceRecords.toArray();
  };

  // Get All Employees
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
    let filteredList = List.empty<AttendanceRecord>();
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

  public query ({ caller }) func getHolidays() : async [Holiday] {
    holidays.toArray();
  };

  public query ({ caller }) func getHolidaysByMonth(month : Text) : async [Holiday] {
    let filtered = holidays.filter(func(h) { h.date.startsWith(#text month) });
    filtered.toArray();
  };

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

        let holidaysForMonth = holidays.filter(func(h) { h.date.startsWith(#text month) });
        days -= holidaysForMonth.size();
        days;
      };
    };
  };

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

  // Helper function for string representing Nat as integer with default fallback
  func stringToNat(str : Text, defaultVal : Nat) : Nat {
    switch (Nat.fromText(str)) {
      case (?val) { val };
      case (null) { defaultVal };
    };
  };

  // Get Month End Report for Month
  public query ({ caller }) func getMonthEndReport(month : Text) : async [MonthEndReport] {
    let monthRecords = attendanceRecords.filter(func(record) { record.date.startsWith(#text month) });
    let reports = List.empty<MonthEndReport>();
    for (employee in employees.values()) {
      let employeeRecords = monthRecords.filter(func(record) { record.employeeId == employee.employeeId });
      let presentDays = employeeRecords.size();
      let totalWorkingDays = calculateWorkingDaysInMonth(month);
      let absentDays = if (totalWorkingDays >= presentDays) {
        totalWorkingDays - presentDays;
      } else { 0 };
      let presentDates = employeeRecords.map(func(record) { record.date });
      let salary = getMonthlySalaryOrFallback(employee.employeeId, month);
      let earnedAmount = if (totalWorkingDays > 0) {
        (salary * presentDays) / totalWorkingDays;
      } else { 0 };
      let report : MonthEndReport = {
        employeeId = employee.employeeId;
        employeeName = employee.name;
        department = employee.department;
        presentDays;
        absentDays;
        totalWorkingDays;
        monthlyPayment = salary;
        presentDates = presentDates.toArray();
        earnedAmount;
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
