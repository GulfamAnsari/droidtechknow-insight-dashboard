import React from "react";
import { format, subDays } from "date-fns";

interface WeeklyChartProps {
  data: { date: string; calories: number }[];
  goal: number;
}

export const WeeklyChart: React.FC<WeeklyChartProps> = ({ data, goal }) => {
  const maxValue = Math.max(...data.map(d => d.calories), goal);
  
  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <h3 className="font-semibold text-foreground mb-4">Weekly Overview</h3>
      <div className="flex items-end justify-between gap-2 h-32">
        {data.map((day, i) => {
          const height = (day.calories / maxValue) * 100;
          const isToday = i === data.length - 1;
          const isOverGoal = day.calories > goal;
          
          return (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
              <div className="relative w-full h-24 flex items-end justify-center">
                <div
                  className={`w-full max-w-[32px] rounded-t-lg transition-all duration-500 ${
                    isOverGoal 
                      ? "bg-destructive/80" 
                      : isToday 
                        ? "bg-primary" 
                        : "bg-primary/40"
                  }`}
                  style={{ height: `${Math.max(height, 4)}%` }}
                />
              </div>
              <span className={`text-xs ${isToday ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                {format(new Date(day.date), "EEE")}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>Goal: {goal} kcal/day</span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-primary/40" />
            <span>Under goal</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-destructive/80" />
            <span>Over goal</span>
          </div>
        </div>
      </div>
    </div>
  );
};
