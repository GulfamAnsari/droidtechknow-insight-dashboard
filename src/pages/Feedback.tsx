
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface Feedback {
  id: string;
  name: string;
  email: string;
  feedback: string;
  date: string;
  time: string;
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

  const {
    data: feedbacks,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["feedbacks"],
    queryFn: fetchFeedback,
  });

  // Filter feedback based on search term
  const filteredFeedback = feedbacks
    ? feedbacks.filter((feedback) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          feedback.name.toLowerCase().includes(searchLower) ||
          feedback.email.toLowerCase().includes(searchLower) ||
          feedback.feedback.toLowerCase().includes(searchLower)
        );
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
  const feedbackPerDay = () => {
    if (!feedbacks || feedbacks.length === 0) return {};
    
    const feedbacksByDate: { [key: string]: number } = {};
    feedbacks.forEach(feedback => {
      if (feedback.date in feedbacksByDate) {
        feedbacksByDate[feedback.date]++;
      } else {
        feedbacksByDate[feedback.date] = 1;
      }
    });
    return feedbacksByDate;
  };

  const feedbackStats = feedbackPerDay();
  const mostActiveDayCount = Math.max(...Object.values(feedbackStats));
  const mostActiveDay = Object.keys(feedbackStats).find(
    day => feedbackStats[day] === mostActiveDayCount
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="dashboard-container">
      <h1 className="text-2xl font-bold mb-6">User Feedback</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFeedbacks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Most Active Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mostActiveDay || "N/A"}</div>
            {mostActiveDay && (
              <p className="text-sm text-gray-500">{mostActiveDayCount} feedbacks</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Per Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(feedbackStats).length 
                ? (totalFeedbacks / Object.keys(feedbackStats).length).toFixed(1) 
                : "0"}
            </div>
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

      {/* Feedback List */}
      <div className="space-y-4">
        {filteredFeedback.length > 0 ? (
          filteredFeedback.map((feedback) => (
            <Card key={feedback.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-10 w-10 border">
                    <AvatarFallback>{getInitials(feedback.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{feedback.name}</h3>
                      <Badge variant="outline" className="ml-2">
                        {new Date(`${feedback.date} ${feedback.time}`).toLocaleString()}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">{feedback.email}</p>
                    <p className="pt-2">{feedback.feedback}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-gray-500">
            No feedback found.
          </div>
        )}
      </div>
    </div>
  );
};

export default Feedback;
