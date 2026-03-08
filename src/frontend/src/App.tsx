import { Toaster } from "@/components/ui/sonner";
import { useState } from "react";
import TopNav from "./components/TopNav";
import AttendancePage from "./pages/AttendancePage";
import ManagerPage from "./pages/ManagerPage";
import MyAttendancePage from "./pages/MyAttendancePage";
import RegisterPage from "./pages/RegisterPage";

export type PageId = "register" | "attendance" | "my-attendance" | "manager";

export default function App() {
  const [activePage, setActivePage] = useState<PageId>("register");

  const renderPage = () => {
    switch (activePage) {
      case "register":
        return <RegisterPage />;
      case "attendance":
        return <AttendancePage />;
      case "my-attendance":
        return <MyAttendancePage />;
      case "manager":
        return <ManagerPage />;
      default:
        return <RegisterPage />;
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "oklch(0.96 0.008 240)" }}
    >
      {/* Top Navigation */}
      <TopNav activePage={activePage} onNavigate={setActivePage} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div key={activePage} className="page-enter">
          {renderPage()}
        </div>
      </main>

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
