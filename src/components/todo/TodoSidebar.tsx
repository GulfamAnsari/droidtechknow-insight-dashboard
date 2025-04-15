
import { useTodo } from "@/contexts/TodoContext";
import { TodoList } from "@/types/todo";
import { 
  CalendarClock, 
  CheckSquare, 
  ListPlus, 
  Star, 
  Sun, 
  Plus, 
  Calendar,
  RefreshCw,
  X,
  Maximize2,
  Minimize2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";

interface TodoSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  refreshData: () => void;
  toggleFullScreen: () => void;
  isFullScreen: boolean;
}

const TodoSidebar = ({ isOpen, onClose, refreshData, toggleFullScreen, isFullScreen }: TodoSidebarProps) => {
  const { state, dispatch } = useTodo();
  const [newListName, setNewListName] = useState("");
  const [showAddList, setShowAddList] = useState(false);
  const isMobile = useIsMobile();

  const handleAddList = () => {
    if (newListName.trim()) {
      dispatch({
        type: "ADD_LIST",
        payload: { name: newListName.trim() }
      });
      setNewListName("");
      setShowAddList(false);
    }
  };

  const getListIcon = (list: TodoList) => {
    switch (list.id) {
      case "my-day":
        return <Sun className="h-5 w-5" />;
      case "important":
        return <Star className="h-5 w-5" />;
      case "planned":
        return <CalendarClock className="h-5 w-5" />;
      case "all":
        return <Calendar className="h-5 w-5" />;
      default:
        return <CheckSquare className="h-5 w-5" />;
    }
  };

  const getListCount = (listId: string) => {
    if (listId === "my-day") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return state.todos.filter(todo => {
        if (todo.dueDate) {
          const dueDate = new Date(todo.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate.getTime() === today.getTime();
        }
        return false;
      }).length;
    } else if (listId === "important") {
      return state.todos.filter(todo => todo.important).length;
    } else if (listId === "planned") {
      return state.todos.filter(todo => todo.dueDate !== null && todo.dueDate !== undefined).length;
    } else if (listId === "all") {
      return state.todos.length;
    } else if (listId === "tasks") {
      return state.todos.length;
    } else {
      return state.todos.filter(todo => todo.listId === listId).length;
    }
  };

  const sidebarContent = (
    <div className="h-full flex flex-col bg-background border-r">
      <div className="p-4 flex justify-between items-center border-b">
        <h2 className="text-xl font-semibold">Todo</h2>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleFullScreen}
            title={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullScreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={refreshData}
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
      
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {state.lists.map(list => (
            <li key={list.id}>
              <button
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm",
                  state.activeListId === list.id 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => {
                  dispatch({ type: "SET_ACTIVE_LIST", payload: list.id });
                  if (isMobile) onClose();
                }}
                style={{ 
                  color: state.activeListId === list.id ? list.color : undefined 
                }}
              >
                <div className="flex items-center">
                  <span className="mr-3" style={{ color: list.color }}>
                    {getListIcon(list)}
                  </span>
                  <span>{list.name}</span>
                </div>
                <span className="text-xs bg-muted px-2 py-1 rounded-full">
                  {getListCount(list.id)}
                </span>
              </button>
            </li>
          ))}
        </ul>
        
        <div className="mt-4">
          {showAddList ? (
            <div className="px-3 py-2">
              <Input
                type="text"
                placeholder="List name"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddList()}
                autoFocus
                className="mb-2"
              />
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleAddList}
                  disabled={!newListName.trim()}
                >
                  Add
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setShowAddList(false);
                    setNewListName("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              className="w-full flex items-center px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              onClick={() => setShowAddList(true)}
            >
              <ListPlus className="mr-3 h-5 w-5" />
              <span>New List</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="left" className="p-0 w-[280px] sm:w-[350px]">
          {sidebarContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className={cn("w-[280px] flex-shrink-0", isOpen ? "block" : "hidden")}>
      {sidebarContent}
    </div>
  );
};

export default TodoSidebar;
