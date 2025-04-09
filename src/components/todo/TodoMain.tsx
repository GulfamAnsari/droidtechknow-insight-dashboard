
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
  Plus,
  Search,
  Menu,
  Filter,
  ListTodo,
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
  const { state, dispatch, filteredTodos, getListById } = useTodo();
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showCompletedTodos, setShowCompletedTodos] = useState(true);
  
  const activeList = state.activeListId ? getListById(state.activeListId) : null;
  
  // Separate todos into completed and non-completed
  const incompleteTodos = filteredTodos.filter(todo => !todo.completed);
  const completedTodos = filteredTodos.filter(todo => todo.completed);
  
  const handleAddTodo = () => {
    if (newTodoTitle.trim()) {
      dispatch({
        type: "ADD_TODO",
        payload: {
          title: newTodoTitle.trim(),
          completed: false,
          important: false,
          listId: state.activeListId || "tasks",
        }
      });
      setNewTodoTitle("");
    }
  };
  
  const handleToggleCompleted = (todoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({
      type: "TOGGLE_TODO_COMPLETED",
      payload: todoId
    });
  };
  
  const handleToggleImportant = (todoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({
      type: "TOGGLE_TODO_IMPORTANT",
      payload: todoId
    });
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
  
  const renderTodoItem = (todo: TodoItem) => {
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
              todo.completed ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground"
            )}
            onClick={(e) => handleToggleCompleted(todo.id, e)}
            aria-label={todo.completed ? "Mark as incomplete" : "Mark as complete"}
          >
            {todo.completed && <Check className="h-3 w-3" />}
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
                  todo.important ? "text-amber-500" : ""
                )}
                onClick={(e) => handleToggleImportant(todo.id, e)}
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
                <span className={cn(
                  "text-xs px-2 py-1 rounded-full inline-flex items-center gap-1",
                  new Date(todo.dueDate) < new Date() && !todo.completed 
                    ? "bg-destructive text-destructive-foreground" 
                    : "bg-muted text-muted-foreground"
                )}>
                  <Calendar className="h-3 w-3" />
                  {formatDueDate(todo.dueDate)}
                </span>
              )}
              
              {todo.reminderDate && new Date(todo.reminderDate) > new Date() && (
                <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full inline-flex items-center gap-1">
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
  
  return (
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
      
      {/* Add new todo - Improved UI */}
      <div className="px-4 py-3 border-b bg-muted/30">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0 h-5 w-5 rounded-full border border-primary flex items-center justify-center bg-primary/10">
              <Plus className="h-3 w-3 text-primary" />
            </div>
            <Input
              value={newTodoTitle}
              onChange={(e) => setNewTodoTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTodo()}
              placeholder="Add a task"
              className="flex-1 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
            />
          </div>
          {newTodoTitle.trim() && (
            <div className="flex justify-end">
              <Button 
                onClick={handleAddTodo} 
                className="bg-primary/90 hover:bg-primary transition-colors"
              >
                Add task
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Todo list */}
      <div className="flex-1 overflow-y-auto">
        {incompleteTodos.length === 0 && completedTodos.length === 0 ? (
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
        ) : (
          <div>
            {/* Incomplete todos section */}
            {incompleteTodos.length > 0 && (
              <div>
                <div className="px-4 py-2 text-sm font-medium text-muted-foreground bg-muted/50">
                  Tasks - {incompleteTodos.length}
                </div>
                {incompleteTodos.map(renderTodoItem)}
              </div>
            )}
            
            {/* Completed todos section */}
            {completedTodos.length > 0 && (
              <div>
                <button 
                  className="w-full px-4 py-2 text-sm font-medium text-muted-foreground bg-muted/50 flex justify-between items-center"
                  onClick={() => setShowCompletedTodos(!showCompletedTodos)}
                >
                  <span>Completed - {completedTodos.length}</span>
                  {showCompletedTodos ? 
                    <ChevronDown className="h-4 w-4" /> : 
                    <ChevronRight className="h-4 w-4" />
                  }
                </button>
                {showCompletedTodos && completedTodos.map(renderTodoItem)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TodoMain;
