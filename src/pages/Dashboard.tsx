
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
  Music,
  AppleIcon,
  Video,
  CreditCard,
  TrendingUp,
  ScanLine,
  Bell,
  Users
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
        <Button asChild variant="pill">
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
      <Button asChild variant="pill">
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
          icon={AppleIcon}
          title="Food tracker"
          description="You can log your food intake"
          features={["Log food", "Log weight and height", "Track calories", "View history"]}
          link="/food-tracker"
          linkText="Food tracker"
        />

        <DashboardCard
          icon={CreditCard}
          title="Expense Manager"
          description="Track your expenses from Gmail"
          features={[
            "Gmail transaction extraction",
            "Expense categorization",
            "Monthly summaries",
            "Real-time tracking"
          ]}
          link="/expense-manager"
          linkText="Manage Expenses"
        />

        <DashboardCard
          icon={Video}
          title="Screen Recorder"
          description="Record your screen with audio"
          features={[
            "High-quality screen recording",
            "Audio capture support",
            "Local storage",
            "Multiple format support"
          ]}
          link="/screen-recorder"
          linkText="Start Recording"
        />

        <DashboardCard
          icon={Video}
          title="Video Editor"
          description="Edit and export your recordings"
          features={[
            "Trim and cut videos",
            "Combine multiple clips",
            "Preview before export",
            "Simple timeline controls"
          ]}
          link="/video-editor"
          linkText="Open Video Editor"
        />

        <DashboardCard
          icon={TrendingUp}
          title="Stock Market News"
          description="Latest Indian market updates"
          features={[
            "Live market news feeds",
            "Multiple news sources",
            "Real-time updates",
            "Image previews"
          ]}
          link="/stock-news"
          linkText="Read Market News"
        />

        <DashboardCard
          icon={ScanLine}
          title="Pattern Detector"
          description="Detect candlestick patterns from charts"
          features={[
            "Upload candlestick screenshots",
            "Pattern detection engine",
            "Highlighted patterns",
            "Manual and AI modes"
          ]}
          link="/pattern-detector"
          linkText="Open Pattern Detector"
        />

        <DashboardCard
          icon={Bell}
          title="Stock Alerts"
          description="Configure price change alerts"
          features={[
            "Percentage-based alerts",
            "NIFTY50 bulk alerts",
            "Sound notifications",
            "Recent symbols list"
          ]}
          link="/stock-alerts"
          linkText="Open Stock Alerts"
        />

        <DashboardCard
          icon={BookOpen}
          title="Notepad"
          description="Take and manage your notes"
          features={[
            "Rich text formatting",
            "Multiple notes support",
            "Fullscreen mode",
            "Auto-save functionality"
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

        <DashboardCard
          icon={Users}
          title="Video Meet"
          description="Join video meetings instantly"
          features={[
            "Real-time video & audio",
            "Up to 10 participants",
            "Screen sharing",
            "No login required"
          ]}
          link="/video-meet"
          linkText="Join Meeting"
        />
      </div>
    </div>
  );
};

export default Dashboard;
