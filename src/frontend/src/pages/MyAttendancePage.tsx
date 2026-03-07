import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, Flame, Loader2, Search, TrendingUp } from "lucide-react";
import { useState } from "react";
import type { AttendanceRecord } from "../backend.d";
import { getCurrentMonth, useAttendanceByEmployee } from "../hooks/useQueries";

function calculateStreak(records: AttendanceRecord[]): number {
  if (records.length === 0) return 0;

  // Sort by date descending
  const sorted = [...records].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let currentDate = new Date(today);

  for (const record of sorted) {
    const recordDate = new Date(record.date);
    recordDate.setHours(0, 0, 0, 0);

    const diff = Math.floor(
      (currentDate.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diff === 0) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else if (diff === 1 && streak === 0) {
      // Allow starting streak from yesterday
      streak++;
      currentDate = new Date(recordDate);
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

function countThisMonth(records: AttendanceRecord[]): number {
  const month = getCurrentMonth();
  return records.filter((r) => r.date.startsWith(month)).length;
}

function formatDisplayDate(dateStr: string): string {
  try {
    const d = new Date(`${dateStr}T00:00:00`);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string): string {
  try {
    const parts = timeStr.split(":");
    if (parts.length >= 2) {
      const h = Number.parseInt(parts[0]);
      const m = parts[1];
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 || 12;
      return `${h12}:${m} ${ampm}`;
    }
    return timeStr;
  } catch {
    return timeStr;
  }
}

export default function MyAttendancePage() {
  const [lookupId, setLookupId] = useState("");
  const [searchId, setSearchId] = useState("");

  const {
    data: records,
    isLoading,
    isFetching,
  } = useAttendanceByEmployee(searchId);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (lookupId.trim()) {
      setSearchId(lookupId.trim());
    }
  };

  const sortedRecords = records
    ? [...records].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      )
    : [];
  const streak = records ? calculateStreak(records) : 0;
  const monthCount = records ? countThisMonth(records) : 0;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "oklch(0.55 0.13 240)" }}
        >
          <Calendar size={18} className="text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">
            My Attendance
          </h2>
          <p className="text-sm text-muted-foreground">
            View your attendance history
          </p>
        </div>
      </div>

      {/* Lookup Form */}
      <form onSubmit={handleSearch} className="form-section mb-6">
        <div className="flex gap-3 items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="myatt-id" className="text-sm font-semibold">
              Employee ID
            </Label>
            <Input
              id="myatt-id"
              type="text"
              placeholder="Enter your employee ID (e.g. EMP-001)"
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
              data-ocid="myattendance.id_input"
            />
          </div>
          <Button
            type="submit"
            disabled={!lookupId.trim() || isLoading}
            className="h-10 px-6 font-semibold"
            style={{
              background: "oklch(var(--navy))",
              color: "white",
            }}
            data-ocid="myattendance.search_button"
          >
            {isLoading || isFetching ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <Search size={14} className="mr-2" />
                View Records
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Loading State */}
      {(isLoading || isFetching) && searchId && (
        <div
          className="form-section space-y-3"
          data-ocid="myattendance.loading_state"
        >
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {/* Empty Results */}
      {!isLoading &&
        !isFetching &&
        searchId &&
        records !== undefined &&
        records.length === 0 && (
          <div
            className="form-section flex flex-col items-center justify-center py-16 text-center"
            data-ocid="myattendance.empty_state"
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "oklch(var(--navy) / 0.06)" }}
            >
              <Calendar
                size={24}
                style={{ color: "oklch(var(--navy) / 0.4)" }}
              />
            </div>
            <p className="text-base font-semibold text-foreground mb-1">
              No records found
            </p>
            <p className="text-sm text-muted-foreground">
              No attendance records for employee ID &ldquo;{searchId}&rdquo;.
              Make sure the ID is correct.
            </p>
          </div>
        )}

      {/* Records View */}
      {!isLoading &&
        !isFetching &&
        searchId &&
        records !== undefined &&
        records.length > 0 && (
          <div>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="stat-card">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "oklch(0.65 0.17 145 / 0.12)" }}
                  >
                    <TrendingUp
                      size={18}
                      style={{ color: "oklch(0.55 0.17 145)" }}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">This Month</p>
                    <p className="text-2xl font-display font-bold text-foreground">
                      {monthCount}
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        days
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="streak-badge">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "oklch(var(--gold) / 0.15)" }}
                  >
                    <Flame size={18} style={{ color: "oklch(var(--gold))" }} />
                  </div>
                  <div>
                    <p
                      className="text-xs"
                      style={{ color: "oklch(0.5 0.05 60)" }}
                    >
                      Current Streak
                    </p>
                    <p
                      className="text-2xl font-display font-bold"
                      style={{ color: "oklch(var(--gold))" }}
                    >
                      {streak}
                      <span
                        className="text-sm font-normal ml-1"
                        style={{ color: "oklch(0.6 0.08 70)" }}
                      >
                        {streak === 1 ? "day" : "days"}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div
              className="bg-white rounded-xl border border-border overflow-hidden shadow-card"
              data-ocid="myattendance.table"
            >
              <div className="px-6 py-4 border-b border-border">
                <p className="text-sm font-semibold text-foreground">
                  Attendance History —{" "}
                  <span className="text-muted-foreground font-normal">
                    {records.length} records total
                  </span>
                </p>
              </div>
              <div className="overflow-x-auto">
                <Table className="data-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Check-in Time</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedRecords.map((record, idx) => (
                      <TableRow
                        key={`${record.employeeId}-${record.date}`}
                        data-ocid={`myattendance.row.${idx + 1}`}
                      >
                        <TableCell className="font-medium text-sm">
                          {formatDisplayDate(record.date)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatTime(record.checkInTime)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {record.department}
                        </TableCell>
                        <TableCell>
                          <span className="badge-present">{record.status}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
