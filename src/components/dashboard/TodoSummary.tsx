
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTodo } from "@/contexts/TodoContext";

interface TodoSummaryProps {
  navigate: (path: string) => void;
}

export const TodoSummary = ({ navigate }: TodoSummaryProps) => {
  const { state } = useTodo();
  
  const todoStats = {
    totalTodos: state.todos.length,
    completedTodos: state.todos.filter(todo => todo.completed).length
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">Tasks</CardTitle>
        <CardDescription>Manage your todo items</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-1">
            <p className="text-sm text-gray-500">Total Tasks</p>
            <p className="text-2xl font-bold">
              {todoStats.totalTodos.toLocaleString()}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-500">Completed</p>
            <p className="text-2xl font-bold">
              {todoStats.completedTodos.toLocaleString()}
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full flex justify-between items-center" 
          onClick={() => navigate("/todo")}
        >
          View Tasks <ChevronRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
};
