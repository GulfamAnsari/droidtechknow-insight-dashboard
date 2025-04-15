
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/DateRangePicker";
import { useQuery } from "@tanstack/react-query";
import { DateRange } from "react-day-picker";
import { normalizeReferrer, removeQueryParams } from "@/utils/analytics-utils";

// Mock data for analytics
const fetchAnalyticsData = (fromDate?: Date, toDate?: Date) => {
  console.log("Fetching analytics data for:", fromDate, toDate);
  
  // This would typically be an API call to your backend
  return new Promise<any>((resolve) => {
    setTimeout(() => {
      resolve({
        pageViews: 12500,
        uniqueVisitors: 4300,
        bounceRate: 42.5,
        avgSessionDuration: 124, // seconds
        topReferrers: [
          { source: "Google", visits: 5240 },
          { source: "Direct", visits: 3150 },
          { source: "Twitter", visits: 1230 },
          { source: "Facebook", visits: 980 },
          { source: "LinkedIn", visits: 720 }
        ],
        topPages: [
          { path: "/home", views: 4320 },
          { path: "/products", views: 2840 },
          { path: "/blog", views: 1920 },
          { path: "/about", views: 1540 },
          { path: "/contact", views: 1280 }
        ]
      });
    }, 800); // Simulate network delay
  });
};

const Analytics = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [applyFilter, setApplyFilter] = useState(false);
  
  // Only fetch data when applyFilter is true
  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics", dateRange?.from, dateRange?.to],
    queryFn: () => fetchAnalyticsData(dateRange?.from, dateRange?.to),
    enabled: applyFilter, // Only run query when filter is applied
  });
  
  // Handle filter application
  const handleApplyFilter = () => {
    setApplyFilter(true);
  };
  
  // Reset when date range changes to require explicit filter application
  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    setApplyFilter(false); // Reset the filter applied state
  };
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Analytics</h1>
      
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end mb-6">
        <div className="flex-1">
          <h2 className="text-lg font-semibold mb-2">Date Range</h2>
          <DatePickerWithRange 
            date={dateRange} 
            setDate={handleDateRangeChange} 
          />
        </div>
        <Button onClick={handleApplyFilter} disabled={!dateRange?.from}>
          Apply Filter
        </Button>
      </div>
      
      {/* Analytics content */}
      <div className="space-y-6">
        {isLoading ? (
          <div>Loading analytics data...</div>
        ) : error ? (
          <div>Error loading analytics data</div>
        ) : !applyFilter ? (
          <div>Select a date range and click Apply Filter to view analytics</div>
        ) : data ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Overview metrics */}
            <div className="col-span-full grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Page Views</h3>
                <p className="text-2xl font-bold">{data.pageViews.toLocaleString()}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Unique Visitors</h3>
                <p className="text-2xl font-bold">{data.uniqueVisitors.toLocaleString()}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Bounce Rate</h3>
                <p className="text-2xl font-bold">{data.bounceRate}%</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg. Session</h3>
                <p className="text-2xl font-bold">{Math.floor(data.avgSessionDuration / 60)}m {data.avgSessionDuration % 60}s</p>
              </div>
            </div>
            
            {/* Top referrers */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-4">Top Referrers</h3>
              <ul className="space-y-3">
                {data.topReferrers.map((ref: any, i: number) => (
                  <li key={i} className="flex justify-between items-center">
                    <span>{ref.source}</span>
                    <span className="font-medium">{ref.visits.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Top pages */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-4">Top Pages</h3>
              <ul className="space-y-3">
                {data.topPages.map((page: any, i: number) => (
                  <li key={i} className="flex justify-between items-center">
                    <span className="truncate max-w-[200px]">{page.path}</span>
                    <span className="font-medium">{page.views.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div>No analytics data available</div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
