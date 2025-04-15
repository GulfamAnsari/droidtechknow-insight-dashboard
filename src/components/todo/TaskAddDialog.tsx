
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTodo } from "@/contexts/TodoContext";
import { TodoList } from "@/types/todo";
import { cn } from "@/lib/utils";
import { CalendarIcon, Star, StarOff, Clock } from "lucide-react";
import { format } from "date-fns";

interface TaskAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TaskAddDialog = ({ open, onOpenChange }: TaskAddDialogProps) => {
  const { state, dispatch } = useTodo();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [listId, setListId] = useState(state.activeListId || "tasks");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [important, setImportant] = useState(false);

  const handleAddTask = () => {
    if (title.trim()) {
      dispatch({
        type: "ADD_TODO",
        payload: {
          title: title.trim(),
          notes: notes.trim() || undefined,
          completed: false,
          important,
          dueDate,
          listId
        }
      });
      resetForm();
      onOpenChange(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setNotes("");
    setListId(state.activeListId || "tasks");
    setDueDate(undefined);
    setImportant(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Input
              placeholder="Task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg"
              autoFocus
            />
          </div>
          
          <div className="grid gap-2">
            <Textarea
              placeholder="Add notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Due Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : <span>Set due date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">List</label>
              <Select value={listId} onValueChange={setListId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select list" />
                </SelectTrigger>
                <SelectContent>
                  {state.lists.map((list: TodoList) => (
                    <SelectItem key={list.id} value={list.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: list.color || "#888" }}
                        />
                        {list.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button
            variant="outline"
            className={cn(
              "justify-start gap-2",
              important ? "text-amber-500" : ""
            )}
            onClick={() => setImportant(!important)}
          >
            {important ? (
              <Star className="h-5 w-5 fill-amber-500" />
            ) : (
              <StarOff className="h-5 w-5" />
            )}
            {important ? "Remove importance" : "Mark as important"}
          </Button>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddTask} disabled={!title.trim()}>
            Add Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskAddDialog;
