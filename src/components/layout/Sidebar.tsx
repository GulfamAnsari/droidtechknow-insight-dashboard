
import { NavLink } from "react-router-dom";
import { BarChart3, FileText, MessageSquare, X, CheckSquare, BookOpen, Cloud, AlignLeft, File } from "lucide-react";
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
  
  const navItems = [
    {
      name: "Dashboard",
      href: "/",
      icon: BarChart3,
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
    {
      name: "Todo",
      href: "/todo",
      icon: CheckSquare,
    },
    {
      name: "Notepad",
      href: "/notepad",
      icon: BookOpen,
    },
    {
      name: "My Cloud",
      href: "/myfiles",
      icon: Cloud,
    },
    {
      name: "Documents",
      href: "/documents",
      icon: File,
      badge: "New"
    }
  ];

  const SidebarContent = () => (
    <div className="h-full flex flex-col">
      {/* Sidebar header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        <div className="flex items-center">
          <span className="text-xl font-bold text-sidebar-foreground">
            DTK Dashboard
          </span>
        </div>
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
          {navItems.map((item) => (
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
                {item.badge && (
                  <Badge variant="blue" className="ml-auto">
                    {item.badge}
                  </Badge>
                )}
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
      <>
        <div className="fixed left-0 top-1/2 transform -translate-y-1/2 z-40">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-12 w-12 rounded-full shadow-lg bg-background border-primary"
            onClick={() => setOpen(true)}
          >
            <AlignLeft className="h-6 w-6" />
          </Button>
        </div>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="h-[90vh] fixed inset-y-0 left-0 w-72">
            <SidebarContent />
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  // For desktop devices - icon sidebar with hover expansion
  return (
    <>
      {/* Icon-only sidebar for desktop */}
      <aside className="fixed inset-y-0 left-0 z-50 w-16 bg-sidebar border-r border-border transition-all duration-300 flex flex-col items-center py-4">
        <div className="flex-1 w-full">
          <ul className="space-y-6 mt-8">
            {navItems.map((item, index) => (
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
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] text-white">
                      •
                    </span>
                  )}
                </NavLink>
                
                {/* Expandable tooltip/label on hover */}
                {hoveredItem === index && (
                  <div 
                    className="absolute left-16 top-0 z-50 bg-popover shadow-lg rounded-md px-4 py-2 min-w-40 whitespace-nowrap animate-fade-in"
                  >
                    <div className="font-medium">{item.name}</div>
                    {item.badge && (
                      <Badge variant="blue" className="mt-1">
                        {item.badge}
                      </Badge>
                    )}
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

      {/* Sidebar toggle button */}
      <div className="fixed left-4 top-4 z-50">
        <Button 
          variant="outline" 
          size="icon" 
          className="h-10 w-10 rounded-full shadow-lg bg-background border-primary"
          onClick={() => setOpen(!open)}
        >
          <AlignLeft className="h-5 w-5" />
        </Button>
      </div>
    </>
  );
};

export default Sidebar;
