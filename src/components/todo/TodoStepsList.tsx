
import { useState } from "react";
import { useTodo } from "@/contexts/TodoContext";
import { Check, X, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { TodoStep } from "@/types/todo";
import { Input } from "@/components/ui/input";

interface TodoStepsListProps {
  steps: TodoStep[];
  todoId: string;
  readOnly?: boolean;
  className?: string;
}

const TodoStepsList = ({ steps, todoId, readOnly = false, className }: TodoStepsListProps) => {
  const { dispatch } = useTodo();
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const handleToggleStep = (stepId: string) => {
    if (readOnly) return;
    
    dispatch({
      type: "TOGGLE_TODO_STEP",
      payload: { todoId, stepId }
    });
  };

  const handleDeleteStep = (stepId: string) => {
    if (readOnly) return;
    
    dispatch({
      type: "DELETE_TODO_STEP",
      payload: { todoId, stepId }
    });
  };

  const handleEditStart = (step: TodoStep) => {
    if (readOnly) return;
    
    setEditingStepId(step.id);
    setEditingText(step.title);
  };

  const handleEditSave = () => {
    if (!editingStepId || !editingText.trim()) {
      setEditingStepId(null);
      return;
    }
    
    dispatch({
      type: "UPDATE_TODO_STEP",
      payload: {
        todoId,
        stepId: editingStepId,
        title: editingText.trim()
      }
    });
    
    setEditingStepId(null);
  };

  if (steps.length === 0) {
    return null;
  }

  return (
    <ul className={cn("space-y-1", className)}>
      {steps.map(step => (
        <li key={step.id} className="flex items-center gap-2">
          {editingStepId === step.id ? (
            <div className="flex flex-1 items-center gap-1">
              <Input
                type="text"
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEditSave()}
                autoFocus
                className="flex-1 h-7 py-1"
              />
              <button
                onClick={handleEditSave}
                className="text-primary p-1 rounded-sm hover:bg-primary/10"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => setEditingStepId(null)}
                className="text-muted-foreground p-1 rounded-sm hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <button
                className={cn(
                  "flex-shrink-0 h-4 w-4 rounded-sm border flex items-center justify-center",
                  step.completed ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground"
                )}
                onClick={() => handleToggleStep(step.id)}
                aria-label={step.completed ? "Mark as incomplete" : "Mark as complete"}
                disabled={readOnly}
              >
                {step.completed && <Check className="h-3 w-3" />}
              </button>
              
              <span 
                className={cn(
                  "text-sm flex-1",
                  step.completed ? "line-through text-muted-foreground" : ""
                )}
              >
                {step.title}
              </span>
              
              {!readOnly && (
                <div className="flex flex-shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                  <button
                    onClick={() => handleEditStart(step)}
                    className="text-muted-foreground p-1 rounded-sm hover:bg-muted"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleDeleteStep(step.id)}
                    className="text-muted-foreground p-1 rounded-sm hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </>
          )}
        </li>
      ))}
    </ul>
  );
};

export default TodoStepsList;
