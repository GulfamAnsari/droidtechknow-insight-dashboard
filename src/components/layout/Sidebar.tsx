
import { NavLink } from "react-router-dom";
import { BarChart3, FileText, MessageSquare, Menu, X, CheckSquare, BookOpen, Image, AlignLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const Sidebar = ({ open, setOpen }: SidebarProps) => {
  const isMobile = useIsMobile();
  
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
      name: "Photo Gallery",
      href: "/gallery",
      icon: Image,
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

  // For desktop devices
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

      {/* Desktop sidebar */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75"
            onClick={() => setOpen(false)}
          />
          <aside
            className="fixed inset-y-0 left-0 z-50 w-64 bg-sidebar transform transition-transform duration-300 ease-in-out"
          >
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
};

export default Sidebar;
