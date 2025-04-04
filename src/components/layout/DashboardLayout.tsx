
import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useTheme } from "@/hooks/use-theme";

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { theme } = useTheme();

  return (
    <ThemeProvider defaultTheme="light" storageKey="ui-theme">
      <div className={`min-h-screen bg-background flex`}>
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
};

export default DashboardLayout;
