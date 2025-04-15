
import { useState } from "react";
import { TodoProvider } from "@/contexts/TodoContext";
import TodoSidebar from "@/components/todo/TodoSidebar";
import TodoMain from "@/components/todo/TodoMain";
import TodoDetails from "@/components/todo/TodoDetails";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDashboard } from "@/components/layout/DashboardLayout";
import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const Todo = () => {
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showMobileDetails, setShowMobileDetails] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const isMobile = useIsMobile();
  const { refreshData } = useDashboard();
  
  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };
  
  return (
    <TodoProvider>
      <div 
        className={cn(
          "flex flex-col",
          isFullScreen ? "fixed inset-0 z-50 bg-background" : "h-[calc(100vh-8rem)]"
        )}
      >
        {/* Fullscreen toggle button */}
        <div className="flex justify-end p-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleFullScreen}
            className="ml-auto"
          >
            {isFullScreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </Button>
        </div>
        
        <div className="flex-1 flex overflow-hidden rounded-lg shadow-sm border bg-background">
          {/* Todo app layout with responsive design */}
          <TodoSidebar 
            isOpen={!isMobile || showMobileSidebar} 
            onClose={() => setShowMobileSidebar(false)}
            refreshData={refreshData}
          />
          
          <TodoMain 
            selectedTodoId={selectedTodoId} 
            setSelectedTodoId={setSelectedTodoId}
            onOpenSidebar={() => setShowMobileSidebar(true)}
            onOpenDetails={() => setShowMobileDetails(true)}
            isMobile={isMobile}
          />
          
          {(selectedTodoId && (!isMobile || showMobileDetails)) && (
            <TodoDetails 
              todoId={selectedTodoId}
              onClose={() => {
                if (isMobile) {
                  setShowMobileDetails(false);
                } else {
                  setSelectedTodoId(null);
                }
              }}
            />
          )}
        </div>
      </div>
    </TodoProvider>
  );
};

// Import the missing cn function
import { cn } from "@/lib/utils";

export default Todo;
