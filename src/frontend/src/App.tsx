import { Toaster } from "@/components/ui/sonner";
import { useState } from "react";
import MobileNav from "./components/MobileNav";
import Sidebar from "./components/Sidebar";
import AttendancePage from "./pages/AttendancePage";
import HomePage from "./pages/HomePage";
import ManagerPage from "./pages/ManagerPage";
import MyAttendancePage from "./pages/MyAttendancePage";
import RegisterPage from "./pages/RegisterPage";

export type PageId =
  | "home"
  | "register"
  | "attendance"
  | "my-attendance"
  | "manager";

export default function App() {
  const [activePage, setActivePage] = useState<PageId>("home");

  const renderPage = () => {
    switch (activePage) {
      case "home":
        return <HomePage />;
      case "register":
        return <RegisterPage />;
      case "attendance":
        return <AttendancePage />;
      case "my-attendance":
        return <MyAttendancePage />;
      case "manager":
        return <ManagerPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[oklch(0.96_0.008_240)]">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar activePage={activePage} onNavigate={setActivePage} />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div key={activePage} className="page-enter h-full">
          {renderPage()}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden">
        <MobileNav activePage={activePage} onNavigate={setActivePage} />
      </div>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            fontFamily: "Outfit, sans-serif",
          },
        }}
      />
    </div>
  );
}
