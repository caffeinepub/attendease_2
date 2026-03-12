import { Toaster } from "@/components/ui/sonner";
import { useState } from "react";
import TopNav from "./components/TopNav";
import AttendanceViewPage from "./pages/AttendanceViewPage";
import ManagerPortalPage from "./pages/ManagerPortalPage";

export type PageId = "attendance-view" | "manager";

export default function App() {
  const [activePage, setActivePage] = useState<PageId>("attendance-view");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopNav activePage={activePage} onNavigate={setActivePage} />
      <main className="flex-1">
        <div key={activePage} className="page-enter">
          {activePage === "attendance-view" ? (
            <AttendanceViewPage />
          ) : (
            <ManagerPortalPage />
          )}
        </div>
      </main>
      <footer className="py-4 text-center text-xs text-muted-foreground border-t border-border">
        © {new Date().getFullYear()}.{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-primary transition-colors"
        >
          Built with ❤️ using caffeine.ai
        </a>
      </footer>
      <Toaster position="top-right" />
    </div>
  );
}
