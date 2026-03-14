import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Search,
  TrendingUp,
  User,
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

  const attendanceRate =
    workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Hero Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold text-foreground mb-2 tracking-tight">
          My Attendance
        </h1>
        <p className="text-muted-foreground text-base">
          Enter your Employee ID to view your attendance records and salary.
        </p>
      </div>

      {/* Search Box */}
      <div className="bg-muted rounded-2xl p-5 mb-8">
        <p className="text-sm font-semibold text-foreground mb-3">
          Employee ID Lookup
        </p>
        <div className="flex gap-2">
          <Input
            data-ocid="attendance.search_input"
            placeholder="Enter Employee ID"
            value={inputId}
            onChange={(e) => setInputId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 bg-white border-border"
          />
          <Button
            data-ocid="attendance.search.primary_button"
            onClick={handleSearch}
            disabled={!inputId.trim()}
            className="rounded-xl px-5 font-semibold"
          >
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>
        </div>
      </div>

      {/* Results */}
      {searchedId && (
        <div className="space-y-5" data-ocid="attendance.section">
          {isLoading ? (
            <div data-ocid="attendance.loading_state" className="space-y-3">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
          ) : records.length === 0 ? (
            <div
              data-ocid="attendance.empty_state"
              className="bg-muted rounded-2xl p-12 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-background flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="font-semibold text-foreground mb-1">
                No records found
              </p>
              <p className="text-sm text-muted-foreground">
                No attendance found for Employee ID{" "}
                <strong>{searchedId}</strong>. Check the ID or ask your manager.
              </p>
            </div>
          ) : (
            <>
              {/* Employee Info */}
              <div className="bg-muted rounded-2xl p-5 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-extrabold text-foreground">
                    {employeeName}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {searchedId} &middot; {department}
                  </p>
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted rounded-2xl p-5">
                  <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-foreground">
                    {presentDays}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Present · {workingDays} working days
                  </p>
                </div>
                <div className="bg-muted rounded-2xl p-5">
                  <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center mb-3">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-2xl font-extrabold text-foreground">
                    {records.length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total records all time
                  </p>
                </div>
                <div className="bg-muted rounded-2xl p-5">
                  <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center mb-3">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-foreground">
                    {attendanceRate}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Attendance rate this month
                  </p>
                </div>
              </div>

              {/* Records Table */}
              <div className="bg-muted rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border/50">
                  <p className="font-bold text-foreground text-base">
                    Attendance Records
                  </p>
                </div>
                <div className="bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Date</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">
                          Check-in Time
                        </TableHead>
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
                                <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
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
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {!searchedId && (
        <div className="text-center py-20 text-muted-foreground">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-5">
            <Search className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="font-bold text-foreground text-lg">
            Enter your Employee ID above
          </p>
          <p className="text-sm mt-2">
            Your attendance records will appear here
          </p>
        </div>
      )}
    </div>
  );
}
