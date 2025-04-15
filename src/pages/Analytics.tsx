import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/DateRangePicker";
import { useQuery } from "@tanstack/react-query";
import { DateRange } from "react-day-picker";
import { fetchAnalyticsData } from "@/utils/analytics-utils";

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
          <DateRangePicker 
            date={dateRange} 
            onDateChange={handleDateRangeChange} 
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
        ) : (
          <div>
            {/* Analytics content would go here */}
            <p>Displaying analytics data for the selected period</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
