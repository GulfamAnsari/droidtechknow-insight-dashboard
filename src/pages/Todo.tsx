
import { useState } from "react";
import { TodoProvider } from "@/contexts/TodoContext";
import TodoSidebar from "@/components/todo/TodoSidebar";
import TodoMain from "@/components/todo/TodoMain";
import TodoDetails from "@/components/todo/TodoDetails";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDashboard } from "@/components/layout/DashboardLayout";

const Todo = () => {
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showMobileDetails, setShowMobileDetails] = useState(false);
  const isMobile = useIsMobile();
  const { refreshData } = useDashboard();
  
  return (
    <TodoProvider>
      <div className="h-[calc(100vh-8rem)] flex overflow-hidden rounded-lg shadow-sm border bg-background">
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
    </TodoProvider>
  );
};

export default Todo;
