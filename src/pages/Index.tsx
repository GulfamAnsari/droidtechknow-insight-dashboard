
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  CheckSquare, 
  BookOpen, 
  Cloud, 
  BarChart3, 
  FileText, 
  MessageSquare, 
  Image 
} from "lucide-react";
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary" />
              Todo App
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
              <BookOpen className="h-5 w-5 text-primary" />
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
              <Cloud className="h-5 w-5 text-primary" />
              My Cloud
            </CardTitle>
            <CardDescription>Store and manage your files</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload, view, and manage your files and documents in one place.
                Supports images, videos, documents, and more.
              </p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Features:</span>
              </div>
              <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                <li>File upload and preview</li>
                <li>Folder organization</li>
                <li>Responsive layout</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link to="/myfiles">Open My Cloud</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Analytics
            </CardTitle>
            <CardDescription>Track your performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                View analytics and statistics about your site's performance,
                including traffic data and user engagement metrics.
              </p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Features:</span>
              </div>
              <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                <li>Performance metrics</li>
                <li>Visual charts</li>
                <li>Data export options</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link to="/analytics">View Analytics</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Articles
            </CardTitle>
            <CardDescription>Manage your content</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Create, edit, and manage your articles and other written content.
                Track views, likes, and engagement metrics.
              </p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Features:</span>
              </div>
              <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                <li>Content management</li>
                <li>Performance tracking</li>
                <li>Publishing tools</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link to="/articles">Manage Articles</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Feedback
            </CardTitle>
            <CardDescription>Review user feedback</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Collect and manage feedback from your users.
                Analyze comments and improve your content based on suggestions.
              </p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Features:</span>
              </div>
              <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                <li>Feedback collection</li>
                <li>Comment management</li>
                <li>Response tools</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link to="/feedback">View Feedback</Link>
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
                Upload, organize, and view your photos in a clean gallery layout.
                Sort photos by date and view them in high resolution.
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
