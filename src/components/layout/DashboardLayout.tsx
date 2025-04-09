
import { useState } from "react";
import { Outlet, useOutletContext } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useTheme } from "@/hooks/use-theme";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type DashboardContextType = {
  refreshData: () => void;
  isRefreshing: boolean;
};

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { theme } = useTheme();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshData = () => {
    setIsRefreshing(true);
    // This will be used by child components through context
    // They'll hook into this and perform their refresh operations
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className={`min-h-screen bg-background flex`}>
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-4 md:p-6">
          <div className="flex justify-end mb-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshData}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          <Outlet context={{ refreshData, isRefreshing }} />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;

export function useDashboard() {
  return useOutletContext<DashboardContextType>();
}
