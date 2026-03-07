import Map "mo:core/Map";
import Array "mo:core/Array";
import Text "mo:core/Text";

module {
  type OldEmployee = {
    employeeId : Text;
    name : Text;
    department : Text;
    role : Text;
    photoData : Text;
    registeredAt : Text;
  };

  type OldAttendanceRecord = {
    employeeId : Text;
    employeeName : Text;
    department : Text;
    date : Text;
    checkInTime : Text;
    status : Text;
  };

  type OldActor = {
    employees : Map.Map<Text, OldEmployee>;
    attendanceRecords : [OldAttendanceRecord];
    stableEmployees : [(Text, OldEmployee)];
    stableAttendanceRecords : [OldAttendanceRecord];
  };

  type NewEmployee = {
    employeeId : Text;
    name : Text;
    department : Text;
    role : Text;
    photoData : Text;
    registeredAt : Text;
    approvalStatus : Text;
  };

  type NewAttendanceRecord = {
    employeeId : Text;
    employeeName : Text;
    department : Text;
    date : Text;
    checkInTime : Text;
    status : Text;
    photoData : Text;
  };

  type NewActor = {
    employees : Map.Map<Text, NewEmployee>;
    attendanceRecords : [NewAttendanceRecord];
  };

  public func run(old : OldActor) : NewActor {
    let newEmployees = old.employees.map<Text, OldEmployee, NewEmployee>(
      func(_id, oldEmployee) {
        { oldEmployee with approvalStatus = "pending" };
      }
    );

    let newAttendanceRecords = old.attendanceRecords.map(
      func(oldRecord) {
        { oldRecord with photoData = "" };
      }
    );

    {
      employees = newEmployees;
      attendanceRecords = newAttendanceRecords;
    };
  };
};
