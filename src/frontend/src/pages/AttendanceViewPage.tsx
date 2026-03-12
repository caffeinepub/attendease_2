import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  CheckCircle2,
  Clock,
  IndianRupee,
  Search,
} from "lucide-react";
import { useState } from "react";
import {
  countWorkingDaysExcludingSundays,
  getCurrentMonth,
  useAttendanceByEmployee,
  useHolidays,
} from "../hooks/useQueries";

export default function AttendanceViewPage() {
  const [inputId, setInputId] = useState("");
  const [searchedId, setSearchedId] = useState("");

  const { data: records = [], isLoading } = useAttendanceByEmployee(searchedId);
  const { data: holidays = [] } = useHolidays();

  const currentMonth = getCurrentMonth();
  const holidayDates = new Set(holidays.map((h) => h.date));
  const workingDays = countWorkingDaysExcludingSundays(
    currentMonth,
    holidayDates,
  );

  const thisMonthRecords = records.filter((r) =>
    r.date.startsWith(currentMonth),
  );
  const presentDays = thisMonthRecords.filter(
    (r) => r.status === "present",
  ).length;

  // Find salary from records (use first record that has a salary context)
  // The earned salary logic: backend sends it via MonthEndReport, but here we just
  // show attendance. For salary, we'll compute client-side using the employee's monthlyPayment
  // from getAllEmployees — but we don't have that here. Instead show presentDays/workingDays.

  const handleSearch = () => {
    if (inputId.trim()) {
      setSearchedId(inputId.trim());
    }
  };

  const employeeName = records[0]?.employeeName ?? "";
  const department = records[0]?.department ?? "";

  const sortedRecords = [...records].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">
          My Attendance
        </h1>
        <p className="text-muted-foreground text-sm">
          Enter your Employee ID to view your attendance records and salary.
        </p>
      </div>

      {/* Search */}
      <Card className="mb-6 shadow-card">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              data-ocid="attendance.search_input"
              placeholder="Enter Employee ID (e.g. EMP001)"
              value={inputId}
              onChange={(e) => setInputId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <Button
              data-ocid="attendance.search.primary_button"
              onClick={handleSearch}
              disabled={!inputId.trim()}
            >
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {searchedId && (
        <div className="space-y-4" data-ocid="attendance.section">
          {isLoading ? (
            <div data-ocid="attendance.loading_state" className="space-y-3">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          ) : records.length === 0 ? (
            <Card data-ocid="attendance.empty_state" className="shadow-card">
              <CardContent className="py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <Search className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">
                  No records found for Employee ID <strong>{searchedId}</strong>
                  .
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Check the ID or ask your manager.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Employee Info */}
              <Card className="shadow-card">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-semibold text-sm">
                        {employeeName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {employeeName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {searchedId} · {department}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* This Month Stats */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Card className="shadow-card">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      <span className="text-xs text-muted-foreground">
                        Present (This Month)
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                      {presentDays}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      of {workingDays} working days
                    </p>
                  </CardContent>
                </Card>
                <Card className="shadow-card">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span className="text-xs text-muted-foreground">
                        Total Records
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                      {records.length}
                    </p>
                    <p className="text-xs text-muted-foreground">all time</p>
                  </CardContent>
                </Card>
                <Card className="shadow-card col-span-2 sm:col-span-1">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <IndianRupee className="w-4 h-4 text-gold" />
                      <span className="text-xs text-muted-foreground">
                        Attendance Rate
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                      {workingDays > 0
                        ? Math.round((presentDays / workingDays) * 100)
                        : 0}
                      %
                    </p>
                    <p className="text-xs text-muted-foreground">this month</p>
                  </CardContent>
                </Card>
              </div>

              {/* Records Table */}
              <Card className="shadow-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Attendance Records
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Check-in Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedRecords.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="text-center text-muted-foreground py-8"
                          >
                            No attendance records yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        sortedRecords.map((rec, idx) => (
                          <TableRow
                            key={`${rec.date}-${rec.checkInTime}`}
                            data-ocid={`attendance.item.${idx + 1}`}
                          >
                            <TableCell className="font-medium">
                              {rec.date}
                            </TableCell>
                            <TableCell>
                              {rec.status === "holiday" ? (
                                <Badge
                                  variant="outline"
                                  className="text-amber-600 border-amber-300 bg-amber-50"
                                >
                                  Holiday
                                </Badge>
                              ) : (
                                <Badge className="bg-success/10 text-success border-success/20">
                                  Present
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {rec.checkInTime || "—"}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {!searchedId && (
        <div className="text-center py-16 text-muted-foreground">
          <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mx-auto mb-4">
            <Search className="w-7 h-7 text-primary/40" />
          </div>
          <p className="font-medium">Enter your Employee ID above</p>
          <p className="text-sm mt-1">
            Your attendance records will appear here
          </p>
        </div>
      )}
    </div>
  );
}
