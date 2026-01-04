import { Link } from "react-router-dom";
import {
  CheckSquare,
  BookOpen,
  Cloud,
  BarChart3,
  FileText,
  MessageSquare,
  Music,
  Apple,
  Video,
  CreditCard,
  TrendingUp,
  Bell,
  Users,
  Film,
  FileEdit
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import httpClient from "@/utils/httpClient";

const dashboardItems = [
  { icon: Music, title: "Music", link: "/music", color: "text-purple-500" },
  { icon: TrendingUp, title: "Stock News", link: "/stock-news", color: "text-emerald-500" },
  { icon: Bell, title: "Stock Alerts", link: "/stock-alerts", color: "text-orange-500" },
  { icon: Cloud, title: "My Cloud", link: "/myfiles", color: "text-sky-500" },
  { icon: BookOpen, title: "Notepad", link: "/notepad", color: "text-amber-500" },
  { icon: CreditCard, title: "Expenses", link: "/expense-manager", color: "text-yellow-500" },
  { icon: Video, title: "Screen Recorder", link: "/screen-recorder", color: "text-red-500" },
  { icon: Film, title: "Video Editor", link: "/video-editor", color: "text-pink-500" },
  { icon: Users, title: "Video Meet", link: "/video-meet", color: "text-cyan-500" },
  { icon: FileEdit, title: "PDF Editor", link: "/pdf-editor", color: "text-indigo-500" },
  { icon: Apple, title: "Food Tracker", link: "/food-tracker", color: "text-green-500" },
  { icon: FileText, title: "Articles", link: "/articles", color: "text-teal-500" },
  { icon: MessageSquare, title: "Feedback", link: "/feedback", color: "text-violet-500" },
  { icon: BarChart3, title: "Analytics", link: "/analytics", color: "text-rose-500" },
];


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
        <Button asChild variant="pill">
          <Link to="/todo">Go to Todo App</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};



const DashboardTile = ({ icon: Icon, title, link, color }: { 
  icon: React.ElementType; 
  title: string; 
  link: string; 
  color: string;
}) => (
  <Link
    to={link}
    className={cn(
      "flex flex-col items-center justify-center gap-2 p-8 rounded-lg",
      "bg-card border border-border hover:border-primary",
      "hover:bg-primary/10 transition-all duration-200",
      "hover:scale-110 hover:shadow-lg cursor-pointer",
      "group"
    )}
  >
    <div className={cn(
      "p-2 rounded-lg transition-colors",
      "bg-muted group-hover:bg-primary/20",
      color
    )}>
      <Icon className="h-5 w-5" />
    </div>
    <span className="text-xs font-medium text-center line-clamp-1">{title}</span>
  </Link>
);

const Dashboard = () => {
  return (
    <div className="p-4 inner-container">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
        <DashboardTodoCard />
        {dashboardItems.map((item) => (
          <DashboardTile
            key={item.title}
            icon={item.icon}
            title={item.title}
            link={item.link}
            color={item.color}
          />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
