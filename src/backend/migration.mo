import List "mo:core/List";
import Nat "mo:core/Nat";
import Order "mo:core/Order";
import Text "mo:core/Text";
import Iter "mo:core/Iter";

module {
  type Employee = {
    employeeId : Text;
    name : Text;
    department : Text;
    role : Text;
    photoData : Text;
    registeredAt : Text;
    approvalStatus : Text;
  };

  type Holiday = {
    date : Text;
    reason : Text;
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

  type OldActor = {
    employees : [Employee];
    attendanceRecords : [AttendanceRecord];
  };

  type NewActor = {
    employees : List.List<Employee>;
    attendanceRecords : List.List<AttendanceRecord>;
    holidays : List.List<Holiday>;
  };

  public func run(old : OldActor) : NewActor {
    let holidays = List.empty<Holiday>();
    {
      employees = List.fromArray(old.employees);
      attendanceRecords = List.fromArray(old.attendanceRecords);
      holidays;
    };
  };
};
