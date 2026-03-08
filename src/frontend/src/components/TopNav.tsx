import { Calendar, Camera, CheckCircle, Shield, UserPlus } from "lucide-react";
import type { PageId } from "../App";

interface TopNavProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}

const navItems: {
  id: PageId;
  label: string;
  icon: React.ReactNode;
  ocid: string;
}[] = [
  {
    id: "register",
    label: "Register",
    icon: <UserPlus size={16} />,
    ocid: "nav.register.link",
  },
  {
    id: "attendance",
    label: "Mark Attendance",
    icon: <Camera size={16} />,
    ocid: "nav.attendance.link",
  },
  {
    id: "my-attendance",
    label: "My Attendance",
    icon: <Calendar size={16} />,
    ocid: "nav.myattendance.link",
  },
  {
    id: "manager",
    label: "Manager Portal",
    icon: <Shield size={16} />,
    ocid: "nav.manager.link",
  },
];

export default function TopNav({ activePage, onNavigate }: TopNavProps) {
  return (
    <header
      className="top-nav"
      style={{ background: "oklch(var(--navy))" }}
      aria-label="Main navigation"
    >
      {/* Brand */}
      <div className="top-nav-brand">
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
          style={{ background: "oklch(var(--gold))" }}
        >
          <CheckCircle size={18} style={{ color: "oklch(0.12 0.04 255)" }} />
        </div>
        <span className="font-display font-bold text-white text-lg tracking-tight hidden sm:block">
          AttendEase
        </span>
      </div>

      {/* Nav Buttons */}
      <nav className="top-nav-buttons" aria-label="Portal navigation">
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`top-nav-btn ${isActive ? "top-nav-btn--active" : ""}`}
              data-ocid={item.ocid}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}
