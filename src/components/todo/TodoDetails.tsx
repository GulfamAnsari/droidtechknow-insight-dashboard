
import { useState, useEffect, useRef } from "react";
import { useTodo } from "@/contexts/TodoContext";
import { 
  X, 
  Calendar, 
  Bell, 
  Star, 
  StarOff, 
  Trash2, 
  PlusCircle,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import TodoStepsList from "./TodoStepsList";
import { useToast } from "@/components/ui/use-toast";

interface TodoDetailsProps {
  todoId: string;
  onClose: () => void;
}

const TodoDetails = ({ todoId, onClose }: TodoDetailsProps) => {
  const { state, dispatch, getTodoById, getListById } = useTodo();
  const todo = getTodoById(todoId);
  const [title, setTitle] = useState(todo?.title || "");
  const [notes, setNotes] = useState(todo?.notes || "");
  const [newStep, setNewStep] = useState("");
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const titleInputRef = useRef<HTMLInputElement>(null);
  const newStepInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (todo) {
      setTitle(todo.title);
      setNotes(todo.notes || "");
    }
  }, [todo]);

  // Focus title input when opened
  useEffect(() => {
    const timer = setTimeout(() => {
      if (titleInputRef.current) {
        titleInputRef.current.focus();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  if (!todo) {
    return null;
  }

  const list = getListById(todo.listId);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
  };

  const handleTitleBlur = () => {
    if (title.trim() && title !== todo.title) {
      dispatch({
        type: "UPDATE_TODO",
        payload: {
          ...todo,
          title
        }
      });
    } else if (!title.trim()) {
      setTitle(todo.title);
    }
  };

  const handleNotesBlur = () => {
    if (notes !== todo.notes) {
      dispatch({
        type: "UPDATE_TODO",
        payload: {
          ...todo,
          notes
        }
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      (e.target as HTMLElement).blur();
    }
  };

  const handleToggleImportant = () => {
    dispatch({ type: "TOGGLE_TODO_IMPORTANT", payload: todo.id });
  };

  const handleToggleCompleted = () => {
    dispatch({ type: "TOGGLE_TODO_COMPLETED", payload: todo.id });
  };

  const handleAddStep = () => {
    if (newStep.trim()) {
      dispatch({
        type: "ADD_TODO_STEP",
        payload: {
          todoId: todo.id,
          stepTitle: newStep.trim()
        }
      });
      setNewStep("");
      if (newStepInputRef.current) {
        newStepInputRef.current.focus();
      }
    }
  };

  const handleSetDueDate = (date: Date | null) => {
    dispatch({
      type: "UPDATE_TODO",
      payload: {
        ...todo,
        dueDate: date
      }
    });
  };

  const handleSetReminder = (date: Date | null) => {
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
  };

  const handleDeleteTodo = () => {
    dispatch({ type: "DELETE_TODO", payload: todo.id });
    onClose();
    toast({
      title: "Task deleted",
      description: "Your task has been deleted successfully",
    });
  };

  const detailsContent = (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      <div className="p-4 border-b flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button 
            className={cn(
              "flex-shrink-0 h-5 w-5 rounded-full border flex items-center justify-center",
              todo.completed ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground"
            )}
            onClick={handleToggleCompleted}
            aria-label={todo.completed ? "Mark as incomplete" : "Mark as complete"}
          >
            {todo.completed && <Check className="h-3 w-3" />}
          </button>
          
          <button
            className={cn(
              "flex-shrink-0 text-muted-foreground hover:text-amber-500",
              todo.important ? "text-amber-500" : ""
            )}
            onClick={handleToggleImportant}
            aria-label={todo.important ? "Remove importance" : "Mark as important"}
          >
            {todo.important ? (
              <Star className="h-5 w-5 fill-amber-500" />
            ) : (
              <StarOff className="h-5 w-5" />
            )}
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="text-muted-foreground"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          <Input
            ref={titleInputRef}
            type="text"
            value={title}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            onKeyDown={handleKeyDown}
            className="text-base font-medium border-0 p-0 h-auto focus-visible:ring-0"
          />
          
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">List</p>
              <span className="text-sm text-muted-foreground">
                {list?.name || "Tasks"}
              </span>
            </div>
            
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">Created</p>
              <span className="text-sm text-muted-foreground">
                {format(new Date(todo.createdAt), "MMM d, yyyy")}
              </span>
            </div>
            
            {todo.completed && (
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium">Completed</p>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(todo.updatedAt), "MMM d, yyyy")}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant={todo.dueDate ? "default" : "outline"} 
                  size="sm" 
                  className="gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  {todo.dueDate 
                    ? format(new Date(todo.dueDate), "MMM d, yyyy") 
                    : "Add due date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={todo.dueDate ? new Date(todo.dueDate) : undefined}
                  onSelect={handleSetDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant={todo.reminderDate ? "default" : "outline"} 
                  size="sm" 
                  className="gap-2"
                >
                  <Bell className="h-4 w-4" />
                  {todo.reminderDate 
                    ? format(new Date(todo.reminderDate), "MMM d, h:mm a") 
                    : "Add reminder"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3">
                  <h4 className="font-medium mb-2">Set reminder</h4>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => {
                        const today = new Date();
                        today.setHours(9, 0, 0, 0);
                        handleSetReminder(today);
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
                        handleSetReminder(today);
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
                        handleSetReminder(tomorrow);
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
                        handleSetReminder(nextWeek);
                      }}
                    >
                      Next week
                    </Button>
                    {todo.reminderDate && (
                      <Button 
                        variant="destructive" 
                        className="w-full justify-start"
                        onClick={() => handleSetReminder(null)}
                      >
                        Remove reminder
                      </Button>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          
          <div>
            <p className="text-sm font-medium mb-2">Notes</p>
            <Textarea
              value={notes}
              onChange={handleNotesChange}
              onBlur={handleNotesBlur}
              placeholder="Add notes..."
              className="resize-none min-h-24"
            />
          </div>
          
          <div>
            <p className="text-sm font-medium mb-2">Steps</p>
            {todo.steps && todo.steps.length > 0 && (
              <TodoStepsList steps={todo.steps} todoId={todo.id} className="mb-2" />
            )}
            
            <div className="flex gap-2 items-center">
              <Input
                ref={newStepInputRef}
                type="text"
                placeholder="Add a step"
                value={newStep}
                onChange={(e) => setNewStep(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddStep()}
                className="flex-1"
              />
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleAddStep}
                disabled={!newStep.trim()}
              >
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4 border-t">
        <Button 
          variant="destructive" 
          size="sm" 
          className="w-full gap-2"
          onClick={handleDeleteTodo}
        >
          <Trash2 className="h-4 w-4" />
          Delete task
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={true} onOpenChange={onClose}>
        <SheetContent side="right" className="p-0 sm:max-w-md">
          {detailsContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="w-[400px] border-l flex-shrink-0">
      {detailsContent}
    </div>
  );
};

export default TodoDetails;
