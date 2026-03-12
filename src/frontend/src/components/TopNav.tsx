import type { PageId } from "../App";

interface TopNavProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}

export default function TopNav({ activePage, onNavigate }: TopNavProps) {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border shadow-xs">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <span className="font-semibold text-foreground tracking-tight">
            AttendEase
          </span>
        </div>
        <nav className="flex items-center gap-1" aria-label="Main navigation">
          <button
            type="button"
            data-ocid="nav.attendance_view.link"
            onClick={() => onNavigate("attendance-view")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activePage === "attendance-view"
                ? "bg-primary text-white"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            Attendance View
          </button>
          <button
            type="button"
            data-ocid="nav.manager_portal.link"
            onClick={() => onNavigate("manager")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activePage === "manager"
                ? "bg-primary text-white"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            Manager Portal
          </button>
        </nav>
      </div>
    </header>
  );
}
