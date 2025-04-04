
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DatePickerWithRange } from "@/components/DateRangePicker";
import { 
  BarChart, 
  LineChart,
  PieChart,
  ResponsiveContainer, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Line,
  Cell,
  Pie,
  Legend
} from "recharts";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { addDays } from "date-fns";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Analytics {
  browser: string;
  device_type: string;
  id: string;
  is_bot: string;
  operating_system: string;
  page_url: string;
  referrer: string;
  user_agent: string;
  visit_date: string;
  visit_time: string;
  visitor_ip: string;
}

interface AnalyticsQueryParams {
  date1: string;
  date2: string;
  is_bot?: string;
  device_type?: string;
  operating_system?: string;
  browser?: string;
  referrer?: string;
  visitor_ip?: string;
  page_url?: string;
}

const fetchAnalytics = async (params: AnalyticsQueryParams): Promise<Analytics[]> => {
  const queryParams = new URLSearchParams();
  
  // Add required params
  queryParams.append("date1", params.date1);
  queryParams.append("date2", params.date2);
  
  // Add optional params if they exist
  if (params.is_bot) queryParams.append("is_bot", params.is_bot);
  if (params.device_type) queryParams.append("device_type", params.device_type);
  if (params.operating_system) queryParams.append("operating_system", params.operating_system);
  if (params.browser) queryParams.append("browser", params.browser);
  if (params.referrer) queryParams.append("referrer", params.referrer);
  if (params.visitor_ip) queryParams.append("visitor_ip", params.visitor_ip);
  if (params.page_url) queryParams.append("page_url", params.page_url);
  
  const response = await fetch(
    `https://droidtechknow.com/admin/api/analytics/getAnalytics.php?${queryParams.toString()}`
  );
  
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  return response.json();
};

const Analytics = () => {
  // Date range state with default as today and yesterday
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -7),
    to: new Date(),
  });
  
  // Filter states
  const [isBot, setIsBot] = useState<string | undefined>(undefined);
  const [deviceType, setDeviceType] = useState<string | undefined>(undefined);
  const [os, setOs] = useState<string | undefined>(undefined);
  const [browser, setBrowser] = useState<string | undefined>(undefined);
  const [referrer, setReferrer] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Prepare query parameters
  const queryParams: AnalyticsQueryParams = {
    date1: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    date2: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    is_bot: isBot,
    device_type: deviceType,
    operating_system: os,
    browser: browser,
    referrer: referrer
  };
  
  const {
    data: analytics,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ["analytics", queryParams],
    queryFn: () => fetchAnalytics(queryParams),
  });
  
  // Extract unique referrers for filter dropdown
  const uniqueReferrers = useMemo(() => {
    if (!analytics) return [];
    
    const referrers = new Set<string>();
    analytics.forEach(item => {
      if (item.referrer && item.referrer !== "none" && item.referrer !== "undefined") {
        referrers.add(item.referrer);
      }
    });
    
    return Array.from(referrers).sort();
  }, [analytics]);
  
  // Prepare data for charts
  const prepareVisitsByDateData = () => {
    if (!analytics) return [];
    
    const visitsByDate: { [key: string]: number } = {};
    
    analytics.forEach(item => {
      const date = item.visit_date;
      if (date in visitsByDate) {
        visitsByDate[date]++;
      } else {
        visitsByDate[date] = 1;
      }
    });
    
    return Object.entries(visitsByDate).map(([date, count]) => ({
      date,
      visits: count
    })).sort((a, b) => a.date.localeCompare(b.date));
  };
  
  const prepareDeviceTypeData = () => {
    if (!analytics) return [];
    
    const deviceTypes: { [key: string]: number } = {};
    
    analytics.forEach(item => {
      const type = item.device_type || "Unknown";
      if (type in deviceTypes) {
        deviceTypes[type]++;
      } else {
        deviceTypes[type] = 1;
      }
    });
    
    return Object.entries(deviceTypes).map(([name, value]) => ({
      name,
      value
    }));
  };
  
  const prepareBrowserData = () => {
    if (!analytics) return [];
    
    const browsers: { [key: string]: number } = {};
    
    analytics.forEach(item => {
      const browserName = item.browser || "Unknown";
      if (browserName in browsers) {
        browsers[browserName]++;
      } else {
        browsers[browserName] = 1;
      }
    });
    
    return Object.entries(browsers).map(([name, value]) => ({
      name,
      value
    })).sort((a, b) => b.value - a.value);
  };
  
  const prepareOsData = () => {
    if (!analytics) return [];
    
    const operatingSystems: { [key: string]: number } = {};
    
    analytics.forEach(item => {
      const os = item.operating_system || "Unknown";
      if (os in operatingSystems) {
        operatingSystems[os]++;
      } else {
        operatingSystems[os] = 1;
      }
    });
    
    return Object.entries(operatingSystems).map(([name, value]) => ({
      name,
      value
    })).sort((a, b) => b.value - a.value);
  };
  
  const prepareReferrerData = () => {
    if (!analytics) return [];
    
    const referrers: { [key: string]: number } = {};
    
    analytics.forEach(item => {
      const ref = item.referrer || "Direct";
      if (ref in referrers) {
        referrers[ref]++;
      } else {
        referrers[ref] = 1;
      }
    });
    
    return Object.entries(referrers).map(([name, value]) => ({
      name: name === "none" ? "Direct" : name,
      value
    })).sort((a, b) => b.value - a.value);
  };
  
  // Traffic source categorization (new metric)
  const prepareTrafficSourceData = () => {
    if (!analytics) return [];
    
    const sources = {
      "Direct": 0,
      "Organic Search": 0,
      "Social Media": 0,
      "Referral": 0,
      "Email": 0,
      "Other": 0
    };
    
    analytics.forEach(item => {
      const ref = item.referrer?.toLowerCase() || "none";
      
      if (ref === "none" || ref === "direct" || ref === "undefined") {
        sources["Direct"]++;
      } else if (ref.includes("google") || ref.includes("bing") || ref.includes("yahoo") || ref.includes("duckduckgo")) {
        sources["Organic Search"]++;
      } else if (
        ref.includes("facebook") || ref.includes("twitter") || ref.includes("instagram") || 
        ref.includes("linkedin") || ref.includes("pinterest") || ref.includes("youtube") ||
        ref.includes("reddit") || ref.includes("tiktok")
      ) {
        sources["Social Media"]++;
      } else if (ref.includes("mail") || ref.includes("outlook") || ref.includes("gmail")) {
        sources["Email"]++;
      } else if (ref !== "none" && ref !== "undefined") {
        sources["Referral"]++;
      } else {
        sources["Other"]++;
      }
    });
    
    return Object.entries(sources)
      .filter(([_, value]) => value > 0) // Only include sources with visits
      .map(([name, value]) => ({
        name,
        value
      }));
  };
  
  const visitsByDateData = prepareVisitsByDateData();
  const deviceTypeData = prepareDeviceTypeData();
  const browserData = prepareBrowserData();
  const osData = prepareOsData();
  const referrerData = prepareReferrerData();
  const trafficSourceData = prepareTrafficSourceData();
  
  // Calculate summary statistics
  const totalVisits = analytics?.length || 0;
  const totalHumans = analytics?.filter(item => item.is_bot === "No").length || 0;
  const totalBots = analytics?.filter(item => item.is_bot === "Yes").length || 0;
  
  // Calculate unique visitors by IP
  const calculateUniqueVisitors = () => {
    if (!analytics) return 0;
    
    const uniqueIps = new Set();
    analytics.forEach(item => {
      if (item.visitor_ip) {
        uniqueIps.add(item.visitor_ip);
      }
    });
    
    return uniqueIps.size;
  };
  
  const uniqueVisitors = calculateUniqueVisitors();
  
  // Calculate bounce rate (estimated)
  const estimateBounceRate = () => {
    if (!analytics || analytics.length === 0) return 0;
    
    // Group by IP and count visits
    const visitsByIp: { [ip: string]: number } = {};
    analytics.forEach(item => {
      if (item.visitor_ip) {
        visitsByIp[item.visitor_ip] = (visitsByIp[item.visitor_ip] || 0) + 1;
      }
    });
    
    // Count single-page visits
    const singlePageVisits = Object.values(visitsByIp).filter(count => count === 1).length;
    
    return (singlePageVisits / Object.keys(visitsByIp).length) * 100;
  };
  
  const bounceRate = estimateBounceRate();
  
  // Pie chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658'];
  
  const handleFilterApply = () => {
    refetch();
  };
  
  const handleResetFilters = () => {
    setIsBot(undefined);
    setDeviceType(undefined);
    setOs(undefined);
    setBrowser(undefined);
    setReferrer(undefined);
    refetch();
  };
  
  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-muted-foreground">Loading analytics data...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (isError) {
    return (
      <div className="dashboard-container">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md">
          <p>Error loading analytics: {(error as Error).message}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="dashboard-container">
      <h1 className="text-2xl font-bold mb-6">Analytics Dashboard</h1>
      
      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
            {/* Date Range Picker */}
            <div>
              <label className="text-sm font-medium mb-1 block">Date Range</label>
              <DatePickerWithRange date={dateRange} setDate={setDateRange} />
            </div>
            
            {/* Is Bot Filter */}
            <div>
              <label className="text-sm font-medium mb-1 block">Bot Filter</label>
              <Select value={isBot} onValueChange={setIsBot}>
                <SelectTrigger>
                  <SelectValue placeholder="All Traffic" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={undefined}>All Traffic</SelectItem>
                  <SelectItem value="Yes">Bots Only</SelectItem>
                  <SelectItem value="No">Humans Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Device Type Filter */}
            <div>
              <label className="text-sm font-medium mb-1 block">Device Type</label>
              <Select value={deviceType} onValueChange={setDeviceType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Devices" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={undefined}>All Devices</SelectItem>
                  <SelectItem value="Desktop">Desktop</SelectItem>
                  <SelectItem value="Mobile">Mobile</SelectItem>
                  <SelectItem value="Tablet">Tablet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* OS Filter */}
            <div>
              <label className="text-sm font-medium mb-1 block">Operating System</label>
              <Select value={os} onValueChange={setOs}>
                <SelectTrigger>
                  <SelectValue placeholder="All OS" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={undefined}>All OS</SelectItem>
                  <SelectItem value="Windows">Windows</SelectItem>
                  <SelectItem value="Mac OS X">macOS</SelectItem>
                  <SelectItem value="Android">Android</SelectItem>
                  <SelectItem value="iOS">iOS</SelectItem>
                  <SelectItem value="Linux">Linux</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Browser Filter */}
            <div>
              <label className="text-sm font-medium mb-1 block">Browser</label>
              <Select value={browser} onValueChange={setBrowser}>
                <SelectTrigger>
                  <SelectValue placeholder="All Browsers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={undefined}>All Browsers</SelectItem>
                  <SelectItem value="Google Chrome">Chrome</SelectItem>
                  <SelectItem value="Safari">Safari</SelectItem>
                  <SelectItem value="Firefox">Firefox</SelectItem>
                  <SelectItem value="Edge">Edge</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Referrer Filter (NEW) */}
            <div>
              <label className="text-sm font-medium mb-1 block">Referrer</label>
              <Select value={referrer} onValueChange={setReferrer}>
                <SelectTrigger>
                  <SelectValue placeholder="All Referrers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={undefined}>All Referrers</SelectItem>
                  <SelectItem value="none">Direct</SelectItem>
                  {uniqueReferrers.map(ref => (
                    <SelectItem key={ref} value={ref}>{ref}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleFilterApply}>Apply Filters</Button>
            <Button variant="outline" onClick={handleResetFilters}>Reset Filters</Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVisits}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueVisitors}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Human Visitors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHumans}</div>
            <p className="text-xs text-muted-foreground">
              {totalVisits > 0 ? `${((totalHumans / totalVisits) * 100).toFixed(1)}%` : '0%'} of total
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Estimated Bounce Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bounceRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs for different analytics sections */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="traffic">Traffic Sources</TabsTrigger>
          <TabsTrigger value="devices">Devices & Browsers</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Visits Over Time Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Visits Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {visitsByDateData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={visitsByDateData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="visits" 
                        name="Visits"
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        activeDot={{ r: 8 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No data available for the selected period</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Traffic Sources Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Traffic Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {trafficSourceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={trafficSourceData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {trafficSourceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} visits`, 'Count']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">No data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Device Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {deviceTypeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={deviceTypeData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {deviceTypeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} visits`, 'Count']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">No data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="traffic" className="space-y-6">
          {/* Traffic Sources Detailed View */}
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Referrers</CardTitle>
                <CardDescription>Sources bringing visitors to your site</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {referrerData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={referrerData.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          width={150}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" name="Visits" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">No referrer data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Traffic Categories</CardTitle>
                <CardDescription>Breakdown of traffic by source type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {trafficSourceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trafficSourceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" name="Visits" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">No traffic source data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="devices" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Device Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {deviceTypeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={deviceTypeData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {deviceTypeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} visits`, 'Count']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">No data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Browsers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {browserData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={browserData.slice(0, 5)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" name="Visits" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">No data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Operating System Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Operating Systems</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {osData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={osData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={150} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" name="Visits" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="engagement" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Bot vs Human Traffic</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {totalVisits > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Humans", value: totalHumans },
                            { name: "Bots", value: totalBots }
                          ]}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          <Cell fill="#0088FE" />
                          <Cell fill="#FF8042" />
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} visits`, 'Count']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">No data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Estimated Engagement Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Bounce Rate</span>
                    <span className="text-sm">{bounceRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                    <div 
                      className="h-2 bg-blue-500 rounded-full" 
                      style={{ width: `${Math.min(bounceRate, 100)}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm font-medium">Human Traffic</span>
                    <span className="text-sm">
                      {totalVisits > 0 ? ((totalHumans / totalVisits) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                    <div 
                      className="h-2 bg-green-500 rounded-full" 
                      style={{ width: `${totalVisits > 0 ? (totalHumans / totalVisits) * 100 : 0}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm font-medium">Mobile Visitors</span>
                    <span className="text-sm">
                      {totalVisits > 0 
                        ? ((analytics?.filter(a => a.device_type === "Mobile").length || 0) / totalVisits * 100).toFixed(1) 
                        : 0}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                    <div 
                      className="h-2 bg-purple-500 rounded-full" 
                      style={{ 
                        width: `${totalVisits > 0 
                          ? (analytics?.filter(a => a.device_type === "Mobile").length || 0) / totalVisits * 100 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </div>
    </div>
  );
};

export default Analytics;
