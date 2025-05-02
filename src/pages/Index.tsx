
import { Navigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarClock, ListChecks, CheckSquare, FileText, Image } from "lucide-react";
import { useTodo } from "@/contexts/TodoContext";

const Index = () => {
  const { state } = useTodo();
  
  // Count todos by status
  const totalTodos = state.todos.length;
  const completedTodos = state.todos.filter(todo => todo.completed).length;
  const pendingTodos = totalTodos - completedTodos;
  
  // Get number of lists
  const customLists = state.lists.filter(list => 
    !["my-day", "important", "planned", "all", "tasks"].includes(list.id)
  ).length;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Welcome to Your Workspace</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" />
              Todo Overview
            </CardTitle>
            <CardDescription>Manage your tasks efficiently</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Tasks</span>
                <span className="font-semibold">{totalTodos}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Pending</span>
                <span className="font-semibold">{pendingTodos}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Completed</span>
                <span className="font-semibold">{completedTodos}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Custom Lists</span>
                <span className="font-semibold">{customLists}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link to="/todo">Go to Todo App</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Notepad
            </CardTitle>
            <CardDescription>Take and manage your notes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Create and manage your notes with a rich text editor.
                Your notes are saved automatically and stored locally.
              </p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Features:</span>
              </div>
              <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                <li>Rich text formatting</li>
                <li>Local storage persistence</li>
                <li>Multiple notes management</li>
                <li>Automatic saving</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link to="/notepad">Open Notepad</Link>
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5 text-primary" />
              Photo Gallery
            </CardTitle>
            <CardDescription>Manage your photo collection</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload, organize, and view your photos in a Google Photos-like interface.
                Sort photos by date and view them in a clean gallery layout.
              </p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Features:</span>
              </div>
              <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                <li>Drag and drop uploading</li>
                <li>Date-based organization</li>
                <li>Photo previews</li>
                <li>Responsive grid layout</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link to="/gallery">Open Photo Gallery</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Index;
