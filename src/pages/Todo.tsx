
import { useState } from "react";
import { TodoProvider } from "@/contexts/TodoContext";
import TodoSidebar from "@/components/todo/TodoSidebar";
import TodoMain from "@/components/todo/TodoMain";
import TodoDetails from "@/components/todo/TodoDetails";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDashboard } from "@/components/layout/DashboardLayout";
import { Maximize2, Minimize2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import TaskAddDialog from "@/components/todo/TaskAddDialog";

const Todo = () => {
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showMobileDetails, setShowMobileDetails] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const isMobile = useIsMobile();
  const { refreshData } = useDashboard();
  
  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };
  
  return (
    <TodoProvider>
      <div 
        className={cn(
          "flex flex-col relative",
          isFullScreen ? "fixed inset-0 z-50 bg-background" : "h-[calc(100vh-8rem)]"
        )}
      >
        <div className="flex-1 flex overflow-hidden rounded-lg shadow-sm border bg-background">
          {/* Todo app layout with responsive design */}
          <TodoSidebar 
            isOpen={!isMobile || showMobileSidebar} 
            onClose={() => setShowMobileSidebar(false)}
            refreshData={refreshData}
          />
          
          <div className="flex-1 flex flex-col relative">
            {/* Fullscreen toggle button */}
            <div className="absolute top-2 right-2 z-10">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleFullScreen}
                className="ml-auto"
              >
                {isFullScreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </Button>
            </div>
            
            <TodoMain 
              selectedTodoId={selectedTodoId} 
              setSelectedTodoId={setSelectedTodoId}
              onOpenSidebar={() => setShowMobileSidebar(true)}
              onOpenDetails={() => setShowMobileDetails(true)}
              isMobile={isMobile}
            />
          </div>
          
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
        
        {/* Floating Add Task Button */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
          <Button 
            size="lg" 
            className="rounded-full shadow-lg px-6 flex items-center gap-2"
            onClick={() => setShowAddTaskDialog(true)}
          >
            <Plus className="h-5 w-5" /> Add Task
          </Button>
        </div>
      </div>
      
      {/* Add Task Dialog */}
      <TaskAddDialog 
        open={showAddTaskDialog} 
        onOpenChange={setShowAddTaskDialog} 
      />
    </TodoProvider>
  );
};

export default Todo;
