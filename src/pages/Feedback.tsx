
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Feedback {
  postId: string;
  postUrl: string;
  likes: string;
  dislikes: string;
  defaultComment: string; // JSON string of comments
  userComment: string; // JSON string of comments
}

const fetchFeedback = async (): Promise<Feedback[]> => {
  const response = await fetch(
    "https://droidtechknow.com/admin/api/feedback/getAllFeedbacks.php"
  );
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  return response.json();
};

const Feedback = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const {
    data: feedbacks,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["feedbacks"],
    queryFn: fetchFeedback,
  });

  // Parse comments from JSON strings
  const parseComments = (commentStr: string): string[] => {
    if (!commentStr) return [];
    try {
      // Remove potential escaped quotes and parse
      const sanitized = commentStr.replace(/\\"/g, '"');
      return JSON.parse(sanitized);
    } catch (err) {
      console.error("Error parsing comments:", err);
      return [];
    }
  };

  // Get combined comments
  const getFeedbackComments = (feedback: Feedback): string[] => {
    const defaultComments = parseComments(feedback.defaultComment);
    const userComments = parseComments(feedback.userComment);
    return [...defaultComments, ...userComments];
  };
  
  // Filter feedback based on search term and active tab
  const filteredFeedback = feedbacks
    ? feedbacks.filter((feedback) => {
        // First filter by search term
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          const comments = getFeedbackComments(feedback);
          const commentsMatch = comments.some(comment => 
            comment.toLowerCase().includes(searchLower)
          );
          
          return (
            feedback.postUrl?.toLowerCase().includes(searchLower) ||
            commentsMatch
          );
        }
        
        return true; // If no search term, include all
      })
    : [];

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-gray-500">Loading feedback...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="dashboard-container">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <p>Error loading feedback: {(error as Error).message}</p>
        </div>
      </div>
    );
  }

  // Calculate feedback statistics
  const totalFeedbacks = feedbacks?.length || 0;
  const totalLikes = feedbacks
    ? feedbacks.reduce((sum, item) => sum + parseInt(item.likes || "0"), 0)
    : 0;
  const totalDislikes = feedbacks
    ? feedbacks.reduce((sum, item) => sum + parseInt(item.dislikes || "0"), 0)
    : 0;
  
  // Calculate total comments
  const totalComments = feedbacks
    ? feedbacks.reduce((sum, item) => {
        const comments = getFeedbackComments(item);
        return sum + comments.length;
      }, 0)
    : 0;

  return (
    <div className="dashboard-container">
      <h1 className="text-2xl font-bold mb-6">User Feedback</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFeedbacks}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Likes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLikes}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Dislikes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDislikes}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalComments}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-64 mb-6">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
        <Input
          type="search"
          placeholder="Search feedback..."
          className="pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All Posts</TabsTrigger>
          <TabsTrigger value="popular">Most Popular</TabsTrigger>
          <TabsTrigger value="commented">Most Commented</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Feedback List */}
      <div className="space-y-4">
        {filteredFeedback.length > 0 ? (
          filteredFeedback
            .sort((a, b) => {
              if (activeTab === "popular") {
                return parseInt(b.likes) - parseInt(a.likes);
              } else if (activeTab === "commented") {
                return getFeedbackComments(b).length - getFeedbackComments(a).length;
              }
              return 0; // Default no sorting
            })
            .map((feedback) => {
              const comments = getFeedbackComments(feedback);
              
              return (
                <Card key={feedback.postId} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                        <h3 className="font-semibold truncate max-w-md">
                          {feedback.postUrl}
                        </h3>
                        <div className="flex gap-2">
                          <Badge variant="secondary" className="ml-2">
                            {feedback.likes} likes
                          </Badge>
                          <Badge variant="outline" className="ml-2">
                            {feedback.dislikes} dislikes
                          </Badge>
                        </div>
                      </div>
                      
                      {comments.length > 0 ? (
                        <div className="space-y-3 mt-2">
                          <h4 className="text-sm font-medium text-muted-foreground">
                            Comments ({comments.length})
                          </h4>
                          {comments.map((comment, idx) => (
                            <div key={idx} className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg">
                              <Avatar className="h-8 w-8 border">
                                <AvatarFallback>U{idx+1}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm">{comment}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No comments on this post</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
        ) : (
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center text-gray-500 dark:text-gray-400">
            No feedback found.
          </div>
        )}
      </div>
    </div>
  );
};

export default Feedback;
