import { useState } from "react";
import { useTodo } from "@/contexts/TodoContext";
import { TodoItem } from "@/types/todo";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Check, 
  Star,
  StarOff,
  Calendar,
  Bell,
  Search,
  Menu,
  Filter,
  Loader2,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import TodoStepsList from "./TodoStepsList";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TodoMainProps {
  selectedTodoId: string | null;
  setSelectedTodoId: (id: string | null) => void;
  onOpenSidebar: () => void;
  onOpenDetails: () => void;
  isMobile: boolean;
}

const TodoMain = ({ 
  selectedTodoId, 
  setSelectedTodoId,
  onOpenSidebar,
  onOpenDetails,
  isMobile 
}: TodoMainProps) => {
  const { state, dispatch, filteredTodos, getListById, toggleTodoCompleted, toggleTodoImportant } = useTodo();
  const [searchTerm, setSearchTerm] = useState("");
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [todoToComplete, setTodoToComplete] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState<string | null>(null);
  
  const activeList = state.activeListId ? getListById(state.activeListId) : null;
  
  // Separate todos into completed and non-completed
  const incompleteTodos = filteredTodos.filter(todo => !todo.completed);
  const completedTodos = filteredTodos.filter(todo => todo.completed);
  
  const handleToggleCompleted = async (todoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const todo = filteredTodos.find(t => t.id === todoId);
    
    if (!todo) return;
    
    if (!todo.completed) {
      // Show confirmation dialog for completing a todo
      setTodoToComplete(todoId);
      setShowCompleteDialog(true);
    } else {
      // Directly uncomplete without confirmation
      setIsToggling(todoId);
      await toggleTodoCompleted(todoId);
      setIsToggling(null);
    }
  };
  
  const confirmComplete = async () => {
    if (todoToComplete) {
      setIsToggling(todoToComplete);
      await toggleTodoCompleted(todoToComplete);
      setIsToggling(null);
      setTodoToComplete(null);
      setShowCompleteDialog(false);
    }
  };
  
  const handleToggleImportant = async (todoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsToggling(todoId);
    await toggleTodoImportant(todoId);
    setIsToggling(null);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    dispatch({
      type: "SET_FILTER",
      payload: { ...state.filter, searchTerm: term }
    });
  };

  const formatDueDate = (date: Date | null | undefined) => {
    if (!date) return "";
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dueDate = new Date(date);
    dueDate.setHours(0, 0, 0, 0);
    
    if (dueDate.getTime() === today.getTime()) {
      return "Today";
    } else if (dueDate.getTime() === tomorrow.getTime()) {
      return "Tomorrow";
    } else {
      return format(dueDate, "MMM d");
    }
  };
  
  const isDueInNext3Days = (dueDate, days = 3) => {
    const now = new Date();
    const due = new Date(dueDate);
    const threeDaysLater = new Date();
    threeDaysLater.setDate(now.getDate() + days);
    return due >= now && due <= threeDaysLater;
  };
  
  const renderTodoItem = (todo: TodoItem) => {
    const isCurrentlyToggling = isToggling === todo.id;
    
    return (
      <div 
        key={todo.id} 
        className={cn(
          "border-b p-4 cursor-pointer hover:bg-accent/50 transition-colors",
          todo.completed ? "opacity-60" : "",
          selectedTodoId === todo.id ? "bg-accent" : ""
        )}
        onClick={() => {
          setSelectedTodoId(todo.id);
          if (isMobile) {
            onOpenDetails();
          }
        }}
      >
        <div className="flex items-start gap-3">
          <button 
            className={cn(
              "mt-1 flex-shrink-0 h-5 w-5 rounded-full border flex items-center justify-center",
              todo.completed ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground",
              isCurrentlyToggling ? "opacity-50" : ""
            )}
            onClick={(e) => handleToggleCompleted(todo.id, e)}
            disabled={isCurrentlyToggling}
            aria-label={todo.completed ? "Mark as incomplete" : "Mark as complete"}
          >
            {isCurrentlyToggling ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              todo.completed && <Check className="h-3 w-3" />
            )}
          </button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className={cn(
                "text-sm font-medium truncate",
                todo.completed ? "line-through text-muted-foreground" : ""
              )}>
                {todo.title}
              </p>
              
              <button
                className={cn(
                  "flex-shrink-0 text-muted-foreground hover:text-amber-500",
                  todo.important ? "text-amber-500" : "",
                  isCurrentlyToggling ? "opacity-50" : ""
                )}
                onClick={(e) => handleToggleImportant(todo.id, e)}
                disabled={isCurrentlyToggling}
                aria-label={todo.important ? "Remove importance" : "Mark as important"}
              >
                {todo.important ? (
                  <Star className="h-5 w-5 fill-amber-500" />
                ) : (
                  <StarOff className="h-5 w-5" />
                )}
              </button>
            </div>
            
            {/* Show steps summary if any */}
            {todo.steps && todo.steps.length > 0 && (
              <div className="mt-1">
                <TodoStepsList 
                  steps={todo.steps} 
                  todoId={todo.id} 
                  readOnly 
                  className="line-clamp-1"
                />
              </div>
            )}
            
            {/* Show notes preview if any */}
            {todo.notes && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{todo.notes}</p>
            )}
            
            {/* Due date and reminder badge */}
            <div className="flex flex-wrap gap-2 mt-2">
            {todo.dueDate && (
              <span
                className={cn(
                  "text-xs px-2 py-1 rounded-full inline-flex items-center gap-1",
                  new Date(todo.dueDate) < new Date() && !todo.completed
                    ? "bg-destructive text-destructive-foreground"
                    : isDueInNext3Days(todo.dueDate) && !todo.completed
                    ? "bg-orange-200 text-orange-800"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Calendar className="h-3 w-3" />
                {formatDueDate(todo.dueDate)}
              </span>
            )}
              
              {todo.reminderDate && new Date(todo.reminderDate) > new Date() && (
                <span className={
                  cn(
                    "text-xs px-2 py-1 rounded-full inline-flex items-center gap-1",
                    isDueInNext3Days(todo.reminderDate, 6)
                      ? "bg-red-200 text-red-800": "bg-muted text-muted-foreground"
                  )
                }>
                  <Bell className="h-3 w-3" />
                  {format(new Date(todo.reminderDate), "MMM d, h:mm a")}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
      <p className="text-muted-foreground mb-2">No tasks found</p>
      {searchTerm && (
        <Button 
          variant="outline" 
          onClick={() => {
            setSearchTerm("");
            dispatch({
              type: "SET_FILTER",
              payload: { ...state.filter, searchTerm: "" }
            });
          }}
        >
          Clear search
        </Button>
      )}
    </div>
  );

  if (state.isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading tasks...</span>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {isMobile && (
              <Button variant="ghost" size="icon" onClick={onOpenSidebar}>
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <h1 className="text-xl font-semibold" style={{ color: activeList?.color }}>
              {activeList?.name || "Tasks"}
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Filter className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => dispatch({
                  type: "SET_FILTER",
                  payload: { ...state.filter, completed: false }
                })}>
                  Hide completed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => dispatch({
                  type: "SET_FILTER",
                  payload: { ...state.filter, completed: undefined }
                })}>
                  Show all
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Search box */}
        <div className="px-4 py-2 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={handleSearch}
              placeholder="Search tasks"
              className="pl-9"
            />
          </div>
        </div>
        
        {/* Todo list with tabs */}
        <div className="flex-1 overflow-y-auto">
          {incompleteTodos.length === 0 && completedTodos.length === 0 ? (
            renderEmptyState()
          ) : (
            <div className="p-4">
              <Tabs defaultValue="active" className="w-full">
                <TabsList className="w-full mb-4">
                  <TabsTrigger value="active" className="flex-1">
                    Tasks ({incompleteTodos.length})
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="flex-1">
                    Completed ({completedTodos.length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="active" className="mt-0">
                  <div className="border rounded-lg overflow-hidden h-full flex flex-col">
                    <div className="flex-1 overflow-y-auto max-h-[calc(100vh-300px)]">
                      {incompleteTodos.length > 0 ? (
                        incompleteTodos.map(renderTodoItem)
                      ) : (
                        <div className="p-4 text-center text-muted-foreground">
                          No active tasks
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="completed" className="mt-0">
                  <div className="border rounded-lg overflow-hidden h-full flex flex-col">
                    <div className="flex-1 overflow-y-auto max-h-[calc(100vh-300px)]">
                      {completedTodos.length > 0 ? (
                        completedTodos.map(renderTodoItem)
                      ) : (
                        <div className="p-4 text-center text-muted-foreground">
                          No completed tasks
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>

      {/* Completion Confirmation Dialog */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this task as completed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowCompleteDialog(false);
              setTodoToComplete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmComplete}>
              Complete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TodoMain;
