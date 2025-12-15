import React, { useMemo } from "react";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import { TrendingUp, TrendingDown, Minus, Flame, Beef, Wheat, Droplets } from "lucide-react";
import type { MealEntry, DailyGoals } from "./types";

interface InsightsPanelProps {
  entries: MealEntry[];
  startDate: string;
  endDate: string;
  goals: DailyGoals;
}

export const InsightsPanel: React.FC<InsightsPanelProps> = ({
  entries,
  startDate,
  endDate,
  goals,
}) => {
  const insights = useMemo(() => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const days = eachDayOfInterval({ start, end });
    
    const dailyData = days.map((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dayEntries = entries.filter((e) => e.date === dateStr);
      return {
        date: dateStr,
        calories: dayEntries.reduce((sum, e) => sum + e.foodItem.calories * e.quantity, 0),
        protein: dayEntries.reduce((sum, e) => sum + e.foodItem.protein * e.quantity, 0),
        carbs: dayEntries.reduce((sum, e) => sum + e.foodItem.carbs * e.quantity, 0),
        fat: dayEntries.reduce((sum, e) => sum + e.foodItem.fat * e.quantity, 0),
        meals: dayEntries.length,
      };
    });

    const daysWithData = dailyData.filter((d) => d.meals > 0);
    const totalDays = daysWithData.length || 1;

    const totals = daysWithData.reduce(
      (acc, d) => ({
        calories: acc.calories + d.calories,
        protein: acc.protein + d.protein,
        carbs: acc.carbs + d.carbs,
        fat: acc.fat + d.fat,
        meals: acc.meals + d.meals,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, meals: 0 }
    );

    const averages = {
      calories: Math.round(totals.calories / totalDays),
      protein: Math.round(totals.protein / totalDays),
      carbs: Math.round(totals.carbs / totalDays),
      fat: Math.round(totals.fat / totalDays),
    };

    const onTargetDays = daysWithData.filter(
      (d) => d.calories >= goals.calories * 0.9 && d.calories <= goals.calories * 1.1
    ).length;

    const overDays = daysWithData.filter((d) => d.calories > goals.calories * 1.1).length;
    const underDays = daysWithData.filter((d) => d.calories < goals.calories * 0.9).length;

    // Find best and worst days
    const bestDay = daysWithData.length > 0
      ? daysWithData.reduce((best, d) => {
          const bestDiff = Math.abs(best.calories - goals.calories);
          const currDiff = Math.abs(d.calories - goals.calories);
          return currDiff < bestDiff ? d : best;
        })
      : null;

    const highestDay = daysWithData.length > 0
      ? daysWithData.reduce((max, d) => (d.calories > max.calories ? d : max))
      : null;

    const lowestDay = daysWithData.filter(d => d.calories > 0).length > 0
      ? daysWithData.filter(d => d.calories > 0).reduce((min, d) => (d.calories < min.calories ? d : min))
      : null;

    return {
      totalDays,
      totals,
      averages,
      onTargetDays,
      overDays,
      underDays,
      bestDay,
      highestDay,
      lowestDay,
      calorieVsGoal: averages.calories - goals.calories,
    };
  }, [entries, startDate, endDate, goals]);

  const TrendIcon = insights.calorieVsGoal > 50 ? TrendingUp : insights.calorieVsGoal < -50 ? TrendingDown : Minus;
  const trendColor = insights.calorieVsGoal > 50 ? "text-destructive" : insights.calorieVsGoal < -50 ? "text-yellow-500" : "text-green-500";

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Period Insights</h3>
        <span className="text-xs text-muted-foreground">
          {format(parseISO(startDate), "MMM d")} - {format(parseISO(endDate), "MMM d, yyyy")}
        </span>
      </div>

      {/* Average Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-muted/50 rounded-xl p-4 text-center">
          <Flame className="w-5 h-5 mx-auto mb-2 text-orange-500" />
          <p className="text-xl font-bold text-foreground">{insights.averages.calories}</p>
          <p className="text-xs text-muted-foreground">Avg. Calories</p>
        </div>
        <div className="bg-muted/50 rounded-xl p-4 text-center">
          <Beef className="w-5 h-5 mx-auto mb-2 text-red-500" />
          <p className="text-xl font-bold text-foreground">{insights.averages.protein}g</p>
          <p className="text-xs text-muted-foreground">Avg. Protein</p>
        </div>
        <div className="bg-muted/50 rounded-xl p-4 text-center">
          <Wheat className="w-5 h-5 mx-auto mb-2 text-amber-500" />
          <p className="text-xl font-bold text-foreground">{insights.averages.carbs}g</p>
          <p className="text-xs text-muted-foreground">Avg. Carbs</p>
        </div>
        <div className="bg-muted/50 rounded-xl p-4 text-center">
          <Droplets className="w-5 h-5 mx-auto mb-2 text-purple-500" />
          <p className="text-xl font-bold text-foreground">{insights.averages.fat}g</p>
          <p className="text-xs text-muted-foreground">Avg. Fat</p>
        </div>
      </div>

      {/* Trend */}
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
        <div>
          <p className="text-sm font-medium text-foreground">Daily Average vs Goal</p>
          <p className="text-xs text-muted-foreground">
            Goal: {goals.calories} kcal/day
          </p>
        </div>
        <div className={`flex items-center gap-2 ${trendColor}`}>
          <TrendIcon className="w-5 h-5" />
          <span className="font-bold">
            {insights.calorieVsGoal > 0 ? "+" : ""}{insights.calorieVsGoal} kcal
          </span>
        </div>
      </div>

      {/* Day Distribution */}
      <div>
        <p className="text-sm font-medium text-foreground mb-3">Day Distribution</p>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-3 bg-green-500/10 rounded-xl border border-green-500/20">
            <p className="text-2xl font-bold text-green-600">{insights.onTargetDays}</p>
            <p className="text-xs text-muted-foreground">On Target</p>
          </div>
          <div className="text-center p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
            <p className="text-2xl font-bold text-yellow-600">{insights.underDays}</p>
            <p className="text-xs text-muted-foreground">Under Goal</p>
          </div>
          <div className="text-center p-3 bg-destructive/10 rounded-xl border border-destructive/20">
            <p className="text-2xl font-bold text-destructive">{insights.overDays}</p>
            <p className="text-xs text-muted-foreground">Over Goal</p>
          </div>
        </div>
      </div>

      {/* Totals */}
      <div className="border-t border-border pt-4">
        <p className="text-sm font-medium text-foreground mb-2">Period Totals</p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Calories</span>
            <span className="font-medium text-foreground">{insights.totals.calories.toLocaleString()} kcal</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Protein</span>
            <span className="font-medium text-foreground">{insights.totals.protein}g</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Carbs</span>
            <span className="font-medium text-foreground">{insights.totals.carbs}g</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Fat</span>
            <span className="font-medium text-foreground">{insights.totals.fat}g</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Days Tracked</span>
            <span className="font-medium text-foreground">{insights.totalDays} days</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Meals</span>
            <span className="font-medium text-foreground">{insights.totals.meals} items</span>
          </div>
        </div>
      </div>

      {/* Highlights */}
      {(insights.highestDay || insights.lowestDay) && (
        <div className="border-t border-border pt-4">
          <p className="text-sm font-medium text-foreground mb-2">Highlights</p>
          <div className="space-y-2 text-sm">
            {insights.highestDay && (
              <div className="flex justify-between p-2 bg-muted/30 rounded-lg">
                <span className="text-muted-foreground">Highest Day</span>
                <span className="font-medium text-foreground">
                  {format(parseISO(insights.highestDay.date), "MMM d")} - {insights.highestDay.calories} kcal
                </span>
              </div>
            )}
            {insights.lowestDay && (
              <div className="flex justify-between p-2 bg-muted/30 rounded-lg">
                <span className="text-muted-foreground">Lowest Day</span>
                <span className="font-medium text-foreground">
                  {format(parseISO(insights.lowestDay.date), "MMM d")} - {insights.lowestDay.calories} kcal
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
