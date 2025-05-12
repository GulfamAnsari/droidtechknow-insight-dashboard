
import { useState } from "react";
import { useTodo } from "@/contexts/TodoContext";
import { TodoItem } from "@/types/todo";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  CalendarIcon, 
  Check, 
  Clock, 
  Star, 
  Trash2, 
  X,
  Bell,
  ListTodo,
} from "lucide-react";
import { cn } from "@/lib/utils";
import TodoStepsList from "./TodoStepsList";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TodoDetailsProps {
  todoId: string;
  onClose: () => void;
}

const TodoDetails = ({ todoId, onClose }: TodoDetailsProps) => {
  const { getTodoById, dispatch, state, updateTodo } = useTodo();
  const todo = getTodoById(todoId) as TodoItem;
  const [newStep, setNewStep] = useState("");
  
  if (!todo) {
    return (
      <div className="w-full md:w-[350px] flex-shrink-0 border-l p-4 bg-background">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">Task Details</h2>
          <button 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-muted-foreground">Task not found</p>
      </div>
    );
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({
      type: "UPDATE_TODO",
      payload: { ...todo, title: e.target.value }
    });
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch({
      type: "UPDATE_TODO",
      payload: { ...todo, notes: e.target.value }
    });
  };

  const handleToggleCompleted = () => {
    dispatch({
      type: "TOGGLE_TODO_COMPLETED",
      payload: todo.id
    });
  };

  const handleToggleImportant = () => {
    dispatch({
      type: "TOGGLE_TODO_IMPORTANT",
      payload: todo.id
    });
  };

  const handleDeleteTodo = () => {
    dispatch({
      type: "DELETE_TODO",
      payload: todo.id
    });
    onClose();
  };

  const handleAddStep = () => {
    if (newStep.trim()) {
      dispatch({
        type: "ADD_TODO_STEP",
        payload: { todoId: todo.id, stepTitle: newStep.trim() }
      });
      setNewStep("");
    }
  };

  const handleSetDueDate = (date: Date | undefined) => {
    dispatch({
      type: "UPDATE_TODO",
      payload: { ...todo, dueDate: date }
    });
  };

  const handleSetReminderDate = (date: Date | undefined) => {
    dispatch({
      type: "UPDATE_TODO",
      payload: { ...todo, reminderDate: date }
    });
  };

  const handleChangeList = (listId: string) => {
    dispatch({
      type: "UPDATE_TODO",
      payload: { ...todo, listId }
    });
  };

  const formatDateForDisplay = (date: Date | null | undefined) => {
    if (!date) return "";
    return format(new Date(date), "PPP");
  };

  return (
    <div className="w-full md:w-[350px] flex-shrink-0 border-l p-4 bg-background overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium">Task Details</h2>
        <button 
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      {/* Completed checkbox and title */}
      <div className="flex items-start gap-3 mb-4">
        <button 
          className={cn(
            "mt-1 flex-shrink-0 h-5 w-5 rounded-full border flex items-center justify-center",
            todo.completed ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground"
          )}
          onClick={handleToggleCompleted}
          aria-label={todo.completed ? "Mark as incomplete" : "Mark as complete"}
        >
          {todo.completed && <Check className="h-3 w-3" />}
        </button>
        
        <Input
          value={todo.title}
          onChange={handleTitleChange}
          className="flex-1 text-base font-medium border-none px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          placeholder="Task title"
        />
      </div>
      
      {/* Important button */}
      <div className="mb-4">
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start gap-2",
            todo.important ? "text-amber-500" : ""
          )}
          onClick={handleToggleImportant}
        >
          {todo.important ? (
            <Star className="h-5 w-5 fill-amber-500" />
          ) : (
            <Star className="h-5 w-5" />
          )}
          {todo.important ? "Remove importance" : "Mark as important"}
        </Button>
      </div>
      
      {/* List selection */}
      <div className="mb-4">
        <label className="text-sm font-medium mb-1 block">List</label>
        <Select
          value={todo.listId}
          onValueChange={handleChangeList}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a list" />
          </SelectTrigger>
          <SelectContent>
            {state.lists.map((list) => (
              <SelectItem key={list.id} value={list.id}>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: list.color }}
                  />
                  {list.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Notes */}
      <div className="mb-4">
        <label className="text-sm font-medium mb-1 block">Notes</label>
        <Textarea 
          value={todo.notes || ""}
          onChange={handleNotesChange}
          className="min-h-24 resize-none"
          placeholder="Add notes"
        />
      </div>
      
      {/* Due Date */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <label className="text-sm font-medium">Due date</label>
          {todo.dueDate && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-5 p-0"
              onClick={() => handleSetDueDate(undefined)}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2 text-left font-normal"
            >
              <CalendarIcon className="h-4 w-4" />
              {todo.dueDate ? (
                formatDateForDisplay(todo.dueDate)
              ) : (
                <span className="text-muted-foreground">Add due date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={todo.dueDate ? new Date(todo.dueDate) : undefined}
              onSelect={handleSetDueDate}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>
      
      {/* Reminder */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <label className="text-sm font-medium">Reminder</label>
          {todo.reminderDate && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-5 p-0"
              onClick={() => handleSetReminderDate(undefined)}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2 text-left font-normal"
            >
              <Bell className="h-4 w-4" />
              {todo.reminderDate ? (
                format(new Date(todo.reminderDate), "PPP p")
              ) : (
                <span className="text-muted-foreground">Add reminder</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3">
              <Calendar
                mode="single"
                selected={todo.reminderDate ? new Date(todo.reminderDate) : undefined}
                onSelect={handleSetReminderDate}
                initialFocus
                className="pointer-events-auto"
              />
              {/* Time picker could be added here */}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      {/* Steps */}
      <div className="mb-4">
        <label className="text-sm font-medium mb-1 block">Steps</label>
        {todo.steps && todo.steps.length > 0 && (
          <div className="mb-2">
            <TodoStepsList steps={todo.steps} todoId={todo.id} />
          </div>
        )}
        
        <div className="flex gap-2">
          <Input
            value={newStep}
            onChange={(e) => setNewStep(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddStep()}
            placeholder="Add a step"
            className="flex-1"
          />
          <Button onClick={handleAddStep} size="sm" disabled={!newStep.trim()}>
            Add
          </Button>
        </div>
      </div>
      
      {/* Delete button */}
      <div className="mt-auto pt-4">
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleDeleteTodo}
        >
          <Trash2 className="h-4 w-4" />
          Delete task
        </Button>
      </div>
      <Button 
          className="w-full justify-start gap-2 mt-2"
          onClick={() => updateTodo(todo)}
        >
          Update task
        </Button>
    </div>
  );
};

export default TodoDetails;
