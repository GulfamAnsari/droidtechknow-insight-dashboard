
import { useState, useEffect } from "react";
import { Outlet, useOutletContext } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Toaster } from "@/components/ui/sonner";

type DashboardContextType = {
  refreshData: () => void;
  isRefreshing: boolean;
};

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isMobile = useIsMobile();

  // Close sidebar on initial mobile load
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile]);

  const refreshData = () => {
    setIsRefreshing(true);
    // This will be used by child components through context
    // They'll hook into this and perform their refresh operations
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Toaster position={isMobile ? "bottom-center" : "top-right"} />
      <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
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
