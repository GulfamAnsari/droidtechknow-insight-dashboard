import { useState, useEffect } from "react";
import { TodoProvider, useTodo } from "@/contexts/TodoContext";
import TodoSidebar from "@/components/todo/TodoSidebar";
import TodoMain from "@/components/todo/TodoMain";
import TodoDetails from "@/components/todo/TodoDetails";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDashboard } from "@/components/layout/DashboardLayout";
import { Maximize2, Minimize2, Plus, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import AddTaskDialog from "@/components/todo/AddTaskDialog";

const TodoContent = () => {
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showMobileDetails, setShowMobileDetails] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const isMobile = useIsMobile();
  const { refreshData } = useDashboard();
  const { state } = useTodo();
  
  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };
  
  return (
    <div 
      className={cn(
        "flex flex-col relative inner-container",
        isFullScreen ? "fixed inset-0 z-50 bg-background" : "h-[calc(100vh-8rem)]"
      )}
    >
      {/* Mobile sidebar toggle button */}
      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-4 z-30 h-10 w-10"
          onClick={() => setShowMobileSidebar(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}
      
      <div className="flex-1 flex overflow-hidden rounded-lg shadow-sm border bg-background">
        {/* Todo app layout with responsive design */}
        <TodoSidebar 
          isOpen={!isMobile || showMobileSidebar} 
          onClose={() => setShowMobileSidebar(false)}
          refreshData={refreshData}
          toggleFullScreen={toggleFullScreen}
          isFullScreen={isFullScreen}
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
      
      {/* Floating Add Task button */}
      <Button
        className="absolute bottom-6 left-1/2 transform -translate-x-1/2 rounded-full shadow-lg"
        size="lg"
        onClick={() => setShowAddTaskDialog(true)}
      >
        <Plus className="mr-2 h-5 w-5" /> Add Task
      </Button>
      
      {/* Add Task Dialog */}
      <AddTaskDialog 
        open={showAddTaskDialog} 
        onOpenChange={setShowAddTaskDialog} 
        listId={state.activeListId || "tasks"}
      />
    </div>
  );
};

const Todo = () => {
  return (
    <TodoProvider>
      <TodoContent />
    </TodoProvider>
  );
};

export default Todo;
