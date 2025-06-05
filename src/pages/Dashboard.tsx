
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckSquare,
  BookOpen,
  Cloud,
  BarChart3,
  FileText,
  MessageSquare,
  Music
} from "lucide-react";
import { useState, useEffect } from "react";
import httpClient from "@/utils/httpClient";

const DashboardTodoCard = () => {
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTodoData = async () => {
      setIsLoading(true);
      try {
        const response = await httpClient.get("https://droidtechknow.com/admin/api/todo/");
        
        if (response.todoItems) {
          const todos = response.todoItems;
          const total = todos.length;
          const completed = todos.filter(todo => todo.completed).length;
          const pending = total - completed;
          
          setStats({ total, completed, pending });
        }
      } catch (error) {
        console.error("Error loading todo data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTodoData();
  }, []);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CheckSquare className="h-5 w-5 text-primary" />
          Todo App
        </CardTitle>
        <CardDescription>Manage your tasks efficiently</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        {isLoading ? (
          <div className="flex justify-center py-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <div className="flex justify-between">
              <span>Total Tasks</span>
              <span className="font-semibold text-foreground">{stats.total}</span>
            </div>
            <div className="flex justify-between">
              <span>Pending</span>
              <span className="font-semibold text-yellow-600">{stats.pending}</span>
            </div>
            <div className="flex justify-between">
              <span>Completed</span>
              <span className="font-semibold text-green-600">{stats.completed}</span>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link to="/todo">Go to Todo App</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

const DashboardCard = ({ icon: Icon, title, description, features, link, linkText }) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-lg">
        <Icon className="h-5 w-5 text-primary" />
        {title}
      </CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>
      {features && (
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
          {features.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      )}
    </CardContent>
    <CardFooter>
      <Button asChild className="w-full">
        <Link to={link}>{linkText}</Link>
      </Button>
    </CardFooter>
  </Card>
);

const Dashboard = () => {
  return (
    <div className="mx-auto p-6 inner-container">
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        <DashboardTodoCard />

        <DashboardCard
          icon={Music}
          title="Music Player"
          description="Stream and discover music"
          features={[
            "Search songs and artists",
            "High-quality streaming",
            "Playlist management",
            "Offline listening"
          ]}
          link="/music"
          linkText="Open Music App"
        />

        <DashboardCard
          icon={BookOpen}
          title="Notepad"
          description="Take and manage your notes"
          features={[
            "Rich text formatting",
            "Local storage persistence",
            "Automatic saving"
          ]}
          link="/notepad"
          linkText="Open Notepad"
        />

        <DashboardCard
          icon={Cloud}
          title="My Cloud"
          description="Store and manage your files"
          features={[
            "File upload and preview",
            "Folder organization",
            "Responsive layout"
          ]}
          link="/myfiles"
          linkText="Open My Cloud"
        />

        <DashboardCard
          icon={BarChart3}
          title="Analytics"
          description="Track your performance metrics"
          features={[
            "Performance metrics",
            "Visual charts",
            "Data export options"
          ]}
          link="/analytics"
          linkText="View Analytics"
        />

        <DashboardCard
          icon={FileText}
          title="Articles"
          description="Manage your content"
          features={[
            "Content management",
            "Performance tracking",
            "Publishing tools"
          ]}
          link="/articles"
          linkText="Manage Articles"
        />

        <DashboardCard
          icon={MessageSquare}
          title="Feedback"
          description="Review user feedback"
          features={[
            "Feedback collection",
            "Comment management",
            "Response tools"
          ]}
          link="/feedback"
          linkText="View Feedback"
        />
      </div>
    </div>
  );
};

export default Dashboard;
