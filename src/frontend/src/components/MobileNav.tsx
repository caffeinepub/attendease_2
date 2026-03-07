import { Calendar, Camera, Home, Shield, UserPlus } from "lucide-react";
import type { PageId } from "../App";

interface MobileNavProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}

const navItems: { id: PageId; label: string; icon: React.ReactNode }[] = [
  { id: "home", label: "Home", icon: <Home size={20} /> },
  { id: "register", label: "Register", icon: <UserPlus size={20} /> },
  { id: "attendance", label: "Attend", icon: <Camera size={20} /> },
  { id: "my-attendance", label: "My Log", icon: <Calendar size={20} /> },
  { id: "manager", label: "Manager", icon: <Shield size={20} /> },
];

export default function MobileNav({ activePage, onNavigate }: MobileNavProps) {
  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {navItems.map((item) => {
        const isActive = activePage === item.id;
        return (
          <button
            type="button"
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className="flex flex-col items-center gap-0.5 px-3 py-1 transition-all"
            style={{
              color: isActive ? "oklch(var(--gold))" : "oklch(0.55 0.04 255)",
            }}
            data-ocid={`mobile.nav.${item.id}.link`}
            aria-current={isActive ? "page" : undefined}
          >
            <span
              className={`p-1 rounded-lg transition-all ${isActive ? "bg-white/10" : ""}`}
            >
              {item.icon}
            </span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
