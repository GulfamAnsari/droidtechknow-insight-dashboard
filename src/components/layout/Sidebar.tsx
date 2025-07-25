
import { NavLink } from "react-router-dom";
import { BarChart3, FileText, MessageSquare, X, CheckSquare, BookOpen, Cloud, Home, Menu, Music, Apple, Video, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const Sidebar = ({ open, setOpen }: SidebarProps) => {
  const isMobile = useIsMobile();
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);
  
  const navigation = [
    {
      name: "Dashboard",
      href: "/",
      icon: Home,
    },
     {
      name: "Todo",
      href: "/todo",
      icon: CheckSquare,
    },
    {
      name: "Music",
      href: "/music",
      icon: Music,
    },
    {
      name: "Food Tracker",
      href: "/food-tracker",
      icon: Apple,
    },
    {
      name: "Expense Manager",
      href: "/expense-manager",
      icon: CreditCard,
    },
    {
      name: "Screen Recorder",
      href: "/screen-recorder",
      icon: Video,
    },
    {
      name: "My Cloud",
      href: "/myfiles",
      icon: Cloud,
    },
    {
      name: "Notepad",
      href: "/notepad",
      icon: BookOpen,
    },
    {
      name: "Articles",
      href: "/articles",
      icon: FileText,
    },
    {
      name: "Feedback",
      href: "/feedback",
      icon: MessageSquare,
    },
    {
      name: "Analytics",
      href: "/analytics",
      icon: BarChart3,
    },
  ];

  const SidebarContent = () => (
    <div className="h-full flex flex-col">
      {/* Sidebar header - removed Home icon here */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        <span className="text-lg font-semibold">Navigation</span>
        <button
          onClick={() => setOpen(false)}
          className="text-sidebar-foreground hover:text-white"
        >
          <X size={24} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {navigation.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center px-4 py-2 text-sm rounded-md transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )
                }
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );

  // For mobile devices use Drawer component
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="h-[90vh] fixed inset-y-0 left-0 w-72">
          <SidebarContent />
        </DrawerContent>
      </Drawer>
    );
  }

  // For desktop devices - icon sidebar with hover expansion
  return (
    <>
      {/* Icon-only sidebar for desktop - don't take visible space */}
      <aside className="fixed inset-y-0 top-14 left-0 z-50 w-16 bg-sidebar border-r border-border transition-all duration-300 flex flex-col items-center py-4">
        <div className="mb-6">
          <NavLink to="/" className="flex justify-center">
            <Home className="h-6 w-6 text-primary" />
          </NavLink>
        </div>
        <div className="flex-1 w-full">
          <ul className="space-y-6 mt-2">
            {navigation.slice(1).map((item, index) => (
              <li 
                key={item.name} 
                className="relative"
                onMouseEnter={() => setHoveredItem(index)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <NavLink
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      "flex justify-center items-center w-12 h-12 mx-auto rounded-full transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )
                  }
                >
                  <item.icon className="h-5 w-5" />
                </NavLink>
                
                {/* Expandable tooltip/label on hover */}
                {hoveredItem === index && (
                  <div 
                    className="absolute left-16 top-0 z-50 bg-popover shadow-lg rounded-md px-4 py-2 min-w-40 whitespace-nowrap animate-fade-in"
                  >
                    <div className="font-medium">{item.name}</div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </aside>
      
      {/* Full sidebar when explicitly opened (via button) */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75"
            onClick={() => setOpen(false)}
          />
          <aside
            className="fixed inset-y-0 left-16 z-50 w-64 bg-sidebar transform transition-transform duration-300 ease-in-out"
          >
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
};

export default Sidebar;
