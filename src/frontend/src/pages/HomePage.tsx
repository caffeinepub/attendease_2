import { Skeleton } from "@/components/ui/skeleton";
import { Activity, CheckCircle, Clock, TrendingUp, Users } from "lucide-react";
import { useRecentAttendance, useStats } from "../hooks/useQueries";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(timeStr: string): string {
  try {
    const d = new Date(timeStr);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    // If it's already a time string like "09:30:00"
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

export default function HomePage() {
  const now = new Date();
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: recent, isLoading: recentLoading } = useRecentAttendance(5n);

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Hero Date Card */}
      <div className="hero-date-card mb-8">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle size={16} style={{ color: "oklch(var(--gold))" }} />
            <span
              className="text-sm font-semibold tracking-wide"
              style={{ color: "oklch(var(--gold))" }}
            >
              Today
            </span>
          </div>
          <h2 className="text-3xl font-display font-bold text-white leading-tight">
            {formatDate(now)}
          </h2>
          <p className="text-white/50 text-sm mt-1">
            {now.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <section aria-label="Statistics overview" className="mb-8">
        <h3
          className="text-xs font-semibold uppercase tracking-widest mb-4"
          style={{ color: "oklch(0.5 0.04 255)" }}
        >
          Quick Overview
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Employees */}
          <div className="stat-card" data-ocid="home.stats.card">
            {statsLoading ? (
              <div data-ocid="home.stats.loading_state">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-16" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Employees
                  </p>
                  <span
                    className="p-2 rounded-lg"
                    style={{ background: "oklch(var(--navy) / 0.06)" }}
                  >
                    <Users size={16} style={{ color: "oklch(var(--navy))" }} />
                  </span>
                </div>
                <p className="text-3xl font-display font-bold text-foreground">
                  {stats?.totalEmployees?.toString() ?? "0"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Registered on platform
                </p>
              </>
            )}
          </div>

          {/* Today Check-ins */}
          <div className="stat-card" data-ocid="home.today.card">
            {statsLoading ? (
              <div>
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-16" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    Check-ins Today
                  </p>
                  <span
                    className="p-2 rounded-lg"
                    style={{ background: "oklch(var(--gold) / 0.1)" }}
                  >
                    <Clock size={16} style={{ color: "oklch(var(--gold))" }} />
                  </span>
                </div>
                <p className="text-3xl font-display font-bold text-foreground">
                  {stats?.todayCheckIns?.toString() ?? "0"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Marked present today
                </p>
              </>
            )}
          </div>

          {/* Month Check-ins */}
          <div className="stat-card" data-ocid="home.month.card">
            {statsLoading ? (
              <div>
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-16" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    This Month
                  </p>
                  <span
                    className="p-2 rounded-lg"
                    style={{ background: "oklch(0.65 0.17 145 / 0.1)" }}
                  >
                    <TrendingUp
                      size={16}
                      style={{ color: "oklch(0.55 0.17 145)" }}
                    />
                  </span>
                </div>
                <p className="text-3xl font-display font-bold text-foreground">
                  {stats?.monthCheckIns?.toString() ?? "0"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Check-ins this month
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      <section aria-label="Recent activity">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={16} style={{ color: "oklch(var(--navy))" }} />
          <h3
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "oklch(0.5 0.04 255)" }}
          >
            Recent Activity
          </h3>
        </div>

        <div
          className="bg-white rounded-xl border border-border overflow-hidden shadow-card"
          data-ocid="home.activity.card"
        >
          {recentLoading ? (
            <div
              className="p-6 space-y-4"
              data-ocid="home.activity.loading_state"
            >
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          ) : !recent || recent.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 px-6 text-center"
              data-ocid="home.activity.empty_state"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "oklch(var(--navy) / 0.06)" }}
              >
                <Activity
                  size={24}
                  style={{ color: "oklch(var(--navy) / 0.4)" }}
                />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                No activity yet
              </p>
              <p className="text-xs text-muted-foreground">
                Attendance records will appear here once employees start
                checking in.
              </p>
            </div>
          ) : (
            <div>
              {recent.map((record, idx) => (
                <div
                  key={`${record.employeeId}-${record.date}-${record.checkInTime}`}
                  className="flex items-center gap-4 px-6 py-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  data-ocid={`home.activity.item.${idx + 1}`}
                >
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ background: "oklch(var(--navy))" }}
                  >
                    {record.employeeName.charAt(0).toUpperCase()}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {record.employeeName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ID: {record.employeeId} · {record.department}
                    </p>
                  </div>

                  {/* Time */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-medium text-foreground">
                      {formatTime(record.checkInTime)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {record.date}
                    </p>
                  </div>

                  {/* Status */}
                  <span className="badge-present flex-shrink-0">
                    {record.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
