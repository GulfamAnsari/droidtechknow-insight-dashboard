import { useState, useEffect } from "react";
import { Outlet, useOutletContext, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import {
  RefreshCw,
  Settings,
  LogOut,
  Moon,
  Sun,
  UserCircle,
  Minimize2,
  Maximize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Toaster } from "@/components/ui/sonner";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/contexts/AuthContext";
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
  const { user, logout } = useAuth();

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
  const hideRefreshButton = [
    "/todo",
    "/myfiles",
    "/notepad",
    "/articles",
    "/music"
  ].includes(location.pathname);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const [isFullscreen, setIsFullscreen] = useState(false);
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col">
      <Toaster position={isMobile ? "bottom-center" : "top-right"} />

      {/* Global Header */}
      <header className="h-14 border-b flex items-center justify-between px-4 bg-background bg-sidebar">
        <div className="text-lg font-semibold">
          {isMobile
            ? "DroidTechKnow Insights"
            : user && `Welcome, ${user.username}`}
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
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {!isMobile && "Refresh"}
            </Button>
          )}

          <Button
            onClick={toggleFullscreen}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
            <span className="hidden md:inline">
              {isFullscreen ? "Exit" : "Fullscreen"}
            </span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <UserCircle />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                {isMobile && user ? `Welcome, ${user.username}` : "My Account"}
              </DropdownMenuLabel>
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
              <DropdownMenuItem onClick={logout}>
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
          <div
            className={
              !isMobile
                ? "ml-16 flex-1 overflow-hidden "
                : "flex-1 overflow-hidden "
            }
          >
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
