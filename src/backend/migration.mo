import List "mo:core/List";
import Text "mo:core/Text";
import Array "mo:core/Array";

module {
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

  type OldActor = {
    employees : List.List<Employee>;
    attendanceRecords : List.List<AttendanceRecord>;
    holidays : List.List<Holiday>;
  };

  type NewActor = {
    employees : List.List<Employee>;
    attendanceRecords : List.List<AttendanceRecord>;
    holidays : List.List<Holiday>;
    monthlySalaries : List.List<{ employeeId : Text; month : Text; salary : Nat }>;
  };

  public func run(old : OldActor) : NewActor {
    {
      old with
      monthlySalaries = List.empty<{ employeeId : Text; month : Text; salary : Nat }>();
    };
  };
};
