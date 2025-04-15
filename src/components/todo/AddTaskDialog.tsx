
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Bell, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTodo } from "@/contexts/TodoContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: (state: any) => string;
}

const AddTaskDialog = ({ open, onOpenChange, listId }: AddTaskDialogProps) => {
  const { state, dispatch } = useTodo();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [reminderDate, setReminderDate] = useState<Date | undefined>(undefined);
  const [important, setImportant] = useState(false);
  const [steps, setSteps] = useState<{ id: string; title: string; completed: boolean }[]>([]);
  const [newStep, setNewStep] = useState("");
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  
  const resetForm = () => {
    setTitle("");
    setNotes("");
    setDueDate(undefined);
    setReminderDate(undefined);
    setImportant(false);
    setSteps([]);
    setNewStep("");
    setSelectedListId(null);
  };
  
  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };
  
  const handleAddStep = () => {
    if (newStep.trim()) {
      const newStepItem = {
        id: Math.random().toString(36).substring(2, 11),
        title: newStep.trim(),
        completed: false
      };
      setSteps([...steps, newStepItem]);
      setNewStep("");
    }
  };
  
  const handleRemoveStep = (id: string) => {
    setSteps(steps.filter(step => step.id !== id));
  };
  
  const handleSubmit = () => {
    if (title.trim()) {
      const activeList = listId(state);
      dispatch({
        type: "ADD_TODO",
        payload: {
          title: title.trim(),
          notes: notes.trim() || null,
          completed: false,
          important,
          dueDate,
          reminderDate,
          steps: steps.length > 0 ? steps : undefined,
          listId: selectedListId || activeList
        }
      });
      
      handleClose();
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
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
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              placeholder="Add notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-24 resize-none"
            />
          </div>
          
          <div className="grid gap-2">
            <label className="text-sm font-medium">List</label>
            <Select
              value={selectedListId || listId(state)}
              onValueChange={setSelectedListId}
            >
              <SelectTrigger>
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
          
          <div className="flex items-center space-x-2">
            <Switch
              id="important-mode"
              checked={important}
              onCheckedChange={setImportant}
            />
            <Label htmlFor="important-mode">Mark as important</Label>
          </div>
          
          <div className="grid gap-2">
            <label className="text-sm font-medium">Due date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2 text-left font-normal"
                >
                  <CalendarIcon className="h-4 w-4" />
                  {dueDate ? (
                    format(dueDate, "PPP")
                  ) : (
                    <span className="text-muted-foreground">Add due date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="grid gap-2">
            <label className="text-sm font-medium">Reminder</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2 text-left font-normal"
                >
                  <Bell className="h-4 w-4" />
                  {reminderDate ? (
                    format(reminderDate, "PPP p")
                  ) : (
                    <span className="text-muted-foreground">Add reminder</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={reminderDate}
                  onSelect={setReminderDate}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="grid gap-2">
            <label className="text-sm font-medium">Steps</label>
            {steps.length > 0 && (
              <div className="space-y-2 mb-2">
                {steps.map((step) => (
                  <div key={step.id} className="flex items-center justify-between p-2 border rounded-md">
                    <span>{step.title}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleRemoveStep(step.id)}
                      className="h-7 w-7"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex gap-2">
              <Input
                placeholder="Add a step"
                value={newStep}
                onChange={(e) => setNewStep(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddStep()}
              />
              <Button
                type="button" 
                size="icon"
                onClick={handleAddStep}
                disabled={!newStep.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!title.trim()}>Add Task</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddTaskDialog;
