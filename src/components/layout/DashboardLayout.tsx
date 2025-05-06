
import { useState, useEffect } from "react";
import { Outlet, useOutletContext, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { RefreshCw, Settings, LogOut, Moon, Sun, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Toaster } from "@/components/ui/sonner";
import { useTheme } from "@/hooks/use-theme";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

type DashboardContextType = {
  refreshData: () => void;
  isRefreshing: boolean;
};

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  // Close sidebar by default on navigation when on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  const refreshData = () => {
    setIsRefreshing(true);
    // This will be used by child components through context
    // They'll hook into this and perform their refresh operations
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Define pages where refresh button should be hidden
  const hideRefreshButton = ['/todo', '/myfiles', '/notepad', '/articles'].includes(location.pathname);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Toaster position={isMobile ? "bottom-center" : "top-right"} />
      
      {/* Global Header */}
      <header className="h-14 border-b flex items-center justify-between px-4 bg-background">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold">DTK Dashboard</h2>
        </div>
        
        <div className="flex items-center">
          {!hideRefreshButton && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshData}
              disabled={isRefreshing}
              className="gap-2 mr-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {!isMobile && "Refresh"}
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <UserCircle className="h-6 w-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={toggleTheme}>
                {theme === "dark" ? (
                  <>
                    <Sun className="mr-2 h-4 w-4" />
                    <span>Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="mr-2 h-4 w-4" />
                    <span>Dark Mode</span>
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
        <main className="flex-1 flex flex-col w-full h-[calc(100vh-3.5rem)] overflow-hidden">
          <div className="flex-1 overflow-x-hidden overflow-y-auto">
            <Outlet context={{ refreshData, isRefreshing }} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;

export function useDashboard() {
  return useOutletContext<DashboardContextType>();
}
