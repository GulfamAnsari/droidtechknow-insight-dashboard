
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/DateRangePicker";
import { useQuery } from "@tanstack/react-query";
import { DateRange } from "react-day-picker";
import { normalizeReferrer, removeQueryParams } from "@/utils/analytics-utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

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
        ],
        dailyVisits: [
          { date: "Apr 8", visits: 420 },
          { date: "Apr 9", visits: 380 },
          { date: "Apr 10", visits: 450 },
          { date: "Apr 11", visits: 520 },
          { date: "Apr 12", visits: 630 },
          { date: "Apr 13", visits: 540 },
          { date: "Apr 14", visits: 480 }
        ],
        deviceBreakdown: [
          { name: "Desktop", value: 58 },
          { name: "Mobile", value: 34 },
          { name: "Tablet", value: 8 }
        ],
        countryData: [
          { country: "United States", users: 2150 },
          { country: "United Kingdom", users: 640 },
          { country: "Canada", users: 520 },
          { country: "Germany", users: 410 },
          { country: "France", users: 390 }
        ]
      });
    }, 800); // Simulate network delay
  });
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

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
          <div className="space-y-8">
            {/* Overview metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            
            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Visits Line Chart */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <h3 className="text-lg font-medium mb-4">Daily Visits</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.dailyVisits}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="visits" 
                        stroke="#8884d8" 
                        activeDot={{ r: 8 }} 
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Device Breakdown Pie Chart */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <h3 className="text-lg font-medium mb-4">Device Breakdown</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.deviceBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {data.deviceBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Top Referrers Bar Chart */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <h3 className="text-lg font-medium mb-4">Top Referrers</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.topReferrers}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="source" type="category" width={80} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="visits" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Top Countries Bar Chart */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <h3 className="text-lg font-medium mb-4">Visitors by Country</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={data.countryData}
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="country" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="users" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            
            {/* Top Pages List */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-4">Top Pages</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Page
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Views
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {data.topPages.map((page: any, i: number) => (
                      <tr key={i}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                          {page.path}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                          {page.views.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
