
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, FileText, MessageSquare, BarChart3, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

// Define interface for the stats data
interface DashboardStats {
  totalArticles: number;
  totalViews: number;
  totalLikes: number;
  totalFeedback: number;
  totalVisits: number;
}

// Mock functions to fetch stats data
const fetchArticlesStats = async (): Promise<{ totalArticles: number; totalViews: number; totalLikes: number }> => {
  try {
    const response = await fetch("https://droidtechknow.com/api/dashboard_fetch_all_results.php");
    if (!response.ok) {
      throw new Error("Failed to fetch articles");
    }
    const articles = await response.json();
    
    return {
      totalArticles: articles.length,
      totalViews: articles.reduce((sum: number, article: any) => sum + parseInt(article.views || "0"), 0),
      totalLikes: articles.reduce((sum: number, article: any) => sum + parseInt(article.likes || "0"), 0),
    };
  } catch (error) {
    console.error("Error fetching articles stats:", error);
    return { totalArticles: 0, totalViews: 0, totalLikes: 0 };
  }
};

const fetchFeedbackStats = async (): Promise<{ totalFeedback: number }> => {
  try {
    const response = await fetch("https://droidtechknow.com/admin/api/feedback/getAllFeedbacks.php");
    if (!response.ok) {
      throw new Error("Failed to fetch feedback");
    }
    const feedback = await response.json();
    
    return {
      totalFeedback: feedback.length,
    };
  } catch (error) {
    console.error("Error fetching feedback stats:", error);
    return { totalFeedback: 0 };
  }
};

const fetchAnalyticsStats = async (): Promise<{ totalVisits: number }> => {
  // Use today's date for analytics
  const today = new Date();
  const dateString = today.toISOString().split('T')[0];
  
  try {
    const response = await fetch(
      `https://droidtechknow.com/admin/api/analytics/getAnalytics.php?date1=${dateString}&date2=${dateString}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch analytics");
    }
    const analytics = await response.json();
    
    return {
      totalVisits: analytics.length,
    };
  } catch (error) {
    console.error("Error fetching analytics stats:", error);
    return { totalVisits: 0 };
  }
};

const Dashboard = () => {
  const navigate = useNavigate();
  
  // Fetch article stats
  const { data: articlesStats, isLoading: isLoadingArticles } = useQuery({
    queryKey: ["articlesStats"],
    queryFn: fetchArticlesStats,
  });
  
  // Fetch feedback stats
  const { data: feedbackStats, isLoading: isLoadingFeedback } = useQuery({
    queryKey: ["feedbackStats"],
    queryFn: fetchFeedbackStats,
  });
  
  // Fetch analytics stats
  const { data: analyticsStats, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ["analyticsStats"],
    queryFn: fetchAnalyticsStats,
  });
  
  const isLoading = isLoadingArticles || isLoadingFeedback || isLoadingAnalytics;
  
  // Combine stats data
  const stats: DashboardStats = {
    totalArticles: articlesStats?.totalArticles || 0,
    totalViews: articlesStats?.totalViews || 0,
    totalLikes: articlesStats?.totalLikes || 0,
    totalFeedback: feedbackStats?.totalFeedback || 0,
    totalVisits: analyticsStats?.totalVisits || 0,
  };

  return (
    <div className="dashboard-container">
      <h1 className="text-3xl font-bold mb-8">Welcome to DroidTechKnow Insights</h1>
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Content</CardTitle>
            <CardDescription>Manage your articles and content</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Total Articles</p>
                <p className="text-2xl font-bold">
                  {isLoading ? "Loading..." : stats.totalArticles.toLocaleString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Total Views</p>
                <p className="text-2xl font-bold">
                  {isLoading ? "Loading..." : stats.totalViews.toLocaleString()}
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="w-full flex justify-between items-center" 
              onClick={() => navigate("/articles")}
            >
              View Articles <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Feedback</CardTitle>
            <CardDescription>Review user feedback</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 mb-4">
              <p className="text-sm text-gray-500">Total Feedback</p>
              <p className="text-2xl font-bold">
                {isLoading ? "Loading..." : stats.totalFeedback.toLocaleString()}
              </p>
            </div>
            <Button 
              variant="outline" 
              className="w-full flex justify-between items-center" 
              onClick={() => navigate("/feedback")}
            >
              View Feedback <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Analytics</CardTitle>
            <CardDescription>Monitor site performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 mb-4">
              <p className="text-sm text-gray-500">Today's Visits</p>
              <p className="text-2xl font-bold">
                {isLoading ? "Loading..." : stats.totalVisits.toLocaleString()}
              </p>
            </div>
            <Button 
              variant="outline" 
              className="w-full flex justify-between items-center" 
              onClick={() => navigate("/analytics")}
            >
              View Analytics <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button 
          variant="default" 
          size="lg" 
          className="flex justify-center items-center gap-2"
          onClick={() => navigate("/articles")}
        >
          <FileText className="h-5 w-5" /> Manage Articles
        </Button>
        <Button 
          variant="default" 
          size="lg" 
          className="flex justify-center items-center gap-2"
          onClick={() => navigate("/feedback")}
        >
          <MessageSquare className="h-5 w-5" /> View Feedback
        </Button>
        <Button 
          variant="default" 
          size="lg" 
          className="flex justify-center items-center gap-2"
          onClick={() => navigate("/analytics")}
        >
          <BarChart3 className="h-5 w-5" /> Check Analytics
        </Button>
      </div>
    </div>
  );
};

export default Dashboard;
