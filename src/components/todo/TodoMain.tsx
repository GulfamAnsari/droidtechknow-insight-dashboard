
import { useState, useRef, useEffect } from "react";
import { useTodo } from "@/contexts/TodoContext";
import { 
  PlusCircle, 
  Calendar, 
  Bell, 
  Star, 
  Search, 
  ChevronDown, 
  PanelLeft, 
  SlidersHorizontal,
  X,
  Check,
  StarOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TodoItem } from "@/types/todo";
import { format, isToday, isTomorrow, isYesterday } from "date-fns";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import TodoStepsList from "./TodoStepsList";
import { useToast } from "@/components/ui/use-toast";

interface TodoMainProps {
  selectedTodoId: string | null;
  setSelectedTodoId: (id: string | null) => void;
  onOpenSidebar: () => void;
  onOpenDetails: () => void;
  isMobile: boolean;
}

const TodoMain = ({ selectedTodoId, setSelectedTodoId, onOpenSidebar, onOpenDetails, isMobile }: TodoMainProps) => {
  const { state, dispatch, filteredTodos, getListById } = useTodo();
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const { toast } = useToast();

  const activeList = state.activeListId ? getListById(state.activeListId) : null;

  useEffect(() => {
    if (showSearchInput && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearchInput]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollPosition(e.currentTarget.scrollTop);
  };

  const handleAddTodo = () => {
    if (newTodoTitle.trim()) {
      dispatch({
        type: "ADD_TODO",
        payload: {
          title: newTodoTitle.trim(),
          completed: false,
          important: false,
          listId: state.activeListId === "my-day" || state.activeListId === "important" || state.activeListId === "planned" || state.activeListId === "all" 
            ? "tasks" : state.activeListId || "tasks"
        }
      });
      setNewTodoTitle("");
      toast({
        title: "Task added",
        description: "Your task has been added successfully"
      });
    }
  };

  const handleToggleImportant = (todoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: "TOGGLE_TODO_IMPORTANT", payload: todoId });
  };

  const handleToggleCompleted = (todoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: "TOGGLE_TODO_COMPLETED", payload: todoId });
  };

  const handleSetDueDate = (todoId: string, date: Date | null) => {
    const todo = filteredTodos.find(t => t.id === todoId);
    if (todo) {
      dispatch({
        type: "UPDATE_TODO",
        payload: {
          ...todo,
          dueDate: date
        }
      });
    }
  };

  const handleSetReminder = (todoId: string, date: Date | null) => {
    const todo = filteredTodos.find(t => t.id === todoId);
    if (todo) {
      dispatch({
        type: "UPDATE_TODO",
        payload: {
          ...todo,
          reminderDate: date
        }
      });
      if (date) {
        toast({
          title: "Reminder set",
          description: `Reminder set for ${format(date, "PPp")}`
        });
      }
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    dispatch({
      type: "SET_FILTER",
      payload: {
        ...state.filter,
        searchTerm: term
      }
    });
  };

  const formatDueDate = (date: Date | null | undefined) => {
    if (!date) return null;
    
    if (isToday(date)) {
      return "Today";
    } else if (isTomorrow(date)) {
      return "Tomorrow";
    } else if (isYesterday(date)) {
      return "Yesterday";
    } else {
      return format(date, "MMM d");
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
    <div className="flex-1 flex flex-col bg-background min-w-0">
      {/* Header */}
      <div className={cn(
        "border-b sticky top-0 z-10 transition-shadow",
        scrollPosition > 0 ? "shadow-sm" : ""
      )}>
        <div className="p-4 flex items-center justify-between bg-background">
          <div className="flex items-center">
            {isMobile && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onOpenSidebar} 
                className="mr-2"
              >
                <PanelLeft className="h-5 w-5" />
              </Button>
            )}
            
            <h1 className="text-xl font-semibold">
              {activeList?.name || "Tasks"}
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            {showSearchInput ? (
              <div className="relative">
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="h-9 w-[200px]"
                />
                <button
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                  onClick={() => {
                    setShowSearchInput(false);
                    handleSearch("");
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowSearchInput(true)}
              >
                <Search className="h-5 w-5" />
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <SlidersHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuCheckboxItem
                  checked={state.filter.completed === false}
                  onCheckedChange={(checked) => {
                    dispatch({
                      type: "SET_FILTER",
                      payload: {
                        ...state.filter,
                        completed: checked ? false : undefined
                      }
                    });
                  }}
                >
                  Hide completed
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    dispatch({
                      type: "SET_FILTER",
                      payload: {
                        ...state.filter,
                        dueDate: 'today'
                      }
                    });
                  }}
                >
                  Due today
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    dispatch({
                      type: "SET_FILTER",
                      payload: {
                        ...state.filter,
                        dueDate: 'upcoming'
                      }
                    });
                  }}
                >
                  Upcoming
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    dispatch({
                      type: "SET_FILTER",
                      payload: {}
                    });
                  }}
                >
                  Clear filters
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      
      {/* Todo list */}
      <div className="flex-1 overflow-y-auto" onScroll={handleScroll}>
        {filteredTodos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Check className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">All done!</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchTerm 
                ? "No tasks match your search." 
                : "You've completed all your tasks. Time to relax!"}
            </p>
            {searchTerm && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  handleSearch("");
                  setShowSearchInput(false);
                }}
              >
                Clear search
              </Button>
            )}
          </div>
        ) : (
          <div>
            {filteredTodos.map(renderTodoItem)}
          </div>
        )}
      </div>
      
      {/* Add new todo */}
      <div className="border-t p-4">
        <div className="flex items-center">
          <span className="text-muted-foreground">
            <PlusCircle className="h-5 w-5" />
          </span>
          <Input
            ref={inputRef}
            type="text"
            placeholder="Add a task"
            value={newTodoTitle}
            onChange={(e) => setNewTodoTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTodo()}
            className="border-0 focus-visible:ring-0 flex-1"
          />
          
          {newTodoTitle.trim() && (
            <div className="flex gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-muted-foreground">
                    <Calendar className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarComponent
                    mode="single"
                    selected={undefined}
                    onSelect={(date) => {
                      // Store the due date temporarily for the new todo
                      localStorage.setItem("newTodoDueDate", date ? date.toISOString() : "");
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-muted-foreground">
                    <Bell className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <div className="p-3">
                    <h4 className="font-medium mb-2">Set reminder</h4>
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => {
                          const today = new Date();
                          today.setHours(9, 0, 0, 0);
                          localStorage.setItem("newTodoReminder", today.toISOString());
                        }}
                      >
                        Today morning
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => {
                          const today = new Date();
                          today.setHours(14, 0, 0, 0);
                          localStorage.setItem("newTodoReminder", today.toISOString());
                        }}
                      >
                        Today afternoon
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => {
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          tomorrow.setHours(9, 0, 0, 0);
                          localStorage.setItem("newTodoReminder", tomorrow.toISOString());
                        }}
                      >
                        Tomorrow
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => {
                          const nextWeek = new Date();
                          nextWeek.setDate(nextWeek.getDate() + 7);
                          nextWeek.setHours(9, 0, 0, 0);
                          localStorage.setItem("newTodoReminder", nextWeek.toISOString());
                        }}
                      >
                        Next week
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-muted-foreground">
                    <ChevronDown className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-52 p-0" align="end">
                  <div className="p-3">
                    <h4 className="font-medium mb-2">Add to list</h4>
                    <div className="max-h-52 overflow-y-auto">
                      {state.lists
                        .filter(list => !list.isDefault || list.id === "tasks")
                        .map(list => (
                          <Button 
                            key={list.id}
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={() => {
                              localStorage.setItem("newTodoListId", list.id);
                            }}
                          >
                            <span className="mr-2">
                              {getListIcon(list as any)}
                            </span>
                            {list.name}
                          </Button>
                        ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              
              <Button onClick={handleAddTodo}>
                Add
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TodoMain;
