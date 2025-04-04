
import { Menu } from "lucide-react";

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Header = ({ sidebarOpen, setSidebarOpen }: HeaderProps) => {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <button
          type="button"
          className="text-gray-500 hover:text-gray-600 lg:hidden"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <span className="sr-only">Open sidebar</span>
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex-1 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-900 ml-3 lg:ml-0">
            DroidTechKnow Insights
          </h1>
          <div className="ml-4 flex items-center md:ml-6">
            {/* Optional: Add user profile, notifications, etc. here */}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
