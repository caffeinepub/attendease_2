import {
  Calendar,
  Camera,
  CheckCircle,
  Home,
  Shield,
  UserPlus,
} from "lucide-react";
import type { PageId } from "../App";

interface SidebarProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}

const navItems: { id: PageId; label: string; icon: React.ReactNode }[] = [
  { id: "home", label: "Dashboard", icon: <Home size={18} /> },
  { id: "register", label: "Register Employee", icon: <UserPlus size={18} /> },
  { id: "attendance", label: "Mark Attendance", icon: <Camera size={18} /> },
  { id: "my-attendance", label: "My Attendance", icon: <Calendar size={18} /> },
  { id: "manager", label: "Manager Dashboard", icon: <Shield size={18} /> },
];

export default function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <nav
      className="app-sidebar flex flex-col"
      style={{ background: "oklch(var(--navy))" }}
      aria-label="Main navigation"
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
        <div
          className="flex items-center justify-center w-9 h-9 rounded-lg"
          style={{ background: "oklch(var(--gold))" }}
        >
          <CheckCircle size={20} style={{ color: "oklch(0.12 0.04 255)" }} />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-white tracking-tight leading-none">
            AttendEase
          </h1>
          <p
            className="text-xs mt-0.5"
            style={{ color: "oklch(0.55 0.04 255)" }}
          >
            Attendance Management
          </p>
        </div>
      </div>

      {/* Nav Items */}
      <div className="flex-1 py-4">
        <p
          className="text-xs font-semibold uppercase tracking-widest px-6 mb-2"
          style={{ color: "oklch(0.45 0.04 255)" }}
        >
          Navigation
        </p>
        {navItems.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`app-sidebar-item w-full text-left ${activePage === item.id ? "active" : ""}`}
            data-ocid={`nav.${item.id}.link`}
            aria-current={activePage === item.id ? "page" : undefined}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            <span className="text-sm">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-white/10">
        <p className="text-xs" style={{ color: "oklch(0.4 0.03 255)" }}>
          © {new Date().getFullYear()}. Built with{" "}
          <span style={{ color: "oklch(var(--gold))" }}>♥</span> using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
            style={{ color: "oklch(var(--gold))" }}
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </nav>
  );
}
