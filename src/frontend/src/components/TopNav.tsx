import { ScanFace } from "lucide-react";
import type { PageId } from "../App";

interface TopNavProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}

export default function TopNav({ activePage, onNavigate }: TopNavProps) {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
            <ScanFace className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-extrabold text-foreground tracking-tight">
            AttendEase
          </span>
        </div>
        <nav className="flex items-center gap-1" aria-label="Main navigation">
          <button
            type="button"
            data-ocid="nav.attendance_view.link"
            onClick={() => onNavigate("attendance-view")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activePage === "attendance-view"
                ? "bg-primary text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            Attendance View
          </button>
          <button
            type="button"
            data-ocid="nav.manager_portal.link"
            onClick={() => onNavigate("manager")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activePage === "manager"
                ? "bg-primary text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            Manager Portal
          </button>
        </nav>
      </div>
    </header>
  );
}
