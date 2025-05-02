
import { useState, useEffect } from "react";
import { Outlet, useOutletContext, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
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
  const location = useLocation();

  // Close sidebar by default
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const refreshData = () => {
    setIsRefreshing(true);
    // This will be used by child components through context
    // They'll hook into this and perform their refresh operations
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Toaster position={isMobile ? "bottom-center" : "top-right"} />
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <main className="flex-1 flex flex-col w-full h-screen overflow-hidden">
        <div className="absolute top-4 right-4 z-30">
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
        <div className="flex-1 overflow-x-hidden overflow-y-auto">
          <Outlet context={{ refreshData, isRefreshing }} />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;

export function useDashboard() {
  return useOutletContext<DashboardContextType>();
}
