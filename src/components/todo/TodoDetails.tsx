import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Calendar, Tag, Plus, Trash2, CheckSquare, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTodo } from "@/contexts/TodoContext";
import { TodoItem, TodoStep, Priority } from "@/types/todo";
import TodoStepsList from "./TodoStepsList";
import { useTodoOperations } from "@/hooks/useTodoOperations";

interface TodoDetailsProps {
  todoId: string;
  onClose: () => void;
}

const TodoDetails = ({ todoId, onClose }: TodoDetailsProps) => {
  const { state, dispatch } = useTodo();
  const { updateTodo, deleteTodo, isLoading } = useTodoOperations();
  const [todo, setTodo] = useState<TodoItem | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    const foundTodo = state.todos.find(t => t.id === todoId);
    if (foundTodo) {
      setTodo(foundTodo);
      setTitle(foundTodo.title);
      setDescription(foundTodo.description || "");
      setPriority(foundTodo.priority || "medium");
      setDueDate(foundTodo.dueDate ? foundTodo.dueDate.toISOString().split('T')[0] : "");
      setTags(foundTodo.tags || []);
    }
  }, [todoId, state.todos]);

  const handleSave = async () => {
    if (!todo) return;

    try {
      await updateTodo(todo.id, {
        title,
        description,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        tags,
      });
    } catch (error) {
      console.error('Failed to save todo:', error);
    }
  };

  const handleDelete = async () => {
    if (!todo) return;
    
    try {
      await deleteTodo(todo.id);
      onClose();
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  };

  const handleToggleComplete = async () => {
    if (!todo) return;

    try {
      await updateTodo(todo.id, {
        completed: !todo.completed,
      });
    } catch (error) {
      console.error('Failed to toggle todo:', error);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const priorityColors = {
    low: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-red-100 text-red-800",
  };

  if (!todo) {
    return (
      <div className="w-96 border-l bg-background p-6">
        <div className="text-center text-muted-foreground">
          Todo not found
        </div>
      </div>
    );
  }

  return (
    <div className="w-96 border-l bg-background flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Todo Details</h2>
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Update"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isLoading}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Completion Status */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleComplete}
            disabled={isLoading}
            className={cn(
              "p-0 h-6 w-6",
              todo.completed ? "text-green-600" : "text-gray-400"
            )}
          >
            {todo.completed ? (
              <CheckSquare className="h-5 w-5" />
            ) : (
              <Square className="h-5 w-5" />
            )}
          </Button>
          <span className={cn(
            "text-sm",
            todo.completed ? "line-through text-muted-foreground" : ""
          )}>
            {todo.completed ? "Completed" : "Not completed"}
          </span>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter todo title..."
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description..."
            rows={3}
          />
        </div>

        {/* Priority */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Priority</label>
          <div className="flex gap-2">
            {(["low", "medium", "high"] as Priority[]).map((p) => (
              <Button
                key={p}
                variant={priority === p ? "default" : "outline"}
                size="sm"
                onClick={() => setPriority(p)}
                className={cn(
                  "capitalize",
                  priority === p && priorityColors[p]
                )}
              >
                {p}
              </Button>
            ))}
          </div>
        </div>

        {/* Due Date */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Due Date
          </label>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Tags
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="gap-1 cursor-pointer"
                onClick={() => removeTag(tag)}
              >
                {tag}
                <X className="h-3 w-3" />
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addTag()}
              placeholder="Add a tag..."
              className="flex-1"
            />
            <Button size="sm" onClick={addTag}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Steps</label>
          <TodoStepsList 
            steps={todo.steps || []} 
            todoId={todo.id} 
          />
        </div>

        {/* Metadata */}
        <div className="space-y-2 text-xs text-muted-foreground border-t pt-4">
          <div>Created: {new Date(todo.createdAt).toLocaleDateString()}</div>
          {todo.updatedAt && (
            <div>Updated: {new Date(todo.updatedAt).toLocaleDateString()}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TodoDetails;
